import { Element } from '@/types/elements';
import { DiagramEdge, PositionedGraph, PositionedNode } from '@/types/ai-diagram';
import { DefaultStyles } from './DefaultStyles';

export class EdgeMapper {
  /**
   * Converts a DiagramEdge into a native whiteboard 'line' Element.
   * Calculates boundary-to-boundary connections.
   */
  public static map(edge: DiagramEdge, graph: PositionedGraph): Element {
    const sourceNode = graph.nodes[edge.source];
    const targetNode = graph.nodes[edge.target];

    if (!sourceNode || !targetNode) {
      throw new Error(`[EdgeMapper] Edge ${edge.id} references invalid source or target`);
    }

    if (sourceNode.x === undefined || sourceNode.y === undefined || sourceNode.width === undefined || sourceNode.height === undefined) {
      throw new Error(`[EdgeMapper] Source node ${sourceNode.id} is missing layout positions`);
    }
    if (targetNode.x === undefined || targetNode.y === undefined || targetNode.width === undefined || targetNode.height === undefined) {
      throw new Error(`[EdgeMapper] Target node ${targetNode.id} is missing layout positions`);
    }

    const { startX, startY, endX, endY } = this.calculateBoundaryPoints(sourceNode, targetNode);

    // For the current whiteboard rendering engine, a 'line' element is drawn from 
    // (x, y) to (x + width, y + height).
    const x = startX;
    const y = startY;
    const width = endX - startX;
    const height = endY - startY;

    return {
      id: edge.id,
      type: 'line',
      x,
      y,
      width,
      height,
      ...DefaultStyles.edge,
      version: 0,
      text: edge.label,
      metadata: {
        diagramEdgeId: edge.id,
        sourceId: edge.source,
        targetId: edge.target
      }
    };
  }

  /**
   * Computes the best boundary connection points between two nodes based on their relative centers.
   */
  private static calculateBoundaryPoints(source: PositionedNode, target: PositionedNode) {
    const sCx = source.x! + source.width! / 2;
    const sCy = source.y! + source.height! / 2;
    const tCx = target.x! + target.width! / 2;
    const tCy = target.y! + target.height! / 2;

    const dx = tCx - sCx;
    const dy = tCy - sCy;

    let startX = sCx;
    let startY = sCy;
    let endX = tCx;
    let endY = tCy;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal orientation
      if (dx > 0) {
        // Target is to the right
        startX = source.x! + source.width!; // Source right-center
        endX = target.x!; // Target left-center
      } else {
        // Target is to the left
        startX = source.x!; // Source left-center
        endX = target.x! + target.width!; // Target right-center
      }
    } else {
      // Vertical orientation
      if (dy > 0) {
        // Target is below
        startY = source.y! + source.height!; // Source bottom-center
        endY = target.y!; // Target top-center
      } else {
        // Target is above
        startY = source.y!; // Source top-center
        endY = target.y! + target.height!; // Target bottom-center
      }
    }

    return { startX, startY, endX, endY };
  }
}
