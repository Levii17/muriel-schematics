import { SCALES } from '../data/scale'
import type { Doc, Endpoint, Item, Rot } from './model'
import { anchorOffset, defOf, emptyDoc, itemScale, scaleDrawing, snap, stepScale, uid } from './model'
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
  | { type: 'resize'; ids: string[]; dir: 1 | -1 }
  | { type: 'set-scale'; ids: string[]; scale: number }
  | { type: 'scale-all'; factor: number }
  | { type: 'fit-sheet'; dx: number; dy: number; size: PaperSize }
  | { type: 'delete-items'; ids: string[] }
  | { type: 'delete-wire'; id: string }
  | { type: 'label'; id: string; label: string }
  | { type: 'wire'; a: Endpoint; b: Endpoint }
  | { type: 'duplicate'; ids: string[]; newIds: string[]; labels: string[] }
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
  const before = anchorOffset(def, itemScale(item), item.rot)
  const after = anchorOffset(def, scale, item.rot)
  return { ...item, scale, x: item.x + before.x - after.x, y: item.y + before.y - after.y }
}

/** Rotate a quarter turn about the pivot, then nudge so the first terminal is back on the grid. */
function rotated(item: Item): Item {
  const def = defOf(item)
  const rot = ((item.rot + 90) % 360) as Rot
  const o = anchorOffset(def, itemScale(item), rot)
  return { ...item, rot, x: item.x + snap(item.x + o.x) - (item.x + o.x), y: item.y + snap(item.y + o.y) - (item.y + o.y) }
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

const sameEnd = (a: Endpoint, b: Endpoint) => a.item === b.item && a.term === b.term

function apply(doc: Doc, action: Action): Doc {
  switch (action.type) {
    case 'add':
      return { ...doc, items: [...doc.items, action.item] }
    case 'move':
      return {
        ...doc,
        items: doc.items.map((i) =>
          action.ids.includes(i.id) ? { ...i, x: i.x + action.dx, y: i.y + action.dy } : i,
        ),
      }
    case 'rotate':
      return { ...doc, items: doc.items.map((i) => (action.ids.includes(i.id) ? rotated(i) : i)) }
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
    case 'duplicate': {
      const copies = action.ids.flatMap((id, n) => {
        const src = doc.items.find((i) => i.id === id)
        return src ? [{ ...src, id: action.newIds[n], x: src.x + 40, y: src.y + 40, label: action.labels[n] }] : []
      })
      return { ...doc, items: [...doc.items, ...copies] }
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