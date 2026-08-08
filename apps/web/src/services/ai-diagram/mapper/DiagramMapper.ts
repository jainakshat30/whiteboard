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
    const nodeKeys = Object.keys(graph.nodes).sort();
    for (const key of nodeKeys) {
      elements.push(NodeMapper.map(graph.nodes[key]));
    }

    // Map Edges
    const edgeKeys = Object.keys(graph.edges).sort();
    for (const key of edgeKeys) {
      elements.push(EdgeMapper.map(graph.edges[key], graph));
    }

    return elements;
  }
}
