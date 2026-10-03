import { describe, expect, it } from 'vitest'

import { isDoubleTap, pinchView } from './gestures'

const V = { x: 100, y: 50, k: 1 }
const worldAt = (v: { x: number; y: number; k: number }, p: { x: number; y: number }) => ({ x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k })

describe('pinchView', () => {
  it('leaves the view alone when the fingers have not moved', () => {
    const f: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 200, y: 100 }]
    expect(pinchView(V, f, f, 0.1, 3)).toEqual(V)
  })

  it('zooms by the ratio of the finger distances', () => {
    const from: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 200, y: 100 }]
    const to: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 50, y: 100 }, { x: 250, y: 100 }]
    expect(pinchView(V, from, to, 0.1, 3).k).toBeCloseTo(2)
  })

  it('keeps the drawing point under the middle of the fingers fixed while zooming', () => {
    const from: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 200, y: 140 }]
    const to: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 60, y: 90 }, { x: 240, y: 150 }]
    const before = worldAt(V, { x: 150, y: 120 })
    const after = pinchView(V, from, to, 0.1, 3)
    const now = worldAt(after, { x: 150, y: 120 })
    expect(now.x).toBeCloseTo(before.x)
    expect(now.y).toBeCloseTo(before.y)
  })

  it('pans when both fingers slide together', () => {
    const from: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 200, y: 100 }]
    const to: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 130, y: 80 }, { x: 230, y: 80 }]
    const out = pinchView(V, from, to, 0.1, 3)
    expect(out.k).toBe(1)
    expect(out.x).toBeCloseTo(130)
    expect(out.y).toBeCloseTo(30)
  })

  it('stops at the zoom limits', () => {
    const from: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 110, y: 100 }]
    const wide: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 0, y: 100 }, { x: 1000, y: 100 }]
    expect(pinchView(V, from, wide, 0.1, 3).k).toBe(3)
    expect(pinchView(V, wide, from, 0.1, 3).k).toBe(0.1)
  })

  it('only pans when the fingers start on top of each other', () => {
    const from: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 100, y: 100 }, { x: 100, y: 100 }]
    const to: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 90, y: 100 }, { x: 300, y: 100 }]
    const out = pinchView(V, from, to, 0.1, 3)
    expect(out.k).toBe(1)
    expect(Number.isFinite(out.x)).toBe(true)
  })
})

describe('isDoubleTap', () => {
  const tap = (t: number, x = 100, y = 100) => ({ t, x, y })

  it('needs an earlier tap', () => {
    expect(isDoubleTap(null, tap(0))).toBe(false)
  })

  it('accepts two quick taps in the same place', () => {
    expect(isDoubleTap(tap(0), tap(200, 108, 95))).toBe(true)
  })

  it('rejects slow taps and taps in different places', () => {
    expect(isDoubleTap(tap(0), tap(600))).toBe(false)
    expect(isDoubleTap(tap(0), tap(100, 200, 100))).toBe(false)
  })
})
