import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const attr = document.documentElement.dataset.theme
    return attr === 'light' || attr === 'dark' ? attr : systemTheme()
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('es.theme', next)
      } catch {
        /* storage unavailable: theme just won't persist */
      }
      return next
    })
  }, [])
  return [theme, toggle]
}
