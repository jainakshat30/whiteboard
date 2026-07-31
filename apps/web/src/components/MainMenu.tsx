'use client'

import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '@/store/scene'
import { UserAuthButton } from '@/components/UserAuthButton'

export function MainMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const clearElements = useSceneStore((s) => s.clearElements)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen && !isConfirmOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isConfirmOpen])

  return (
    <>
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition cursor-pointer shadow-sm border ${
            isOpen 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80' 
              : 'bg-white/95 dark:bg-neutral-900/95 border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          title="Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        {isOpen && (
          <div className="flex flex-col min-w-[200px] rounded-xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2 shadow-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 transition-all">
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" x2="10" y1="11" y2="17"/>
                <line x1="14" x2="14" y1="11" y2="17"/>
              </svg>
              Reset the canvas
            </button>
            
            <div className="my-2 h-px w-full bg-neutral-200 dark:bg-neutral-800" />
            
            <div className="px-2 pb-2 pt-1 flex justify-center">
              <UserAuthButton />
            </div>
          </div>
        )}
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Clear Canvas</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Are you sure you want to clear the canvas? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setIsConfirmOpen(false)
                  setIsOpen(false)
                }}
                className="px-4 py-2 text-sm font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearElements()
                  setIsConfirmOpen(false)
                  setIsOpen(false)
                }}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-red-500 hover:bg-red-600 text-white transition cursor-pointer shadow-sm"
              >
                Clear canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
