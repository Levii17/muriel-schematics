import { useSyncExternalStore } from 'react'

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
