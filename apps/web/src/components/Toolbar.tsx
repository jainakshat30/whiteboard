'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToolStore, Tool } from '@/store/tools'
import { useConnectionStore, getBoardConnection } from '@/store/yjs'
import { useThemeStore } from '@/store/theme'
import { useSceneStore } from '@/store/scene'
import { getOnlineUsers, UserPresence, getSavedUserName } from '@/store/presence'

type ToolConfig = {
  id: Tool
  label: string
  shortcut: string
  icon: React.ReactNode
}

const tools: ToolConfig[] = [
  {
    id: 'hand',
    label: 'Hand (Pan)',
    shortcut: 'H',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6V6a1.5 1.5 0 013 0m0 0V4.5a1.5 1.5 0 113 0m-3 0V12m3-7.5V6a1.5 1.5 0 013 0m0 0v6a6 6 0 01-6 6H9.5a6 6 0 01-6-6v-1.5a1.5 1.5 0 013 0V11.5" />
      </svg>
    ),
  },
  {
    id: 'selection',
    label: 'Selection',
    shortcut: '1',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    shortcut: '2',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    shortcut: '3',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    id: 'freedraw',
    label: 'Pen',
    shortcut: '4',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    shortcut: '5',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <line x1="5" y1="19" x2="19" y2="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'diamond',
    label: 'Diamond',
    shortcut: '6',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12 3 21 12 12 21 3 12" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortcut: '7',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    ),
  },
]

export function Toolbar() {
  const boardId = useSceneStore((s) => s.boardId)
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)
  const status = useConnectionStore((s) => s.status)
  const userRole = useConnectionStore((s) => s.userRole)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const [users, setUsers] = useState<UserPresence[]>([])
  const [accessRequests, setAccessRequests] = useState<{userId: string, userName: string}[]>([])

  useEffect(() => {
    function handleAccessRequest(e: Event) {
      const detail = (e as CustomEvent).detail
      setAccessRequests(prev => {
        if (prev.find(req => req.userId === detail.userId)) return prev
        return [...prev, detail]
      })
    }
    window.addEventListener('hocuspocus:access_requested', handleAccessRequest)
    return () => window.removeEventListener('hocuspocus:access_requested', handleAccessRequest)
  }, [])

  function handleRequestAccess() {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    const savedName = getSavedUserName() || 'Someone'
    provider.sendStateless(JSON.stringify({ type: 'request_access', userName: savedName }))
    alert('Access request sent to the Host!')
  }

  function handleApprove(userId: string) {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    provider.sendStateless(JSON.stringify({ type: 'approve_access', userId }))
    setAccessRequests(prev => prev.filter(r => r.userId !== userId))
  }

  function handleDeny(userId: string) {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    provider.sendStateless(JSON.stringify({ type: 'deny_access', userId }))
    setAccessRequests(prev => prev.filter(r => r.userId !== userId))
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = e.key.toLowerCase()
      const tool = tools.find((t) => t.shortcut.toLowerCase() === key)
      if (tool) {
        e.preventDefault()
        setTool(tool.id)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool])

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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-1.5 shadow-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 transition-all">
      <Link
        href="/"
        className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        title="Back to Dashboard"
      >
        &larr; Dashboard
      </Link>

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

      <div className="flex gap-1">
        {tools.filter(t => userRole !== 'AUDIENCE' || t.id === 'hand').map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition cursor-pointer ${
              activeTool === t.id
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent'
            }`}
          >
            {t.icon}
            <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-60 select-none">
              {t.shortcut}
            </span>
          </button>
        ))}
      </div>
      
      {userRole === 'AUDIENCE' && (
        <button
          onClick={handleRequestAccess}
          className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          Request Drawing Access
        </button>
      )}

      {userRole === 'HOST' && accessRequests.length > 0 && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-4">
          <h4 className="text-sm font-bold mb-2">Access Requests</h4>
          {accessRequests.map(req => (
            <div key={req.userId} className="flex flex-col gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <span className="text-sm font-medium">{req.userName} wants to draw</span>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(req.userId)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-1 text-xs font-semibold">Approve</button>
                <button onClick={() => handleDeny(req.userId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded py-1 text-xs font-semibold">Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

      <button
        onClick={toggleTheme}
        className="flex items-center justify-center px-2.5 h-9 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition cursor-pointer text-xs gap-1"
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {users.length > 0 && (
        <>
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />
          <div className="flex items-center gap-1.5 px-1">
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

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

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
        <span className="text-neutral-500 dark:text-neutral-400 capitalize hidden sm:inline">{status}</span>
      </div>
    </div>
  )
}