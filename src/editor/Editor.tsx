import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORIES, SYMBOLS, getSymbol } from '../data'
import type { SymbolDef } from '../data/types'
import { GlyphBody, Prims, SymbolSvg } from '../components/Glyph'
import {
  DuplicateIcon, FitIcon, MinusIcon, PlusIcon, PrintIcon, RedoIcon, RotateIcon, TrashIcon, UndoIcon,
} from '../components/Icons'
import { loadJson, saveJson } from '../lib/hooks'
import { printSheet } from '../lib/print'
import { searchSymbols } from '../lib/search'
import { downloadBlob, downloadText, svgToPngBlob } from '../lib/svg'
import { dolStarterExample } from './examples'
import { diagramToSvg, junctions, labelPos, wireGeometries } from './export'
import { initHistory, reducer } from './history'
import { sheetConflicts } from './checks'
import { sanitizeDoc } from './persist'
import { FIELD_DEFS, PAPER, paperBox, sheetPrims } from './sheet'
import type { PaperSize, SheetConfig, TitleFields } from './sheet'
import type { Doc, Endpoint, Item, Pt } from './model'
import { defOf, itemBounds, nextLabel, pivotOf, pointsToPath, routeWire, snap, terminalWorld, uid } from './model'

const STORAGE_KEY = 'es.doc.v1'
const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const SNAP_RADIUS = 18

type Selection = { kind: 'items'; ids: string[] } | { kind: 'wire'; id: string } | null
interface View {
  x: number
  y: number
  k: number
}

interface Props {
  armId: string | null
  loadExample: boolean
  onToast: (msg: string) => void
}

