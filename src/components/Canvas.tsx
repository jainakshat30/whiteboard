'use client'

import { useEffect, useRef } from 'react'
import { useSceneStore } from '@/store/scene'
import { useToolStore } from '@/store/tools'
import { Element, createElement } from '@/types/elements'


export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef<{ 
    id: string
    startX: number
    startY: number
    mode: 'draw' | 'move'
    origX?: number
    origY?: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resizeCanvas() {
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      // Internal resolution = CSS size * device pixel ratio
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      // Scale the context so drawing commands use CSS pixel units,
      // not raw device pixels
      ctx.scale(dpr, dpr)

      render()
    }
    function drawElement(ctx: CanvasRenderingContext2D, el: Element) {
        ctx.strokeStyle = el.strokeColor
        ctx.fillStyle = el.fillColor
        ctx.lineWidth = 2

        if (el.type === 'rectangle') {
            ctx.fillRect(el.x, el.y, el.width, el.height)
            ctx.strokeRect(el.x, el.y, el.width, el.height)
        } else if (el.type === 'ellipse') {
            ctx.beginPath()
            ctx.ellipse(
            el.x + el.width / 2,
            el.y + el.height / 2,
            Math.abs(el.width / 2),
            Math.abs(el.height / 2),
            0, 0, Math.PI * 2
            )
            ctx.fill()
            ctx.stroke()
        }
    }

    function render() {
        if (!ctx || !canvas) return
        const dpr = window.devicePixelRatio || 1
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

        const elements = useSceneStore.getState().elements
        for (const el of elements) {
            drawElement(ctx, el)
        }

        const selectedId = useSceneStore.getState().selectedId
        const selected = elements.find((el) => el.id === selectedId)
        if (selected) {
            ctx.strokeStyle = '#4f46e5'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.strokeRect(selected.x - 4, selected.y - 4, selected.width + 8, selected.height + 8)
            ctx.setLineDash([])
        }
    }

    const unsubscribe = useSceneStore.subscribe(() => render())

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      unsubscribe()
    }
  }, [])

  function hitTest(x: number, y: number): Element | null {
    const elements = useSceneStore.getState().elements
    // Check in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el
      }
    }
    return null
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const tool = useToolStore.getState().activeTool
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'rectangle' || tool === 'ellipse') {
      const el = createElement({
        type: tool,
        x, y, width: 0, height: 0,
        strokeColor: '#1e1e1e',
        fillColor: 'transparent',
      })
      useSceneStore.getState().addElement(el)
      draggingRef.current = { id: el.id, startX: x, startY: y, mode: 'draw' }
      return
    }

    if (tool === 'selection') {
      const hit = hitTest(x, y)
      if (hit) {
        useSceneStore.getState().setSelectedId(hit.id)
        draggingRef.current = { id: hit.id, startX: x, startY: y, mode: 'move', origX: hit.x, origY: hit.y }
      } else {
        useSceneStore.getState().setSelectedId(null)
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current
    if (!drag) return

    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (drag.mode === 'draw') {
      useSceneStore.getState().updateElement(drag.id, {
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        width: Math.abs(x - drag.startX),
        height: Math.abs(y - drag.startY),
      })
    } else if (drag.mode === 'move') {
      const dx = x - drag.startX
      const dy = y - drag.startY
      useSceneStore.getState().updateElement(drag.id, {
        x: drag.origX! + dx,
        y: drag.origY! + dy,
      })
    }
  }

  function handlePointerUp() {
    draggingRef.current = null
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ width: '100vw', height: '100vh', display: 'block', touchAction: 'none' }}
    />
  )
}