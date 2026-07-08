import { create } from 'zustand'
import { getBoardConnection } from './yjs'
import { Element } from '@/types/elements'

type SceneState = {
  boardId: string | null
  elements: Element[]
  selectedId: string | null
  initBoard: (boardId: string) => void
  addElement: (element: Element) => void
  updateElement: (id: string, patch: Partial<Element>) => void
  removeElement: (id: string) => void
  setSelectedId: (id: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  boardId: null,
  elements: [],
  selectedId: null,
  initBoard: (boardId) => {
    if (useSceneStore.getState().boardId === boardId) {
      return
    }

    const { yElements } = getBoardConnection(boardId)

    useSceneStore.setState({
      boardId,
      elements: Array.from(yElements.values()),
      selectedId: null,
    })

    yElements.observe(() => {
      useSceneStore.setState({
        elements: Array.from(yElements.values()),
      })
    })
  },
  addElement: (el) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      yElements.set(el.id, el)
    })
  },
  removeElement: (id) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return

    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      yElements.delete(id)
    })

    set((state) => ({
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },
  updateElement: (id, patch) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return

    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const existing = yElements.get(id)
      if (!existing) return
      yElements.set(id, { ...existing, ...patch, version: existing.version + 1 })
    })
  },
  setSelectedId: (id) => set({ selectedId: id }),
}))