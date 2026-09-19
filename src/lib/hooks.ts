import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/* ---------------- hash router ---------------- */

export type Route =
  | { name: 'library'; symbol: string | null }
  | { name: 'editor'; arm: string | null; example: boolean }

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, query = ''] = raw.split('?')
  if (pathPart === 'editor') {
    const q = new URLSearchParams(query)
    return { name: 'editor', arm: q.get('arm'), example: q.get('example') === 'dol' }
  }
  if (pathPart.startsWith('s/')) return { name: 'library', symbol: decodeURIComponent(pathPart.slice(2)) }
  return { name: 'library', symbol: null }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const getHash = () => window.location.hash

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return parseRoute(hash)
}

export const navigate = (to: string) => {
  window.location.hash = to
}

/* ---------------- theme ---------------- */

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

/* ---------------- toast ---------------- */

export function useToast(): [string, (msg: string) => void] {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((msg: string) => {
    setMessage(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), 2200)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [message, show]
}

/* ---------------- persisted state ---------------- */

export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
