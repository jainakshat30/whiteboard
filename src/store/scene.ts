import { create } from 'zustand'
import { ydoc, yElements } from './yjs'
import { Element } from '@/types/elements'

type SceneState = {
  elements: Element[]
  selectedId: string | null
  addElement: (el: Element) => void
  removeElement: (id: string) => void
  updateElement: (id: string, patch: Partial<Element>) => void
  setSelectedId: (id: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  elements: [],
  selectedId: null,
  addElement: (el) => {
    ydoc.transact(() => {
      yElements.set(el.id, el)
    })
  },
  removeElement: (id) => {
    ydoc.transact(() => {
      yElements.delete(id)
    })

    set((state) => ({
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },
  updateElement: (id, patch) => {
    ydoc.transact(() => {
      const existing = yElements.get(id)
      if (!existing) return
      yElements.set(id, { ...existing, ...patch, version: existing.version + 1 })
    })
  },
  setSelectedId: (id) => set({ selectedId: id }),
}))

function syncElementsFromYjs() {
  useSceneStore.setState({ elements: Array.from(yElements.values()) })
}

yElements.observe(syncElementsFromYjs)
syncElementsFromYjs()