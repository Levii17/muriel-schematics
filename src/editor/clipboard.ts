import type { Doc, Item, Wire } from './model'
import { defOf, nextLabel, uid } from './model'
import type { Selection } from './select'

export interface Payload {
  items: Item[]
  wires: Wire[]
}

/**
 * What copying the selection puts on the clipboard: the selected parts, plus every wire that runs
 * between two of them. Wires to parts that were not copied are left behind. Null if no parts are selected.
 */
export function copyPayload(doc: Doc, sel: Selection): Payload | null {
  const items = doc.items.filter((i) => sel.items.includes(i.id))
  if (!items.length) return null
  const ids = new Set(items.map((i) => i.id))
  const wires = doc.wires.filter((w) => ids.has(w.a.item) && ids.has(w.b.item))
  return { items: items.map((i) => ({ ...i })), wires: wires.map((w) => ({ ...w, a: { ...w.a }, b: { ...w.b } })) }
}

/**
 * Turn a payload into new parts and wires with fresh ids, moved by (dx, dy). Labels that follow the
 * automatic pattern (Q1, K2, ...) are renumbered to the next free number; custom labels are kept.
 */
export function clonePayload(doc: Doc, payload: Payload, dx: number, dy: number): Payload {
  const idMap = new Map<string, string>()
  const placed: Item[] = [...doc.items]
  const items: Item[] = payload.items.map((src) => {
    const def = defOf(src)
    const auto = def.reference && new RegExp(`^${def.reference}\\d+$`).test(src.label)
    const copy: Item = {
      ...src,
      id: uid('i'),
      x: src.x + dx,
      y: src.y + dy,
      label: auto ? nextLabel(placed, def) : src.label,
    }
    idMap.set(src.id, copy.id)
    placed.push(copy)
    return copy
  })
  const wires: Wire[] = payload.wires.flatMap((w) => {
    const a = idMap.get(w.a.item)
    const b = idMap.get(w.b.item)
    return a && b ? [{ id: uid('w'), a: { item: a, term: w.a.term }, b: { item: b, term: w.b.term } }] : []
  })
  return { items, wires }
}