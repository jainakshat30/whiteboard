import { DiagramGraph, PositionedGraph } from '../../../types/ai-diagram';

/**
 * Checks if a graph has no nodes.
 */
export function isGraphEmpty(graph: DiagramGraph): boolean {
  return graph.nodes.length === 0;
}

/**
 * Returns an empty PositionedGraph gracefully.
 */
export function handleEmptyGraph(graph: DiagramGraph): PositionedGraph {
  return {
    nodes: [],
    edges: [...graph.edges],
    type: graph.type,
    metadata: { ...graph.metadata }
  };
}

/**
 * Deterministically calculates node dimensions based on label length.
 * Does not rely on DOM measurement to ensure safety outside the browser.
 */
export function calculateNodeDimensions(label: string): { width: number; height: number } {
  if (!label) return { width: 120, height: 60 };

  const paddingX = 40; // 20px left + 20px right
  const paddingY = 40; // 20px top + 20px bottom
  const charWidth = 9.6; // Approximate width for 16px Inter font
  const lineSpacing = 24; // 16px font + line height

  const lines = label.split('\n');
  const maxLineLength = Math.max(...lines.map(l => l.length));
  
  let width = maxLineLength * charWidth + paddingX;
  let height = lines.length * lineSpacing + paddingY;

  // Enforce reasonable boundaries
  width = Math.max(120, Math.min(width, 400));
  height = Math.max(60, height);

  return { width, height };
}
