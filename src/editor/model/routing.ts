import type { Pt } from '@/shared/geometry'
import { GRID, snap } from '@/shared/geometry'

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
    if ((d1[0] !== 0 || d1[1] !== 0) && first.x * d1[0] + first.y * d1[1] <= EPS) cost += 1500
    if (d2) {
      const n = pts.length
      const behind = { x: pts[n - 2].x - pts[n - 1].x, y: pts[n - 2].y - pts[n - 1].y }
      if ((d2[0] !== 0 || d2[1] !== 0) && behind.x * d2[0] + behind.y * d2[1] <= EPS) cost += 300
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
