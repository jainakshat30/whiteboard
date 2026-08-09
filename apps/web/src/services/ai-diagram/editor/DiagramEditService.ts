import { Element } from '@/types/elements';
import { IAIProvider } from '../providers/IAIProvider';
import { DiagramStateExtractor } from '../extractor/DiagramStateExtractor';
import { DiagramPatchGenerator } from '../ai/DiagramPatchGenerator';
import { DiagramPatchEngine } from '../patch/DiagramPatchEngine';
import { LayoutFactory } from '../layout/LayoutFactory';
import { DiagramCanvasIntegration } from '../integration/DiagramCanvasIntegration';
import { DiagramPatch } from '../patch/DiagramPatch';
import { DiagramPatchPreview } from '../patch/DiagramPatchPreview';
import { DiagramGraph } from '@/types/ai-diagram';

export class ClarificationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClarificationRequiredError';
  }
}

export interface PreparedDiagramEdit {
  diagramId: string;
  patch: DiagramPatch;
  preview: DiagramPatchPreview;
  originalGraph: DiagramGraph;
}

export class DiagramEditService {
  /**
   * Step 1: Prepares the edit by generating a semantic patch and its deterministic preview.
   * - Extracts current graph
   * - Queries AI for patch
   * - Validates patch
   * - Generates deterministic preview
   *
   * @param diagramId The target diagram to edit
   * @param instruction Natural language instruction from user
   * @param allElements All current elements on the whiteboard
   * @param aiProvider The provider abstraction (e.g. GeminiProvider)
   * @returns A PreparedDiagramEdit object if successful
   * @throws Error if any stage fails (graph unchanged)
   */
  public static async prepareEdit(
    diagramId: string,
    instruction: string,
    allElements: Element[],
    aiProvider: IAIProvider
  ): Promise<PreparedDiagramEdit> {
    if (!diagramId) {
      throw new Error('DiagramEditService: No diagram selected for editing.');
    }

    if (!instruction || instruction.trim().length === 0) {
      throw new Error('DiagramEditService: Instruction cannot be empty.');
    }

    // 1. Extract Current Graph (Semantic Layer)
    const existingDiagramElements = allElements.filter(el => el.metadata?.diagramId === diagramId);
    if (existingDiagramElements.length === 0) {
      throw new Error('DiagramEditService: Diagram not found on the board.');
    }

    const currentGraph = DiagramStateExtractor.extractDiagram(existingDiagramElements, diagramId);

    // 2. Generate Semantic Patch
    const generator = new DiagramPatchGenerator(aiProvider);
    const editResponse = await generator.generatePatch(currentGraph, instruction);

    if (editResponse.status === 'NEEDS_CLARIFICATION') {
      throw new ClarificationRequiredError(editResponse.message);
    }

    const patch = editResponse.patch;

    // 3. Generate Preview
    const { DiagramPatchPreviewGenerator } = await import('../patch/DiagramPatchPreviewGenerator');
    const preview = DiagramPatchPreviewGenerator.generatePreview(currentGraph, patch);

    return {
      diagramId,
      patch,
      preview,
      originalGraph: currentGraph
    };
  }

  /**
   * Step 2: Applies a previously prepared and user-approved edit.
   * - Verifies diagram still exists and graph hasn't mutated (stale check)
   * - Applies patch in memory
   * - Layouts updated graph
   * - Maps to native elements
   * - Replaces diagram atomically in whiteboard
   *
   * @param preparedEdit The prepared edit object to apply
   * @param allElements All current elements on the whiteboard
   * @returns The newly updated elements (if successful)
   */
  public static async applyPreparedEdit(
    preparedEdit: PreparedDiagramEdit,
    allElements: Element[]
  ): Promise<Element[]> {
    const { diagramId, patch, originalGraph } = preparedEdit;

    // 1. Verify diagram still exists and extract current state
    const existingDiagramElements = allElements.filter(el => el.metadata?.diagramId === diagramId);
    if (existingDiagramElements.length === 0) {
      throw new Error('DiagramEditService: Diagram no longer exists on the board.');
    }

    const currentGraph = DiagramStateExtractor.extractDiagram(existingDiagramElements, diagramId);

    // 2. Stale Check
    // A simple structural check: if node count or edge count changed, or if it fundamentally mutated, reject it.
    // For Phase 6.7, we do a basic semantic identity check using JSON.stringify (or node/edge counts).
    // The instructions say: "If the graph has materially changed: DO NOT apply the stale patch."
    if (
      currentGraph.nodes.length !== originalGraph.nodes.length ||
      currentGraph.edges.length !== originalGraph.edges.length ||
      JSON.stringify(currentGraph) !== JSON.stringify(originalGraph)
    ) {
      throw new Error('The diagram changed while you were reviewing these changes. Please generate the edit again.');
    }

    // 3. Apply Patch Deterministically
    const updatedGraph = DiagramPatchEngine.apply(currentGraph, patch);

    // 4. Layout Updated Graph
    const layoutEngine = LayoutFactory.getLayout(updatedGraph.type);
    const positionedGraph = await layoutEngine.layout(updatedGraph);

    // 5. Map & Atomic Whiteboard Update
    const newElements = DiagramCanvasIntegration.updateDiagram(positionedGraph, diagramId, existingDiagramElements);

    return newElements;
  }
}
