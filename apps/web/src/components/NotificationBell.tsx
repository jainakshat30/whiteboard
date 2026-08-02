'use client'

import { useState } from 'react'
import { useNotificationStore } from '@/store/notifications'
import { useSceneStore } from '@/store/scene'
import { getBoardConnection } from '@/store/yjs'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const pendingRequests = useNotificationStore((s) => s.pendingRequests)
  const boardId = useSceneStore((s) => s.boardId)

  function handleApprove(userId: string) {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    provider.sendStateless(JSON.stringify({ type: 'approve_access', userId }))
  }

  function handleDeny(userId: string) {
    if (!boardId) return
    const { provider } = getBoardConnection(boardId)
    provider.sendStateless(JSON.stringify({ type: 'deny_access', userId }))
  }

  const badgeCount = pendingRequests.length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer border border-transparent"
        title="Access Request Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-80 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xl p-4 z-50 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Access Requests
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">
                {badgeCount}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto flex flex-col gap-2.5">
            {pendingRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                No pending access requests
              </div>
            ) : (
              pendingRequests.map((req) => {
                const initials = (req.userName || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={req.userId}
                    className="flex flex-col gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {req.userName}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Just now
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req.userId)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(req.userId)}
                        className="flex-1 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
