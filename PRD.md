# Product Requirements Document (PRD): AI-powered Diagram Generator

## 1. Overview
The AI-powered Diagram Generator is a new feature for the collaborative whiteboard application. It enables users to generate and iteratively edit complex diagrams—such as flowcharts, mind maps, ER diagrams, and sequence diagrams—using natural language prompts. 

## 2. Goals & Non-Goals

### Goals
*   **Modular Architecture**: Fully decouple AI logic, layout algorithms, and whiteboard rendering.
*   **Semantic AI Focus**: Ensure the LLM generates only graph relationships (Nodes & Edges) and never attempts to calculate coordinates.
*   **Conversational Editing**: Support iterative refinement (e.g., "Add Redis cache", "Make the flow horizontal") using graph patches.
*   **Provider Agnostic**: Allow easy swapping between AI providers (Gemini, OpenAI, Claude, Local).
*   **Extensibility**: Build a foundation that inherently supports future features like import/export (Mermaid, PlantUML), real-time collaboration, and custom diagram types.

### Non-Goals
*   The AI will not handle deterministic spatial logic (coordinates, routing).
*   The Whiteboard Renderer will not have any knowledge of AI generation; it will simply receive standard elements to draw.

---

## 3. Core Architectural Concepts

The architecture utilizes a strict separation of concerns, transitioning from a linear API flow to a sophisticated **Generation Pipeline** centered around the **DiagramGraph** as the canonical data model.

1.  **Diagram Engine**: The single source of truth for all graph operations. It owns graph creation, mutation, validation, serialization, lookups, diff generation, and patch application. No other module modifies graph structures directly.
2.  **Generation Pipeline**: Independent processing stages: `Prompt Builder -> AI Provider -> JSON Validator -> Diagram Engine -> Graph Validator -> Layout Strategy -> Mapper -> Store`.
3.  **Diagram Session**: Contextual model storing graph state, prompt history, AI responses, and metadata, enabling conversational editing.
4.  **Graph Diff & Patching**: AI generates structural patches (add/remove node, add/remove edge) instead of full graph regenerations, improving performance and stabilizing layouts.
5.  **Provider Abstraction (`IAIProvider`)**: Decouples the application from specific LLMs to prevent vendor lock-in.

---

## 4. Folder Structure

### Frontend (`apps/web/src`)
```
apps/web/src/
├── components/
│   └── ai-diagram/
│       ├── AiDiagramModal.tsx         # User input modal
│       └── AiDiagramToolbarButton.tsx # Entry point
├── hooks/
│   └── useAiDiagramGenerator.ts       # Manages UI state (loading, error, progress) ONLY
├── services/
│   └── ai-diagram/
│       ├── DiagramGenerationService.ts # Orchestrates the generation pipeline
│       ├── DiagramEngine.ts           # Single source of truth for DiagramGraph operations
│       ├── DiagramSessionManager.ts   # Manages iterative conversation state
│       ├── validators/
│       │   └── GraphValidator.ts      # Validates logical graph rules (cycles, orphans, links)
│       └── layout/
│           ├── ILayoutStrategy.ts     # Interface for diagram-specific layouts
│           ├── FlowchartLayout.ts     # Flowchart layout implementation
│           └── MindMapLayout.ts       # Mind map layout implementation
├── types/
│   └── ai-diagram.ts                  # Domain models (Session, Graph, Node, Edge, Patch)
└── utils/
    └── ai-diagram-mapper.ts           # Pure function: PositionedGraph -> CanvasElement[]
```

### Backend (`apps/server/src`)
```
apps/server/src/
├── handlers/
│   └── ai-diagram/
│       └── generateDiagramHandler.ts  # Express route handler
├── services/
│   └── ai-diagram/
│       ├── DiagramGenerationService.ts # Backend pipeline orchestration
│       ├── providers/                 
│       │   ├── IAIProvider.ts         # Abstraction for AI models
│       │   ├── GeminiProvider.ts      
│       │   └── OpenAIProvider.ts      
│       └── prompt-builder/            # Dedicated layer for prompt construction
│           ├── PromptBuilder.ts       
│           ├── FlowchartPrompt.ts     
│           └── MindMapPrompt.ts       
└── validators/
    └── ai-diagram/
        ├── diagramRequestSchema.ts    
        └── diagramResponseSchema.ts   # JSON schema validation
```

