import { create } from 'zustand'

export type Tool = 'hand' | 'selection' | 'rectangle' | 'ellipse' | 'freedraw' | 'line' | 'diamond' | 'eraser' | 'text'

type ToolState = {
  activeTool: Tool
  setTool: (tool: Tool) => void
  strokeColor: string
  fillColor: string
  strokeWidth: number
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  roughness: number
  roundness: 'sharp' | 'round'
  opacity: number
  fontFamily: string
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  setStyle: (style: Partial<ToolState>) => void
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'selection',
  setTool: (tool) => set({ activeTool: tool }),
  strokeColor: '#1e1e1e', // default dark, will be adjusted on draw based on theme if needed, or explicitly set by user
  fillColor: 'transparent',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  roundness: 'sharp',
  opacity: 100,
  fontFamily: 'sans-serif',
  fontSize: 20,
  textAlign: 'left',
  setStyle: (style) => set((state) => ({ ...state, ...style })),
}))