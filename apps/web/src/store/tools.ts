import { create } from 'zustand'

export type Tool = 'hand' | 'selection' | 'rectangle' | 'ellipse' | 'freedraw' | 'line' | 'diamond' | 'eraser'

type ToolState = {
  activeTool: Tool
  setTool: (tool: Tool) => void
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'selection',
  setTool: (tool) => set({ activeTool: tool }),
}))