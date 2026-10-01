import { useCallback, useEffect, useRef, useState } from 'react'

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
