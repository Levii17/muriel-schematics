import { describe, expect, it } from 'vitest'
import { SYMBOLS } from './index'
import { SCALES, scaleBody, scalePath, scalePrim } from './scale'

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