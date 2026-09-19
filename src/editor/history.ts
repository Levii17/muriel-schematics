import type { Doc, Endpoint, Item, Rot } from './model'
import { emptyDoc, uid } from './model'
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
      return {
        ...doc,
        items: doc.items.map((i) =>
          action.ids.includes(i.id) ? { ...i, rot: (((i.rot + 90) % 360) as Rot) } : i,
        ),
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
