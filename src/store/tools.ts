import { create } from 'zustand'

export type Tool = 'selection' | 'rectangle' | 'ellipse'

type ToolState = {
  activeTool: Tool
  setTool: (tool: Tool) => void
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'rectangle',
  setTool: (tool) => set({ activeTool: tool }),
}))