import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, SYMBOLS, getSymbol, symbolsByCategory } from '../data'
import type { SymbolDef } from '../data/types'
import { searchSymbols } from '../lib/search'
import { copyText, downloadText, symbolToSvgString } from '../lib/svg'
import { navigate } from '../lib/hooks'
import { SearchIcon } from './Icons'
import { SymbolCard } from './SymbolCard'
import { SymbolDrawer } from './SymbolDrawer'

interface Props {
  openId: string | null
  onToast: (msg: string) => void
}

export function Library({ openId, onToast }: Props) {
  const [query, setQuery] = useState('')
  const [showTerminals, setShowTerminals] = useState(false)
  const [active, setActive] = useState<string>(CATEGORIES[0].id)
  const searchRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(symbolsByCategory, [])
  const results = useMemo(() => searchSymbols(SYMBOLS, query), [query])
  const searching = query.trim().length > 0
  const openDef = openId ? getSymbol(openId) : undefined

  // "/" focuses search, like most docs sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(t.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Scroll-spy for the category nav.
  useEffect(() => {
    if (searching) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.getAttribute('data-cat') ?? '')
      },
      { rootMargin: '-120px 0px -70% 0px' },
    )
    document.querySelectorAll('[data-cat]').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [searching])

  const copy = async (def: SymbolDef) =>
    onToast((await copyText(symbolToSvgString(def))) ? `Copied ${def.name} as SVG` : 'Copy failed — use Download instead')
  const download = (def: SymbolDef) => downloadText(`${def.id}.svg`, symbolToSvgString(def))
  const open = (def: SymbolDef) => navigate(`/s/${encodeURIComponent(def.id)}`)

  const grid = (list: SymbolDef[]) => (
    <div className="grid">
      {list.map((def) => (
        <SymbolCard key={def.id} def={def} showTerminals={showTerminals} onOpen={open} onCopy={copy} onDownload={download} />
      ))}
    </div>
  )

  return (
    <div className="library">
      <section className="hero">
        <p className="eyebrow">Muriel Schematics</p>
        <h1>Electrical symbols, ready to draw.</h1>
        <p className="hero-sub">
          {SYMBOLS.length} IEC-style symbols for power and motor-control drawings, each with labelled connection terminals. Search
          and export them, or open the editor, wire up a circuit and put it on a titled drawing sheet.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="#/editor">
            Open the editor
          </a>
          <a className="btn" href="#/editor?example=dol">
            Try the motor starter example
          </a>
        </div>
      </section>

      <div className="toolbar" role="search">
        <label className="search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols — try “isolator”, “dol”, “a1”, “timer”"
            aria-label="Search symbols"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <label className="switch">
          <input type="checkbox" checked={showTerminals} onChange={(e) => setShowTerminals(e.target.checked)} />
          <span>Show terminals</span>
        </label>
      </div>

      <div className="layout">
        <nav className="cat-nav" aria-label="Categories">
          {groups.map(({ category, symbols }) => (
            <a
              key={category.id}
              href={`#cat-${category.id}`}
              className={!searching && active === category.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault()
                setQuery('')
                requestAnimationFrame(() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
              }}
            >
              <span>{category.name}</span>
              <span className="count mono">{symbols.length}</span>
            </a>
          ))}
        </nav>

        <div className="content">
          {searching ? (
            <section aria-live="polite">
              <h2 className="section-title">
                {results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”
              </h2>
              {results.length ? (
                grid(results)
              ) : (
                <p className="empty">
                  No symbols match. Try a broader word like “contact”, “motor” or “switch”, or clear the search.
                </p>
              )}
            </section>
          ) : (
            groups.map(({ category, symbols }) => (
              <section key={category.id} id={`cat-${category.id}`} data-cat={category.id} className="category">
                <div className="section-head">
                  <h2 className="section-title">{category.name}</h2>
                  <p className="muted">{category.blurb}</p>
                </div>
                {grid(symbols)}
              </section>
            ))
          )}
        </div>
      </div>

      {openDef && (
        <SymbolDrawer
          def={openDef}
          onClose={() => navigate('/')}
          onToast={onToast}
          onOpenInEditor={(d) => navigate(`/editor?arm=${encodeURIComponent(d.id)}`)}
        />
      )}
    </div>
  )
}