---

## 5. Interfaces & Domain Models

**DiagramGraph** is the canonical data model. Everything derives from it.

```typescript
// Canonical Data Model
export interface DiagramGraph {
  nodes: Record<string, DiagramNode>; // Fast lookups
  edges: Record<string, DiagramEdge>;
  type: DiagramType;
  metadata: Record<string, any>;
}

export interface DiagramNode {
  id: string;
  label: string;
  type: string; 
}

export interface DiagramEdge {
  id: string;
  source: string; 
  target: string; 
  label?: string;
  type?: string; 
}

// Session Management
export interface DiagramSession {
  sessionId: string;
  currentGraph: DiagramGraph;
  history: Array<{ role: 'user' | 'ai', content: string, patch?: GraphPatch }>;
  diagramType: DiagramType;
}

// Graph Diffing & Patching
export interface GraphPatch {
  addedNodes: DiagramNode[];
  removedNodeIds: string[];
  updatedNodes: Partial<DiagramNode>[];
  addedEdges: DiagramEdge[];
  removedEdgeIds: string[];
}

// AI Provider Abstraction
export interface IAIProvider {
  generateCompletion(prompt: string, schema: any): Promise<any>;
}

// Layout & Pure Mapper
export interface PositionedGraph {
  nodes: (DiagramNode & { x: number; y: number; width: number; height: number; })[];
  edges: DiagramEdge[];
}

export interface IDiagramToCanvasMapper {
  map(positionedGraph: PositionedGraph): CanvasElement[]; // Pure transformation
}
```

---

## 6. Responsibilities

*   **`useAiDiagramGenerator` Hook**: Stripped of business logic. It solely coordinates UI behavior, loading spinners, and error toasts.
*   **`DiagramGenerationService`**: Orchestrates the pipeline stages. It calls the backend, updates the `DiagramEngine`, applies layouts, calls the pure mapper, and finally updates the Whiteboard Store.
*   **`DiagramEngine`**: The core graph manager. Handles graph creation, `applyPatch(graph, patch)`, diff calculations, structural queries, and acts as the adapter point for future Import/Export logic.
*   **`GraphValidator`**: Runs after JSON validation to check for duplicate IDs, missing references, disconnected subgraphs, and invalid self-references.
*   **`PromptBuilder`**: Manages system prompts, few-shot examples, and incorporates session history for iterative requests.
*   **`ai-diagram-mapper.ts`**: strictly a **pure function**. It transforms `PositionedGraph` -> `CanvasElements` without touching global stores.

---

## 7. The Generation Pipeline Flow

1. **User Input**: User submits a prompt (e.g., "Add Redis").
2. **Orchestration**: Hook calls `DiagramGenerationService.generate(prompt, sessionId)`.
3. **Backend Pipeline**: 
    - `PromptBuilder` merges session history and specific diagram instructions.
    - `IAIProvider` requests structural completion.
    - Result is validated against JSON schema.
4. **Graph Mutating**: Backend returns a `GraphPatch` (or full graph).
5. **Engine Update**: `DiagramEngine.applyPatch(patch)` integrates the changes safely.
6. **Graph Validation**: `GraphValidator` ensures no invalid links or orphans.
7. **Layout Generation**: `ILayoutStrategy` applies deterministic algorithms (e.g., Dagre, D3) to generate a `PositionedGraph`.
8. **Canvas Mapping**: `ai-diagram-mapper.ts` converts to `CanvasElement[]`.
9. **Render**: Elements are dispatched to the Whiteboard Store, and the canvas rerenders.
