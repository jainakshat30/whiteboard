import { ElementType } from '@/types/elements';

/**
 * ShapeFactory maps semantic diagram node types (e.g., 'process', 'decision')
 * to native whiteboard ElementTypes (e.g., 'rectangle', 'diamond').
 * 
 * It uses a registry pattern to satisfy the Open/Closed Principle, allowing
 * new node types to be supported dynamically without modifying a switch statement.
 */
export class ShapeFactory {
  private static registry = new Map<string, ElementType>([
    ['process', 'rectangle'],
    ['decision', 'diamond'],
    ['database', 'rectangle'], // Fallback since no cylinder exists
    ['actor', 'rectangle'],    // Fallback since no actor shape exists
    ['start', 'ellipse'],
    ['end', 'ellipse'],
    ['group', 'rectangle'],
    ['step', 'rectangle'],
    ['condition', 'diamond'],
  ]);

  /**
   * Registers a new shape mapping.
   */
  public static registerShape(diagramNodeType: string, elementType: ElementType): void {
    this.registry.set(diagramNodeType, elementType);
  }

  /**
   * Resolves a diagram node type to a native ElementType.
   * If the type is unknown, it falls back to 'rectangle' and emits a warning.
   */
  public static getShape(diagramNodeType: string): ElementType {
    const shape = this.registry.get(diagramNodeType);
    if (!shape) {
      console.warn(`[ShapeFactory] Unknown DiagramNodeType '${diagramNodeType}'. Falling back to 'rectangle'.`);
      return 'rectangle';
    }
    return shape;
  }
}
