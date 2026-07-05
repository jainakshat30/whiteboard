import { create } from 'zustand'
import { Element } from '@/types/elements'

type SceneState = {
  elements: Element[]
  selectedId: string | null
  addElement: (el: Element) => void
  updateElement: (id: string, patch: Partial<Element>) => void
  setSelectedId: (id: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  elements: [],
  selectedId: null,
  addElement: (el) =>
    set((state) => ({ elements: [...state.elements, el] })),
  updateElement: (id, patch) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...patch, version: el.version + 1 } : el
      ),
    })),
  setSelectedId: (id) => set({ selectedId: id }),
}))