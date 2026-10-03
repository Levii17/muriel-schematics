import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import type { AlignMode, Axis } from '@/editor/actions/align'
import { conflictingItemIds, conflictingNoteIds, conflictingShapeIds, planFit, planShrink } from '@/editor/actions/checks'
import type { Payload } from '@/editor/actions/clipboard'
import { clonePayload, copyPayload } from '@/editor/actions/clipboard'
import type { ProjectHistory } from '@/editor/actions/project'
import { initProject, projectReducer } from '@/editor/actions/project'
import type { Selection } from '@/editor/actions/select'
import {
  EMPTY,
  bodyIds,
  boxMode,
  countOf,
  isEmpty,
  itemsInBox,
  normBox,
  notesInBox,
  sel,
  shapesInBox,
  toggle,
  wiresInBox,
} from '@/editor/actions/select'
import { nextOrientation } from '@/editor/actions/transform'
import { diagramToSvg } from '@/editor/io/export'
import { restoreProject, STORED_PROJECT_VERSION } from '@/editor/io/persist'
import { nextLabel, scaleDrawing, uid } from '@/editor/model/doc'
import { defOf, itemBounds, itemScale, snapPlacement, terminalWorld } from '@/editor/model/geometry'
import { LABEL_LINE_H, labelBox, labelLines, labelPos } from '@/editor/model/labels'
import { alignDelta, terminalPoints } from '@/editor/model/magnet'
import { itemPrims, NET_LABEL_SYMBOL } from '@/editor/model/netlabel'
import type { NetLabelRef } from '@/editor/model/nets'
import { flaggedLabels, netGroups, netIssues, suggestNetName, xrefLabels } from '@/editor/model/nets'
import { NOTE_LINE, noteBounds, noteLines, noteLocalBox, noteRot } from '@/editor/model/notes'
import { sheetName } from '@/editor/model/project'
import { pointsToPath, routeWire } from '@/editor/model/routing'
import type { HandleId } from '@/editor/model/shapes'
import { handlesOf, isUsable, moveShape, resizeShape, shapeBounds, shapeFromDrag } from '@/editor/model/shapes'
import { PAPER, paperBox, sheetPrims } from '@/editor/model/sheet'
import type { Doc, Endpoint, Item, Rot, Shape, TextNote } from '@/editor/model/types'
import { junctions, wireGeometries } from '@/editor/model/wires'
import { JUNCTION_SYMBOL, JUNCTION_TERMINAL, nearestWirePoint, shiftSegment, shiftWires, tapPoint, wireStroke } from '@/editor/model/wires'
import { Inspector } from '@/editor/ui/Inspector'
import type { MenuEntry } from '@/editor/ui/Menu'
import { Menu } from '@/editor/ui/Menu'
import { PaletteButton } from '@/editor/ui/PaletteButton'
import type { SheetSummary } from '@/editor/ui/ProjectPanel'
import { ShapeView, hitWidth } from '@/editor/ui/ShapeView'
import { SheetTabs } from '@/editor/ui/SheetTabs'
import type { Tap } from '@/editor/ui/gestures'
import { isDoubleTap, pinchView } from '@/editor/ui/gestures'
import { isTextTarget, usesSpace } from '@/editor/ui/keys'
import type { Marquee, Tool, View, WireEdit } from '@/editor/ui/state'
import { DRAG_THRESHOLD, LABEL_SNAP, MAX_ZOOM, MIN_ZOOM, PROJECT_KEY, SHAPE_TOOLS, SNAP_RADIUS, STORAGE_KEY, TOUCH_SLOP } from '@/editor/ui/state'
import {
  CursorIcon,
  DuplicateIcon,
  FitIcon,
  FlipHIcon,
  FlipVIcon,
  HandIcon,
  ChevronDownIcon,
  CloseIcon,
  DownloadIcon,
  MinusIcon,
  PlusIcon,
  MoreIcon,
  MultiSelectIcon,
  PartsIcon,
  RedoIcon,
  RotateIcon,
  SlidersIcon,
  EllipseIcon,
  LineIcon,
  RectIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
  WarnIcon,
} from '@/shared/Icons'
import { downloadBlob, downloadText, svgToPngBlob } from '@/shared/download'
import type { Pt } from '@/shared/geometry'
import { snap } from '@/shared/geometry'
import { printPages, printSheet } from '@/shared/print'
import { loadJson, saveJson } from '@/shared/storage'
import { useCoarsePointer } from '@/shared/useMedia'
import { CATEGORIES, SYMBOLS, getSymbol } from '@/symbols'
import { GlyphBody, Prims } from '@/symbols/Glyph'
import { pivotOf } from '@/symbols/geometry'
import { searchSymbols } from '@/symbols/search'
import type { SymbolDef } from '@/symbols/types'

import { dolStarterExample } from './examples'

interface Props {
  armId: string | null
  loadExample: boolean
  onToast: (msg: string) => void
}

/** The saved drawing, a drawing saved by an earlier version (one sheet), or the starter example. */
function initialProject(): ProjectHistory {
  const restored = restoreProject(loadJson<unknown>(PROJECT_KEY), loadJson<unknown>(STORAGE_KEY), () => uid('s'))
  return restored ? initProject(restored.sheets, restored.active) : initProject([{ id: uid('s'), doc: dolStarterExample() }])
}

