import { describe, expect, it } from 'vitest'
import { SYMBOLS } from './index'
import { SCALES, mirrorPath, mirrorPrim, scaleBody, scalePath, scalePrim } from './scale'

describe('scalePath', () => {
  it('scales end points and radii but not arc flags', () => {
    expect(scalePath('M44,26 A14,14 0 0 1 44,54', 0.5)).toBe('M22 13 A7 7 0 0 1 22 27')
  })

  it('handles closed shapes and implicit repeated pairs', () => {
    expect(scalePath('M36,14 L35.6,24.8 L28.3,21.5 Z', 2)).toBe('M72 28 L71.2 49.6 L56.6 43 Z')
    expect(scalePath('M0,0 10,10', 3)).toBe('M0 0 30 30')
  })

  it('refuses commands it cannot scale rather than drawing them wrong', () => {
    expect(() => scalePath('M0,0 C1,1 2,2 3,3', 2)).toThrow(/Unsupported/)
  })
})

describe('scaleBody', () => {
  it('returns the library primitives untouched at size 1', () => {
    for (const def of SYMBOLS) expect(scaleBody(def, 1)).toBe(def.body)
  })

  it('scales every symbol at every preset without throwing, keeping the primitive count', () => {
    for (const def of SYMBOLS) {
      for (const s of SCALES) {
        const body = scaleBody(def, s)
        expect(body).toHaveLength(def.body.length)
        for (const p of body) {
          const nums = p.k === 'line' ? [p.x1, p.y1, p.x2, p.y2] : p.k === 'rect' ? [p.x, p.y, p.w, p.h] : p.k === 'circle' ? [p.cx, p.cy, p.r] : p.k === 'text' ? [p.x, p.y, p.size] : p.k === 'poly' ? p.pts.flat() : []
          expect(nums.every(Number.isFinite), `${def.id}@${s}`).toBe(true)
        }
      }
    }
  })

  it('scales geometry and text size but never stroke width', () => {
    const line = scalePrim({ k: 'line', x1: 0, y1: 0, x2: 10, y2: 20, style: { w: 3 } }, 2)
    expect(line).toMatchObject({ x2: 20, y2: 40, style: { w: 3 } })
    const t = scalePrim({ k: 'text', x: 10, y: 10, text: 'M', size: 20, weight: 700, anchor: 'middle' }, 0.5)
    expect(t).toMatchObject({ x: 5, y: 5, size: 10 })
  })

  it('is memoised', () => {
    const def = SYMBOLS[0]
    expect(scaleBody(def, 1.5)).toBe(scaleBody(def, 1.5))
  })
})

describe('mirroring', () => {
  it('flips arcs: sweep reverses and x reflects', () => {
    expect(mirrorPath('M44,26 A14,14 0 0 1 44,54', 100)).toBe('M56 26 A14 14 0 0 0 56 54')
  })

  it('is its own inverse for every symbol and size', () => {
    // Round numbers so floating-point noise (30.6 vs 30.600000000000001) does not matter.
    const fix = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x))
    for (const def of SYMBOLS) {
      for (const s of SCALES) {
        const body = scaleBody(def, s)
        const axis2 = 2 * 60 * s
        const twice = body.map((p) => mirrorPrim(mirrorPrim(p, axis2), axis2))
        // Paths come back re-formatted, so compare them against a path passed through the same formatter.
        const expected = body.map((p) => (p.k === 'path' ? { ...p, d: mirrorPath(mirrorPath(p.d, 0), 0) } : p))
        expect(fix(twice), `${def.id}@${s}`).toBe(fix(expected))
      }
    }
  })

  it('keeps text readable: only the anchor point and side move', () => {
    const t = mirrorPrim({ k: 'text', x: 30, y: 10, text: 'kWh', size: 16, weight: 600, anchor: 'start' }, 100)
    expect(t).toMatchObject({ x: 70, y: 10, text: 'kWh', anchor: 'end', size: 16 })
    expect(mirrorPrim({ k: 'text', x: 30, y: 10, text: 'M', size: 16, weight: 600, anchor: 'middle' }, 100)).toMatchObject({ anchor: 'middle' })
  })

  it('mirrors rects, circles and polylines', () => {
    expect(mirrorPrim({ k: 'rect', x: 10, y: 0, w: 30, h: 5 }, 100)).toMatchObject({ x: 60, w: 30 })
    expect(mirrorPrim({ k: 'circle', cx: 20, cy: 5, r: 3 }, 100)).toMatchObject({ cx: 80 })
    expect(mirrorPrim({ k: 'poly', pts: [[10, 1], [20, 2]] }, 100)).toMatchObject({ pts: [[90, 1], [80, 2]] })
  })

  it('handles every path in the library', () => {
    for (const def of SYMBOLS) for (const p of def.body) if (p.k === 'path') expect(() => mirrorPath(p.d, 100)).not.toThrow()
  })
})