import { getSymbol } from '../data'
import { SCALES } from '../data/scale'
import type { Doc, TextNote } from './model'
import { mergeSheet } from './sheet'

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
  const wires = r.wires.filter((w) => w && hasTerminal(w.a) && hasTerminal(w.b))
  for (const i of items) {
    for (const k of ['rating', 'description', 'partNo'] as const) {
      const v = i[k] as unknown
      if (typeof v === 'string' && v.trim()) i[k] = v.trim().slice(0, 60)
      else delete i[k]
    }
    const o = i.labelOffset as unknown as { x?: unknown; y?: unknown } | undefined
    if (o !== undefined && !(o && Number.isFinite(o.x) && Number.isFinite(o.y))) delete i.labelOffset
  }
  return { items, wires, notes: sanitizeNotes((r as { notes?: unknown }).notes), sheet: mergeSheet(r.sheet) }
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