import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'brasil-medido-theme'

/** The visitor's saved choice, else the operating system's preference. */
function initial(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useThemeState() {
  const [theme, setTheme] = useState<Theme>(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a1224' : '#1d3fa8')
  }, [theme])
  const toggle = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(KEY, next)
      return next
    })
  return { theme, toggle }
}

export const ThemeContext = createContext<Theme>('light')
export const useTheme = () => useContext(ThemeContext)
