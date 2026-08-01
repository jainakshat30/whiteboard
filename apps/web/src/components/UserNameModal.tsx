'use client'

import { useState, useEffect } from 'react'
import { initializePresence, getSavedUserName } from '@/store/presence'
import { useSession } from 'next-auth/react'

export function UserNameModal({ boardId }: { boardId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user?.name) {
      initializePresence(boardId, session.user.name)
      setIsOpen(false)
      return
    }

    const saved = getSavedUserName()
    if (!saved) {
      setIsOpen(true)
    } else {
      initializePresence(boardId, saved)
    }
  }, [boardId, session, status])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    initializePresence(boardId, trimmed)
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-3 text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Join Whiteboard Session
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enter your name so collaborators know who is drawing.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Alex"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition cursor-pointer"
          >
            Join Board &rarr;
          </button>
        </form>
      </div>
    </div>
  )
}
