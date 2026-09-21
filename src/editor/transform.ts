import type { Item, Pt, Rot, TextNote } from './model'
import { anchorOffset, defOf, itemBounds, itemMirror, itemScale, noteBounds, noteRot, snap } from './model'

export type Transform = 'rot90' | 'flipH' | 'flipV'

/** Everything a transform can act on. */
export interface Content {
  items: Item[]
  notes: TextNote[]
}

/**
 * Round to a multiple of `step`, sending exact halves to the even multiple. Plain rounding sends every
 * half the same way, which makes "flip, then flip again" land on a different centre the second time
 * whenever the group's centre falls exactly between two grid lines. Ties-to-even makes it a true undo.
 */
export function snapEven(v: number, step: number): number {
  const q = v / step
  const fl = Math.floor(q)
  const r = q - fl === 0.5 ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(q)
  return r * step + 0
}

/**
 * Centre of the selection's bounding box on a grid. Flips only need a 10 px grid (twice a multiple of 10
 * is a multiple of 20, so parts stay on the 20 px lattice); turns need the full 20 px grid.
 */
export function groupCenter(items: Item[], notes: TextNote[] = [], step = 20): Pt {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (b: { x: number; y: number; w: number; h: number }) => {
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  for (const it of items) add(itemBounds(it, defOf(it)))
  for (const n of notes) add(noteBounds(n))
  return { x: snapEven((x0 + x1) / 2, step), y: snapEven((y0 + y1) / 2, step) }
}

const mod360 = (n: number) => (((n % 360) + 360) % 360) as Rot

/** Orientation after a transform, for a part that stays put (or for a not-yet-placed one). */
export function nextOrientation(rot: Rot, mirror: boolean, kind: Transform): { rot: Rot; mirror: boolean } {
  if (kind === 'rot90') return { rot: mod360(rot + 90), mirror }
  if (kind === 'flipH') return { rot: mod360(-rot), mirror: !mirror }
  return { rot: mod360(180 - rot), mirror: !mirror }
}

/** Centre of a note's text box, relative to its anchor. */
const noteCentre = (n: TextNote): Pt => {
  const b = noteBounds({ ...n, x: 0, y: 0 })
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}
const clean = (v: number) => Math.round(v * 1e6) / 1e6 + 0

/**
 * Rotate a quarter turn clockwise, or flip left-right / top-bottom as seen on screen.
 *
 * One part turns about its own pivot. Several objects turn about the centre of the group, so the
 * arrangement (and every wire between them) keeps its shape.
 *
 * A part's world transform is  pos + R(rot) * M^mirror  (M = left-right reflection). Reflecting the whole
 * plane left-right gives R(-rot) * M^(mirror+1); top-bottom gives R(180 - rot) * M^(mirror+1).
 *
 * Text is never drawn mirrored. A note's whole text block moves as a rigid box: its centre goes where the
 * centre would go, and only a quarter turn changes its orientation. A single note flipped on its own would
 * reflect about itself, so that does nothing; a single note can still be turned.
 */
export function transformDoc(content: Content, ids: string[], kind: Transform): Content {
  const items = content.items.filter((i) => ids.includes(i.id))
  const notes = content.notes.filter((n) => ids.includes(n.id))
  if (!items.length && !notes.length) return content
  const single = items.length + notes.length === 1
  const anchor = single ? (items[0] ?? notes[0]) : null
  const c: Pt = anchor ? { x: anchor.x, y: anchor.y } : groupCenter(items, notes, kind === 'rot90' ? 20 : 10)

  const moved = (x: number, y: number): Pt =>
    kind === 'rot90' ? { x: c.x - (y - c.y), y: c.y + (x - c.x) } : kind === 'flipH' ? { x: 2 * c.x - x, y } : { x, y: 2 * c.y - y }

  return {
    items: content.items.map((it) => {
      if (!ids.includes(it.id)) return it
      let { x, y } = moved(it.x, it.y)
      const { rot, mirror } = nextOrientation(it.rot, itemMirror(it), kind)
      if (single) {
        // Nudge so the part's first terminal is still on the grid (only matters for resized parts).
        const o = anchorOffset(defOf(it), itemScale(it), rot, mirror)
        x += snap(x + o.x) - (x + o.x)
        y += snap(y + o.y) - (y + o.y)
      }
      const next: Item = { ...it, x: x + 0, y: y + 0, rot }
      if (mirror) next.mirror = true
      else delete next.mirror
      return next
    }),
    notes: content.notes.map((n) => {
      if (!ids.includes(n.id)) return n
      const turn = kind === 'rot90'
      const rot = turn ? mod360(noteRot(n) + 90) : noteRot(n)
      const next: TextNote = { ...n }
      if (turn) {
        if (rot === 0) delete next.rot
        else next.rot = rot
      }
      if (single) return turn ? next : n // a lone note turns about its anchor; flipping it changes nothing
      const from = noteCentre(n)
      const to = moved(n.x + from.x, n.y + from.y)
      const off = noteCentre(next)
      next.x = clean(to.x - off.x)
      next.y = clean(to.y - off.y)
      return next
    }),
  }
}

/** Parts only: the same transform for callers that have no notes. */
export function transformItems(items: Item[], ids: string[], kind: Transform): Item[] {
  return transformDoc({ items, notes: [] }, ids, kind).items
}