import type { Pt, Rect } from '@/shared/geometry'
import { snap } from '@/shared/geometry'
import { getSymbol } from '@/symbols'
import { pivotOf } from '@/symbols/geometry'
import { SCALES } from '@/symbols/scale'
import type { Dir, SymbolDef } from '@/symbols/types'

import type { Item, Rot } from './types'

export const itemScale = (item: { scale?: number }) => item.scale ?? 1
export const itemMirror = (item: { mirror?: boolean }) => item.mirror === true

/** Offset of a symbol's first terminal from its pivot, at a given size and rotation. */
export function anchorOffset(def: SymbolDef, scale: number, rot: Rot, mirror = false): Pt {
  const t = def.terminals[0]
  const pv = pivotOf(def)
  const [x, y] = rotateVec((mirror ? -1 : 1) * (t.x - pv.x) * scale, (t.y - pv.y) * scale, rot)
  return { x: x + 0, y: y + 0 }
}

/**
 * Snap a desired pivot position so the part's first terminal, not its centre, lands on the grid.
 * At size 1 this is identical to snapping the pivot; at other sizes it keeps wires attachable on-grid.
 */
export function snapPlacement(def: SymbolDef, desired: Pt, scale = 1, rot: Rot = 0, mirror = false): Pt {
  const o = anchorOffset(def, scale, rot, mirror)
  return { x: snap(desired.x + o.x) - o.x, y: snap(desired.y + o.y) - o.y }
}

/** The next larger (dir 1) or smaller (dir -1) preset size, clamped to the ends. */
export function stepScale(current: number, dir: 1 | -1): number {
  const idx = SCALES.reduce((best, v, i) => (Math.abs(v - current) < Math.abs(SCALES[best] - current) ? i : best), 0)
  return SCALES[Math.min(SCALES.length - 1, Math.max(0, idx + dir))]
}

/** Rotate a vector clockwise (SVG y-down) by a multiple of 90 degrees. */
export function rotateVec(x: number, y: number, rot: Rot): [number, number] {
  switch (rot) {
    case 0:
      return [x, y]
    case 90:
      return [-y, x]
    case 180:
      return [-x, -y]
    case 270:
      return [y, -x]
  }
}

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], any: [0, 0] }

/** World-space position and outward direction of one terminal of a placed item. */
export function terminalWorld(item: Item, def: SymbolDef, terminalId: string) {
  const t = def.terminals.find((x) => x.id === terminalId)
  if (!t) return null
  const pv = pivotOf(def)
  const k = itemScale(item)
  const mx = itemMirror(item) ? -1 : 1
  const [rx, ry] = rotateVec(mx * (t.x - pv.x) * k, (t.y - pv.y) * k, item.rot)
  const [dx, dy] = rotateVec(mx * DIRS[t.dir][0], DIRS[t.dir][1], item.rot)
  return { x: item.x + rx, y: item.y + ry, dx: dx + 0, dy: dy + 0 } // "+ 0" normalises -0
}

export function itemBounds(item: Item, def: SymbolDef): Rect {
  const pv = pivotOf(def)
  const k = itemScale(item)
  const bb = def.bounds ?? { x: 0, y: 0, w: def.width, h: def.height }
  const corners: [number, number][] = [
    [bb.x, bb.y],
    [bb.x + bb.w, bb.y],
    [bb.x + bb.w, bb.y + bb.h],
    [bb.x, bb.y + bb.h],
  ]
  const mx = itemMirror(item) ? -1 : 1
  const pts = corners.map(([cx, cy]) => rotateVec(mx * (cx - pv.x) * k, (cy - pv.y) * k, item.rot))
  const xs = pts.map((p) => item.x + p[0])
  const ys = pts.map((p) => item.y + p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/* ---------- text notes ---------- */

export function defOf(item: Item): SymbolDef {
  const d = getSymbol(item.symbolId)
  if (!d) throw new Error(`Unknown symbol ${item.symbolId}`)
  return d
}
