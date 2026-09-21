import { SCALES } from '../data/scale'
import type { Doc, Endpoint, Item, Pt, TextNote, WireStyle } from './model'
import type { AlignMode, Axis } from './align'
import { alignMoves, distributeMoves } from './align'
import type { Payload } from './clipboard'
import { anchorOffset, defOf, emptyDoc, itemMirror, itemScale, scaleDrawing, stepScale, uid } from './model'
import { transformDoc } from './transform'
import { shiftWires, tapWire } from './wires'
import type { TapRequest } from './wires'
import type { PaperSize, TitleFields } from './sheet'

export interface History {
  past: Doc[]
  present: Doc
  future: Doc[]
}

export type Action =
  | { type: 'add'; item: Item }
  | { type: 'move'; ids: string[]; dx: number; dy: number }
  | { type: 'rotate'; ids: string[] }
  | { type: 'flip'; ids: string[]; axis: Axis }
  | { type: 'align'; ids: string[]; mode: AlignMode }
  | { type: 'distribute'; ids: string[]; axis: Axis }
  | { type: 'paste'; payload: Payload }
  | { type: 'delete'; items: string[]; wires: string[]; notes?: string[] }
  | { type: 'wire-route'; id: string; via: Pt[] | null }
  | { type: 'wire-style'; ids: string[]; patch: { dash?: WireStyle['dash'] | null; width?: 1 | 2 | 3 | null } }
  | { type: 'tap'; request: TapRequest }
  | { type: 'add-note'; note: TextNote }
  | { type: 'edit-note'; id: string; patch: Partial<Omit<TextNote, 'id'>> }
  | { type: 'props'; id: string; patch: Partial<Pick<Item, 'rating' | 'description' | 'partNo'>> }
  | { type: 'label-offset'; id: string; offset: Pt | null }
  | { type: 'resize'; ids: string[]; dir: 1 | -1 }
  | { type: 'set-scale'; ids: string[]; scale: number }
  | { type: 'scale-all'; factor: number }
  | { type: 'fit-sheet'; dx: number; dy: number; size: PaperSize }
  | { type: 'delete-items'; ids: string[] }
  | { type: 'delete-wire'; id: string }
  | { type: 'label'; id: string; label: string }
  | { type: 'wire'; a: Endpoint; b: Endpoint }
  | { type: 'sheet'; patch: { enabled?: boolean; size?: PaperSize; fields?: Partial<TitleFields> } }
  | { type: 'load'; doc: Doc }
  | { type: 'undo' }
  | { type: 'redo' }

const LIMIT = 100

export const initHistory = (doc: Doc = emptyDoc()): History => ({ past: [], present: doc, future: [] })

/** Change a part's size while keeping its first terminal exactly where it is, so its wire stays attached. */
function withScale(item: Item, scale: number): Item {
  if (!SCALES.includes(scale as (typeof SCALES)[number]) || scale === itemScale(item)) return item
  const def = defOf(item)
  const before = anchorOffset(def, itemScale(item), item.rot, itemMirror(item))
  const after = anchorOffset(def, scale, item.rot, itemMirror(item))
  return { ...item, scale, x: item.x + before.x - after.x, y: item.y + before.y - after.y }
}

/** Apply fn to the listed items; return the same doc object if nothing changed, so no-ops stay out of the undo history. */
function mapItems(doc: Doc, ids: string[], fn: (i: Item) => Item): Doc {
  let changed = false
  const items = doc.items.map((i) => {
    if (!ids.includes(i.id)) return i
    const next = fn(i)
    if (next !== i) changed = true
    return next
  })
  return changed ? { ...doc, items } : doc
}

/** Move each listed part by its own offset; the same doc object comes back if nothing moves. */
function moveEach(doc: Doc, moves: Map<string, { dx: number; dy: number }>): Doc {
  let changed = false
  const items = doc.items.map((i) => {
    const m = moves.get(i.id)
    if (!m || (m.dx === 0 && m.dy === 0)) return i
    changed = true
    return { ...i, x: i.x + m.dx, y: i.y + m.dy }
  })
  return changed ? { ...doc, items } : doc
}

const sameEnd = (a: Endpoint, b: Endpoint) => a.item === b.item && a.term === b.term

