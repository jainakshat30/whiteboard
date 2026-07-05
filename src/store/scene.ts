import { create } from 'zustand'
import { Element } from '@/types/elements'

type SceneState = {
  elements: Element[]
  addElement: (el: Element) => void
  updateElement: (id: string, patch: Partial<Element>) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  elements: [],
  addElement: (el) =>
    set((state) => ({ elements: [...state.elements, el] })),
  updateElement: (id, patch) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...patch, version: el.version + 1 } : el
      ),
    })),
}))