import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { CheckIcon } from '@/shared/Icons'

export type MenuEntry =
  | { label: string; onSelect: () => void; disabled?: boolean; hint?: string; checked?: boolean }
  | 'separator'

const WIDTH = 236
const GAP = 6
const EDGE = 8

/**
 * A button that opens a small menu. The menu is positioned against the screen rather than the button's
 * container, so it is never clipped by a toolbar that scrolls, and it opens upward when the button is low
 * on the screen (a toolbar at the bottom of a phone). Escape, a tap outside or a choice closes it.
 */
export function Menu({ label, buttonClass, children, entries }: { label: string; buttonClass: string; children: ReactNode; entries: MenuEntry[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; maxHeight: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const byKeyboard = useRef(false)

  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect()
    if (!r) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = Math.min(Math.max(EDGE, r.right - WIDTH), vw - WIDTH - EDGE)
    const up = r.top > vh / 2
    setPos(
      up
        ? { left, bottom: vh - r.top + GAP, maxHeight: r.top - GAP - EDGE }
        : { left, top: r.bottom + GAP, maxHeight: vh - r.bottom - GAP - EDGE },
    )
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!pop.current?.contains(t) && !button.current?.contains(t)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  useEffect(() => {
    if (open && byKeyboard.current) pop.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [open, pos])

  const move = (e: React.KeyboardEvent, dir: 1 | -1) => {
    e.preventDefault()
    const items = [...(pop.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(at + dir + items.length) % items.length]?.focus()
  }

  return (
    <>
      <button
        ref={button}
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          byKeyboard.current = e.detail === 0
          setOpen((o) => !o)
        }}
      >
        {children}
      </button>
      {open && (
        <div
          ref={pop}
          className="menu-pop"
          role="menu"
          aria-label={label}
          style={{ position: 'fixed', left: pos?.left ?? 0, top: pos?.top, bottom: pos?.bottom, width: WIDTH, maxHeight: pos?.maxHeight, visibility: pos ? 'visible' : 'hidden' }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') move(e, 1)
            else if (e.key === 'ArrowUp') move(e, -1)
          }}
        >
          {entries.map((en, i) =>
            en === 'separator' ? (
              <hr key={i} className="menu-sep" />
            ) : (
              <button
                key={i}
                role="menuitem"
                className="menu-item"
                disabled={en.disabled}
                onClick={() => {
                  setOpen(false)
                  en.onSelect()
                }}
              >
                <span className="menu-check">{en.checked ? <CheckIcon /> : null}</span>
                <span className="menu-label">{en.label}</span>
                {en.hint && <kbd className="menu-hint">{en.hint}</kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </>
  )
}
