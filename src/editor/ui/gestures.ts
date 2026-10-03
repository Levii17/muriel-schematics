import type { Pt } from '@/shared/geometry'

import type { View } from './state'

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The view after two fingers move from `from` to `to` (positions relative to the canvas), starting from `view`.
 * The drawing point that was under the middle of the fingers stays under it, so one gesture both zooms and pans.
 */
export function pinchView(view: View, from: [Pt, Pt], to: [Pt, Pt], min: number, max: number): View {
  const m0 = mid(from[0], from[1])
  const m1 = mid(to[0], to[1])
  const d0 = dist(from[0], from[1])
  // Fingers that start on top of each other give no scale to work from, so only pan.
  const ratio = d0 < 1 ? 1 : dist(to[0], to[1]) / d0
  const k = Math.min(max, Math.max(min, view.k * ratio))
  const wx = (m0.x - view.x) / view.k
  const wy = (m0.y - view.y) / view.k
  return { k, x: m1.x - wx * k, y: m1.y - wy * k }
}

/** A tap: where and when a finger last lifted without moving. */
export interface Tap {
  t: number
  x: number
  y: number
}

/** True when `now` follows `prev` closely enough in time and place to be the second half of a double-tap. */
export function isDoubleTap(prev: Tap | null, now: Tap, ms = 350, px = 28): boolean {
  return !!prev && now.t - prev.t <= ms && Math.hypot(now.x - prev.x, now.y - prev.y) <= px
}
