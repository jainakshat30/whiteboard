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
  clearElements: () => void
  setSelectedId: (id: string | null) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
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
      elements: Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
      selectedId: null,
    })

    yElements.observe(() => {
      useSceneStore.setState({
        elements: Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
      })
    })
  },
  addElement: (el) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const maxZIndex = Array.from(yElements.values()).reduce((max, e) => Math.max(max, e.zIndex || 0), 0)
      el.zIndex = maxZIndex + 1
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
  clearElements: () => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return

    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      Array.from(yElements.keys()).forEach((key) => yElements.delete(key))
    })

    set({ selectedId: null })
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
  bringToFront: (id) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const el = yElements.get(id)
      if (!el) return
      const maxZ = Array.from(yElements.values()).reduce((max, e) => Math.max(max, e.zIndex || 0), 0)
      if ((el.zIndex || 0) < maxZ) {
        yElements.set(id, { ...el, zIndex: maxZ + 1, version: el.version + 1 })
      }
    })
  },
  sendToBack: (id) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const el = yElements.get(id)
      if (!el) return
      const minZ = Array.from(yElements.values()).reduce((min, e) => Math.min(min, e.zIndex || 0), 0)
      if ((el.zIndex || 0) > minZ) {
        yElements.set(id, { ...el, zIndex: minZ - 1, version: el.version + 1 })
      }
    })
  },
  bringForward: (id) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const el = yElements.get(id)
      if (!el) return
      const allEls = Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      const idx = allEls.findIndex((e) => e.id === id)
      if (idx >= 0 && idx < allEls.length - 1) {
        const nextEl = allEls[idx + 1]
        const currentZ = el.zIndex || 0
        const nextZ = nextEl.zIndex || 0
        yElements.set(id, { ...el, zIndex: nextZ, version: el.version + 1 })
        yElements.set(nextEl.id, { ...nextEl, zIndex: currentZ, version: nextEl.version + 1 })
      }
    })
  },
  sendBackward: (id) => {
    const boardId = useSceneStore.getState().boardId
    if (!boardId) return
    const { ydoc, yElements } = getBoardConnection(boardId)
    ydoc.transact(() => {
      const el = yElements.get(id)
      if (!el) return
      const allEls = Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      const idx = allEls.findIndex((e) => e.id === id)
      if (idx > 0) {
        const prevEl = allEls[idx - 1]
        const currentZ = el.zIndex || 0
        const prevZ = prevEl.zIndex || 0
        yElements.set(id, { ...el, zIndex: prevZ, version: el.version + 1 })
        yElements.set(prevEl.id, { ...prevEl, zIndex: currentZ, version: prevEl.version + 1 })
      }
    })
  },
}))