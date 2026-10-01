import type { Dir, Prim, Role, Terminal } from './types'

export const line = (x1: number, y1: number, x2: number, y2: number, dash = false): Prim => ({
  k: 'line', x1, y1, x2, y2, dash,
})
export const rect = (x: number, y: number, w: number, h: number): Prim => ({ k: 'rect', x, y, w, h })
export const circle = (cx: number, cy: number, r: number, solid = false): Prim => ({
  k: 'circle', cx, cy, r, solid,
})
export const path = (d: string, solid = false): Prim => ({ k: 'path', d, solid })
export const poly = (...pts: [number, number][]): Prim => ({ k: 'poly', pts })
export const text = (
  x: number,
  y: number,
  t: string,
  size = 14,
  weight: 400 | 600 | 700 = 600,
  anchor: 'start' | 'middle' | 'end' = 'middle',
): Prim => ({ k: 'text', x, y, text: t, size, weight, anchor })

export const term = (
  id: string,
  label: string,
  name: string,
  x: number,
  y: number,
  role: Role,
  dir: Dir,
): Terminal => ({ id, label, name, x, y, role, dir })

/** Height of every contact "pole" drawing. */
export const POLE_H = 80

/**
 * One vertical contact pole centred on `x`. Fixed contact at the top, hinge at the bottom.
 * NO: blade rests clear of the fixed contact. NC: blade rests on a foot on the fixed contact.
 * `mark` adds the breaker cross or the isolator (disconnector) bar at the fixed end.
 */
export function pole(x: number, kind: 'no' | 'nc', mark?: 'breaker' | 'isolator'): Prim[] {
  const out: Prim[] = [line(x, 0, x, 24), line(x, 56, x, POLE_H), line(x, 56, x + 16, 24)]
  if (kind === 'nc') out.push(line(x, 24, x + 16, 24))
  if (mark === 'breaker') out.push(line(x - 5, 19, x + 5, 29), line(x - 5, 29, x + 5, 19))
  if (mark === 'isolator') out.push(line(x - 8, 24, x + 8, 24))
  return out
}

/** Dashed mechanical linkage. */
export const link = (x1: number, x2: number, y = 40): Prim => line(x1, y, x2, y, true)

/** Thermal-release mark: a small square bracket the linkage runs into. */
export const thermalMark = (x: number, y: number): Prim =>
  poly([x, y - 10], [x + 10, y - 10], [x + 10, y + 10], [x, y + 10])
