'use client'

import Link from 'next/link'
import { useToolStore, Tool } from '@/store/tools'
import { useConnectionStore } from '@/store/yjs'

const tools: { id: Tool; label: string }[] = [
  { id: 'selection', label: 'Select' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'freedraw', label: 'Pen' },
]

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)
  const status = useConnectionStore((s) => s.status)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl bg-white/95 backdrop-blur-xs p-2 shadow-lg border border-neutral-200">
      <Link
        href="/"
        className="flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition"
        title="Back to Dashboard"
      >
        &larr; Dashboard
      </Link>

      <div className="h-5 w-px bg-neutral-200" />

      <div className="flex gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              activeTool === tool.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-neutral-200" />

      <div className="flex items-center gap-1.5 px-2 text-xs font-medium">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500 animate-pulse'
              : status === 'connecting'
              ? 'bg-amber-500 animate-ping'
              : 'bg-red-500'
          }`}
        />
        <span className="text-neutral-500 capitalize">{status}</span>
      </div>
    </div>
  )
}