import { getSymbol } from '../data'
import type { Dir, SymbolDef } from '../data/types'
import type { SheetConfig } from './sheet'
import { defaultSheet } from './sheet'

export const GRID = 20

export type Rot = 0 | 90 | 180 | 270

export interface Item {
  id: string
  symbolId: string
  /** Canvas position of the symbol's pivot (its box centre, snapped to the grid). */
  x: number
  y: number
  rot: Rot
  label: string
}
export interface Endpoint {
  item: string
  term: string
}
export interface Wire {
  id: string
  a: Endpoint
  b: Endpoint
}
export interface Doc {
  items: Item[]
  wires: Wire[]
  /** Paper, border and title block. Drawn under the circuit when `sheet.enabled`. */
  sheet: SheetConfig
}
export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const emptyDoc = (): Doc => ({ items: [], wires: [], sheet: defaultSheet() })

export const snap = (v: number) => Math.round(v / GRID) * GRID

export const pivotOf = (def: SymbolDef): Pt => ({ x: snap(def.width / 2), y: snap(def.height / 2) })

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

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

/** World-space position and outward direction of one terminal of a placed item. */
export function terminalWorld(item: Item, def: SymbolDef, terminalId: string) {
  const t = def.terminals.find((x) => x.id === terminalId)
  if (!t) return null
  const pv = pivotOf(def)
  const [rx, ry] = rotateVec(t.x - pv.x, t.y - pv.y, item.rot)
  const [dx, dy] = rotateVec(...DIRS[t.dir], item.rot)
  return { x: item.x + rx, y: item.y + ry, dx: dx + 0, dy: dy + 0 } // "+ 0" normalises -0
}

export function itemBounds(item: Item, def: SymbolDef): Rect {
  const pv = pivotOf(def)
  const corners: [number, number][] = [
    [0, 0],
    [def.width, 0],
    [def.width, def.height],
    [0, def.height],
  ]
  const pts = corners.map(([cx, cy]) => rotateVec(cx - pv.x, cy - pv.y, item.rot))
  const xs = pts.map((p) => item.x + p[0])
  const ys = pts.map((p) => item.y + p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** Next free reference like Q1, Q2, K1 for the given symbol; '' for symbols without a reference. */
export function nextLabel(items: Item[], def: SymbolDef): string {
  const prefix = def.reference
  if (!prefix) return ''
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const it of items) {
    const m = re.exec(it.label)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

export const uid = (() => {
  let n = 0
  return (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`
})()

export function defOf(item: Item): SymbolDef {
  const d = getSymbol(item.symbolId)
  if (!d) throw new Error(`Unknown symbol ${item.symbolId}`)
  return d
}

/**
 * Orthogonal wire between two terminals. Each end leaves along its outward direction for one grid
 * step, then a single Z- or L-shaped jog joins the two stubs. Collinear points are removed.
 */
export function routeWire(
  p1: Pt,
  d1: [number, number],
  p2: Pt,
  d2: [number, number] | null,
): Pt[] {
  const s1 = { x: p1.x + d1[0] * GRID, y: p1.y + d1[1] * GRID }
  const s2 = d2 ? { x: p2.x + d2[0] * GRID, y: p2.y + d2[1] * GRID } : p2
  const vertical1 = d1[0] === 0
  const pts: Pt[] = [p1, s1]

  if (!d2) {
    pts.push(vertical1 ? { x: s1.x, y: p2.y } : { x: p2.x, y: s1.y }, p2)
  } else {
    const vertical2 = d2[0] === 0
    if (vertical1 && vertical2) {
      const my = snap((s1.y + s2.y) / 2)
      pts.push({ x: s1.x, y: my }, { x: s2.x, y: my })
    } else if (!vertical1 && !vertical2) {
      const mx = snap((s1.x + s2.x) / 2)
      pts.push({ x: mx, y: s1.y }, { x: mx, y: s2.y })
    } else if (vertical1) {
      pts.push({ x: s1.x, y: s2.y })
    } else {
      pts.push({ x: s2.x, y: s1.y })
    }
    pts.push(s2, p2)
  }
  return simplify(pts)
}

/** Drop duplicate points and points that sit in the middle of a straight run. */
export function simplify(pts: Pt[]): Pt[] {
  const dedup = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y)
  const out: Pt[] = []
  for (const p of dedup) {
    while (out.length >= 2) {
      const a = out[out.length - 2]
      const b = out[out.length - 1]
      const collinear = (a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)
      if (collinear) out.pop()
      else break
    }
    out.push(p)
  }
  return out
}

export const pointsToPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
