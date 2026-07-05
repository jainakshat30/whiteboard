'use client'

import { useEffect, useRef } from 'react'
import { useSceneStore } from '@/store/scene'
import { Element, createElement } from '@/types/elements'


export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef<{ id: string; startX: number; startY: number } | null>(null)

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
    }

    const unsubscribe = useSceneStore.subscribe(() => render())

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      unsubscribe()
    }
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const el = createElement({
      type: 'rectangle',
      x, y, width: 0, height: 0,
      strokeColor: '#1e1e1e',
      fillColor: 'transparent',
    })

    useSceneStore.getState().addElement(el)
    draggingRef.current = { id: el.id, startX: x, startY: y }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current
    if (!drag) return

    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    useSceneStore.getState().updateElement(drag.id, {
      x: Math.min(drag.startX, x),
      y: Math.min(drag.startY, y),
      width: Math.abs(x - drag.startX),
      height: Math.abs(y - drag.startY),
    })
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