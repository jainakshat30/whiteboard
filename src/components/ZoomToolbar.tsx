'use client'

import { useViewportStore } from '@/store/viewport'

export function ZoomToolbar() {
  const zoom = useViewportStore((s) => s.zoom)
  const zoomIn = useViewportStore((s) => s.zoomIn)
  const zoomOut = useViewportStore((s) => s.zoomOut)
  const resetZoom = useViewportStore((s) => s.resetZoom)

  const percentage = Math.round(zoom * 100)

  return (
    <div className="fixed bottom-4 left-4 z-20 flex items-center gap-1 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-1.5 shadow-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 transition-all text-xs font-semibold select-none">
      <button
        onClick={zoomOut}
        title="Zoom Out (−)"
        className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer text-base"
      >
        −
      </button>

      <button
        onClick={resetZoom}
        title="Reset Zoom to 100%"
        className="px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer min-w-[52px] text-center"
      >
        {percentage}%
      </button>

      <button
        onClick={zoomIn}
        title="Zoom In (+)"
        className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer text-base"
      >
        +
      </button>
    </div>
  )
}
