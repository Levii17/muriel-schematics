import { nextLabel, uid } from '@/editor/model/doc'
import { defOf } from '@/editor/model/geometry'
import { moveShape } from '@/editor/model/shapes'
import type { Doc, Item, Shape, TextNote, Wire } from '@/editor/model/types'

import type { Selection } from './select'

export interface Payload {
  items: Item[]
  wires: Wire[]
  notes: TextNote[]
  shapes: Shape[]
}

/**
 * What copying the selection puts on the clipboard: the selected parts and notes, plus every wire that runs
 * between two of the copied parts. Wires to parts that were not copied are left behind. Null if nothing
 * copyable is selected (a wire on its own cannot be copied).
 */
export function copyPayload(doc: Doc, sel: Selection): Payload | null {
  const items = doc.items.filter((i) => sel.items.includes(i.id))
  const notes = doc.notes.filter((n) => sel.notes.includes(n.id))
  const shapes = doc.shapes.filter((sh) => sel.shapes.includes(sh.id))
  if (!items.length && !notes.length && !shapes.length) return null
  const ids = new Set(items.map((i) => i.id))
  const wires = doc.wires.filter((w) => ids.has(w.a.item) && ids.has(w.b.item))
  return {
    items: items.map((i) => ({ ...i, ...(i.labelOffset ? { labelOffset: { ...i.labelOffset } } : {}) })),
    wires: wires.map((w) => ({ ...w, a: { ...w.a }, b: { ...w.b }, ...(w.via ? { via: w.via.map((v) => ({ ...v })) } : {}), ...(w.style ? { style: { ...w.style } } : {}) })),
    notes: notes.map((n) => ({ ...n })),
    shapes: shapes.map((sh) => ({ ...sh, ...(sh.style ? { style: { ...sh.style } } : {}) })),
  }
}

/**
 * Turn a payload into new objects with fresh ids, moved by (dx, dy). Labels that follow the automatic
 * pattern (Q1, K2, ...) are renumbered to the next free number; custom labels, ratings and other
 * properties are kept.
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
    if (!a || !b) return []
    const copy: Wire = { ...w, id: uid('w'), a: { item: a, term: w.a.term }, b: { item: b, term: w.b.term } }
    if (w.via) copy.via = w.via.map((v) => ({ x: v.x + dx, y: v.y + dy }))
    return [copy]
  })
  const notes: TextNote[] = payload.notes.map((n) => ({ ...n, id: uid('n'), x: n.x + dx, y: n.y + dy }))
  const shapes: Shape[] = payload.shapes.map((sh) => ({ ...moveShape(sh, dx, dy), id: uid('s') }))
  return { items, wires, notes, shapes }
}