export default function Editor({ armId, loadExample, onToast }: Props) {
  const [hist, dispatch] = useReducer(reducer, undefined, () => initHistory(sanitizeDoc(loadJson<unknown>(STORAGE_KEY)) ?? dolStarterExample()))
  const doc = hist.present

  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 })
  const [armed, setArmed] = useState<string | null>(armId && getSymbol(armId) ? armId : null)
  const [ghost, setGhost] = useState<Pt | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [drag, setDrag] = useState<{ ids: string[]; start: Pt; delta: Pt } | null>(null)
  const [wiring, setWiring] = useState<{ from: Endpoint; cursor: Pt; target: Endpoint | null } | null>(null)
  const [query, setQuery] = useState('')

  const svgRef = useRef<SVGSVGElement>(null)
  const panRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => saveJson(STORAGE_KEY, doc), [doc])

  /* ---------- derived ---------- */

  // While dragging, render items at their tentative positions so wires follow live.
  const shown: Doc = useMemo(() => {
    if (!drag || (drag.delta.x === 0 && drag.delta.y === 0)) return doc
    return {
      ...doc,
      items: doc.items.map((i) => (drag.ids.includes(i.id) ? { ...i, x: i.x + drag.delta.x, y: i.y + drag.delta.y } : i)),
    }
  }, [doc, drag])

  const sheetArt = useMemo(() => (doc.sheet.enabled ? sheetPrims(doc.sheet) : null), [doc.sheet])
  const wires = useMemo(() => wireGeometries(shown), [shown])
  const dots = useMemo(() => junctions(shown), [shown])

  const selectedItemIds = selection?.kind === 'items' ? selection.ids : []
  const selectedItems = doc.items.filter((i) => selectedItemIds.includes(i.id))

  const filtered = useMemo(() => searchSymbols(SYMBOLS, query), [query])

  /* ---------- coordinates & view ---------- */

  const toWorld = useCallback((e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (e.clientX - r.left - v.x) / v.k, y: (e.clientY - r.top - v.y) / v.k }
  }, [])

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const r = svgRef.current?.getBoundingClientRect()
      const px = cx ?? (r ? r.width / 2 : 0)
      const py = cy ?? (r ? r.height / 2 : 0)
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor))
      const ratio = k / v.k
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio }
    })
  }, [])

  const fit = useCallback((d: Doc) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || (!d.items.length && !d.sheet.enabled)) {
      setView({ x: 40, y: 40, k: 1 })
      return
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    if (d.sheet.enabled) {
      const p = paperBox(d.sheet.size)
      x0 = p.x; y0 = p.y; x1 = p.x + p.w; y1 = p.y + p.h
    }
    for (const it of d.items) {
      const b = itemBounds(it, defOf(it))
      const lp = labelPos(it)
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y)
      x1 = Math.max(x1, b.x + b.w, lp.x + it.label.length * 9); y1 = Math.max(y1, b.y + b.h)
    }
    const pad = d.sheet.enabled ? 24 : 60
    const k = Math.min(1.5, Math.max(MIN_ZOOM, Math.min((r.width - pad * 2) / (x1 - x0), (r.height - pad * 2) / (y1 - y0))))
    setView({ k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: (r.height - (y1 - y0) * k) / 2 - y0 * k })
  }, [])

  // Fit once on mount, and again when asked to load the example.
  useEffect(() => {
    const id = requestAnimationFrame(() => fit(doc))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loadExample) return
    const ex = dolStarterExample()
    dispatch({ type: 'load', doc: ex })
    requestAnimationFrame(() => fit(ex))
    history.replaceState(null, '', '#/editor')
  }, [loadExample, fit])

  useEffect(() => {
    if (armId && getSymbol(armId)) setArmed(armId)
  }, [armId])

  // Wheel zoom needs a non-passive listener so the page does not scroll.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* ---------- actions ---------- */

  const rotateSelected = useCallback(() => {
    if (selection?.kind === 'items') dispatch({ type: 'rotate', ids: selection.ids })
  }, [selection])

  const deleteSelected = useCallback(() => {
    if (selection?.kind === 'items') dispatch({ type: 'delete-items', ids: selection.ids })
    else if (selection?.kind === 'wire') dispatch({ type: 'delete-wire', id: selection.id })
    setSelection(null)
  }, [selection])

  const duplicateSelected = useCallback(() => {
    if (selection?.kind !== 'items') return
    const sim: Item[] = [...doc.items]
    const newIds: string[] = []
    const labels: string[] = []
    for (const id of selection.ids) {
      const src = doc.items.find((i) => i.id === id)
      if (!src) continue
      const label = nextLabel(sim, defOf(src))
      newIds.push(uid('i'))
      labels.push(label)
      sim.push({ ...src, label })
    }
    dispatch({ type: 'duplicate', ids: selection.ids, newIds, labels })
    setSelection({ kind: 'items', ids: newIds })
  }, [selection, doc.items])

  const nearestTerminal = useCallback(
    (p: Pt, exclude: Endpoint | null): Endpoint | null => {
      let best: Endpoint | null = null
      let bestD = SNAP_RADIUS
      for (const it of shown.items) {
        const def = defOf(it)
        for (const t of def.terminals) {
          if (exclude && exclude.item === it.id && exclude.term === t.id) continue
          const w = terminalWorld(it, def, t.id)!
          const d = Math.hypot(w.x - p.x, w.y - p.y)
          if (d < bestD) {
            bestD = d
            best = { item: it.id, term: t.id }
          }
        }
      }
      return best
    },
    [shown.items],
  )

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (key === 'escape') {
        setArmed(null)
        setWiring(null)
        setGhost(null)
        setSelection(null)
      } else if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        deleteSelected()
      } else if (mod && key === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (mod && key === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
      } else if (mod && key === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (!mod && key === 'r') {
        rotateSelected()
      } else if (key.startsWith('arrow') && selection?.kind === 'items') {
        e.preventDefault()
        const step = e.shiftKey ? 100 : 20
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        dispatch({ type: 'move', ids: selection.ids, dx, dy })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected, duplicateSelected, rotateSelected, selection])

  /* ---------- pointer handling ---------- */

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const hit = (e.target as Element).closest('[data-kind]')
    const kind = hit?.getAttribute('data-kind')
    const w = toWorld(e)
    svgRef.current!.setPointerCapture(e.pointerId)

    if (kind === 'term') {
      setWiring({
        from: { item: hit!.getAttribute('data-item')!, term: hit!.getAttribute('data-term')! },
        cursor: w,
        target: null,
      })
      return
    }
    if (armed) {
      const def = getSymbol(armed)!
      const item: Item = { id: uid('i'), symbolId: def.id, x: snap(w.x), y: snap(w.y), rot: 0, label: nextLabel(doc.items, def) }
      dispatch({ type: 'add', item })
      setSelection({ kind: 'items', ids: [item.id] })
      return
    }
    if (kind === 'item') {
      const id = hit!.getAttribute('data-id')!
      let ids = selectedItemIds
      if (e.shiftKey) ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
      else if (!ids.includes(id)) ids = [id]
      setSelection(ids.length ? { kind: 'items', ids } : null)
      if (ids.includes(id)) setDrag({ ids, start: w, delta: { x: 0, y: 0 } })
      return
    }
    if (kind === 'wire') {
      setSelection({ kind: 'wire', id: hit!.getAttribute('data-id')! })
      return
    }
    setSelection(null)
    panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const w = toWorld(e)
    if (panRef.current) {
      const p = panRef.current
      setView((v) => ({ ...v, x: p.vx + e.clientX - p.sx, y: p.vy + e.clientY - p.sy }))
    } else if (drag) {
      setDrag({ ...drag, delta: { x: snap(w.x - drag.start.x), y: snap(w.y - drag.start.y) } })
    } else if (wiring) {
      setWiring({ ...wiring, cursor: w, target: nearestTerminal(w, wiring.from) })
    } else if (armed) {
      setGhost({ x: snap(w.x), y: snap(w.y) })
    }
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    panRef.current = null
    if (drag) {
      if (drag.delta.x || drag.delta.y) dispatch({ type: 'move', ids: drag.ids, dx: drag.delta.x, dy: drag.delta.y })
      setDrag(null)
    }
    if (wiring) {
      const target = nearestTerminal(toWorld(e), wiring.from)
      if (target) dispatch({ type: 'wire', a: wiring.from, b: target })
      setWiring(null)
    }
  }

  /* ---------- export ---------- */

  const exportSvg = () => {
    if (!doc.items.length) return onToast('Nothing to export yet')
    downloadText('muriel-schematic.svg', diagramToSvg(doc).svg)
  }
  const exportPng = async () => {
    if (!doc.items.length) return onToast('Nothing to export yet')
    try {
      const { svg, width, height } = diagramToSvg(doc, { background: '#ffffff' })
      downloadBlob('muriel-schematic.png', await svgToPngBlob(svg, width, height, 2))
    } catch {
      onToast('PNG export failed in this browser')
    }
  }

  const print = () => {
    if (!doc.items.length && !doc.sheet.enabled) return onToast('Nothing to print yet')
    const { svg } = diagramToSvg(doc, { background: '#ffffff' })
    if (!printSheet(svg, doc.sheet.size)) onToast('Allow pop-ups to print, or export the SVG instead')
  }

  /* ---------- render ---------- */

  const armedDef = armed ? getSymbol(armed) : undefined
  const selBounds = selectedItems.map((i) => ({ id: i.id, b: itemBounds(shown.items.find((s) => s.id === i.id) ?? i, defOf(i)) }))
  const draftFrom = wiring ? shown.items.find((i) => i.id === wiring.from.item) : undefined
  const draftPoints: Pt[] | null = (() => {
    if (!wiring || !draftFrom) return null
    const a = terminalWorld(draftFrom, defOf(draftFrom), wiring.from.term)
    if (!a) return null
    const tgtItem = wiring.target ? shown.items.find((i) => i.id === wiring.target!.item) : undefined
    const b = tgtItem && wiring.target ? terminalWorld(tgtItem, defOf(tgtItem), wiring.target.term) : null
    if (b) return routeWire(a, [a.dx, a.dy], b, [b.dx, b.dy])
    return routeWire(a, [a.dx, a.dy], { x: snap(wiring.cursor.x), y: snap(wiring.cursor.y) }, null)
  })()

  return (
    <div className="editor">
      <aside className="palette" aria-label="Symbol palette">
        <div className="palette-search">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbols…" aria-label="Search palette" />
        </div>
        <div className="palette-list">
          {query.trim() ? (
            filtered.length ? (
              filtered.map((d) => <PaletteButton key={d.id} def={d} armed={armed === d.id} onPick={() => setArmed(armed === d.id ? null : d.id)} />)
            ) : (
              <p className="muted small pad">No matches.</p>
            )
          ) : (
            CATEGORIES.map((c) => (
              <div key={c.id} className="palette-group">
                <h3>{c.name}</h3>
                {SYMBOLS.filter((s) => s.category === c.id).map((d) => (
                  <PaletteButton key={d.id} def={d} armed={armed === d.id} onPick={() => setArmed(armed === d.id ? null : d.id)} />
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="stage">
        <div className="editor-toolbar" role="toolbar" aria-label="Editor tools">
          <button className="icon-btn" onClick={() => dispatch({ type: 'undo' })} disabled={!hist.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><UndoIcon /></button>
          <button className="icon-btn" onClick={() => dispatch({ type: 'redo' })} disabled={!hist.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><RedoIcon /></button>
          <span className="sep" />
          <button className="icon-btn" onClick={rotateSelected} disabled={selection?.kind !== 'items'} aria-label="Rotate selected" title="Rotate (R)"><RotateIcon /></button>
          <button className="icon-btn" onClick={duplicateSelected} disabled={selection?.kind !== 'items'} aria-label="Duplicate selected" title="Duplicate (Ctrl+D)"><DuplicateIcon /></button>
          <button className="icon-btn" onClick={deleteSelected} disabled={!selection} aria-label="Delete selected" title="Delete (Del)"><TrashIcon /></button>
          <span className="sep" />
          <button className="icon-btn" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out" title="Zoom out"><MinusIcon /></button>
          <span className="zoom mono" aria-live="polite">{Math.round(view.k * 100)}%</span>
          <button className="icon-btn" onClick={() => zoomAt(1.25)} aria-label="Zoom in" title="Zoom in"><PlusIcon /></button>
          <button className="icon-btn" onClick={() => fit(doc)} aria-label="Fit to content" title="Fit to content"><FitIcon /></button>
          <span className="sep" />
          <label className="switch tb-switch">
            <input type="checkbox" checked={doc.sheet.enabled} onChange={(e) => { dispatch({ type: 'sheet', patch: { enabled: e.target.checked } }); if (e.target.checked) requestAnimationFrame(() => fit({ ...doc, sheet: { ...doc.sheet, enabled: true } })) }} />
            <span>Sheet</span>
          </label>
          <span className="grow" />
          <button className="btn small" onClick={() => { const ex = dolStarterExample(); dispatch({ type: 'load', doc: ex }); setSelection(null); requestAnimationFrame(() => fit(ex)) }} aria-label="Load example circuit" title="Load the motor starter example">Example</button>
          <button className="btn small" onClick={() => { dispatch({ type: 'load', doc: { items: [], wires: [], sheet: doc.sheet } }); setSelection(null) }} disabled={!doc.items.length}>Clear</button>
          <button className="icon-btn" onClick={print} aria-label="Print or save as PDF" title="Print / save as PDF"><PrintIcon /></button>
          <button className="btn small" onClick={exportSvg} aria-label="Export SVG" title="Export as SVG">SVG</button>
          <button className="btn small primary" onClick={exportPng} aria-label="Export PNG" title="Export as PNG">PNG</button>
        </div>

        <div className="canvas-wrap">
          <svg
            ref={svgRef}
            className={`canvas${armed ? ' is-armed' : ''}${wiring ? ' is-wiring' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setGhost(null)}
            aria-label="Schematic canvas"
            role="application"
          >
            <defs>
              <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                <circle cx="0" cy="0" r="1.1" className="grid-dot" />
              </pattern>
              <pattern id="grid-dots-world" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="0" cy="0" r="1.1" className="grid-dot" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />

            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {sheetArt && (
                <g className="sheet" data-testid="sheet" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect className="paper" x={0} y={0} width={PAPER[doc.sheet.size].w} height={PAPER[doc.sheet.size].h} stroke="none" />
                  <rect x={0} y={0} width={PAPER[doc.sheet.size].w} height={PAPER[doc.sheet.size].h} fill="url(#grid-dots-world)" stroke="none" pointerEvents="none" />
                  <Prims prims={sheetArt} />
                </g>
              )}
              <g className="wires">
                {wires.map((w) => (
                  <g key={w.id}>
                    <path className={`wire${selection?.kind === 'wire' && selection.id === w.id ? ' selected' : ''}`} d={pointsToPath(w.points)} />
                    <path className="wire-hit" data-kind="wire" data-id={w.id} d={pointsToPath(w.points)} />
                  </g>
                ))}
              </g>

              {selBounds.map(({ id, b }) => (
                <rect key={id} className="sel-box" x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx="6" />
              ))}

              {shown.items.map((it) => {
                const def = defOf(it)
                const pv = pivotOf(def)
                const lp = labelPos(it)
                return (
                  <g key={it.id}>
                    <g
                      className="item"
                      data-kind="item"
                      data-id={it.id}
                      transform={`translate(${it.x} ${it.y}) rotate(${it.rot}) translate(${-pv.x} ${-pv.y})`}
                    >
                      <rect className="item-hit" x={-4} y={-4} width={def.width + 8} height={def.height + 8} />
                      <GlyphBody def={def} />
                    </g>
                    {it.label && (
                      <text className="item-label" x={lp.x} y={lp.y}>
                        {it.label}
                      </text>
                    )}
                  </g>
                )
              })}

              {dots.map((p, i) => (
                <circle key={i} className="junction" cx={p.x} cy={p.y} r={4} />
              ))}

              {shown.items.flatMap((it) => {
                const def = defOf(it)
                return def.terminals.map((t) => {
                  const p = terminalWorld(it, def, t.id)!
                  const isTarget = wiring?.target?.item === it.id && wiring.target.term === t.id
                  const lx = p.x + p.dx * 12
                  const ly = p.y + p.dy * 12 + (p.dy === 0 ? 4 : p.dy > 0 ? 8 : 0)
                  return (
                    <g key={`${it.id}:${t.id}`} className={`term-g tg-${t.role}${isTarget ? ' is-target' : ''}`}>
                      <circle className="t-dot" cx={p.x} cy={p.y} r={3.5} />
                      <circle className="t-hit" data-kind="term" data-item={it.id} data-term={t.id} cx={p.x} cy={p.y} r={10} />
                      <text className="t-label" x={lx} y={ly} textAnchor={p.dx > 0 ? 'start' : p.dx < 0 ? 'end' : 'middle'}>
                        {t.label}
                      </text>
                    </g>
                  )
                })
              })}

              {draftPoints && <path className="wire draft" d={pointsToPath(draftPoints)} />}

              {armedDef && ghost && (
                <g
                  className="ghost"
                  transform={`translate(${ghost.x} ${ghost.y}) translate(${-pivotOf(armedDef).x} ${-pivotOf(armedDef).y})`}
                  pointerEvents="none"
                >
                  <GlyphBody def={armedDef} />
                </g>
              )}
            </g>
          </svg>

          {!doc.items.length && !armed && (
            <div className="canvas-empty">
              <p><strong>Empty canvas</strong></p>
              <p className="muted">Pick a symbol on the left, then click here to place it. Drag from one terminal dot to another to draw a wire.</p>
            </div>
          )}
          {armedDef && (
            <div className="canvas-hint" role="status">
              Placing <strong>{armedDef.name}</strong> — click the canvas to place, <kbd>Esc</kbd> to stop
            </div>
          )}
        </div>
      </section>

      <aside className="inspector" aria-label="Inspector">
        <Inspector
          doc={doc}
          selection={selection}
          onLabel={(id, label) => dispatch({ type: 'label', id, label })}
          onSheet={(patch) => dispatch({ type: 'sheet', patch })}
          onRotate={rotateSelected}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />
      </aside>
    </div>
  )
}

function PaletteButton({ def, armed, onPick }: { def: SymbolDef; armed: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`palette-item${armed ? ' armed' : ''}`} onClick={onPick} aria-pressed={armed}>
      <SymbolSvg def={def} className="mini-glyph" />
      <span>{def.name}</span>
    </button>
  )
}

function Inspector({
  doc, selection, onLabel, onSheet, onRotate, onDuplicate, onDelete,
}: {
  doc: Doc
  selection: Selection
  onLabel: (id: string, label: string) => void
  onSheet: (patch: { enabled?: boolean; size?: PaperSize; fields?: Partial<TitleFields> }) => void
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  if (selection?.kind === 'wire') {
    const w = doc.wires.find((x) => x.id === selection.id)
    const name = (e: Endpoint) => `${doc.items.find((i) => i.id === e.item)?.label || 'part'}·${e.term}`
    return (
      <div className="inspector-body">
        <p className="eyebrow">Wire</p>
        {w && <p className="mono">{name(w.a)} → {name(w.b)}</p>}
        <button className="btn danger" onClick={onDelete}><TrashIcon /> Delete wire</button>
      </div>
    )
  }

  if (selection?.kind === 'items') {
    const items = doc.items.filter((i) => selection.ids.includes(i.id))
    if (items.length === 1) {
      const item = items[0]
      const def = defOf(item)
      const conns = doc.wires.flatMap((w) => {
        const other = (e: Endpoint, o: Endpoint) => (e.item === item.id ? [{ term: e.term, to: `${doc.items.find((i) => i.id === o.item)?.label || 'part'}·${o.term}` }] : [])
        return [...other(w.a, w.b), ...other(w.b, w.a)]
      })
      return (
        <div className="inspector-body">
          <p className="eyebrow">Selected</p>
          <h2>{def.name}</h2>
          <LabelField key={item.id + item.label} value={item.label} onCommit={(v) => onLabel(item.id, v)} />
          <div className="row">
            <button className="btn small" onClick={onRotate}><RotateIcon /> Rotate</button>
            <button className="btn small" onClick={onDuplicate}><DuplicateIcon /> Duplicate</button>
            <button className="btn small danger" onClick={onDelete}><TrashIcon /> Delete</button>
          </div>
          <h3>Terminals</h3>
          <ul className="term-list">
            {def.terminals.map((t) => {
              const c = conns.filter((x) => x.term === t.id)
              return (
                <li key={t.id}>
                  <span className={`dot dot-${t.role}`} aria-hidden="true" />
                  <span className="mono">{t.label}</span>
                  <span className="muted small">{c.length ? c.map((x) => x.to).join(', ') : t.name}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )
    }
    return (
      <div className="inspector-body">
        <p className="eyebrow">Selected</p>
        <h2>{items.length} parts</h2>
        <div className="row">
          <button className="btn small" onClick={onRotate}><RotateIcon /> Rotate</button>
          <button className="btn small" onClick={onDuplicate}><DuplicateIcon /> Duplicate</button>
          <button className="btn small danger" onClick={onDelete}><TrashIcon /> Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="inspector-body">
      <p className="eyebrow">Editor</p>
      <h2>{doc.items.length} parts · {doc.wires.length} wires</h2>
      <p className="muted small">Your drawing is saved in this browser automatically.</p>
      <SheetForm sheet={doc.sheet} conflicts={sheetConflicts(doc)} onChange={onSheet} />
      <h3>Shortcuts</h3>
      <dl className="shortcuts">
        <dt><kbd>R</kbd></dt><dd>Rotate selected</dd>
        <dt><kbd>Del</kbd></dt><dd>Delete selected</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>D</kbd></dt><dd>Duplicate</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>Undo / <kbd>Shift</kbd> redo</dd>
        <dt><kbd>←↑↓→</kbd></dt><dd>Nudge (Shift = 5 cells)</dd>
        <dt><kbd>Shift</kbd>+click</dt><dd>Multi-select</dd>
        <dt><kbd>Esc</kbd></dt><dd>Cancel / deselect</dd>
        <dt>Scroll</dt><dd>Zoom; drag background to pan</dd>
      </dl>
    </div>
  )
}

function LabelField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return <CommitField label="Label" value={value} onCommit={onCommit} placeholder="e.g. Q1" maxLength={16} mono />
}

/** Text input that commits on blur or Enter, so typing does not flood the undo history. */
function CommitField({
  label, value, onCommit, placeholder, maxLength, mono = false,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  maxLength: number
  mono?: boolean
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value]) // follow undo/redo and external changes
  const commit = () => v.trim() !== value && onCommit(v.trim())
  return (
    <label className={`field${mono ? ' mono-field' : ''}`}>
      <span>{label}</span>
      <input
        value={v}
        maxLength={maxLength}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
      />
    </label>
  )
}

const PAIRS: (keyof TitleFields)[][] = [['organization'], ['project'], ['title'], ['details'], ['drawnBy', 'drawingNo'], ['date', 'scale'], ['revision', 'sheet']]

function SheetForm({ sheet, conflicts, onChange }: { sheet: SheetConfig; conflicts: boolean; onChange: (patch: { enabled?: boolean; size?: PaperSize; fields?: Partial<TitleFields> }) => void }) {
  return (
    <fieldset className="sheet-form">
      <legend>Drawing sheet</legend>
      <div className="row between">
        <label className="switch">
          <input type="checkbox" checked={sheet.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
          <span>Show sheet</span>
        </label>
        <label className="size-pick">
          <span className="sr-only">Paper size</span>
          <select value={sheet.size} onChange={(e) => onChange({ size: e.target.value as PaperSize })} aria-label="Paper size">
            {(Object.keys(PAPER) as PaperSize[]).map((s) => (
              <option key={s} value={s}>{s} landscape</option>
            ))}
          </select>
        </label>
      </div>
      {conflicts && (
        <p className="warn small" role="status">
          Some parts sit outside the frame or under the title block. Move them, or pick a larger sheet.
        </p>
      )}
      {PAIRS.map((keys) => (
        <div key={keys.join()} className={keys.length > 1 ? 'pair' : undefined}>
          {keys.map((k) => {
            const def = FIELD_DEFS.find((d) => d.key === k)!
            return (
              <CommitField key={k} label={def.label} value={sheet.fields[k]} placeholder={def.placeholder} maxLength={def.maxLength} onCommit={(v) => onChange({ fields: { [k]: v } })} />
            )
          })}
        </div>
      ))}
    </fieldset>
  )
}
