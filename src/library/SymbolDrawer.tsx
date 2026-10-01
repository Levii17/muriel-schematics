import { useEffect, useRef, useState } from 'react'

import { CloseIcon, CopyIcon, DownloadIcon } from '@/shared/Icons'
import { copyText, downloadBlob, downloadText, svgToPngBlob } from '@/shared/download'
import { CATEGORIES } from '@/symbols'
import { SymbolSvg } from '@/symbols/Glyph'
import { symbolToSvgString } from '@/symbols/svg'
import type { SymbolDef } from '@/symbols/types'

const roleLabel = { in: 'Input', out: 'Output', io: 'I/O' } as const

interface Props {
  def: SymbolDef
  onClose: () => void
  onToast: (msg: string) => void
  onOpenInEditor: (def: SymbolDef) => void
}

export function SymbolDrawer({ def, onClose, onToast, onOpenInEditor }: Props) {
  const [terms, setTerms] = useState(true)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus management: focus the close button on open, restore focus on close, trap Tab, close on Esc.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  const category = CATEGORIES.find((c) => c.id === def.category)

  const copySvg = async () => onToast((await copyText(symbolToSvgString(def))) ? 'SVG copied to clipboard' : 'Copy failed — use Download instead')
  const downloadSvg = () => downloadText(`${def.id}.svg`, symbolToSvgString(def))
  const downloadPng = async () => {
    try {
      const svg = symbolToSvgString(def, { margin: 16 })
      const blob = await svgToPngBlob(svg, def.width + 32, def.height + 32, 4)
      downloadBlob(`${def.id}.png`, blob)
    } catch {
      onToast('PNG export failed in this browser')
    }
  }

  return (
    <div className="drawer-root">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={panelRef}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow">{category?.name}</p>
            <h2 id="drawer-title">{def.name}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            <CloseIcon />
          </button>
        </header>

        <div className="drawer-preview">
          <SymbolSvg def={def} showTerminals={terms} scale={1.4} />
        </div>
        <label className="switch">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>Show terminals</span>
        </label>

        <p className="lead">{def.summary}</p>
        <p className="muted">{def.usage}</p>

        <h3>Terminals</h3>
        <table className="terminal-table">
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Description</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {def.terminals.map((t) => (
              <tr key={t.id}>
                <td className="mono">
                  <span className={`dot dot-${t.role}`} aria-hidden="true" />
                  {t.label}
                </td>
                <td>{t.name}</td>
                <td>{roleLabel[t.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {def.reference && (
          <p className="muted small">
            Reference designation: <span className="chip mono">{def.reference}</span> (auto-numbered in the editor, e.g. {def.reference}1).
          </p>
        )}

        <div className="drawer-actions">
          <button type="button" className="btn primary" onClick={() => onOpenInEditor(def)}>
            Place in editor
          </button>
          <button type="button" className="btn" onClick={copySvg}>
            <CopyIcon /> Copy SVG
          </button>
          <button type="button" className="btn" onClick={downloadSvg}>
            <DownloadIcon /> SVG
          </button>
          <button type="button" className="btn" onClick={downloadPng}>
            <DownloadIcon /> PNG
          </button>
        </div>
      </div>
    </div>
  )
}
