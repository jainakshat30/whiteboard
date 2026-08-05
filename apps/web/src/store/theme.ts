import { create } from 'zustand'

export type Theme = 'light' | 'dark'

type ThemeState = {
  theme: Theme
  canvasBackgroundLight: string
  canvasBackgroundDark: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setCanvasBackgroundLight: (color: string) => void
  setCanvasBackgroundDark: (color: string) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  canvasBackgroundLight: '#ffffff',
  canvasBackgroundDark: '#121212',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    set({ theme })
  },
  toggleTheme: () => {
    const current = get().theme
    const next = current === 'light' ? 'dark' : 'light'
    get().setTheme(next)
  },
  setCanvasBackgroundLight: (color) => {
    if (typeof window !== 'undefined') localStorage.setItem('canvasBgLight', color)
    set({ canvasBackgroundLight: color })
  },
  setCanvasBackgroundDark: (color) => {
    if (typeof window !== 'undefined') localStorage.setItem('canvasBgDark', color)
    set({ canvasBackgroundDark: color })
  },
  initTheme: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved || (prefersDark ? 'dark' : 'light')
    
    const bgLight = localStorage.getItem('canvasBgLight') || '#ffffff'
    const bgDark = localStorage.getItem('canvasBgDark') || '#121212'
    
    set({ theme: initial, canvasBackgroundLight: bgLight, canvasBackgroundDark: bgDark })
  },
}))

export function getAdaptiveStrokeColor(strokeColor: string, theme: Theme): string {
  const isDefaultDarkStroke = !strokeColor || strokeColor === '#1e1e1e' || strokeColor === '#000000' || strokeColor === '#111827'
  const isDefaultLightStroke = strokeColor === '#f3f4f6' || strokeColor === '#ffffff'

  if (theme === 'dark' && isDefaultDarkStroke) {
    return '#f3f4f6'
  }
  if (theme === 'light' && isDefaultLightStroke) {
    return '#1e1e1e'
  }
  return strokeColor
}
