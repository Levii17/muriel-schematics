import { useEffect, useState } from 'react'

/** Whether a CSS media query currently matches, kept up to date as the window or device changes. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/** True when the main way of pointing is a finger, so on-screen controls stand in for keys and hover. */
export const useCoarsePointer = () => useMedia('(pointer: coarse)')
