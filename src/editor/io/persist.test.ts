import { describe, expect, it } from 'vitest'

import { dolStarterExample } from '@/editor/examples'

import { sanitizeDoc } from './persist'

describe('sanitizeDoc', () => {
  it('round-trips a valid document', () => {
    const doc = dolStarterExample()
    expect(sanitizeDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('rejects things that are not documents', () => {
    expect(sanitizeDoc(null)).toBeNull()
    expect(sanitizeDoc({ items: 'x', wires: [] })).toBeNull()
  })

  it('loads documents saved before the sheet existed with the sheet switched off', () => {
    const { items, wires } = dolStarterExample()
    const legacy = sanitizeDoc({ items, wires })!
    expect(legacy.items).toHaveLength(items.length)
    expect(legacy.sheet.enabled).toBe(false)
  })

  it('drops unknown symbols and the wires that pointed at them', () => {
    const doc = dolStarterExample()
    const broken = { ...doc, items: doc.items.map((i) => (i.id === 'e-k1' ? { ...i, symbolId: 'gone' } : i)) }
    const clean = sanitizeDoc(broken)!
    expect(clean.items.some((i) => i.id === 'e-k1')).toBe(false)
    expect(clean.wires.some((w) => w.a.item === 'e-k1' || w.b.item === 'e-k1')).toBe(false)
    expect(clean.wires.length).toBeGreaterThan(0)
  })

  it('keeps valid part sizes and drops invalid ones', () => {
    const doc = dolStarterExample()
    const sized = { ...doc, items: doc.items.map((i, n) => ({ ...i, scale: n === 0 ? 1.5 : n === 1 ? 1.3 : undefined })) }
    const clean = sanitizeDoc(JSON.parse(JSON.stringify(sized)))!
    expect(clean.items[0].scale).toBe(1.5)
    expect(clean.items[1].scale).toBeUndefined()
  })

  it('drops wires whose terminal no longer exists', () => {
    const doc = dolStarterExample()
    const broken = { ...doc, wires: [...doc.wires, { id: 'x', a: { item: 'e-q1', term: 'NOPE' }, b: { item: 'e-k1', term: '1' } }] }
    expect(sanitizeDoc(broken)!.wires).toHaveLength(doc.wires.length)
  })
})