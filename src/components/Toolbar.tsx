'use client'

import { useToolStore, Tool } from '@/store/tools'

const tools: { id: Tool; label: string }[] = [
  { id: 'selection', label: 'Select' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
]

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, background: 'white', padding: 8,
      borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10,
    }}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setTool(tool.id)}
          style={{
            padding: '6px 12px',
            background: activeTool === tool.id ? '#4f46e5' : 'transparent',
            color: activeTool === tool.id ? 'white' : 'black',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          {tool.label}
        </button>
      ))}
    </div>
  )
}