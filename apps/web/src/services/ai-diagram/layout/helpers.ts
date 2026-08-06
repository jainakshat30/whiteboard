import { DiagramGraph, PositionedGraph } from '../../../types/ai-diagram';

/**
 * Checks if a graph has no nodes.
 */
export function isGraphEmpty(graph: DiagramGraph): boolean {
  return Object.keys(graph.nodes).length === 0;
}

/**
 * Returns an empty PositionedGraph gracefully.
 */
export function handleEmptyGraph(graph: DiagramGraph): PositionedGraph {
  return {
    nodes: {},
    edges: { ...graph.edges },
    type: graph.type,
    metadata: { ...graph.metadata }
  };
}
