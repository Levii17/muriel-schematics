import type { Item, Pt, Rot } from './model'
import { anchorOffset, defOf, itemBounds, itemMirror, itemScale, snap } from './model'

export type Transform = 'rot90' | 'flipH' | 'flipV'

/** Centre of the selection's bounding box, snapped to the grid, so group transforms keep parts on the lattice. */
export function groupCenter(items: Item[]): Pt {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const it of items) {
    const b = itemBounds(it, defOf(it))
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x: snap((x0 + x1) / 2), y: snap((y0 + y1) / 2) }
}

const mod360 = (n: number) => (((n % 360) + 360) % 360) as Rot

/** Orientation after a transform, for a part that stays put (or for a not-yet-placed one). */
export function nextOrientation(rot: Rot, mirror: boolean, kind: Transform): { rot: Rot; mirror: boolean } {
  if (kind === 'rot90') return { rot: mod360(rot + 90), mirror }
  if (kind === 'flipH') return { rot: mod360(-rot), mirror: !mirror }
  return { rot: mod360(180 - rot), mirror: !mirror }
}

/**
 * Rotate a quarter turn clockwise, or flip left-right / top-bottom as seen on screen.
 *
 * One part turns about its own pivot. Several parts turn about the centre of the group, so the
 * arrangement (and every wire between them) keeps its shape.
 *
 * A part's world transform is  pos + R(rot) * M^mirror  (M = left-right reflection). Reflecting the whole
 * plane left-right gives R(-rot) * M^(mirror+1); top-bottom gives R(180 - rot) * M^(mirror+1).
 */
export function transformItems(items: Item[], ids: string[], kind: Transform): Item[] {
  const selected = items.filter((i) => ids.includes(i.id))
  if (!selected.length) return items
  const single = selected.length === 1
  const c: Pt = single ? { x: selected[0].x, y: selected[0].y } : groupCenter(selected)

  return items.map((it) => {
    if (!ids.includes(it.id)) return it
    let x = it.x
    let y = it.y
    if (kind === 'rot90') {
      x = c.x - (it.y - c.y)
      y = c.y + (it.x - c.x)
    } else if (kind === 'flipH') x = 2 * c.x - it.x
    else y = 2 * c.y - it.y
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
  })
}