function apply(doc: Doc, action: Action): Doc {
  switch (action.type) {
    case 'add':
      return { ...doc, items: [...doc.items, action.item] }
    case 'move':
      return {
        ...doc,
        items: doc.items.map((i) => (action.ids.includes(i.id) ? { ...i, x: i.x + action.dx, y: i.y + action.dy } : i)),
        notes: doc.notes.map((n) => (action.ids.includes(n.id) ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n)),
        wires: shiftWires(doc.wires, action.ids, action.dx, action.dy),
      }
    case 'rotate':
      return { ...doc, ...transformDoc(doc, action.ids, 'rot90') }
    case 'flip':
      return { ...doc, ...transformDoc(doc, action.ids, action.axis === 'h' ? 'flipH' : 'flipV') }
    case 'align':
      return moveEach(doc, alignMoves(doc.items, action.ids, action.mode))
    case 'distribute':
      return moveEach(doc, distributeMoves(doc.items, action.ids, action.axis))
    case 'paste':
      return {
        ...doc,
        items: [...doc.items, ...action.payload.items],
        wires: [...doc.wires, ...action.payload.wires],
        notes: [...doc.notes, ...action.payload.notes],
      }
    case 'wire-route': {
      let changed = false
      const wires = doc.wires.map((w) => {
        if (w.id !== action.id) return w
        const via = action.via?.length ? action.via.map((p) => ({ x: p.x, y: p.y })) : undefined
        if (JSON.stringify(via) === JSON.stringify(w.via)) return w
        changed = true
        const next = { ...w }
        if (via) next.via = via
        else delete next.via
        return next
      })
      return changed ? { ...doc, wires } : doc
    }
    case 'wire-style': {
      let changed = false
      const wires = doc.wires.map((w) => {
        if (!action.ids.includes(w.id)) return w
        const style: WireStyle = { ...w.style }
        if ('dash' in action.patch) {
          if (action.patch.dash) style.dash = action.patch.dash
          else delete style.dash
        }
        if ('width' in action.patch) {
          if (action.patch.width === 1 || action.patch.width === 3) style.width = action.patch.width
          else delete style.width
        }
        if (JSON.stringify(style) === JSON.stringify(w.style ?? {})) return w
        changed = true
        const next = { ...w }
        if (Object.keys(style).length) next.style = style
        else delete next.style
        return next
      })
      return changed ? { ...doc, wires } : doc
    }
    case 'tap':
      return tapWire(doc, action.request) ?? doc
    case 'add-note':
      return { ...doc, notes: [...doc.notes, action.note] }
    case 'edit-note': {
      let changed = false
      const notes = doc.notes.map((n) => {
        if (n.id !== action.id) return n
        const next: TextNote = { ...n, ...action.patch }
        for (const k of Object.keys(next) as (keyof TextNote)[]) if (next[k] === undefined) delete next[k]
        if (JSON.stringify(next) !== JSON.stringify(n)) changed = true
        return next
      })
      return changed ? { ...doc, notes } : doc
    }
    case 'props': {
      let changed = false
      const items = doc.items.map((i) => {
        if (i.id !== action.id) return i
        const next: Item = { ...i }
        for (const [k, v] of Object.entries(action.patch) as ['rating' | 'description' | 'partNo', string | undefined][]) {
          const clean = (v ?? '').trim().slice(0, 60)
          if (clean) next[k] = clean
          else delete next[k]
        }
        if (JSON.stringify(next) !== JSON.stringify(i)) changed = true
        return next
      })
      return changed ? { ...doc, items } : doc
    }
    case 'label-offset': {
      let changed = false
      const items = doc.items.map((i) => {
        if (i.id !== action.id) return i
        const off = action.offset && (action.offset.x !== 0 || action.offset.y !== 0) ? { x: action.offset.x, y: action.offset.y } : undefined
        if (JSON.stringify(off) === JSON.stringify(i.labelOffset)) return i
        changed = true
        const next: Item = { ...i }
        if (off) next.labelOffset = off
        else delete next.labelOffset
        return next
      })
      return changed ? { ...doc, items } : doc
    }
    case 'delete':
      return {
        ...doc,
        notes: doc.notes.filter((n) => !(action.notes ?? []).includes(n.id)),
        items: doc.items.filter((i) => !action.items.includes(i.id)),
        wires: doc.wires.filter((w) => !action.wires.includes(w.id) && !action.items.includes(w.a.item) && !action.items.includes(w.b.item)),
      }
    case 'resize':
      return mapItems(doc, action.ids, (i) => withScale(i, stepScale(itemScale(i), action.dir)))
    case 'set-scale':
      return mapItems(doc, action.ids, (i) => withScale(i, action.scale))
    case 'scale-all':
      return scaleDrawing(doc, action.factor) ?? doc
    case 'fit-sheet':
      return {
        ...doc,
        items: doc.items.map((i) => ({ ...i, x: i.x + action.dx, y: i.y + action.dy })),
        notes: doc.notes.map((n) => ({ ...n, x: n.x + action.dx, y: n.y + action.dy })),
        wires: shiftWires(doc.wires, doc.items.map((i) => i.id), action.dx, action.dy),
        sheet: { ...doc.sheet, size: action.size },
      }
    case 'delete-items':
      return {
        ...doc,
        items: doc.items.filter((i) => !action.ids.includes(i.id)),
        wires: doc.wires.filter((w) => !action.ids.includes(w.a.item) && !action.ids.includes(w.b.item)),
      }
    case 'delete-wire':
      return { ...doc, wires: doc.wires.filter((w) => w.id !== action.id) }
    case 'label':
      return { ...doc, items: doc.items.map((i) => (i.id === action.id ? { ...i, label: action.label } : i)) }
    case 'wire': {
      if (sameEnd(action.a, action.b)) return doc
      const exists = doc.wires.some(
        (w) => (sameEnd(w.a, action.a) && sameEnd(w.b, action.b)) || (sameEnd(w.a, action.b) && sameEnd(w.b, action.a)),
      )
      if (exists) return doc
      return { ...doc, wires: [...doc.wires, { id: uid('w'), a: action.a, b: action.b }] }
    }
    case 'sheet': {
      const { fields, ...rest } = action.patch
      return { ...doc, sheet: { ...doc.sheet, ...rest, fields: { ...doc.sheet.fields, ...fields } } }
    }
    case 'load':
      return action.doc
    default:
      return doc
  }
}

export function reducer(h: History, action: Action): History {
  if (action.type === 'undo') {
    if (!h.past.length) return h
    const previous = h.past[h.past.length - 1]
    return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] }
  }
  if (action.type === 'redo') {
    if (!h.future.length) return h
    const [next, ...rest] = h.future
    return { past: [...h.past, h.present], present: next, future: rest }
  }
  const next = apply(h.present, action)
  if (next === h.present) return h
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] }
}