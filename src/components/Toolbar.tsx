'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToolStore, Tool } from '@/store/tools'
import { useConnectionStore, getBoardConnection } from '@/store/yjs'
import { useThemeStore } from '@/store/theme'
import { useSceneStore } from '@/store/scene'
import { getOnlineUsers, UserPresence } from '@/store/presence'

const tools: { id: Tool; label: string }[] = [
  { id: 'selection', label: 'Select' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'freedraw', label: 'Pen' },
]

export function Toolbar() {
  const boardId = useSceneStore((s) => s.boardId)
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)
  const status = useConnectionStore((s) => s.status)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const [users, setUsers] = useState<UserPresence[]>([])

  useEffect(() => {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    const awareness = provider.awareness
    if (!awareness) return

    function updateUsers() {
      setUsers(getOnlineUsers(boardId!))
    }

    updateUsers()
    awareness.on('change', updateUsers)
    return () => {
      awareness.off('change', updateUsers)
    }
  }, [boardId])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs p-2 shadow-lg border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 transition-colors">
      <Link
        href="/"
        className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        title="Back to Dashboard"
      >
        &larr; Dashboard
      </Link>

      <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

      <div className="flex gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              activeTool === tool.id
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition cursor-pointer text-xs flex items-center gap-1"
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>

      {users.length > 0 && (
        <>
          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div className="flex items-center gap-1.5">
            {users.map((u) => (
              <div
                key={u.clientId}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-medium"
                title={u.isDrawing ? `${u.name} is currently drawing` : `${u.name} (Online)`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: u.color }}
                />
                <span>{u.name}</span>
                {u.isDrawing && <span className="animate-pulse">✏️</span>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

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
        <span className="text-neutral-500 dark:text-neutral-400 capitalize">{status}</span>
      </div>
    </div>
  )
}