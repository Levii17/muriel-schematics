import { describe, expect, it } from 'vitest'

import type { Prim } from '@/symbols/types'

import type { PaperSize, SheetConfig } from './sheet'
import { BLOCK_H, BLOCK_W, FIELD_DEFS, MARGIN, PAPER, blockBox, defaultSheet, fit, frameBox, mergeSheet, sheetFieldValue, sheetPrims, zoneOf } from './sheet'

const sizes: PaperSize[] = ['A4', 'A3', 'A2', 'A1']
const sample = (size: PaperSize): SheetConfig => ({
  ...defaultSheet(),
  enabled: true,
  size,
  fields: { ...defaultSheet().fields, organization: 'Muriel', project: 'Motor control', title: 'DOL starter' },
})

const texts = (prims: Prim[]) => prims.flatMap((p) => (p.k === 'text' ? [p.text] : []))

describe('drawing sheet geometry', () => {
  it('starts the frame on the 20 px grid and keeps the title block a fixed size', () => {
    // Paper uses true ISO proportions (A3 = 420 x 297 mm at 4 px/mm), so the far edges need not land on the grid.
    for (const size of sizes) {
      const f = frameBox(size)
      expect(f.x % 20).toBe(0)
      expect(f.y % 20).toBe(0)
      const b = blockBox(size)
      expect(b.w).toBe(BLOCK_W)
      expect(b.h).toBe(BLOCK_H)
    }
  })

  it('uses true ISO paper proportions', () => {
    for (const size of sizes) {
      const { w, h } = PAPER[size]
      expect(w / h).toBeCloseTo(Math.SQRT2, 2)
    }
  })

  it('places the title block inside the frame, flush to its bottom-right corner', () => {
    for (const size of sizes) {
      const f = frameBox(size)
      const b = blockBox(size)
      expect(b.x + b.w).toBe(f.x + f.w)
      expect(b.y + b.h).toBe(f.y + f.h)
      expect(b.x).toBeGreaterThan(f.x)
      expect(b.y).toBeGreaterThan(f.y)
    }
  })

  it('fills the paper with the frame plus a uniform margin', () => {
    for (const size of sizes) {
      const f = frameBox(size)
      expect(f.x + f.w + MARGIN).toBe(PAPER[size].w)
      expect(f.y + f.h + MARGIN).toBe(PAPER[size].h)
    }
  })

  it('emits only finite numbers', () => {
    for (const size of sizes) {
      for (const p of sheetPrims(sample(size))) {
        const nums = p.k === 'line' ? [p.x1, p.y1, p.x2, p.y2] : p.k === 'rect' ? [p.x, p.y, p.w, p.h] : p.k === 'text' ? [p.x, p.y] : p.k === 'poly' ? p.pts.flat() : []
        expect(nums.every(Number.isFinite)).toBe(true)
      }
    }
  })

  it('labels every zone column and row', () => {
    const t = texts(sheetPrims(sample('A3')))
    for (let i = 1; i <= PAPER.A3.cols; i++) expect(t.filter((x) => x === String(i)).length).toBe(2)
    for (let j = 0; j < PAPER.A3.rows; j++) expect(t.filter((x) => x === String.fromCharCode(65 + j)).length).toBe(2)
  })

  it('prints captions for every title-block field and the entered values', () => {
    const t = texts(sheetPrims(sample('A4')))
    for (const def of FIELD_DEFS) expect(t).toContain(def.label.toUpperCase())
    expect(t).toContain('Muriel')
    expect(t).toContain('DOL starter')
    expect(t).toContain('NTS')
  })

  it('draws the logo tile text', () => {
    expect(texts(sheetPrims(sample('A4')))).toContain('MURIEL')
  })
})

describe('fit', () => {
  it('leaves short text alone and truncates long text with an ellipsis', () => {
    expect(fit('abc', 200, 15)).toBe('abc')
    const cut = fit('a very long project name that will not fit', 100, 15)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.length).toBeLessThan(20)
  })
})

describe('mergeSheet', () => {
  it('falls back to defaults for junk input', () => {
    expect(mergeSheet(null).enabled).toBe(false)
    expect(mergeSheet('x').size).toBe('A3')
    expect(mergeSheet({ size: 'B9', enabled: 'yes' })).toMatchObject({ size: 'A3', enabled: false })
  })

  it('keeps valid values, drops non-strings and clamps length', () => {
    const s = mergeSheet({ enabled: true, size: 'A4', fields: { project: 'P', scale: 5, revision: 'ABCDEFGHIJ' } })
    expect(s).toMatchObject({ enabled: true, size: 'A4' })
    expect(s.fields.project).toBe('P')
    expect(s.fields.scale).toBe('NTS')
    expect(s.fields.revision).toHaveLength(4)
  })
})
describe('zoneOf', () => {
  it('names zones like the margin does: row letter, then column number', () => {
    const f = frameBox('A3')
    expect(zoneOf('A3', f.x + 1, f.y + 1)).toBe('A1')
    expect(zoneOf('A3', f.x + f.w - 1, f.y + f.h - 1)).toBe('F8')
  })

  it('clamps points outside the frame to the edge zones', () => {
    expect(zoneOf('A4', -500, -500)).toBe('A1')
    expect(zoneOf('A4', 99999, 99999)).toBe('D6')
  })

  it('uses each paper size\'s own grid', () => {
    const f = frameBox('A1')
    expect(zoneOf('A1', f.x + f.w - 1, f.y + f.h - 1)).toBe('L16')
  })
})

describe('sheetFieldValue', () => {
  it('numbers a multi-sheet drawing when the field is blank or untouched', () => {
    expect(sheetFieldValue('1 / 1', { index: 2, total: 5 })).toBe('2 / 5')
    expect(sheetFieldValue('', { index: 1, total: 2 })).toBe('1 / 2')
  })

  it('keeps what the user typed, and leaves a single sheet alone', () => {
    expect(sheetFieldValue('A', { index: 2, total: 5 })).toBe('A')
    expect(sheetFieldValue('1 / 1', { index: 1, total: 1 })).toBe('1 / 1')
    expect(sheetFieldValue('1 / 1')).toBe('1 / 1')
  })
})
