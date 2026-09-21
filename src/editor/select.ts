import type { WireGeometry } from './export'
import type { Item, Pt, Rect, TextNote } from './model'
import { defOf, itemBounds, noteBounds } from './model'

/** What is selected: any mix of parts, wires and text notes. */
export interface Selection {
  items: string[]
  wires: string[]
  notes: string[]
}

export const EMPTY: Selection = { items: [], wires: [], notes: [] }

export const isEmpty = (s: Selection) => s.items.length === 0 && s.wires.length === 0 && s.notes.length === 0
export const countOf = (s: Selection) => s.items.length + s.wires.length + s.notes.length
/** Ids of everything that moves, turns or nudges as a body: parts and notes (wires follow their parts). */
export const bodyIds = (s: Selection) => [...s.items, ...s.notes]

export const toggle = (list: string[], id: string): string[] => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

/** Rectangle spanning two corner points, whichever way it was dragged. */
export function normBox(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

const overlaps = (a: Rect, b: Rect) => a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y
const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h

/**
 * Marquee selection, CAD style. Dragging left to right is a "window": only objects fully inside are selected.
 * Right to left is a "crossing": anything the box touches is selected.
 */
export type BoxMode = 'window' | 'cross'

export const boxMode = (from: Pt, to: Pt): BoxMode => (to.x >= from.x ? 'window' : 'cross')

const pick = (box: Rect, b: Rect, mode: BoxMode) => (mode === 'window' ? contains(box, b) : overlaps(box, b))

export function itemsInBox(items: Item[], box: Rect, mode: BoxMode): string[] {
  return items.filter((it) => pick(box, itemBounds(it, defOf(it)), mode)).map((it) => it.id)
}

export function notesInBox(notes: TextNote[], box: Rect, mode: BoxMode): string[] {
  return notes.filter((n) => pick(box, noteBounds(n), mode)).map((n) => n.id)
}

export function wiresInBox(geoms: WireGeometry[], box: Rect, mode: BoxMode): string[] {
  return geoms
    .filter(({ points }) => {
      if (mode === 'window') return points.every((p) => p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h)
      // Crossing: any (axis-aligned) segment whose bounding box meets the marquee.
      return points.some((p, i) => {
        if (i === 0) return false
        const q = points[i - 1]
        return overlaps(box, { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(p.x - q.x), h: Math.abs(p.y - q.y) })
      })
    })
    .map((g) => g.id)
}