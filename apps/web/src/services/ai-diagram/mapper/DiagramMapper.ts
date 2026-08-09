import { Element } from '@/types/elements';
import { PositionedGraph } from '@/types/ai-diagram';
import { NodeMapper } from './NodeMapper';
import { EdgeMapper } from './EdgeMapper';

export class DiagramMapper {
  /**
   * Transforms a PositionedGraph into a deterministic array of native whiteboard Elements.
   * Remains completely independent of any React, Canvas, Store, or Layout dependencies.
   */
  public static map(graph: PositionedGraph): Element[] {
    const elements: Element[] = [];

    // Map Nodes
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
    for (const node of sortedNodes) {
      elements.push(NodeMapper.map(node));
    }

    // Map Edges
    const sortedEdges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));
    for (const edge of sortedEdges) {
      elements.push(EdgeMapper.map(edge, graph));
    }

    return elements;
  }
}
