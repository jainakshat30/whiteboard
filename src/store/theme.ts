import { create } from 'zustand'

export type Theme = 'light' | 'dark'

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
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
  initTheme: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved || (prefersDark ? 'dark' : 'light')
    get().setTheme(initial)
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
