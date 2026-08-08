export type ElementType = 'line' | 'rectangle' | 'circle' | 'text' | 'ellipse' | 'freedraw' | 'diamond';

export interface ElementMetadata {
  diagramNodeId?: string;
  diagramNodeType?: string;
  [key: string]: unknown;
}

export type Element = {
    id: string
    type: ElementType
    x: number       // top-left corner, in world space
    y: number
    width: number
    height: number
    strokeColor: string
    fillColor: string
    strokeWidth?: number
    strokeStyle?: 'solid' | 'dashed' | 'dotted'
    roughness?: number
    roundness?: 'sharp' | 'round'
    opacity?: number
    zIndex?: number
    points?: { x: number; y: number }[]
    version: number // bumped on every edit — useful later for sync/undo
    text?: string
    metadata?: ElementMetadata
}

export function createElement(partial: Omit<Element, 'id' | 'version'>): Element {
  return {
    id: crypto.randomUUID(),
    version: 0,
    ...partial,
  }
}