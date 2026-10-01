import { describe, expect, it } from 'vitest'

import { SYMBOLS } from './index'
import { searchSymbols } from './search'

describe('searchSymbols', () => {
  it('returns everything for an empty query', () => {
    expect(searchSymbols(SYMBOLS, '  ')).toHaveLength(SYMBOLS.length)
  })

  it('ranks name matches first', () => {
    const r = searchSymbols(SYMBOLS, 'isolator')
    expect(r.slice(0, 3).every((s) => s.id.startsWith('isolator'))).toBe(true)
  })

  it('finds by synonym tags', () => {
    expect(searchSymbols(SYMBOLS, 'mcb').map((s) => s.id)).toContain('circuit-breaker-1p')
    expect(searchSymbols(SYMBOLS, 'ground').map((s) => s.id)).toContain('earth')
    expect(searchSymbols(SYMBOLS, 'dol').map((s) => s.id)).toContain('motor-3ph-dol')
  })

  it('requires every token to match', () => {
    const r = searchSymbols(SYMBOLS, 'motor star')
    expect(r[0].id).toBe('motor-3ph-star-delta')
    // Both tokens must match: a fuse mentions neither, so it is excluded.
    expect(r.map((s) => s.id)).not.toContain('fuse')
  })

  it('finds by terminal label', () => {
    expect(searchSymbols(SYMBOLS, 'a1').map((s) => s.id)).toContain('coil')
  })

  it('returns nothing for gibberish', () => {
    expect(searchSymbols(SYMBOLS, 'qqzzxx')).toEqual([])
  })
})
