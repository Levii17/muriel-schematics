import { describe, expect, it } from 'vitest'

import { dolStarterExample } from '@/editor/examples'

import { restoreProject, sanitizeDoc, sanitizeProject } from './persist'

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
describe('net names in documents', () => {
  const base = () => ({ items: [] as unknown[], wires: [] as unknown[] })
  const lbl = (extra: Record<string, unknown>) => ({ id: 'n', symbolId: 'net-label', x: 0, y: 0, rot: 0, label: '', ...extra })

  it('keeps a tidy name on a net label', () => {
    const doc = sanitizeDoc({ ...base(), items: [lbl({ net: '  L1  ' })] })!
    expect(doc.items[0].net).toBe('L1')
  })

  it('cuts a name that is too long and drops one that is junk', () => {
    const long = sanitizeDoc({ ...base(), items: [lbl({ net: 'X'.repeat(50) })] })!
    expect(long.items[0].net).toHaveLength(12)
    const junk = sanitizeDoc({ ...base(), items: [lbl({ net: 42 }), lbl({ id: 'm', net: '   ' })] })!
    expect(junk.items.every((i) => i.net === undefined)).toBe(true)
  })

  it('removes a name from a part that is not a net label', () => {
    const doc = sanitizeDoc({ ...base(), items: [{ id: 'j', symbolId: 'junction', x: 0, y: 0, rot: 0, label: '', net: 'L1' }] })!
    expect(doc.items[0].net).toBeUndefined()
  })
})

describe('sanitizeProject', () => {
  const doc = () => JSON.parse(JSON.stringify(dolStarterExample()))

  it('round-trips a project and keeps which sheet was open', () => {
    const stored = { v: 2, active: 'b', sheets: [{ id: 'a', doc: doc() }, { id: 'b', doc: doc() }] }
    const out = sanitizeProject(JSON.parse(JSON.stringify(stored)))!
    expect(out.sheets.map((s) => s.id)).toEqual(['a', 'b'])
    expect(out.active).toBe('b')
    expect(out.sheets[0].doc).toEqual(dolStarterExample())
  })

  it('opens the first sheet when the saved one is gone', () => {
    expect(sanitizeProject({ active: 'zz', sheets: [{ id: 'a', doc: doc() }] })!.active).toBe('a')
    expect(sanitizeProject({ sheets: [{ id: 'a', doc: doc() }] })!.active).toBe('a')
  })

  it('drops broken sheets and repeated ids', () => {
    const out = sanitizeProject({ sheets: [{ id: 'a', doc: doc() }, { id: 'a', doc: doc() }, { id: 'c', doc: 'x' }, { doc: doc() }, null] })!
    expect(out.sheets.map((s) => s.id)).toEqual(['a'])
  })

  it('returns null when nothing usable is left', () => {
    expect(sanitizeProject(null)).toBeNull()
    expect(sanitizeProject({ sheets: [] })).toBeNull()
    expect(sanitizeProject({ sheets: [{ id: 'a', doc: 5 }] })).toBeNull()
    expect(sanitizeProject({ sheets: 'x' })).toBeNull()
  })

  it('caps the number of sheets', () => {
    const sheets = Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, doc: doc() }))
    expect(sanitizeProject({ sheets })!.sheets).toHaveLength(40)
  })
})

describe('restoreProject', () => {
  it('prefers the saved project', () => {
    const saved = { sheets: [{ id: 'a', doc: dolStarterExample() }] }
    const out = restoreProject(saved, dolStarterExample(), () => 'new')!
    expect(out.sheets.map((s) => s.id)).toEqual(['a'])
  })

  it('carries a drawing saved by an earlier version over as one sheet', () => {
    const out = restoreProject(null, JSON.parse(JSON.stringify(dolStarterExample())), () => 'first')!
    expect(out.sheets).toHaveLength(1)
    expect(out.sheets[0].id).toBe('first')
    expect(out.active).toBe('first')
    expect(out.sheets[0].doc.items.length).toBe(dolStarterExample().items.length)
  })

  it('returns null when nothing was saved', () => {
    expect(restoreProject(null, null, () => 'x')).toBeNull()
  })
})
