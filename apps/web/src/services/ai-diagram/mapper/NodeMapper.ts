import { Element } from '@/types/elements';
import { PositionedNode } from '@/types/ai-diagram';
import { ShapeFactory } from './ShapeFactory';
import { DefaultStyles } from './DefaultStyles';

export class NodeMapper {
  /**
   * Converts a PositionedNode into a native whiteboard Element.
   * Ensures immutability of the input and purity of mapping.
   */
  public static map(node: PositionedNode): Element {
    if (node.x === undefined || node.y === undefined || node.width === undefined || node.height === undefined) {
      throw new Error(`[NodeMapper] Missing layout positions/dimensions on node ${node.id}`);
    }

    const type = ShapeFactory.getShape(node.type);
    
    // Select specific styles based on whether it is a group container or regular node
    const style = node.type === 'group' ? DefaultStyles.group : DefaultStyles.node;

    return {
      id: node.id,
      type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      ...style,
      version: 0,
      text: node.label,
      metadata: {
        diagramNodeId: node.id,
        diagramNodeType: node.type,
      }
    };
  }
}
