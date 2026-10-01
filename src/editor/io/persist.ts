import { mergeSheet } from '@/editor/model/sheet'
import type { Doc, Shape, TextNote, Wire, WireStyle } from '@/editor/model/types'
import { getSymbol } from '@/symbols'
import { SCALES } from '@/symbols/scale'

/**
 * Validate a document read from storage. Drops parts whose symbol no longer exists, wires whose
 * endpoints are gone, and fills in the drawing sheet. Documents saved before the sheet existed
 * load with it switched off so their parts are not suddenly covered by a border.
 */
export function sanitizeDoc(raw: unknown): Doc | null {
  const r = raw as Partial<Doc> | null
  if (!r || !Array.isArray(r.items) || !Array.isArray(r.wires)) return null
  const items = r.items.filter(
    (i) => i && getSymbol(i.symbolId) && Number.isFinite(i.x) && Number.isFinite(i.y) && [0, 90, 180, 270].includes(i.rot),
  )
  for (const i of items) {
    if (i.scale !== undefined && !SCALES.includes(i.scale as (typeof SCALES)[number])) delete i.scale
  }
  for (const i of items) {
    if (i.mirror !== undefined && i.mirror !== true) delete i.mirror
  }
  const byId = new Map(items.map((i) => [i.id, i]))
  const hasTerminal = (e: { item: string; term: string } | undefined) => {
    const it = e && byId.get(e.item)
    return !!it && !!getSymbol(it.symbolId)?.terminals.some((t) => t.id === e.term)
  }
  const wires = r.wires.filter((w) => w && hasTerminal(w.a) && hasTerminal(w.b)).map(cleanWire)
  for (const i of items) {
    for (const k of ['rating', 'description', 'partNo'] as const) {
      const v = i[k] as unknown
      if (typeof v === 'string' && v.trim()) i[k] = v.trim().slice(0, 60)
      else delete i[k]
    }
    const o = i.labelOffset as unknown as { x?: unknown; y?: unknown } | undefined
    if (o !== undefined && !(o && Number.isFinite(o.x) && Number.isFinite(o.y))) delete i.labelOffset
  }
  return {
    items,
    wires,
    notes: sanitizeNotes((r as { notes?: unknown }).notes),
    shapes: sanitizeShapes((r as { shapes?: unknown }).shapes),
    sheet: mergeSheet(r.sheet),
  }
}

const DASH_KINDS = ['dashed', 'dotted', 'dashdot']
const MAX_VIA = 60

/** Keep a wire's waypoints and style only if they are well-formed. */
function cleanWire(w: Wire): Wire {
  const { via, style, ...rest } = w as Wire & { via?: unknown; style?: unknown }
  const out: Wire = { ...rest }
  if (Array.isArray(via)) {
    const pts = (via as { x?: unknown; y?: unknown }[])
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .slice(0, MAX_VIA)
      .map((p) => ({ x: p.x as number, y: p.y as number }))
    if (pts.length) out.via = pts
  }
  if (style && typeof style === 'object') {
    const st = style as { dash?: unknown; width?: unknown }
    const clean: NonNullable<Wire['style']> = {}
    if (typeof st.dash === 'string' && DASH_KINDS.includes(st.dash)) clean.dash = st.dash as NonNullable<Wire['style']>['dash']
    if (st.width === 1 || st.width === 3) clean.width = st.width
    if (Object.keys(clean).length) out.style = clean
  }
  return out
}

const ALIGNS = ['start', 'middle', 'end']

/** Keep only well-formed notes; clamp sizes and text length so stored junk cannot break drawing. */
export function sanitizeNotes(raw: unknown): TextNote[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((n): TextNote[] => {
    if (!n || typeof n.id !== 'string' || typeof n.text !== 'string') return []
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !Number.isFinite(n.size)) return []
    const note: TextNote = { id: n.id, x: n.x, y: n.y, text: n.text.slice(0, 2000), size: Math.min(96, Math.max(6, n.size)) }
    if (n.bold === true) note.bold = true
    if (typeof n.align === 'string' && ALIGNS.includes(n.align) && n.align !== 'start') note.align = n.align as TextNote['align']
    if (n.rot === 90 || n.rot === 180 || n.rot === 270) note.rot = n.rot
    return [note]
  })
}

const MAX_SHAPES = 2000
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function cleanStyle(raw: unknown): WireStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const st = raw as { dash?: unknown; width?: unknown }
  const out: WireStyle = {}
  if (typeof st.dash === 'string' && DASH_KINDS.includes(st.dash)) out.dash = st.dash as WireStyle['dash']
  if (st.width === 1 || st.width === 3) out.width = st.width
  return Object.keys(out).length ? out : undefined
}

/** Keep only well-formed shapes, and give them only the fields their kind uses. */
export function sanitizeShapes(raw: unknown): Shape[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_SHAPES).flatMap((r): Shape[] => {
    if (!r || typeof r.id !== 'string') return []
    const style = cleanStyle(r.style)
    const base = style ? { style } : {}
    if (r.kind === 'line' && num(r.x1) && num(r.y1) && num(r.x2) && num(r.y2)) {
      return [{ id: r.id, kind: 'line', x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, ...base, ...(r.arrow === 'end' || r.arrow === 'both' ? { arrow: r.arrow } : {}) }]
    }
    if (r.kind === 'rect' && num(r.x) && num(r.y) && num(r.w) && num(r.h) && r.w > 0 && r.h > 0) {
      return [{ id: r.id, kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, ...base, ...(r.fill === true ? { fill: true } : {}), ...(num(r.radius) && r.radius > 0 ? { radius: Math.min(r.radius, 100) } : {}) }]
    }
    if (r.kind === 'ellipse' && num(r.cx) && num(r.cy) && num(r.rx) && num(r.ry) && r.rx > 0 && r.ry > 0) {
      return [{ id: r.id, kind: 'ellipse', cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry, ...base, ...(r.fill === true ? { fill: true } : {}) }]
    }
    return []
  })
}