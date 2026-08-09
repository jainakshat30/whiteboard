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
  const maxWidth = 400;
  const maxContentWidth = maxWidth - paddingX;

  const lines = label.split('\n');
  let totalWrappedLines = 0;
  let maxLineWidthFound = 0;

  for (const line of lines) {
    const words = line.split(' ');
    let currentLineLength = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordLen = word.length;
      
      // If adding this word exceeds maxContentWidth (in chars) and it's not the first word of the line
      if (currentLineLength + wordLen > (maxContentWidth / charWidth) && currentLineLength > 0) {
        // Wrap to a new line
        totalWrappedLines++;
        maxLineWidthFound = Math.max(maxLineWidthFound, currentLineLength - 1); // -1 removes trailing space
        currentLineLength = wordLen + 1; // Start new line with this word + space
      } else {
        currentLineLength += wordLen + 1; // Add word + space
      }
    }
    
    // Add the remainder of the line
    if (currentLineLength > 0) {
      totalWrappedLines++;
      maxLineWidthFound = Math.max(maxLineWidthFound, currentLineLength - 1);
    }
  }

  let width = maxLineWidthFound * charWidth + paddingX;
  let height = totalWrappedLines * lineSpacing + paddingY;

  // Enforce reasonable boundaries
  width = Math.max(120, Math.min(width, maxWidth));
  height = Math.max(60, height);

  return { width, height };
}
