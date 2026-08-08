'use client'

import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '@/store/scene'
import { useThemeStore } from '@/store/theme'
import { UserAuthButton } from '@/components/UserAuthButton'
import { DiagramEngine } from '@/services/ai-diagram/DiagramEngine'
import { ElkLayoutEngine } from '@/services/ai-diagram/layout/ElkLayoutEngine'
import { DiagramCanvasIntegration } from '@/services/ai-diagram/integration/DiagramCanvasIntegration'
import { VerticalFlowStrategy } from '@/services/ai-diagram/layout/strategies/VerticalFlowStrategy'
import { AiDiagramModal } from './AiDiagramModal'

export function MainMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const clearElements = useSceneStore((s) => s.clearElements)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const canvasBackgroundLight = useThemeStore((s) => s.canvasBackgroundLight)
  const canvasBackgroundDark = useThemeStore((s) => s.canvasBackgroundDark)
  const setCanvasBackgroundLight = useThemeStore((s) => s.setCanvasBackgroundLight)
  const setCanvasBackgroundDark = useThemeStore((s) => s.setCanvasBackgroundDark)

  const lightColors = ["#ffffff", "#f8f9fa", "#f0f4f8", "#fffbeb", "#fff1f2"]
  const darkColors = ["#121212", "#1e1e1e", "#1e293b", "#2a2411", "#2a1616"]

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
              onClick={() => {
                setIsOpen(false)
                setIsAiModalOpen(true)
              }}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition cursor-pointer mb-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M20 12h2"/><path d="m17.66 17.66 1.41 1.41"/><path d="M12 20v2"/><path d="m4.93 19.07 1.41-1.41"/><path d="M2 12h2"/><path d="m6.34 6.34 1.41 1.41"/>
              </svg>
              Generate with AI
            </button>
            
            <div className="my-1 h-px w-full bg-neutral-200 dark:bg-neutral-800" />

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
            
            <button
              onClick={async () => {
                setIsOpen(false)
                
                const engine = new DiagramEngine('FLOWCHART')
                
                engine.addNode({ id: 'start', type: 'start', label: 'Start' })
                engine.addNode({ id: 'process', type: 'process', label: 'Process' })
                engine.addNode({ id: 'decision', type: 'decision', label: 'Decision' })
                engine.addNode({ id: 'success', type: 'step', label: 'Success' })
                engine.addNode({ id: 'error', type: 'step', label: 'Error' })
                
                engine.addEdge({ id: 'e1', source: 'start', target: 'process' })
                engine.addEdge({ id: 'e2', source: 'process', target: 'decision' })
                engine.addEdge({ id: 'e3', source: 'decision', target: 'success', label: 'Yes' })
                engine.addEdge({ id: 'e4', source: 'decision', target: 'error', label: 'No' })
                
                const graph = engine.getGraph()
                
                const layoutEngine = new ElkLayoutEngine(new VerticalFlowStrategy())
                const positionedGraph = await layoutEngine.layout(graph, {
                  direction: 'TB',
                  horizontalSpacing: 50,
                  verticalSpacing: 50
                })
                
                DiagramCanvasIntegration.insertDiagram(positionedGraph, {
                  origin: { x: 400, y: 100 }
                })
              }}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18"/><path d="m5 10 7-7 7 7"/>
              </svg>
              Test Diagram (Phase 4)
            </button>
            
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                </svg>
              )}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            
            <div className="my-2 h-px w-full bg-neutral-200 dark:bg-neutral-800" />
            
            <div className="px-3 py-2 flex flex-col gap-3">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Canvas background
              </span>
              <div className="flex items-center gap-2">
                {(theme === 'light' ? lightColors : darkColors).map((color) => {
                  const isActive = theme === 'light' ? canvasBackgroundLight === color : canvasBackgroundDark === color;
                  return (
                    <button
                      key={color}
                      onClick={() => theme === 'light' ? setCanvasBackgroundLight(color) : setCanvasBackgroundDark(color)}
                      className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 border ${
                        isActive 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' 
                          : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Background ${color}`}
                    />
                  )
                })}
              </div>
            </div>

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

      <AiDiagramModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
      />
    </>
  )
}
