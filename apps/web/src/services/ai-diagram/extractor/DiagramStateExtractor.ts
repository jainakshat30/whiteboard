import { Element } from '@/types/elements';
import { DiagramGraph, DiagramType } from '@/types/ai-diagram';
import { DiagramEngine } from '../DiagramEngine';

export class DiagramStateExtractor {
  /**
   * Reconstructs a canonical semantic DiagramGraph from native whiteboard Elements.
   * Extracts purely from metadata; geometric heuristics are forbidden.
   */
  public static extractDiagram(elements: Element[], diagramId: string): DiagramGraph {
    if (!diagramId) {
      throw new Error(`DiagramStateExtractor: Must provide a diagramId.`);
    }

    // 1. Filter elements that belong to this diagram
    const diagramElements = elements.filter(el => el.metadata?.diagramId === diagramId);
    
    if (diagramElements.length === 0) {
      // Empty diagram
      // Default to FLOWCHART as we have no elements to infer from.
      return { nodes: [], edges: [], type: 'FLOWCHART', metadata: {} };
    }

    // 2. Recover diagram type
    let diagramType: DiagramType = 'FLOWCHART';
    for (const el of diagramElements) {
      if (el.metadata?.diagramType) {
        diagramType = el.metadata.diagramType as DiagramType;
        break;
      }
    }

    const engine = new DiagramEngine(diagramType);

    // 3. Extract Nodes
    // We create a map of native element UUID to semantic Node ID to resolve edges later.
    const uuidToSemanticId = new Map<string, string>();
    const nodeElements = diagramElements.filter(el => !!el.metadata?.diagramNodeId);

    // Sort by semantic ID to ensure deterministic insertion order
    nodeElements.sort((a, b) => {
      const aId = a.metadata!.diagramNodeId as string;
      const bId = b.metadata!.diagramNodeId as string;
      return aId.localeCompare(bId);
    });

    for (const el of nodeElements) {
      const semanticId = el.metadata!.diagramNodeId as string;
      const nodeType = (el.metadata!.diagramNodeType as string) || 'process';
      const label = el.text || '';

      uuidToSemanticId.set(el.id, semanticId);

      engine.addNode({
        id: semanticId,
        type: nodeType,
        label,
        metadata: {} // Original arbitrary metadata was not preserved in canvas elements
      });
    }

    // 4. Extract Edges
    const edgeElements = diagramElements.filter(el => !!el.metadata?.diagramEdgeId);

    // Sort by semantic ID to ensure deterministic insertion order
    edgeElements.sort((a, b) => {
      const aId = a.metadata!.diagramEdgeId as string;
      const bId = b.metadata!.diagramEdgeId as string;
      return aId.localeCompare(bId);
    });

    for (const el of edgeElements) {
      const semanticId = el.metadata!.diagramEdgeId as string;
      const label = el.text || '';
      
      const sourceUUID = el.metadata!.sourceId as string;
      const targetUUID = el.metadata!.targetId as string;

      const sourceSemanticId = uuidToSemanticId.get(sourceUUID);
      const targetSemanticId = uuidToSemanticId.get(targetUUID);

      if (!sourceSemanticId || !targetSemanticId) {
        throw new Error(`DiagramStateExtractor: Edge '${semanticId}' references missing source/target in metadata.`);
      }

      engine.addEdge({
        id: semanticId,
        source: sourceSemanticId,
        target: targetSemanticId,
        label,
        // Optional typing if we mapped edge types in the future.
      });
    }

    // 5. Validate the extracted graph
    const validationErrors = engine.validate();
    if (validationErrors.length > 0) {
      throw new Error(`DiagramStateExtractor: Graph validation failed:\n${validationErrors.join('\n')}`);
    }

    // Return the canonical graph
    const graph = engine.getGraph();
    
    return graph;
  }
}