export default function Editor({ armId, loadExample, onToast }: Props) {
  const [proj, dispatch] = useReducer(projectReducer, undefined, initialProject)
  const sheets = proj.present
  const activeIndex = Math.max(0, sheets.findIndex((s) => s.id === proj.active))
  const doc = sheets[activeIndex].doc

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
  const [drawing, setDrawing] = useState<{ kind: Shape['kind']; from: Pt; to: Pt; constrain: boolean; sx: number; sy: number } | null>(null)
  const [shapeEdit, setShapeEdit] = useState<{ id: string; handle: HandleId; orig: Shape; shape: Shape; sx: number; sy: number; moved: boolean } | null>(null)
  const [query, setQuery] = useState('')
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({})

  const svgRef = useRef<SVGSVGElement>(null)
  const panRef = useRef<{ sx: number; sy: number; vx: number; vy: number; tap?: boolean; moved?: boolean } | null>(null)

  // Small screens: which slide-over panel is open, and the touch gestures that stand in for mouse and keys.
  const coarse = useCoarsePointer()
  const [panel, setPanel] = useState<'parts' | 'details' | null>(null)
  /** Touch stand-in for holding Shift: taps add to the selection and a drag on empty space draws a box. */
  const [multi, setMulti] = useState(false)
  const touches = useRef(new Map<number, Pt>())
  const pinch = useRef<{ ids: [number, number]; from: [Pt, Pt]; view: View } | null>(null)
  const pinched = useRef(false)
  const touchPlace = useRef<number | null>(null)
  const slop = useRef(DRAG_THRESHOLD)
  const downAt = useRef<Pt | null>(null)
  const lastTap = useRef<Tap | null>(null)
  const swallowDbl = useRef(false)
  const clipRef = useRef<Payload | null>(null)
  const editFocused = useRef(false)
  const pasteCount = useRef(0)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => saveJson(PROJECT_KEY, { v: STORED_PROJECT_VERSION, active: proj.active, sheets: proj.present }), [proj.present, proj.active])

  // Undo, redo and deletes can leave ids behind; only ever act on ones that still exist.
  const selection: Selection = useMemo(() => {
    const items = rawSelection.items.filter((id) => doc.items.some((i) => i.id === id))
    const wires = rawSelection.wires.filter((id) => doc.wires.some((w) => w.id === id))
    const notes = rawSelection.notes.filter((id) => doc.notes.some((n) => n.id === id))
    const shapes = rawSelection.shapes.filter((id) => doc.shapes.some((sh) => sh.id === id))
    const same = items.length === rawSelection.items.length && wires.length === rawSelection.wires.length && notes.length === rawSelection.notes.length && shapes.length === rawSelection.shapes.length
    return same ? rawSelection : { items, wires, notes, shapes }
  }, [rawSelection, doc.items, doc.wires, doc.notes, doc.shapes])

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
        shapes: d.shapes.map((sh) => (ids.includes(sh.id) ? moveShape(sh, delta.x, delta.y) : sh)),
        wires: shiftWires(d.wires, ids, delta.x, delta.y),
      }
    }
    if (shapeEdit && shapeEdit.moved) {
      d = { ...d, shapes: d.shapes.map((sh) => (sh.id === shapeEdit.id ? shapeEdit.shape : sh)) }
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
  }, [doc, drag, labelDrag, wireEdit, shapeEdit])

  const wireStyles = useMemo(() => new Map(doc.wires.map((w) => [w.id, w.style])), [doc.wires])
  const position = useMemo(() => ({ index: activeIndex + 1, total: sheets.length }), [activeIndex, sheets.length])
  const sheetArt = useMemo(() => (doc.sheet.enabled ? sheetPrims(doc.sheet, position) : null), [doc.sheet, position])

  // Net labels: who is linked to whom across every sheet, and what looks wrong.
  const xrefs = useMemo(() => xrefLabels(sheets, proj.active), [sheets, proj.active])
  const nets = useMemo(() => netGroups(sheets), [sheets])
  const issues = useMemo(() => netIssues(sheets), [sheets])
  const flagged = useMemo(() => flaggedLabels(issues, proj.active), [issues, proj.active])
  const sheetSummaries: SheetSummary[] = useMemo(
    () => sheets.map((s, i) => ({ id: s.id, name: sheetName(s, i), content: s.doc.items.length + s.doc.notes.length + s.doc.shapes.length, active: s.id === proj.active })),
    [sheets, proj.active],
  )
  const wires = useMemo(() => wireGeometries(shown), [shown])
  const dots = useMemo(() => junctions(shown), [shown])
  const selectedItems = doc.items.filter((i) => selection.items.includes(i.id))
  const selectedNotes = shown.notes.filter((n) => selection.notes.includes(n.id))

  const filtered = useMemo(() => searchSymbols(SYMBOLS, query), [query])
  const conflictIds = useMemo(() => conflictingItemIds(shown), [shown])
  const conflictNoteIds = useMemo(() => conflictingNoteIds(shown), [shown])
  const conflictShapeIds = useMemo(() => conflictingShapeIds(shown), [shown])
  const fitPlan = useMemo(() => planFit(doc), [doc])
  const shrinkPlan = useMemo(() => (fitPlan.ok ? null : planShrink(doc)), [doc, fitPlan])

  const panMode = tool === 'pan' || space
  const drawTool = SHAPE_TOOLS.includes(tool)

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
    if (!r || (!d.items.length && !d.notes.length && !d.shapes.length && !d.sheet.enabled)) {
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
    for (const sh of d.shapes) grow(shapeBounds(sh))
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

  /* ---------- sheets and net labels ---------- */

  // Each sheet remembers where you were looking. A jump to a label on another sheet waits here for the switch.
  const viewsRef = useRef(new Map<string, View>())
  const shownSheet = useRef(proj.active)
  const pendingJump = useRef<string | null>(null)

  const centerOn = useCallback((pt: Pt, k?: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    setView((v) => {
      const kk = Math.min(1.5, Math.max(0.6, k ?? v.k))
      return { k: kk, x: r.width / 2 - pt.x * kk, y: r.height / 2 - pt.y * kk }
    })
  }, [])

  // Runs for every way the open sheet can change: a tab, a jump, or undo landing on another sheet.
  useEffect(() => {
    if (shownSheet.current === proj.active) return
    viewsRef.current.set(shownSheet.current, viewRef.current)
    shownSheet.current = proj.active
    const target = pendingJump.current ? doc.items.find((i) => i.id === pendingJump.current) : undefined
    pendingJump.current = null
    const saved = viewsRef.current.get(proj.active)
    setWiring(null)
    setDrag(null)
    setLabelDrag(null)
    setMarquee(null)
    setWireEdit(null)
    setShapeEdit(null)
    setDrawing(null)
    if (target) {
      setSelection(sel({ items: [target.id], wires: [], notes: [] }))
      if (saved) setView(saved)
      centerOn({ x: target.x, y: target.y }, saved?.k ?? 1)
      return
    }
    setSelection(EMPTY)
    if (saved) setView(saved)
    else requestAnimationFrame(() => fit(doc))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj.active])

  const openSheet = useCallback((id: string) => dispatch({ type: 'project-open-sheet', id }), [])
  const addSheet = useCallback(() => dispatch({ type: 'project-add-sheet', id: uid('s') }), [])
  const moveSheet = useCallback((id: string, dir: -1 | 1) => dispatch({ type: 'project-move-sheet', id, dir }), [])
  const deleteSheet = useCallback(
    (id: string) => {
      const s = sheetSummaries.find((x) => x.id === id)
      if (!s) return
      if (s.content > 0 && !window.confirm(`Delete "${s.name}" and everything on it? Undo brings it back.`)) return
      dispatch({ type: 'project-delete-sheet', id })
    },
    [sheetSummaries],
  )

  /** Select a net label and bring it into view, switching sheets first when it is on another one. */
  const jumpTo = useCallback(
    (ref: NetLabelRef) => {
      if (ref.sheetId !== proj.active) {
        pendingJump.current = ref.itemId
        dispatch({ type: 'project-open-sheet', id: ref.sheetId })
        return
      }
      const it = doc.items.find((i) => i.id === ref.itemId)
      if (!it) return
      setSelection(sel({ items: [it.id], wires: [], notes: [] }))
      const r = svgRef.current?.getBoundingClientRect()
      const v = viewRef.current
      const sx = v.x + it.x * v.k
      const sy = v.y + it.y * v.k
      if (!r || sx < 40 || sy < 40 || sx > r.width - 40 || sy > r.height - 40) centerOn({ x: it.x, y: it.y })
    },
    [proj.active, doc.items, centerOn],
  )
  const [issueCursor, setIssueCursor] = useState(0)
  const nextIssue = () => {
    if (!issues.length) return
    jumpTo(issues[issueCursor % issues.length].labels[0])
    setIssueCursor((c) => c + 1)
  }

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
    dispatch({ type: 'delete', items: selection.items, wires: selection.wires, notes: selection.notes, shapes: selection.shapes })
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
          payload.shapes.length && `${payload.shapes.length} ${payload.shapes.length === 1 ? 'shape' : 'shapes'}`,
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
      setSelection(sel({ items: clone.items.map((i) => i.id), notes: clone.notes.map((n) => n.id), shapes: clone.shapes.map((sh) => sh.id) }))
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

  const selectAll = useCallback(() => setSelection({ items: doc.items.map((i) => i.id), wires: doc.wires.map((w) => w.id), notes: doc.notes.map((n) => n.id), shapes: doc.shapes.map((sh) => sh.id) }), [doc])

  const align = useCallback((mode: AlignMode) => dispatch({ type: 'align', ids: selection.items, mode }), [selection.items])
  const distribute = useCallback((axis: Axis) => dispatch({ type: 'distribute', ids: selection.items, axis }), [selection.items])

  const fitToSheet = useCallback(() => {
    const plan = planFit(doc)
    if (!plan.ok) return onToast('That will not fit even on A1. Make the parts smaller first.')
    dispatch({ type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    requestAnimationFrame(() => fit({ ...doc, items: doc.items.map((i) => ({ ...i, x: i.x + plan.dx, y: i.y + plan.dy })), notes: doc.notes.map((n) => ({ ...n, x: n.x + plan.dx, y: n.y + plan.dy })), shapes: doc.shapes.map((sh) => moveShape(sh, plan.dx, plan.dy)), sheet: { ...doc.sheet, size: plan.size } }))
  }, [doc, fit, onToast])

  const shrinkAndFit = useCallback(() => {
    const plan = planShrink(doc)
    if (!plan) return onToast('Even shrunk, that will not fit. Split it across sheets.')
    dispatch({ type: 'scale-all', factor: plan.factor })
    dispatch({ type: 'fit-sheet', dx: plan.plan.dx, dy: plan.plan.dy, size: plan.plan.size })
    const scaled = scaleDrawing(doc, plan.factor)!
    requestAnimationFrame(() => fit({ ...scaled, items: scaled.items.map((i) => ({ ...i, x: i.x + plan.plan.dx, y: i.y + plan.plan.dy })), notes: scaled.notes.map((n) => ({ ...n, x: n.x + plan.plan.dx, y: n.y + plan.plan.dy })), shapes: scaled.shapes.map((sh) => moveShape(sh, plan.plan.dx, plan.plan.dy)), sheet: { ...doc.sheet, size: plan.plan.size } }))
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
    const onControl = usesSpace(e.target)

    if (key === ' ' && !onControl) {
      e.preventDefault()
      setSpace(true)
    } else if (key === 'escape') {
      setPanel(null)
      setMulti(false)
      setArmed(null)
      setWiring(null)
      setGhost(null)
      setMarquee(null)
      setLabelDrag(null)
      setWireEdit(null)
      setDrawing(null)
      setShapeEdit(null)
      setTool((t) => (t === 'select' || t === 'pan' ? t : 'select'))
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
    } else if (key === 'l') {
      setTool('line')
    } else if (key === 'b') {
      setTool('rect')
    } else if (key === 'o') {
      setTool('ellipse')
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

  /** Where a part being placed would land for a pointer at w: on the grid by its first terminal, then pulled onto a nearby terminal line. */
  const placementAt = (def: SymbolDef, w: Pt): { at: Pt; guideX?: number; guideY?: number } => {
    const at = snapPlacement(def, w, 1, armedOrient.rot, armedOrient.mirror)
    const probe: Item = { id: 'ghost', symbolId: def.id, x: at.x, y: at.y, rot: armedOrient.rot, label: '', mirror: armedOrient.mirror || undefined }
    const a = alignDelta(terminalPoints([probe]), terminalPoints(doc.items), { x: 0, y: 0 })
    return { at: { x: at.x + a.delta.x, y: at.y + a.delta.y }, guideX: a.guideX, guideY: a.guideY }
  }

  /** Drop whatever a single pointer was in the middle of, without committing it (a second finger, or the system, took over). */
  const cancelGestures = () => {
    panRef.current = null
    touchPlace.current = null
    setPanning(false)
    setWiring(null)
    setDrag(null)
    setLabelDrag(null)
    setMarquee(null)
    setWireEdit(null)
    setShapeEdit(null)
    setDrawing(null)
    setGhost(null)
    setGuides({})
  }

  /** Put the armed part down at world point `w`, snapped as usual. */
  const placeArmed = (w: Pt) => {
    const def = getSymbol(armed!)!
    // Work the spot out from this point, not from the last hover: a tap has no hover before it.
    const at = placementAt(def, w).at
    const item: Item = { id: uid('i'), symbolId: def.id, x: at.x, y: at.y, rot: armedOrient.rot, label: nextLabel(doc.items, def) }
    if (armedOrient.mirror) item.mirror = true
    if (def.id === NET_LABEL_SYMBOL) item.net = suggestNetName(sheets)
    dispatch({ type: 'add', item })
    setSelection(sel({ items: [item.id], wires: [], notes: [] }))
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const touch = e.pointerType === 'touch'
    if (touch) {
      const r = svgRef.current!.getBoundingClientRect()
      touches.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top })
      svgRef.current!.setPointerCapture(e.pointerId)
      if (touches.current.size === 2) {
        // A second finger turns whatever the first was doing into a pinch: zoom and pan together.
        cancelGestures()
        const ids = [...touches.current.keys()].slice(0, 2) as [number, number]
        pinch.current = { ids, from: [touches.current.get(ids[0])!, touches.current.get(ids[1])!], view: viewRef.current }
        pinched.current = true
        return
      }
      if (touches.current.size > 2 || pinched.current) return
    }
    slop.current = touch ? TOUCH_SLOP : DRAG_THRESHOLD
    downAt.current = { x: e.clientX, y: e.clientY }
    if (e.button !== 0 && e.button !== 1) return
    if (e.button === 1) e.preventDefault()
    const hit = (e.target as Element).closest('[data-kind]')
    const kind = hit?.getAttribute('data-kind')
    const w = toWorld(e)
    const shift = e.shiftKey || multi
    svgRef.current!.setPointerCapture(e.pointerId)

    // Pan: Pan tool, Space held, or middle mouse. Works over anything.
    if (e.button === 1 || panMode) {
      panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
      setPanning(true)
      return
    }

    // Drawing tools: a drag anywhere draws the shape (they never connect to parts or wires).
    if (drawTool && !armed) {
      const p = { x: Math.round(w.x / 10) * 10 + 0, y: Math.round(w.y / 10) * 10 + 0 }
      setDrawing({ kind: tool as Shape['kind'], from: p, to: p, constrain: e.shiftKey, sx: e.clientX, sy: e.clientY })
      setSelection(EMPTY)
      return
    }
    if (kind === 'shandle') {
      const id = hit!.getAttribute('data-id')!
      const shape = doc.shapes.find((sh) => sh.id === id)
      if (shape) setShapeEdit({ id, handle: hit!.getAttribute('data-h') as HandleId, orig: shape, shape, sx: e.clientX, sy: e.clientY, moved: false })
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
      if (touch) {
        // A finger hides the spot, so show the ghost and place when it lifts; drag to fine-tune first.
        touchPlace.current = e.pointerId
        const p = placementAt(getSymbol(armed)!, w)
        setGuides({ x: p.guideX, y: p.guideY })
        setGhost(p.at)
        return
      }
      placeArmed(w)
      return
    }
    if (kind === 'label') {
      const id = hit!.getAttribute('data-id')!
      setSelection(sel({ items: [id], wires: [], notes: [] }))
      setLabelDrag({ id, start: w, delta: { x: 0, y: 0 } })
      return
    }
    if (kind === 'item' || kind === 'note' || kind === 'shape') {
      const id = hit!.getAttribute('data-id')!
      const list = kind === 'item' ? 'items' : kind === 'note' ? 'notes' : 'shapes'
      let next: Selection = selection
      if (shift) next = { ...selection, [list]: toggle(selection[list], id) }
      else if (!selection[list].includes(id)) next = sel({ [list]: [id] })
      setSelection(next)
      if (next[list].includes(id)) setDrag({ ids: bodyIds(next), start: w, delta: { x: 0, y: 0 }, clickId: id, shift })
      return
    }
    if (kind === 'wire') {
      const id = hit!.getAttribute('data-id')!
      setSelection(shift ? { ...selection, wires: toggle(selection.wires, id) } : sel({ wires: [id] }))
      return
    }
    // Empty canvas. A finger drags the view (a plain tap clears the selection); Multi-select turns it back into a
    // selection box. A mouse or pen starts a box straight away (a plain click, with no drag, just clears the selection).
    if (touch && !multi) {
      panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, tap: true, moved: false }
      setPanning(true)
      return
    }
    setMarquee({ from: w, to: w, additive: shift, sx: e.clientX, sy: e.clientY, moved: false })
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
      const r = svgRef.current!.getBoundingClientRect()
      touches.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top })
      const pc = pinch.current
      if (pc) {
        const a = touches.current.get(pc.ids[0])
        const b = touches.current.get(pc.ids[1])
        if (a && b) setView(pinchView(pc.view, pc.from, [a, b], MIN_ZOOM, MAX_ZOOM))
        return
      }
      if (pinched.current) return
    }
    const w = toWorld(e)
    if (panRef.current) {
      const p = panRef.current
      if (p.tap && !p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > slop.current) p.moved = true
      setView((v) => ({ ...v, x: p.vx + e.clientX - p.sx, y: p.vy + e.clientY - p.sy }))
    } else if (drawing) {
      setDrawing({ ...drawing, to: { x: Math.round(w.x / 10) * 10 + 0, y: Math.round(w.y / 10) * 10 + 0 }, constrain: e.shiftKey })
    } else if (shapeEdit) {
      const p = { x: Math.round(w.x / 10) * 10 + 0, y: Math.round(w.y / 10) * 10 + 0 }
      const far = shapeEdit.moved || Math.hypot(e.clientX - shapeEdit.sx, e.clientY - shapeEdit.sy) > slop.current
      setShapeEdit({ ...shapeEdit, shape: resizeShape(shapeEdit.orig, shapeEdit.handle, p, e.shiftKey), moved: far })
    } else if (labelDrag) {
      const snapTo = (v: number) => Math.round(v / LABEL_SNAP) * LABEL_SNAP + 0
      setLabelDrag({ ...labelDrag, delta: { x: snapTo(w.x - labelDrag.start.x), y: snapTo(w.y - labelDrag.start.y) } })
    } else if (marquee) {
      const moved = marquee.moved || Math.hypot(e.clientX - marquee.sx, e.clientY - marquee.sy) > slop.current
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
      const far = wireEdit.moved || Math.hypot(e.clientX - wireEdit.sx, e.clientY - wireEdit.sy) > slop.current
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
      const p = placementAt(getSymbol(armed)!, w)
      setGuides({ x: p.guideX, y: p.guideY })
      setGhost(p.at)
    }
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    const touch = e.pointerType === 'touch'
    if (touch) {
      touches.current.delete(e.pointerId)
      if (pinched.current) {
        // The pinch is over, but a finger left on the glass must not turn into a tap or a drag.
        if (touches.current.size < 2) pinch.current = null
        if (touches.current.size === 0) pinched.current = false
        lastTap.current = null
        return
      }
    }
    const tapped = touch && !!downAt.current && Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y) <= slop.current
    if (panRef.current?.tap && !panRef.current.moved) setSelection(EMPTY)
    if (touchPlace.current === e.pointerId) {
      touchPlace.current = null
      placeArmed(toWorld(e))
    }
    panRef.current = null
    setPanning(false)
    setGuides({})
    // Browsers differ on whether a double-tap becomes a double-click, so do it here and ignore the native one.
    if (tapped && !armed) {
      const now: Tap = { t: e.timeStamp, x: e.clientX, y: e.clientY }
      if (isDoubleTap(lastTap.current, now)) {
        lastTap.current = null
        swallowDbl.current = true
        window.setTimeout(() => (swallowDbl.current = false), 500)
        activateAt(e)
      } else lastTap.current = now
    }
    if (marquee) {
      if (marquee.moved) {
        const box = normBox(marquee.from, marquee.to)
        const mode = boxMode(marquee.from, marquee.to)
        const items = itemsInBox(doc.items, box, mode)
        const noteIds = notesInBox(doc.notes, box, mode)
        const shapeIds = shapesInBox(doc.shapes, box, mode)
        const wireIds = wiresInBox(wireGeometries(doc), box, mode)
        setSelection(
          marquee.additive
            ? {
                items: [...new Set([...selection.items, ...items])],
                wires: [...new Set([...selection.wires, ...wireIds])],
                notes: [...new Set([...selection.notes, ...noteIds])],
                shapes: [...new Set([...selection.shapes, ...shapeIds])],
              }
            : { items, wires: wireIds, notes: noteIds, shapes: shapeIds },
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
        const c = drag.clickId
        setSelection(doc.notes.some((n) => n.id === c) ? sel({ notes: [c] }) : doc.shapes.some((sh) => sh.id === c) ? sel({ shapes: [c] }) : sel({ items: [c] }))
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
    if (drawing) {
      const shape = shapeFromDrag(drawing.kind, uid('s'), drawing.from, drawing.to, drawing.constrain)
      if (isUsable(shape)) {
        dispatch({ type: 'add-shape', shape })
        setSelection(sel({ shapes: [shape.id] }))
      }
      setDrawing(null)
    }
    if (shapeEdit) {
      if (shapeEdit.moved) dispatch({ type: 'edit-shape', id: shapeEdit.id, shape: shapeEdit.shape })
      setShapeEdit(null)
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

  const onPointerCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
    if (touches.current.size === 0) pinched.current = false
    cancelGestures()
  }

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (swallowDbl.current) return
    activateAt(e)
  }

  /** Double-click or double-tap: remove a waypoint of the selected wire, or edit the note under the pointer. */
  const activateAt = (e: { clientX: number; clientY: number }) => {
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
    setSelection(sel({ items: [], wires: [], notes: [note.id] }))
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
        setSelection(sel({ items: [], wires: [], notes: [note.id] }))
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

  // Several sheets get numbered file names so exporting each one does not overwrite the last.
  const fileBase = sheets.length > 1 ? `muriel-schematic-sheet${activeIndex + 1}` : 'muriel-schematic'
  const exportOpts = { xrefs, position }
  const exportSvg = () => {
    if (!doc.items.length && !doc.notes.length && !doc.shapes.length) return onToast('Nothing to export yet')
    downloadText(`${fileBase}.svg`, diagramToSvg(doc, exportOpts).svg)
  }
  const exportPng = async () => {
    if (!doc.items.length && !doc.notes.length && !doc.shapes.length) return onToast('Nothing to export yet')
    try {
      const { svg, width, height } = diagramToSvg(doc, { background: '#ffffff', ...exportOpts })
      // Cap the bitmap so an A1 sheet does not ask the browser for a 30-megapixel canvas.
      const scale = Math.min(2, 6000 / Math.max(width, height))
      downloadBlob(`${fileBase}.png`, await svgToPngBlob(svg, width, height, scale))
    } catch {
      onToast('PNG export failed in this browser')
    }
  }

  const print = () => {
    if (!doc.items.length && !doc.notes.length && !doc.shapes.length && !doc.sheet.enabled) return onToast('Nothing to print yet')
    const { svg } = diagramToSvg(doc, { background: '#ffffff', ...exportOpts })
    if (!printSheet(svg, doc.sheet.size)) onToast('Allow pop-ups to print, or export the SVG instead')
  }

  /** Every sheet, in order, one per page at its own paper size. */
  const printAll = () => {
    const pages = sheets.map((s, i) => ({
      svg: diagramToSvg(s.doc, { background: '#ffffff', xrefs: xrefLabels(sheets, s.id), position: { index: i + 1, total: sheets.length } }).svg,
      size: s.doc.sheet.size,
    }))
    if (!printPages(pages)) onToast('Allow pop-ups to print, or export each sheet as SVG instead')
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
  // A lone selected shape shows its resize handles.
  const editableShape = selection.shapes.length === 1 && !selection.items.length && !selection.notes.length && !selection.wires.length ? (shown.shapes.find((sh) => sh.id === selection.shapes[0]) ?? null) : null
  // Handles appear when exactly one wire, and nothing else, is selected.
  const editableWire = (() => {
    if (selection.wires.length !== 1 || selection.items.length || selection.notes.length) return null
    const wire = shown.wires.find((x) => x.id === selection.wires[0])
    const geom = wire && wires.find((g) => g.id === wire.id)
    return wire && geom ? { wire, geom } : null
  })()
  const selCount = countOf(selection)
  const selectedIsEmpty = isEmpty(selection)
  const allConflicts = conflictIds.length + conflictNoteIds.length + conflictShapeIds.length

  const drawingIsEmpty = !doc.items.length && !doc.notes.length && !doc.shapes.length
  const chooseTool = (t: Tool) => {
    setTool(t)
    setArmed(null)
  }
  const loadStarter = () => {
    const ex = dolStarterExample()
    dispatch({ type: 'load', doc: ex })
    setSelection(EMPTY)
    requestAnimationFrame(() => fit(ex))
  }
  const clearDrawing = () => {
    dispatch({ type: 'load', doc: { items: [], wires: [], notes: [], shapes: [], sheet: doc.sheet } })
    setSelection(EMPTY)
  }
  const togglePanel = (which: 'parts' | 'details') => setPanel((p) => (p === which ? null : which))

  const exportEntries: MenuEntry[] = [
    { label: 'PNG image', onSelect: exportPng, disabled: drawingIsEmpty },
    { label: 'SVG file', onSelect: exportSvg, disabled: drawingIsEmpty },
    { label: 'Print or save as PDF', onSelect: print },
    ...(sheets.length > 1 ? [{ label: 'All sheets as one PDF', onSelect: printAll }] : []),
  ]
  const moreEntries: MenuEntry[] = [
    { label: 'Select all', hint: 'Ctrl+A', onSelect: selectAll, disabled: drawingIsEmpty },
    { label: 'Copy', hint: 'Ctrl+C', onSelect: () => copySelected(), disabled: !hasBody },
    { label: 'Cut', hint: 'Ctrl+X', onSelect: cutSelected, disabled: !hasBody },
    { label: 'Paste', hint: 'Ctrl+V', onSelect: pasteClipboard },
    'separator',
    { label: 'Load example circuit', onSelect: loadStarter },
    { label: 'Clear drawing', onSelect: clearDrawing, disabled: drawingIsEmpty },
  ]

  return (
    <div className="editor">
      {panel && <button className="drawer-scrim" aria-label="Close panel" onClick={() => setPanel(null)} />}
      <aside className={`palette${panel === 'parts' ? ' is-open' : ''}`} aria-label="Symbol palette">
        <div className="panel-head only-compact">
          <h2>Parts</h2>
          <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close palette"><CloseIcon /></button>
        </div>
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
          <button className="btn small tb-panel only-compact" aria-pressed={panel === 'parts'} onClick={() => togglePanel('parts')} title="Open the symbol palette">
            <PartsIcon /> Parts
          </button>

          <div className="tb-group" role="group" aria-label="Tools">
            <button className="icon-btn" aria-pressed={tool === 'select'} onClick={() => chooseTool('select')} aria-label="Select tool" title="Select (V). Drag empty space for a selection box"><CursorIcon /></button>
            <button className="icon-btn" aria-pressed={tool === 'text'} onClick={() => chooseTool('text')} aria-label="Text tool" title="Text (T). Click the canvas, type, then click away"><TextIcon /></button>
            <span className="sep" aria-hidden="true" />
            <button className="icon-btn" aria-pressed={tool === 'line'} onClick={() => chooseTool('line')} aria-label="Line tool" title="Line (L). Drag to draw; Shift snaps to 45 degrees"><LineIcon /></button>
            <button className="icon-btn" aria-pressed={tool === 'rect'} onClick={() => chooseTool('rect')} aria-label="Rectangle tool" title="Rectangle (B). Drag to draw; Shift makes a square"><RectIcon /></button>
            <button className="icon-btn" aria-pressed={tool === 'ellipse'} onClick={() => chooseTool('ellipse')} aria-label="Ellipse tool" title="Ellipse (O). Drag to draw; Shift makes a circle"><EllipseIcon /></button>
            <span className="sep" aria-hidden="true" />
            <button className="icon-btn" aria-pressed={tool === 'pan'} onClick={() => chooseTool('pan')} aria-label="Pan tool" title="Pan (H). Or hold Space, or use the middle mouse button"><HandIcon /></button>
          </div>

          <div className="tb-group" role="group" aria-label="History">
            <button className="icon-btn" onClick={() => dispatch({ type: 'undo' })} disabled={!proj.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><UndoIcon /></button>
            <button className="icon-btn" onClick={() => dispatch({ type: 'redo' })} disabled={!proj.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><RedoIcon /></button>
          </div>

          <div className="tb-group" role="group" aria-label="Selection">
            <button className="icon-btn" onClick={rotateSelected} disabled={!hasBody && !armed} aria-label="Rotate" title="Rotate (R)"><RotateIcon /></button>
            <button className="icon-btn" onClick={() => flipSelected('h')} disabled={!hasBody && !armed} aria-label="Flip left-right" title="Flip left-right (F)"><FlipHIcon /></button>
            <button className="icon-btn" onClick={() => flipSelected('v')} disabled={!hasBody && !armed} aria-label="Flip top-bottom" title="Flip top-bottom (Shift+F)"><FlipVIcon /></button>
            <button className="icon-btn" onClick={duplicateSelected} disabled={!hasBody} aria-label="Duplicate selected" title="Duplicate (Ctrl+D)"><DuplicateIcon /></button>
            <button className="icon-btn" onClick={deleteSelected} disabled={selectedIsEmpty} aria-label="Delete selected" title="Delete (Del)"><TrashIcon /></button>
            <button className="icon-btn only-touch" aria-pressed={multi} onClick={() => setMulti((m) => !m)} aria-label="Select several" title="Select several: tap to add or remove parts, drag empty space for a box"><MultiSelectIcon /></button>
          </div>

          <div className="tb-group tb-view" role="group" aria-label="View">
            <button className="icon-btn" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out" title="Zoom out"><MinusIcon /></button>
            <span className="zoom mono" aria-live="polite">{Math.round(view.k * 100)}%</span>
            <button className="icon-btn" onClick={() => zoomAt(1.25)} aria-label="Zoom in" title="Zoom in"><PlusIcon /></button>
            <button className="icon-btn" onClick={() => fit(doc)} aria-label="Fit to content" title="Fit to content"><FitIcon /></button>
          </div>

          <div className="tb-group tb-doc" role="group" aria-label="Drawing">
            <label className="switch tb-switch">
              <input type="checkbox" checked={doc.sheet.enabled} onChange={(e) => { dispatch({ type: 'sheet', patch: { enabled: e.target.checked } }); if (e.target.checked) requestAnimationFrame(() => fit({ ...doc, sheet: { ...doc.sheet, enabled: true } })) }} />
              <span>Sheet</span>
            </label>
            {allConflicts > 0 && (
              <button className="chip-btn" onClick={() => setSelection(sel({ items: conflictIds, notes: conflictNoteIds, shapes: conflictShapeIds }))} title="Select what is outside the frame or under the title block">
                <WarnIcon /> {allConflicts} off sheet
              </button>
            )}
            {issues.length > 0 && (
              <button className="chip-btn warn-chip" onClick={nextIssue} title="Jump to the next net label that needs attention">
                <WarnIcon /> {issues.length} net {issues.length === 1 ? 'issue' : 'issues'}
              </button>
            )}
          </div>

          <span className="grow" />

          <div className="tb-group" role="group" aria-label="File">
            <button className="btn small tb-panel only-compact" aria-pressed={panel === 'details'} onClick={() => togglePanel('details')} title="Open the inspector">
              <SlidersIcon /> Details{selCount > 0 ? <span className="tb-badge">{selCount}</span> : null}
            </button>
            <Menu label="Export and print" buttonClass="btn small primary" entries={exportEntries}>
              <DownloadIcon /> Export <ChevronDownIcon />
            </Menu>
            <Menu label="More actions" buttonClass="icon-btn" entries={moreEntries}>
              <MoreIcon />
            </Menu>
          </div>
        </div>

        <div className="stage-body">
          <div className="canvas-wrap">
            <svg
              ref={svgRef}
              className={`canvas${armed ? ' is-armed' : ''}${wiring ? ' is-wiring' : ''}${panMode ? ' is-pan' : ''}${tool === 'text' ? ' is-text' : ''}${drawTool ? ' is-draw' : ''}${panning ? ' is-panning' : ''}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={() => { setGhost(null); setGuides({}) }}
              onDoubleClick={onDoubleClick}
              onAuxClick={(e) => e.preventDefault()}
              aria-label="Schematic canvas"
              role="application"
              style={{ '--inv-k': 1 / view.k } as React.CSSProperties}
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
                <g className="shapes">
                  {shown.shapes.map((sh) => (
                    <ShapeView key={sh.id} shape={sh} selected={selection.shapes.includes(sh.id)} zoom={view.k} />
                  ))}
                  {drawing && <ShapeView shape={shapeFromDrag(drawing.kind, 'preview', drawing.from, drawing.to, drawing.constrain)} preview />}
                </g>
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
                        <path className="wire-hit" data-kind="wire" data-id={w.id} d={pointsToPath(w.points)} style={{ strokeWidth: hitWidth(view.k) }} />
                      </g>
                    )
                  })}
                </g>

                {editableShape && (
                  <g className="shape-handles">
                    {handlesOf(editableShape).map((h) => (
                      <rect
                        key={h.id}
                        className="handle shape"
                        data-kind="shandle"
                        data-id={editableShape.id}
                        data-h={h.id}
                        x={h.at.x - 5 / view.k}
                        y={h.at.y - 5 / view.k}
                        width={10 / view.k}
                        height={10 / view.k}
                      />
                    ))}
                  </g>
                )}

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

                {shown.items
                  .filter((it) => flagged.has(it.id))
                  .map((it) => {
                    const b = itemBounds(it, defOf(it))
                    return <rect key={`nw-${it.id}`} className="net-warn-box" x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx="6" />
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
                  const xref = xrefs.get(it.id)
                  const lb = labelBox(it, xref)
                  if (!lb) return null
                  const p = labelPos(it)
                  return (
                    <g key={`lbl-${it.id}`} className="label-block">
                      <rect className="label-hit" data-kind="label" data-id={it.id} x={lb.x} y={lb.y} width={lb.w} height={lb.h} rx="3" />
                      {labelLines(it, xref).map((l, i) => (
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
                        <GlyphBody def={def} prims={itemPrims(it, def)} />
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

            {!doc.items.length && !doc.notes.length && !doc.shapes.length && !armed && !editing && !drawTool && (
              <div className="canvas-empty">
                <p><strong>Empty canvas</strong></p>
                <p className="muted">
                  {coarse
                    ? 'Open Parts, pick a symbol, then touch the canvas to place it. Drag from one terminal dot to another to draw a wire. Pinch to zoom, drag to move around.'
                    : 'Pick a symbol on the left, then click here to place it. Drag from one terminal dot to another to draw a wire.'}
                </p>
              </div>
            )}
            {armedDef && (
              <div className="canvas-hint" role="status">
                {coarse ? (
                  <>Placing <strong>{armedDef.name}</strong>. Touch and drag to aim, lift to place.</>
                ) : (
                  <>Placing <strong>{armedDef.name}</strong>. Click to place, <kbd>R</kbd> rotate, <kbd>F</kbd> flip, <kbd>Esc</kbd> stop</>
                )}
                {armedDef.id === NET_LABEL_SYMBOL && '. It takes the name of an unpaired label, so two placements make a link'}
                {coarse && <button className="hint-btn" onClick={() => setArmed(null)}>Done</button>}
              </div>
            )}
            {drawTool && !armedDef && (
              <div className="canvas-hint" role="status">
                {coarse ? (
                  <>Drag to draw a {tool === 'line' ? 'line' : tool === 'rect' ? 'rectangle' : 'ellipse'}.</>
                ) : (
                  <>Drag to draw a {tool === 'line' ? 'line' : tool === 'rect' ? 'rectangle' : 'ellipse'}. <kbd>Shift</kbd> {tool === 'line' ? 'snaps to 45°' : 'keeps it square'}, <kbd>Esc</kbd> to stop</>
                )}
                {coarse && <button className="hint-btn" onClick={() => chooseTool('select')}>Done</button>}
              </div>
            )}
            {tool === 'text' && !armedDef && (
              <div className="canvas-hint" role="status">
                {coarse ? <>Tap where the text should go.</> : <>Click where the text should go. <kbd>Esc</kbd> to cancel</>}
                {coarse && <button className="hint-btn" onClick={() => chooseTool('select')}>Done</button>}
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
                  // iOS zooms the whole page into any field under 16px, so a finger-sized floor keeps the layout still.
                  fontSize: Math.max(coarse ? 16 : 0, editing.note.size * view.k),
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
                {selCount} selected{multi ? '. Tap more to add or remove.' : ''}
              </div>
            )}
          </div>
        </div>
        <SheetTabs sheets={sheetSummaries} onOpen={openSheet} onAdd={addSheet} />
      </section>

      <aside className={`inspector${panel === 'details' ? ' is-open' : ''}`} aria-label="Inspector">
        <div className="panel-head only-compact">
          <h2>Details</h2>
          <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close inspector"><CloseIcon /></button>
        </div>
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
          onShapeStyle={(patch) => dispatch({ type: 'shape-style', ids: selection.shapes, patch })}
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
          sheets={sheetSummaries}
          activeIndex={activeIndex}
          nets={nets}
          netIssues={issues}
          onOpenSheet={openSheet}
          onAddSheet={addSheet}
          onMoveSheet={moveSheet}
          onDeleteSheet={deleteSheet}
          onNetName={(id, name) => dispatch({ type: 'net-name', id, name })}
          onRenameNet={(from, to) => dispatch({ type: 'project-rename-net', from, to })}
          onJump={jumpTo}
        />
      </aside>
    </div>
  )

  function pick(id: string) {
    setArmed((cur) => (cur === id ? null : id))
    setArmedOrient({ rot: 0, mirror: false })
    setPanel(null)
  }
}
