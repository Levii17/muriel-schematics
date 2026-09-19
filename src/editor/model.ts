import { getSymbol } from '../data'
import { SCALES } from '../data/scale'
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
  /** Size relative to the library symbol (see SCALES). Absent means 1. */
  scale?: number
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

// "+ 0" turns -0 into 0 so coordinates never print as "-0".
export const snap = (v: number) => Math.round(v / GRID) * GRID + 0

export const pivotOf = (def: SymbolDef): Pt => ({ x: snap(def.width / 2), y: snap(def.height / 2) })

export const itemScale = (item: { scale?: number }) => item.scale ?? 1

/** Offset of a symbol's first terminal from its pivot, at a given size and rotation. */
export function anchorOffset(def: SymbolDef, scale: number, rot: Rot): Pt {
  const t = def.terminals[0]
  const pv = pivotOf(def)
  const [x, y] = rotateVec((t.x - pv.x) * scale, (t.y - pv.y) * scale, rot)
  return { x, y }
}

/**
 * Snap a desired pivot position so the part's first terminal, not its centre, lands on the grid.
 * At size 1 this is identical to snapping the pivot; at other sizes it keeps wires attachable on-grid.
 */
export function snapPlacement(def: SymbolDef, desired: Pt, scale = 1, rot: Rot = 0): Pt {
  const o = anchorOffset(def, scale, rot)
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

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

/** World-space position and outward direction of one terminal of a placed item. */
export function terminalWorld(item: Item, def: SymbolDef, terminalId: string) {
  const t = def.terminals.find((x) => x.id === terminalId)
  if (!t) return null
  const pv = pivotOf(def)
  const k = itemScale(item)
  const [rx, ry] = rotateVec((t.x - pv.x) * k, (t.y - pv.y) * k, item.rot)
  const [dx, dy] = rotateVec(...DIRS[t.dir], item.rot)
  return { x: item.x + rx, y: item.y + ry, dx: dx + 0, dy: dy + 0 } // "+ 0" normalises -0
}

export function itemBounds(item: Item, def: SymbolDef): Rect {
  const pv = pivotOf(def)
  const k = itemScale(item)
  const corners: [number, number][] = [
    [0, 0],
    [def.width, 0],
    [def.width, def.height],
    [0, def.height],
  ]
  const pts = corners.map(([cx, cy]) => rotateVec((cx - pv.x) * k, (cy - pv.y) * k, item.rot))
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

const EPS = 0.01
const sameNum = (a: number, b: number) => Math.abs(a - b) < EPS

/**
 * Is this orthogonal path acceptable for terminals facing d1 (start) and d2 (end)?
 * A wire may leave or arrive straight out of a terminal or sideways, but never back through the
 * part it belongs to: the first leg must not head against d1, and the last leg must not come
 * from behind the end terminal.
 */
function validRoute(pts: Pt[], d1: [number, number], d2: [number, number] | null): boolean {
  if (pts.length < 2) return false
  for (let i = 1; i < pts.length; i++) {
    if (!sameNum(pts[i].x, pts[i - 1].x) && !sameNum(pts[i].y, pts[i - 1].y)) return false
  }
  const first = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y }
  if (first.x * d1[0] + first.y * d1[1] < -EPS) return false
  if (d2) {
    const n = pts.length
    const behind = { x: pts[n - 2].x - pts[n - 1].x, y: pts[n - 2].y - pts[n - 1].y }
    if (behind.x * d2[0] + behind.y * d2[1] < -EPS) return false
  }
  return true
}

const bends = (pts: Pt[]) => pts.length - 2
const length = (pts: Pt[]) => pts.reduce((sum, p, i) => (i ? sum + Math.abs(p.x - pts[i - 1].x) + Math.abs(p.y - pts[i - 1].y) : 0), 0)

/**
 * Orthogonal wire between two terminals. Candidate routes (straight, L, and Z/U shapes through a
 * handful of channel coordinates) are filtered by validRoute and the one with the fewest bends,
 * then shortest length, wins. Leaving a terminal sideways is heavily penalised and arriving sideways lightly,
 * so wires leave straight out of a part. With no end direction (a wire being
 * dragged) only the start constraint applies.
 */
export function routeWire(p1: Pt, d1: [number, number], p2: Pt, d2: [number, number] | null): Pt[] {
  const xs = new Set<number>([p1.x, p2.x, snap((p1.x + p2.x) / 2), p1.x + d1[0] * GRID, Math.min(p1.x, p2.x) - GRID, Math.max(p1.x, p2.x) + GRID])
  const ys = new Set<number>([p1.y, p2.y, snap((p1.y + p2.y) / 2), p1.y + d1[1] * GRID, Math.min(p1.y, p2.y) - GRID, Math.max(p1.y, p2.y) + GRID])
  if (d2) {
    xs.add(p2.x + d2[0] * GRID)
    ys.add(p2.y + d2[1] * GRID)
  }

  const candidates: Pt[][] = [
    [p1, p2],
    [p1, { x: p2.x, y: p1.y }, p2],
    [p1, { x: p1.x, y: p2.y }, p2],
  ]
  for (const cx of xs) candidates.push([p1, { x: cx, y: p1.y }, { x: cx, y: p2.y }, p2])
  for (const cy of ys) candidates.push([p1, { x: p1.x, y: cy }, { x: p2.x, y: cy }, p2])

  let best: Pt[] | null = null
  let bestCost = Infinity
  for (const raw of candidates) {
    const pts = simplify(raw)
    if (!validRoute(pts, d1, d2)) continue
    const first = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y }
    let cost = bends(pts) * 1000 + length(pts)
    // Leaving sideways runs the wire along the row of neighbouring terminals (it reads as a short circuit),
    // so it costs more than a bend. Arriving sideways is fine, e.g. dropping onto the end of a horizontal lead.
    if (first.x * d1[0] + first.y * d1[1] <= EPS) cost += 1500
    if (d2) {
      const n = pts.length
      const behind = { x: pts[n - 2].x - pts[n - 1].x, y: pts[n - 2].y - pts[n - 1].y }
      if (behind.x * d2[0] + behind.y * d2[1] <= EPS) cost += 300
    }
    if (cost < bestCost) {
      best = pts
      bestCost = cost
    }
  }
  return best ?? stubRoute(p1, d1, p2, d2)
}

