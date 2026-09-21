import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORIES, SYMBOLS, getSymbol } from '../data'
import type { SymbolDef } from '../data/types'
import { GlyphBody, Prims, SymbolSvg } from '../components/Glyph'
import {
  CursorIcon, DuplicateIcon, FitIcon, FlipHIcon, FlipVIcon, HandIcon, MinusIcon, PlusIcon, PrintIcon, RedoIcon, RotateIcon,
  TextIcon, TrashIcon, UndoIcon, WarnIcon,
} from '../components/Icons'
import { loadJson, saveJson } from '../lib/hooks'
import { printSheet } from '../lib/print'
import { searchSymbols } from '../lib/search'
import { downloadBlob, downloadText, svgToPngBlob } from '../lib/svg'
import type { AlignMode, Axis } from './align'
import { conflictingItemIds, conflictingNoteIds, planFit, planShrink } from './checks'
import type { Payload } from './clipboard'
import { clonePayload, copyPayload } from './clipboard'
import { dolStarterExample } from './examples'
import { diagramToSvg, junctions, wireGeometries } from './export'
import { JUNCTION_SYMBOL, JUNCTION_TERMINAL, nearestWirePoint, shiftSegment, shiftWires, tapPoint, wireStroke } from './wires'
import { initHistory, reducer } from './history'
import { Inspector } from './Inspector'
import { LABEL_LINE_H, labelBox, labelLines, labelPos } from './labels'
import type { Doc, Endpoint, Item, Pt, Rot, TextNote } from './model'
import {
  NOTE_LINE, alignDelta, defOf, itemBounds, itemMirror, itemScale, nextLabel, noteBounds, noteLines, noteLocalBox, noteRot, pivotOf,
  pointsToPath, routeWire, scaleDrawing, snap, snapPlacement, terminalPoints, terminalWorld, uid,
} from './model'
import { sanitizeDoc } from './persist'
import type { Selection } from './select'
import { EMPTY, bodyIds, boxMode, countOf, isEmpty, itemsInBox, normBox, notesInBox, toggle, wiresInBox } from './select'
import { PAPER, paperBox, sheetPrims } from './sheet'
import { nextOrientation } from './transform'

const STORAGE_KEY = 'es.doc.v1'
const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const SNAP_RADIUS = 18
/** Screen pixels a press must travel before it counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4
const LABEL_SNAP = 5

type Tool = 'select' | 'pan' | 'text'
interface View {
  x: number
  y: number
  k: number
}
/**
 * A change being dragged on the selected wire. `via` is the full waypoint list as it would be if released now.
 * "move" drags one waypoint; "shift" slides the segment `k` of the current route sideways.
 */
type WireEdit = {
  id: string
  via: Pt[]
  sx: number
  sy: number
  moved: boolean
} & ({ mode: 'move'; index: number } | { mode: 'shift'; pts: Pt[]; k: number })
interface Marquee {
  from: Pt
  to: Pt
  additive: boolean
  sx: number
  sy: number
  moved: boolean
}

interface Props {
  armId: string | null
  loadExample: boolean
  onToast: (msg: string) => void
}

const isTextTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export default function Editor({ armId, loadExample, onToast }: Props) {
  const [hist, dispatch] = useReducer(reducer, undefined, () => initHistory(sanitizeDoc(loadJson<unknown>(STORAGE_KEY)) ?? dolStarterExample()))
  const doc = hist.present

  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [space, setSpace] = useState(false)
  const [panning, setPanning] = useState(false)
  const [armed, setArmed] = useState<string | null>(armId && getSymbol(armId) ? armId : null)
  const [armedOrient, setArmedOrient] = useState<{ rot: Rot; mirror: boolean }>({ rot: 0, mirror: false })
  const [ghost, setGhost] = useState<Pt | null>(null)
  const [rawSelection, setSelection] = useState<Selection>(EMPTY)
  const [drag, setDrag] = useState<{ ids: string[]; start: Pt; delta: Pt; clickId: string; shift: boolean } | null>(null)
  const [labelDrag, setLabelDrag] = useState<{ id: string; start: Pt; delta: Pt } | null>(null)
  const [editing, setEditing] = useState<{ note: TextNote; isNew: boolean } | null>(null)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const [wiring, setWiring] = useState<{ from: Endpoint; cursor: Pt; target: Endpoint | null; tap: { wireId: string; point: Pt } | null } | null>(null)
  const [wireEdit, setWireEdit] = useState<WireEdit | null>(null)
  const [query, setQuery] = useState('')
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({})

  const svgRef = useRef<SVGSVGElement>(null)
  const panRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)
  const clipRef = useRef<Payload | null>(null)
  const editFocused = useRef(false)
  const pasteCount = useRef(0)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => saveJson(STORAGE_KEY, doc), [doc])

  // Undo, redo and deletes can leave ids behind; only ever act on ones that still exist.
  const selection: Selection = useMemo(() => {
    const items = rawSelection.items.filter((id) => doc.items.some((i) => i.id === id))
    const wires = rawSelection.wires.filter((id) => doc.wires.some((w) => w.id === id))
    const notes = rawSelection.notes.filter((id) => doc.notes.some((n) => n.id === id))
    return items.length === rawSelection.items.length && wires.length === rawSelection.wires.length && notes.length === rawSelection.notes.length
      ? rawSelection
      : { items, wires, notes }
  }, [rawSelection, doc.items, doc.wires, doc.notes])

  /* ---------- derived ---------- */

  // While dragging, render things at their tentative positions so wires and labels follow live.
  const shown: Doc = useMemo(() => {
    let d = doc
    if (drag && (drag.delta.x !== 0 || drag.delta.y !== 0)) {
      const { ids, delta } = drag
      d = {
        ...d,
        items: d.items.map((i) => (ids.includes(i.id) ? { ...i, x: i.x + delta.x, y: i.y + delta.y } : i)),
        notes: d.notes.map((n) => (ids.includes(n.id) ? { ...n, x: n.x + delta.x, y: n.y + delta.y } : n)),
        wires: shiftWires(d.wires, ids, delta.x, delta.y),
      }
    }
    if (wireEdit && wireEdit.moved) {
      d = { ...d, wires: d.wires.map((w) => (w.id === wireEdit.id ? { ...w, via: wireEdit.via } : w)) }
    }
    if (labelDrag && (labelDrag.delta.x !== 0 || labelDrag.delta.y !== 0)) {
      const { id, delta } = labelDrag
      d = {
        ...d,
        items: d.items.map((i) => (i.id === id ? { ...i, labelOffset: { x: (i.labelOffset?.x ?? 0) + delta.x, y: (i.labelOffset?.y ?? 0) + delta.y } } : i)),
      }
    }
    return d
  }, [doc, drag, labelDrag, wireEdit])

  const wireStyles = useMemo(() => new Map(doc.wires.map((w) => [w.id, w.style])), [doc.wires])
  const sheetArt = useMemo(() => (doc.sheet.enabled ? sheetPrims(doc.sheet) : null), [doc.sheet])
  const wires = useMemo(() => wireGeometries(shown), [shown])
  const dots = useMemo(() => junctions(shown), [shown])
  const selectedItems = doc.items.filter((i) => selection.items.includes(i.id))
  const selectedNotes = shown.notes.filter((n) => selection.notes.includes(n.id))

  const filtered = useMemo(() => searchSymbols(SYMBOLS, query), [query])
  const conflictIds = useMemo(() => conflictingItemIds(shown), [shown])
  const conflictNoteIds = useMemo(() => conflictingNoteIds(shown), [shown])
  const fitPlan = useMemo(() => planFit(doc), [doc])
  const shrinkPlan = useMemo(() => (fitPlan.ok ? null : planShrink(doc)), [doc, fitPlan])

  const panMode = tool === 'pan' || space

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
    if (!r || (!d.items.length && !d.notes.length && !d.sheet.enabled)) {
      setView({ x: 40, y: 40, k: 1 })
      return
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    if (d.sheet.enabled) {
      const p = paperBox(d.sheet.size)
      x0 = p.x; y0 = p.y; x1 = p.x + p.w; y1 = p.y + p.h
    }
    const grow = (b: { x: number; y: number; w: number; h: number }) => {
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y)
      x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h)
    }
    for (const it of d.items) {
      grow(itemBounds(it, defOf(it)))
      const lb = labelBox(it)
      if (lb) grow(lb)
    }
    for (const n of d.notes) grow(noteBounds(n))
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

  const hasItems = selection.items.length > 0
  const body = useMemo(() => bodyIds(selection), [selection])
  const hasBody = body.length > 0

  const rotateSelected = useCallback(() => {
    if (armed) return setArmedOrient((o) => nextOrientation(o.rot, o.mirror, 'rot90'))
    if (hasBody) dispatch({ type: 'rotate', ids: body })
  }, [armed, hasBody, body])

  const flipSelected = useCallback(
    (axis: Axis) => {
      if (armed) return setArmedOrient((o) => nextOrientation(o.rot, o.mirror, axis === 'h' ? 'flipH' : 'flipV'))
      if (hasBody) dispatch({ type: 'flip', ids: body, axis })
    },
    [armed, hasBody, body],
  )

  const resizeSelected = useCallback(
    (dir: 1 | -1) => {
      if (selection.items.length) dispatch({ type: 'resize', ids: selection.items, dir })
    },
    [selection.items],
  )

  const deleteSelected = useCallback(() => {
    if (isEmpty(selection)) return
    dispatch({ type: 'delete', items: selection.items, wires: selection.wires, notes: selection.notes })
    setSelection(EMPTY)
  }, [selection])

  const copySelected = useCallback(
    (quiet = false) => {
      const payload = copyPayload(doc, selection)
      if (!payload) return false
      clipRef.current = payload
      pasteCount.current = 0
      if (!quiet) {
        const bits = [
          payload.items.length && `${payload.items.length} ${payload.items.length === 1 ? 'part' : 'parts'}`,
          payload.notes.length && `${payload.notes.length} ${payload.notes.length === 1 ? 'note' : 'notes'}`,
          payload.wires.length && `${payload.wires.length} ${payload.wires.length === 1 ? 'wire' : 'wires'}`,
        ].filter(Boolean)
        onToast(`Copied ${bits.join(' and ')}`)
      }
      return true
    },
    [doc, selection, onToast],
  )

  const pasteFrom = useCallback(
    (payload: Payload, offset: number) => {
      const clone = clonePayload(doc, payload, offset, offset)
      dispatch({ type: 'paste', payload: clone })
      setSelection({ items: clone.items.map((i) => i.id), wires: [], notes: clone.notes.map((n) => n.id) })
    },
    [doc],
  )

  const pasteClipboard = useCallback(() => {
    if (!clipRef.current) return onToast('Nothing to paste. Copy some parts first.')
    pasteCount.current += 1
    pasteFrom(clipRef.current, 40 * pasteCount.current)
  }, [pasteFrom, onToast])

  const cutSelected = useCallback(() => {
    if (copySelected(true)) {
      onToast('Cut. Paste with Ctrl+V.')
      deleteSelected()
    }
  }, [copySelected, deleteSelected, onToast])

  const duplicateSelected = useCallback(() => {
    const payload = copyPayload(doc, selection)
    if (payload) pasteFrom(payload, 40)
  }, [doc, selection, pasteFrom])

  const selectAll = useCallback(() => setSelection({ items: doc.items.map((i) => i.id), wires: doc.wires.map((w) => w.id), notes: doc.notes.map((n) => n.id) }), [doc])

  const align = useCallback((mode: AlignMode) => dispatch({ type: 'align', ids: selection.items, mode }), [selection.items])
  const distribute = useCallback((axis: Axis) => dispatch({ type: 'distribute', ids: selection.items, axis }), [selection.items])

  const fitToSheet = useCallback(() => {
    const plan = planFit(doc)
    if (!plan.ok) return onToast('That will not fit even on A1. Make the parts smaller first.')
    dispatch({ type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    requestAnimationFrame(() => fit({ ...doc, items: doc.items.map((i) => ({ ...i, x: i.x + plan.dx, y: i.y + plan.dy })), notes: doc.notes.map((n) => ({ ...n, x: n.x + plan.dx, y: n.y + plan.dy })), sheet: { ...doc.sheet, size: plan.size } }))
  }, [doc, fit, onToast])

  const shrinkAndFit = useCallback(() => {
    const plan = planShrink(doc)
    if (!plan) return onToast('Even shrunk, that will not fit. Split it across sheets.')
    dispatch({ type: 'scale-all', factor: plan.factor })
    dispatch({ type: 'fit-sheet', dx: plan.plan.dx, dy: plan.plan.dy, size: plan.plan.size })
    const scaled = scaleDrawing(doc, plan.factor)!
    requestAnimationFrame(() => fit({ ...scaled, items: scaled.items.map((i) => ({ ...i, x: i.x + plan.plan.dx, y: i.y + plan.plan.dy })), notes: scaled.notes.map((n) => ({ ...n, x: n.x + plan.plan.dx, y: n.y + plan.plan.dy })), sheet: { ...doc.sheet, size: plan.plan.size } }))
  }, [doc, fit, onToast])

  const scaleAll = useCallback(
    (factor: number) => {
      const scaled = scaleDrawing(doc, factor)
      if (!scaled) return onToast('Some parts are already at their smallest or largest size.')
      dispatch({ type: 'scale-all', factor })
      requestAnimationFrame(() => fit(scaled))
    },
    [doc, fit, onToast],
  )

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

  // The handler is rebuilt every render and called through a ref, so it always sees current state.
  const keyDown = useRef<(e: KeyboardEvent) => void>(() => {})
  keyDown.current = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    const onControl = ['BUTTON', 'A'].includes((e.target as HTMLElement | null)?.tagName ?? '')

    if (key === ' ' && !onControl) {
      e.preventDefault()
      setSpace(true)
    } else if (key === 'escape') {
      setArmed(null)
      setWiring(null)
      setGhost(null)
      setMarquee(null)
      setLabelDrag(null)
      setWireEdit(null)
      setSelection(EMPTY)
    } else if (key === 'delete' || key === 'backspace') {
      e.preventDefault()
      deleteSelected()
    } else if (mod && key === 'z') {
      e.preventDefault()
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
    } else if (mod && key === 'y') {
      e.preventDefault()
      dispatch({ type: 'redo' })
    } else if (mod && key === 'a') {
      e.preventDefault()
      selectAll()
    } else if (mod && key === 'c') {
      if (hasBody) {
        e.preventDefault()
        copySelected()
      }
    } else if (mod && key === 'x') {
      if (hasBody) {
        e.preventDefault()
        cutSelected()
      }
    } else if (mod && key === 'v') {
      e.preventDefault()
      pasteClipboard()
    } else if (mod && key === 'd') {
      e.preventDefault()
      duplicateSelected()
    } else if (mod) {
      return
    } else if (key === 'r') {
      rotateSelected()
    } else if (key === 'f') {
      flipSelected(e.shiftKey ? 'v' : 'h')
    } else if (key === 'v') {
      setTool('select')
    } else if (key === 'h') {
      setTool('pan')
    } else if (key === 't') {
      setTool('text')
    } else if (key === ']' || key === '=' || key === '+') {
      resizeSelected(1)
    } else if (key === '[' || key === '-') {
      resizeSelected(-1)
    } else if (key.startsWith('arrow') && hasBody) {
      e.preventDefault()
      const step = e.shiftKey ? 100 : 20
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
      dispatch({ type: 'move', ids: body, dx, dy })
    }
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyDown.current(e)
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpace(false)
    }
    const blur = () => setSpace(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  /* ---------- pointer handling ---------- */

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    if (e.button === 1) e.preventDefault()
    const hit = (e.target as Element).closest('[data-kind]')
    const kind = hit?.getAttribute('data-kind')
    const w = toWorld(e)
    svgRef.current!.setPointerCapture(e.pointerId)

    // Pan: Pan tool, Space held, or middle mouse. Works over anything.
    if (e.button === 1 || panMode) {
      panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
      setPanning(true)
      return
    }

    // Text tool: a click on empty canvas starts a new note. Anything else behaves as in the Select tool.
    if (tool === 'text' && !armed && !kind) {
      const note: TextNote = { id: uid('n'), x: snap(w.x), y: snap(w.y), text: '', size: 14 }
      editFocused.current = false
      setEditing({ note, isNew: true })
      setSelection(EMPTY)
      setTool('select')
      return
    }

    if (kind === 'seg' || kind === 'via') {
      const id = hit!.getAttribute('data-wire')!
      const wire = doc.wires.find((x) => x.id === id)
      const geom = wireGeometries(doc).find((x) => x.id === id)
      if (wire && geom) {
        if (kind === 'via') {
          setWireEdit({ id, mode: 'move', via: [...(wire.via ?? [])], index: Number(hit!.getAttribute('data-index')), sx: e.clientX, sy: e.clientY, moved: false })
        } else {
          // Every corner of the current route becomes a waypoint, so the rest of the wire keeps its shape.
          setWireEdit({ id, mode: 'shift', via: geom.points.slice(1, -1), pts: geom.points, k: Number(hit!.getAttribute('data-seg')), sx: e.clientX, sy: e.clientY, moved: false })
        }
      }
      return
    }

    if (kind === 'term') {
      setWiring({
        from: { item: hit!.getAttribute('data-item')!, term: hit!.getAttribute('data-term')! },
        cursor: w,
        target: null,
        tap: null,
      })
      return
    }
    // Junction dots are small, so their whole area moves them; Alt+drag draws a wire from one instead.
    if (kind === 'item' && e.altKey) {
      const id = hit!.getAttribute('data-id')!
      if (doc.items.find((i) => i.id === id)?.symbolId === JUNCTION_SYMBOL) {
        setWiring({ from: { item: id, term: JUNCTION_TERMINAL }, cursor: w, target: null, tap: null })
        return
      }
    }
    if (armed) {
      const def = getSymbol(armed)!
      const at = ghost ?? snapPlacement(def, w, 1, armedOrient.rot, armedOrient.mirror)
      const item: Item = { id: uid('i'), symbolId: def.id, x: at.x, y: at.y, rot: armedOrient.rot, label: nextLabel(doc.items, def) }
      if (armedOrient.mirror) item.mirror = true
      dispatch({ type: 'add', item })
      setSelection({ items: [item.id], wires: [], notes: [] })
      return
    }
    if (kind === 'label') {
      const id = hit!.getAttribute('data-id')!
      setSelection({ items: [id], wires: [], notes: [] })
      setLabelDrag({ id, start: w, delta: { x: 0, y: 0 } })
      return
    }
    if (kind === 'item' || kind === 'note') {
      const id = hit!.getAttribute('data-id')!
      const list = kind === 'item' ? 'items' : 'notes'
      let next: Selection = selection
      if (e.shiftKey) next = { ...selection, [list]: toggle(selection[list], id) }
      else if (!selection[list].includes(id)) next = { items: [], wires: [], notes: [], [list]: [id] }
      setSelection(next)
      if (next[list].includes(id)) setDrag({ ids: bodyIds(next), start: w, delta: { x: 0, y: 0 }, clickId: id, shift: e.shiftKey })
      return
    }
    if (kind === 'wire') {
      const id = hit!.getAttribute('data-id')!
      setSelection(e.shiftKey ? { ...selection, wires: toggle(selection.wires, id) } : { items: [], wires: [id], notes: [] })
      return
    }
    // Empty canvas: start a box selection (a plain click, with no drag, just clears the selection).
    setMarquee({ from: w, to: w, additive: e.shiftKey, sx: e.clientX, sy: e.clientY, moved: false })
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const w = toWorld(e)
    if (panRef.current) {
      const p = panRef.current
      setView((v) => ({ ...v, x: p.vx + e.clientX - p.sx, y: p.vy + e.clientY - p.sy }))
    } else if (labelDrag) {
      const snapTo = (v: number) => Math.round(v / LABEL_SNAP) * LABEL_SNAP + 0
      setLabelDrag({ ...labelDrag, delta: { x: snapTo(w.x - labelDrag.start.x), y: snapTo(w.y - labelDrag.start.y) } })
    } else if (marquee) {
      const moved = marquee.moved || Math.hypot(e.clientX - marquee.sx, e.clientY - marquee.sy) > DRAG_THRESHOLD
      setMarquee({ ...marquee, to: w, moved })
    } else if (drag) {
      const raw = { x: snap(w.x - drag.start.x), y: snap(w.y - drag.start.y) }
      const moving = terminalPoints(doc.items.filter((i) => drag.ids.includes(i.id)))
      const fixed = terminalPoints(doc.items.filter((i) => !drag.ids.includes(i.id)))
      const a = alignDelta(moving, fixed, raw)
      setGuides({ x: a.guideX, y: a.guideY })
      setDrag({ ...drag, delta: a.delta })
    } else if (wireEdit) {
      const snap10 = (v: number) => Math.round(v / 10) * 10 + 0
      const fixed = [...terminalPoints(doc.items), ...doc.wires.filter((x) => x.id !== wireEdit.id).flatMap((x) => x.via ?? [])]
      const far = wireEdit.moved || Math.hypot(e.clientX - wireEdit.sx, e.clientY - wireEdit.sy) > DRAG_THRESHOLD
      if (wireEdit.mode === 'move') {
        const raw = { x: snap10(w.x), y: snap10(w.y) }
        const a = alignDelta([raw], fixed, { x: 0, y: 0 }, 8)
        setGuides({ x: a.guideX, y: a.guideY })
        const via = wireEdit.via.map((p, i) => (i === wireEdit.index ? { x: raw.x + a.delta.x, y: raw.y + a.delta.y } : p))
        setWireEdit({ ...wireEdit, via, moved: far })
      } else {
        // Slide the segment sideways: only the coordinate across it changes.
        const A = wireEdit.pts[wireEdit.k]
        const B = wireEdit.pts[wireEdit.k + 1]
        const horizontal = Math.abs(A.y - B.y) < 0.01
        const probe = { x: horizontal ? (A.x + B.x) / 2 : snap10(w.x), y: horizontal ? snap10(w.y) : (A.y + B.y) / 2 }
        const a = alignDelta([probe], fixed, { x: 0, y: 0 }, 8)
        setGuides({ x: horizontal ? undefined : a.guideX, y: horizontal ? a.guideY : undefined })
        const across = horizontal ? probe.y + a.delta.y : probe.x + a.delta.x
        const offset = across - (horizontal ? A.y : A.x)
        setWireEdit({ ...wireEdit, via: shiftSegment(wireEdit.pts, wireEdit.k, offset), moved: far && offset !== 0 })
      }
    } else if (wiring) {
      const target = nearestTerminal(w, wiring.from)
      setWiring({ ...wiring, cursor: w, target, tap: target ? null : findTap(w, wiring.from) })
    } else if (armed) {
      const def = getSymbol(armed)!
      const at = snapPlacement(def, w, 1, armedOrient.rot, armedOrient.mirror)
      const probe: Item = { id: 'ghost', symbolId: def.id, x: at.x, y: at.y, rot: armedOrient.rot, label: '', mirror: armedOrient.mirror || undefined }
      const a = alignDelta(terminalPoints([probe]), terminalPoints(doc.items), { x: 0, y: 0 })
      setGuides({ x: a.guideX, y: a.guideY })
      setGhost({ x: at.x + a.delta.x, y: at.y + a.delta.y })
    }
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    panRef.current = null
    setPanning(false)
    setGuides({})
    if (marquee) {
      if (marquee.moved) {
        const box = normBox(marquee.from, marquee.to)
        const mode = boxMode(marquee.from, marquee.to)
        const items = itemsInBox(doc.items, box, mode)
        const noteIds = notesInBox(doc.notes, box, mode)
        const wireIds = wiresInBox(wireGeometries(doc), box, mode)
        setSelection(
          marquee.additive
            ? {
                items: [...new Set([...selection.items, ...items])],
                wires: [...new Set([...selection.wires, ...wireIds])],
                notes: [...new Set([...selection.notes, ...noteIds])],
              }
            : { items, wires: wireIds, notes: noteIds },
        )
      } else if (!marquee.additive) {
        setSelection(EMPTY)
      }
      setMarquee(null)
    }
    if (drag) {
      if (drag.delta.x || drag.delta.y) dispatch({ type: 'move', ids: drag.ids, dx: drag.delta.x, dy: drag.delta.y })
      else if (!drag.shift && drag.ids.length > 1) {
        // A plain click on one of several selected objects narrows the selection to it.
        const isNote = doc.notes.some((n) => n.id === drag.clickId)
        setSelection(isNote ? { items: [], wires: [], notes: [drag.clickId] } : { items: [drag.clickId], wires: [], notes: [] })
      }
      setDrag(null)
    }
    if (labelDrag) {
      const item = doc.items.find((i) => i.id === labelDrag.id)
      if (item && (labelDrag.delta.x || labelDrag.delta.y)) {
        dispatch({ type: 'label-offset', id: item.id, offset: { x: (item.labelOffset?.x ?? 0) + labelDrag.delta.x, y: (item.labelOffset?.y ?? 0) + labelDrag.delta.y } })
      }
      setLabelDrag(null)
    }
    if (wireEdit) {
      if (wireEdit.moved) dispatch({ type: 'wire-route', id: wireEdit.id, via: wireEdit.via })
      setWireEdit(null)
    }
    if (wiring) {
      const w = toWorld(e)
      const target = nearestTerminal(w, wiring.from)
      if (target) dispatch({ type: 'wire', a: wiring.from, b: target })
      else {
        const tap = findTap(w, wiring.from)
        if (tap) dispatch({ type: 'tap', request: { wireId: tap.wireId, at: tap.point, from: wiring.from, junctionId: uid('i'), secondId: uid('w'), newId: uid('w') } })
      }
      setWiring(null)
    }
  }

  /** Where a wire dragged from `from` would tap into an existing wire, if the pointer is over one (not the wires already on `from`). */
  const findTap = (p: Pt, from: Endpoint): { wireId: string; point: Pt } | null => {
    const own = new Set(doc.wires.filter((x) => (x.a.item === from.item && x.a.term === from.term) || (x.b.item === from.item && x.b.term === from.term)).map((x) => x.id))
    const geoms = wireGeometries(doc)
    const hit = nearestWirePoint(geoms, p, 10, own)
    const geom = hit && geoms.find((g) => g.id === hit.wireId)
    const point = hit && geom ? tapPoint(geom, hit) : null
    return hit && point ? { wireId: hit.wireId, point } : null
  }

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Double-clicking a waypoint of the selected wire removes it.
    if (selection.wires.length === 1 && !selection.items.length && !selection.notes.length) {
      const wire = doc.wires.find((x) => x.id === selection.wires[0])
      const at = toWorld(e)
      const reach = 9 / view.k
      const i = wire?.via?.findIndex((v) => Math.hypot(v.x - at.x, v.y - at.y) <= reach) ?? -1
      if (wire?.via && i >= 0) {
        dispatch({ type: 'wire-route', id: wire.id, via: wire.via.filter((_, k) => k !== i) })
        return
      }
    }
    // While the pointer is captured by the canvas the event target is the canvas itself, so find the note by position.
    const w = toWorld(e)
    const pad = 4
    const note = [...doc.notes].reverse().find((n) => {
      const b = noteBounds(n)
      return w.x >= b.x - pad && w.x <= b.x + b.w + pad && w.y >= b.y - pad && w.y <= b.y + b.h + pad
    })
    if (!note) return
    if (noteRot(note) !== 0) return onToast('Rotated text is edited in the panel on the right.')
    editFocused.current = false
    setSelection({ items: [], wires: [], notes: [note.id] })
    setEditing({ note: { ...note }, isNew: false })
  }

  const finishEdit = useCallback(
    (commit: boolean) => {
      if (!editing) return
      const { note, isNew } = editing
      setEditing(null)
      if (!commit) return
      const text = note.text.replace(/\s+$/g, '')
      if (isNew) {
        if (!text.trim()) return
        dispatch({ type: 'add-note', note: { ...note, text } })
        setSelection({ items: [], wires: [], notes: [note.id] })
      } else if (!text.trim()) {
        dispatch({ type: 'delete', items: [], wires: [], notes: [note.id] })
        setSelection(EMPTY)
      } else {
        dispatch({ type: 'edit-note', id: note.id, patch: { text } })
      }
    },
    [editing],
  )

  /* ---------- export ---------- */

  const exportSvg = () => {
    if (!doc.items.length && !doc.notes.length) return onToast('Nothing to export yet')
    downloadText('muriel-schematic.svg', diagramToSvg(doc).svg)
  }
  const exportPng = async () => {
    if (!doc.items.length && !doc.notes.length) return onToast('Nothing to export yet')
    try {
      const { svg, width, height } = diagramToSvg(doc, { background: '#ffffff' })
      // Cap the bitmap so an A1 sheet does not ask the browser for a 30-megapixel canvas.
      const scale = Math.min(2, 6000 / Math.max(width, height))
      downloadBlob('muriel-schematic.png', await svgToPngBlob(svg, width, height, scale))
    } catch {
      onToast('PNG export failed in this browser')
    }
  }

  const print = () => {
    if (!doc.items.length && !doc.notes.length && !doc.sheet.enabled) return onToast('Nothing to print yet')
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
    if (wiring.tap) return routeWire(a, [a.dx, a.dy], wiring.tap.point, null)
    return routeWire(a, [a.dx, a.dy], { x: snap(wiring.cursor.x), y: snap(wiring.cursor.y) }, null)
  })()
  const marqueeBox = marquee?.moved ? normBox(marquee.from, marquee.to) : null
  // Handles appear when exactly one wire, and nothing else, is selected.
  const editableWire = (() => {
    if (selection.wires.length !== 1 || selection.items.length || selection.notes.length) return null
    const wire = shown.wires.find((x) => x.id === selection.wires[0])
    const geom = wire && wires.find((g) => g.id === wire.id)
    return wire && geom ? { wire, geom } : null
  })()
  const selCount = countOf(selection)
  const selectedIsEmpty = isEmpty(selection)
  const allConflicts = conflictIds.length + conflictNoteIds.length

  return (
    <div className="editor">
      <aside className="palette" aria-label="Symbol palette">
        <div className="palette-search">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbols…" aria-label="Search palette" />
        </div>
        <div className="palette-list">
          {query.trim() ? (
            filtered.length ? (
              filtered.map((d) => <PaletteButton key={d.id} def={d} armed={armed === d.id} onPick={() => pick(d.id)} />)
            ) : (
              <p className="muted small pad">No matches.</p>
            )
          ) : (
            CATEGORIES.map((c) => (
              <div key={c.id} className="palette-group">
                <h3>{c.name}</h3>
                {SYMBOLS.filter((s) => s.category === c.id).map((d) => (
                  <PaletteButton key={d.id} def={d} armed={armed === d.id} onPick={() => pick(d.id)} />
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="stage">
        <div className="editor-toolbar" role="toolbar" aria-label="Editor actions">
          <button className="icon-btn" onClick={() => dispatch({ type: 'undo' })} disabled={!hist.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><UndoIcon /></button>
          <button className="icon-btn" onClick={() => dispatch({ type: 'redo' })} disabled={!hist.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><RedoIcon /></button>
          <span className="sep" />
          <button className="icon-btn" onClick={rotateSelected} disabled={!hasBody && !armed} aria-label="Rotate" title="Rotate (R)"><RotateIcon /></button>
          <button className="icon-btn" onClick={() => flipSelected('h')} disabled={!hasBody && !armed} aria-label="Flip left-right" title="Flip left-right (F)"><FlipHIcon /></button>
          <button className="icon-btn" onClick={() => flipSelected('v')} disabled={!hasBody && !armed} aria-label="Flip top-bottom" title="Flip top-bottom (Shift+F)"><FlipVIcon /></button>
          <button className="icon-btn" onClick={duplicateSelected} disabled={!hasBody} aria-label="Duplicate selected" title="Duplicate (Ctrl+D)"><DuplicateIcon /></button>
          <button className="icon-btn" onClick={deleteSelected} disabled={selectedIsEmpty} aria-label="Delete selected" title="Delete (Del)"><TrashIcon /></button>
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
          {allConflicts > 0 && (
            <button className="chip-btn" onClick={() => setSelection({ items: conflictIds, wires: [], notes: conflictNoteIds })} title="Select what is outside the frame or under the title block">
              <WarnIcon /> {allConflicts} off sheet
            </button>
          )}
          <span className="grow" />
          <button className="btn small" onClick={() => { const ex = dolStarterExample(); dispatch({ type: 'load', doc: ex }); setSelection(EMPTY); requestAnimationFrame(() => fit(ex)) }} aria-label="Load example circuit" title="Load the motor starter example">Example</button>
          <button className="btn small" onClick={() => { dispatch({ type: 'load', doc: { items: [], wires: [], notes: [], sheet: doc.sheet } }); setSelection(EMPTY) }} disabled={!doc.items.length && !doc.notes.length}>Clear</button>
          <button className="icon-btn" onClick={print} aria-label="Print or save as PDF" title="Print / save as PDF"><PrintIcon /></button>
          <button className="btn small" onClick={exportSvg} aria-label="Export SVG" title="Export as SVG">SVG</button>
          <button className="btn small primary" onClick={exportPng} aria-label="Export PNG" title="Export as PNG">PNG</button>
        </div>

        <div className="stage-body">
          <nav className="tool-rail" aria-label="Tools">
            <button className="icon-btn" aria-pressed={tool === 'select'} onClick={() => setTool('select')} aria-label="Select tool" title="Select (V). Drag empty space for a selection box"><CursorIcon /></button>
            <button className="icon-btn" aria-pressed={tool === 'text'} onClick={() => setTool('text')} aria-label="Text tool" title="Text (T). Click the canvas, type, then click away"><TextIcon /></button>
            <button className="icon-btn" aria-pressed={tool === 'pan'} onClick={() => setTool('pan')} aria-label="Pan tool" title="Pan (H). Or hold Space, or use the middle mouse button"><HandIcon /></button>
          </nav>

          <div className="canvas-wrap">
            <svg
              ref={svgRef}
              className={`canvas${armed ? ' is-armed' : ''}${wiring ? ' is-wiring' : ''}${panMode ? ' is-pan' : ''}${tool === 'text' ? ' is-text' : ''}${panning ? ' is-panning' : ''}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => { setGhost(null); setGuides({}) }}
              onDoubleClick={onDoubleClick}
              onAuxClick={(e) => e.preventDefault()}
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
                  {wires.map((w) => {
                    const st = wireStroke(wireStyles.get(w.id))
                    const selected = selection.wires.includes(w.id)
                    const tapped = wiring?.tap?.wireId === w.id
                    return (
                      <g key={w.id}>
                        <path
                          className={`wire${selected ? ' selected' : ''}${tapped ? ' tap-target' : ''}`}
                          d={pointsToPath(w.points)}
                          style={{ strokeWidth: st.width + (selected || tapped ? 1 : 0), strokeDasharray: st.dash }}
                        />
                        <path className="wire-hit" data-kind="wire" data-id={w.id} d={pointsToPath(w.points)} />
                      </g>
                    )
                  })}
                </g>

                {editableWire && (
                  <g className="wire-handles">
                    {editableWire.geom.points.slice(0, -1).map((p, i) => {
                      const q = editableWire.geom.points[i + 1]
                      if (Math.hypot(q.x - p.x, q.y - p.y) < 30) return null
                      const mx = (p.x + q.x) / 2
                      const my = (p.y + q.y) / 2
                      return (
                        <circle
                          key={`s${i}`}
                          className="handle seg"
                          data-kind="seg"
                          data-wire={editableWire.geom.id}
                          data-seg={i}
                          cx={mx}
                          cy={my}
                          r={5 / view.k}
                        />
                      )
                    })}
                    {(editableWire.wire.via ?? []).map((v, i) => (
                      <rect
                        key={`v${i}`}
                        className="handle via"
                        data-kind="via"
                        data-wire={editableWire.geom.id}
                        data-index={i}
                        x={v.x - 5 / view.k}
                        y={v.y - 5 / view.k}
                        width={10 / view.k}
                        height={10 / view.k}
                      />
                    ))}
                  </g>
                )}

                {guides.x !== undefined && <line className="guide" x1={guides.x} x2={guides.x} y1={-4000} y2={6000} />}
                {guides.y !== undefined && <line className="guide" y1={guides.y} y2={guides.y} x1={-4000} x2={6000} />}

                {shown.items
                  .filter((it) => conflictIds.includes(it.id))
                  .map((it) => {
                    const b = itemBounds(it, defOf(it))
                    return <rect key={it.id} className="conflict-box" x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx="6" />
                  })}

                {shown.notes
                  .filter((n) => conflictNoteIds.includes(n.id))
                  .map((n) => {
                    const b = noteBounds(n)
                    return <rect key={n.id} className="conflict-box" x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx="4" />
                  })}

                {selBounds.map(({ id, b }) => (
                  <rect key={id} className="sel-box" x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx="6" />
                ))}
                {selectedNotes.map((n) => {
                  const b = noteBounds(n)
                  return <rect key={n.id} className="sel-box" x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx="4" />
                })}

                {shown.items.map((it) => {
                  const lb = labelBox(it)
                  if (!lb) return null
                  const p = labelPos(it)
                  return (
                    <g key={`lbl-${it.id}`} className="label-block">
                      <rect className="label-hit" data-kind="label" data-id={it.id} x={lb.x} y={lb.y} width={lb.w} height={lb.h} rx="3" />
                      {labelLines(it).map((l, i) => (
                        <text key={i} className={`item-label ${l.kind}`} x={p.x} y={p.y + i * LABEL_LINE_H}>
                          {l.text}
                        </text>
                      ))}
                    </g>
                  )
                })}

                {shown.items.map((it) => {
                  const def = defOf(it)
                  const pv = pivotOf(def)
                  const k = itemScale(it)
                  return (
                    <g key={it.id}>
                      <g
                        className="item"
                        data-kind="item"
                        data-id={it.id}
                        transform={`translate(${it.x} ${it.y}) rotate(${it.rot}) translate(${-pv.x * k} ${-pv.y * k})`}
                      >
                        <rect className="item-hit" x={(def.bounds?.x ?? 0) * k - 4} y={(def.bounds?.y ?? 0) * k - 4} width={(def.bounds?.w ?? def.width) * k + 8} height={(def.bounds?.h ?? def.height) * k + 8} />
                        {it.symbolId === JUNCTION_SYMBOL && <title>Junction. Alt+drag to start a wire from it.</title>}
                        <GlyphBody def={def} scale={k} mirror={itemMirror(it)} />
                      </g>
                    </g>
                  )
                })}

                {shown.notes
                  .filter((n) => !(editing && !editing.isNew && editing.note.id === n.id))
                  .map((n) => {
                    const box = noteLocalBox(n)
                    const rot = noteRot(n)
                    return (
                      <g key={n.id} className="note" data-kind="note" data-id={n.id} transform={`translate(${n.x} ${n.y})${rot ? ` rotate(${rot})` : ''}`}>
                        <rect className="note-hit" x={box.x - 4} y={box.y - 4} width={box.w + 8} height={box.h + 8} />
                        <text className="note-text" fontSize={n.size} fontWeight={n.bold ? 700 : 400} textAnchor={n.align ?? 'start'}>
                          {noteLines(n).map((line, i) => (
                            <tspan key={i} x={0} dy={i === 0 ? 0 : n.size * NOTE_LINE}>
                              {line || '\u00a0'}
                            </tspan>
                          ))}
                        </text>
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
                    const zero = p.dx === 0 && p.dy === 0
                    const lx = p.x + p.dx * 12
                    const ly = zero ? p.y - 10 : p.y + p.dy * 12 + (p.dy === 0 ? 4 : p.dy > 0 ? 8 : 0)
                    const junction = it.symbolId === JUNCTION_SYMBOL
                    return (
                      <g key={`${it.id}:${t.id}`} className={`term-g tg-${t.role}${isTarget ? ' is-target' : ''}`}>
                        {!junction && <circle className="t-dot" cx={p.x} cy={p.y} r={3.5} />}
                        {!junction && <circle className="t-hit" data-kind="term" data-item={it.id} data-term={t.id} cx={p.x} cy={p.y} r={10} />}
                        <text className="t-label" x={lx} y={ly} textAnchor={p.dx > 0 ? 'start' : p.dx < 0 ? 'end' : 'middle'}>
                          {t.label}
                        </text>
                      </g>
                    )
                  })
                })}

                {draftPoints && <path className="wire draft" d={pointsToPath(draftPoints)} />}
                {wiring?.tap && <circle className="tap-dot" cx={wiring.tap.point.x} cy={wiring.tap.point.y} r={6} />}

                {armedDef && ghost && (
                  <g
                    className="ghost"
                    transform={`translate(${ghost.x} ${ghost.y}) rotate(${armedOrient.rot}) translate(${-pivotOf(armedDef).x} ${-pivotOf(armedDef).y})`}
                    pointerEvents="none"
                  >
                    <GlyphBody def={armedDef} mirror={armedOrient.mirror} />
                  </g>
                )}

                {marqueeBox && marquee && (
                  <rect
                    className={`marquee ${boxMode(marquee.from, marquee.to)}`}
                    x={marqueeBox.x}
                    y={marqueeBox.y}
                    width={marqueeBox.w}
                    height={marqueeBox.h}
                    pointerEvents="none"
                  />
                )}
              </g>
            </svg>

            {!doc.items.length && !doc.notes.length && !armed && !editing && (
              <div className="canvas-empty">
                <p><strong>Empty canvas</strong></p>
                <p className="muted">Pick a symbol on the left, then click here to place it. Drag from one terminal dot to another to draw a wire.</p>
              </div>
            )}
            {armedDef && (
              <div className="canvas-hint" role="status">
                Placing <strong>{armedDef.name}</strong>. Click to place, <kbd>R</kbd> rotate, <kbd>F</kbd> flip, <kbd>Esc</kbd> stop
              </div>
            )}
            {tool === 'text' && !armedDef && (
              <div className="canvas-hint" role="status">
                Click where the text should go. <kbd>Esc</kbd> to cancel
              </div>
            )}
            {editing && (
              <textarea
                className="note-editor"
                aria-label="Note text"
                value={editing.note.text}
                rows={Math.max(1, noteLines(editing.note).length)}
                onChange={(e) => setEditing({ ...editing, note: { ...editing.note, text: e.target.value } })}
                onFocus={() => (editFocused.current = true)}
                onBlur={() => editFocused.current && finishEdit(true)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') finishEdit(false)
                  else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finishEdit(true)
                }}
                ref={(el) => {
                  if (el && !editFocused.current) window.setTimeout(() => { el.focus(); el.select() }, 30)
                }}
                style={{
                  left: view.x + editing.note.x * view.k,
                  top: view.y + (editing.note.y - editing.note.size) * view.k,
                  fontSize: editing.note.size * view.k,
                  fontWeight: editing.note.bold ? 700 : 400,
                  lineHeight: NOTE_LINE,
                  textAlign: editing.note.align === 'middle' ? 'center' : editing.note.align === 'end' ? 'right' : 'left',
                  width: Math.max(140, Math.max(...noteLines(editing.note).map((l) => l.length), 6) * editing.note.size * 0.62 * view.k + 24),
                  transform: editing.note.align === 'middle' ? 'translateX(-50%)' : editing.note.align === 'end' ? 'translateX(-100%)' : undefined,
                }}
              />
            )}
            {!armedDef && !editing && selCount > 1 && (
              <div className="canvas-hint" role="status">
                {selCount} selected
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="inspector" aria-label="Inspector">
        <Inspector
          doc={doc}
          selection={selection}
          fitPlan={fitPlan}
          shrinkPlan={shrinkPlan}
          conflictCount={allConflicts}
          onLabel={(id, label) => dispatch({ type: 'label', id, label })}
          onProps={(id, patch) => dispatch({ type: 'props', id, patch })}
          onResetLabel={(id) => dispatch({ type: 'label-offset', id, offset: null })}
          onWireStyle={(patch) => dispatch({ type: 'wire-style', ids: selection.wires, patch })}
          onResetRoute={(id) => dispatch({ type: 'wire-route', id, via: null })}
          onNote={(id, patch) => dispatch({ type: 'edit-note', id, patch })}
          onSheet={(patch) => dispatch({ type: 'sheet', patch })}
          onResize={resizeSelected}
          onSetScale={(scale) => hasItems && dispatch({ type: 'set-scale', ids: selection.items, scale })}
          onRotate={rotateSelected}
          onFlip={flipSelected}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onAlign={align}
          onDistribute={distribute}
          onFitSheet={fitToSheet}
          onShrink={shrinkAndFit}
          onScaleAll={scaleAll}
        />
      </aside>
    </div>
  )

  function pick(id: string) {
    setArmed((cur) => (cur === id ? null : id))
    setArmedOrient({ rot: 0, mirror: false })
  }
}

function PaletteButton({ def, armed, onPick }: { def: SymbolDef; armed: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`palette-item${armed ? ' armed' : ''}`} onClick={onPick} aria-pressed={armed}>
      <SymbolSvg def={def} className="mini-glyph" />
      <span>{def.name}</span>
    </button>
  )
}