import { describe, expect, it } from 'vitest'
import { CATEGORIES, SYMBOLS } from './index'
import type { Prim } from './types'

const finite = (p: Prim): boolean => {
  switch (p.k) {
    case 'line':
      return [p.x1, p.y1, p.x2, p.y2].every(Number.isFinite)
    case 'rect':
      return [p.x, p.y, p.w, p.h].every(Number.isFinite)
    case 'circle':
      return [p.cx, p.cy, p.r].every(Number.isFinite)
    case 'poly':
      return p.pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    case 'text':
      return Number.isFinite(p.x) && Number.isFinite(p.y)
    case 'path':
      return p.d.length > 0
  }
}

describe('symbol library data', () => {
  it('has unique symbol ids', () => {
    const ids = SYMBOLS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('assigns every symbol to a known category and fills every category', () => {
    const known = new Set(CATEGORIES.map((c) => c.id))
    for (const s of SYMBOLS) expect(known.has(s.category), s.id).toBe(true)
    for (const c of CATEGORIES) expect(SYMBOLS.some((s) => s.category === c.id), c.id).toBe(true)
  })

  it('keeps bounding boxes on the 20 px grid', () => {
    for (const s of SYMBOLS) {
      expect(s.width % 20, `${s.id} width`).toBe(0)
      expect(s.height % 20, `${s.id} height`).toBe(0)
    }
  })

  it('places terminals on the grid, inside the box, with unique ids', () => {
    for (const s of SYMBOLS) {
      expect(s.terminals.length, s.id).toBeGreaterThan(0)
      const ids = s.terminals.map((t) => t.id)
      expect(new Set(ids).size, `${s.id} terminal ids`).toBe(ids.length)
      for (const t of s.terminals) {
        expect(t.x % 20, `${s.id}.${t.id} x`).toBe(0)
        expect(t.y % 20, `${s.id}.${t.id} y`).toBe(0)
        expect(t.x >= 0 && t.x <= s.width, `${s.id}.${t.id} inside width`).toBe(true)
        expect(t.y >= 0 && t.y <= s.height, `${s.id}.${t.id} inside height`).toBe(true)
      }
    }
  })

  it('has finite drawing geometry and descriptive text', () => {
    for (const s of SYMBOLS) {
      expect(s.body.every(finite), s.id).toBe(true)
      expect(s.summary.length, s.id).toBeGreaterThan(10)
      expect(s.usage.length, s.id).toBeGreaterThan(10)
      expect(s.tags.length, s.id).toBeGreaterThan(0)
    }
  })

  it('ships a reasonably complete library', () => {
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(30)
  })
})
