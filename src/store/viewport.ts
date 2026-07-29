import { create } from 'zustand'

type ViewportState = {
  zoom: number
  panX: number
  panY: number
  setZoom: (updater: number | ((prev: number) => number)) => void
  setPan: (updater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

export const useViewportStore = create<ViewportState>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  setZoom: (updater) =>
    set((state) => {
      const nextZoom = typeof updater === 'function' ? updater(state.zoom) : updater
      const clamped = Math.min(Math.max(nextZoom, 0.1), 5.0)
      return { zoom: clamped }
    }),
  setPan: (updater) =>
    set((state) => {
      const nextPan = typeof updater === 'function' ? updater({ x: state.panX, y: state.panY }) : updater
      return { panX: nextPan.x, panY: nextPan.y }
    }),
  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(+(state.zoom + 0.15).toFixed(2), 5.0),
    })),
  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(+(state.zoom - 0.15).toFixed(2), 0.1),
    })),
  resetZoom: () => set({ zoom: 1 }),
}))