/** Last-resort route: leave and arrive along the terminal directions, joined by a jog. */
function stubRoute(p1: Pt, d1: [number, number], p2: Pt, d2: [number, number] | null): Pt[] {
  const s1 = { x: p1.x + d1[0] * GRID, y: p1.y + d1[1] * GRID }
  const s2 = d2 ? { x: p2.x + d2[0] * GRID, y: p2.y + d2[1] * GRID } : p2
  const pts: Pt[] = [p1, s1]
  if (d1[0] === 0) pts.push({ x: s1.x, y: (s1.y + s2.y) / 2 }, { x: s2.x, y: (s1.y + s2.y) / 2 })
  else pts.push({ x: (s1.x + s2.x) / 2, y: s1.y }, { x: (s1.x + s2.x) / 2, y: s2.y })
  pts.push(s2, p2)
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

/**
 * Scale the whole drawing about its top-left corner: positions and part sizes both multiply by
 * `factor`, so every terminal moves along a straight line from that corner and wires that were
 * aligned stay aligned. Returns null if any part would land on a size that is not a preset.
 */
export function scaleDrawing(doc: Doc, factor: number): Doc | null {
  if (!doc.items.length || factor === 1) return null
  const next: number[] = []
  for (const it of doc.items) {
    const target = SCALES.find((v) => Math.abs(v - itemScale(it) * factor) < 1e-9)
    if (target === undefined) return null
    next.push(target)
  }
  let ax = Infinity
  let ay = Infinity
  for (const it of doc.items) {
    const b = itemBounds(it, defOf(it))
    ax = Math.min(ax, b.x)
    ay = Math.min(ay, b.y)
  }
  const r = (v: number) => Math.round(v * 100) / 100
  return {
    ...doc,
    items: doc.items.map((it, n) => ({
      ...it,
      scale: next[n] === 1 ? undefined : next[n],
      x: r(ax + (it.x - ax) * factor),
      y: r(ay + (it.y - ay) * factor),
    })),
  }
}

export interface AlignResult {
  delta: Pt
  /** World x / y of the terminal line the part snapped onto, for drawing a guide. */
  guideX?: number
  guideY?: number
}

/**
 * Magnetic alignment: nudge a proposed move so a moving terminal lines up with a fixed terminal, if one is
 * within `radius` on that axis. X and Y are handled separately, each taking the closest match. This is what
 * lets a part of a different size (with a different terminal spacing) line up exactly with parts it connects to.
 */
export function alignDelta(moving: Pt[], fixed: Pt[], delta: Pt, radius = GRID / 2): AlignResult {
  let bestX = radius + 1
  let bestY = radius + 1
  const out: AlignResult = { delta: { ...delta } }
  for (const m of moving) {
    for (const f of fixed) {
      const ex = f.x - (m.x + delta.x)
      const ey = f.y - (m.y + delta.y)
      if (Math.abs(ex) <= radius && Math.abs(ex) < bestX) {
        bestX = Math.abs(ex)
        out.delta.x = delta.x + ex
        out.guideX = f.x
      }
      if (Math.abs(ey) <= radius && Math.abs(ey) < bestY) {
        bestY = Math.abs(ey)
        out.delta.y = delta.y + ey
        out.guideY = f.y
      }
    }
  }
  return out
}

/** World positions of every terminal of the given items. */
export function terminalPoints(items: Item[]): Pt[] {
  return items.flatMap((it) => {
    const def = defOf(it)
    return def.terminals.map((t) => {
      const p = terminalWorld(it, def, t.id)!
      return { x: p.x, y: p.y }
    })
  })
}