import { PositionedGraph } from '@/types/ai-diagram';
import { Element } from '@/types/elements';
import { DiagramMapper } from '../mapper/DiagramMapper';
import { useSceneStore } from '@/store/scene';

export interface InsertDiagramOptions {
  origin: { x: number; y: number };
  diagramId?: string;
}

export class DiagramCanvasIntegration {
  /**
   * Translates a semantic positioned graph into native whiteboard elements
   * and inserts them directly into the current whiteboard scene in a single transaction.
   */
  public static insertDiagram(graph: PositionedGraph, options: InsertDiagramOptions): Element[] {
    const diagramId = options.diagramId || crypto.randomUUID();
    
    // 1. Map to raw elements (with deterministic IDs preserved from DiagramNode)
    const rawElements = DiagramMapper.map(graph);
    
    // 2. ID collision and remapping
    // DiagramMapper preserves node IDs in `element.id`.
    // We must generate unique UUIDs for the canvas to prevent collisions.
    const idMap = new Map<string, string>(); // Maps original semantic ID -> unique UUID
    
    for (const el of rawElements) {
      idMap.set(el.id, crypto.randomUUID());
    }

    const finalElements: Element[] = rawElements.map(el => {
      // Create copy
      const finalEl = { ...el };

      // Apply UUID
      finalEl.id = idMap.get(el.id)!;
      
      // Update metadata with diagram instance ID and type
      finalEl.metadata = {
        ...finalEl.metadata,
        diagramId,
        diagramType: graph.type,
      };

      // If it's an edge (mapped to 'line'), remap its structural connections
      if (finalEl.type === 'line' && finalEl.metadata) {
        if (finalEl.metadata.sourceId) {
          finalEl.metadata.sourceId = idMap.get(finalEl.metadata.sourceId as string) || finalEl.metadata.sourceId;
        }
        if (finalEl.metadata.targetId) {
          finalEl.metadata.targetId = idMap.get(finalEl.metadata.targetId as string) || finalEl.metadata.targetId;
        }
      }

      // 3. Apply Origin offset
      finalEl.x += options.origin.x;
      finalEl.y += options.origin.y;

      return finalEl;
    });

    // 4. Insert into store (single transaction)
    useSceneStore.getState().addElements(finalElements);

    return finalElements;
  }

  /**
   * Updates an existing diagram atomically.
   * Maps the new PositionedGraph, applies the existing diagram's origin,
   * and replaces the old elements with the new ones in a single Yjs transaction.
   */
  public static updateDiagram(graph: PositionedGraph, diagramId: string, existingElements: Element[]): Element[] {
    // 1. Calculate existing origin
    let originX = 0;
    let originY = 0;
    
    if (existingElements.length > 0) {
      originX = Math.min(...existingElements.map(e => e.x));
      originY = Math.min(...existingElements.map(e => e.y));
    }

    // 2. Map to raw elements
    const rawElements = DiagramMapper.map(graph);
    
    // 3. ID collision and remapping (preserve existing mapper UUID strategy)
    const idMap = new Map<string, string>();
    for (const el of rawElements) {
      idMap.set(el.id, crypto.randomUUID());
    }

    const finalElements: Element[] = rawElements.map(el => {
      const finalEl = { ...el };
      finalEl.id = idMap.get(el.id)!;
      
      finalEl.metadata = {
        ...finalEl.metadata,
        diagramId,
        diagramType: graph.type,
      };

      if (finalEl.type === 'line' && finalEl.metadata) {
        if (finalEl.metadata.sourceId) {
          finalEl.metadata.sourceId = idMap.get(finalEl.metadata.sourceId as string) || finalEl.metadata.sourceId;
        }
        if (finalEl.metadata.targetId) {
          finalEl.metadata.targetId = idMap.get(finalEl.metadata.targetId as string) || finalEl.metadata.targetId;
        }
      }

      // Apply Origin offset
      finalEl.x += originX;
      finalEl.y += originY;

      return finalEl;
    });

    // 4. Atomic Replacement in Scene Store
    const oldElementIds = existingElements.map(e => e.id);
    useSceneStore.getState().replaceElements(oldElementIds, finalElements);

    return finalElements;
  }
}
