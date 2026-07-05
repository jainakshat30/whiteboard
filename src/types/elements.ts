export type ElementType = 'line' | 'rectangle' | 'circle' | 'text' | 'ellipse';

export type Element = {
    id: string
    type: ElementType
    x: number       // top-left corner, in world space
    y: number
    width: number
    height: number
    strokeColor: string
    fillColor: string
    version: number // bumped on every edit — useful later for sync/undo
}

export function createElement(partial: Omit<Element, 'id' | 'version'>): Element {
  return {
    id: crypto.randomUUID(),
    version: 0,
    ...partial,
  }
}