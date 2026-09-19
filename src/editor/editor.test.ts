import { describe, expect, it } from 'vitest'
import { SYMBOLS, getSymbol } from '../data'
import { diagramToSvg, junctions, wireGeometries } from './export'
import { initHistory, reducer } from './history'
import { dolStarterExample } from './examples'
import type { Item, Rot } from './model'
import { GRID, itemBounds, nextLabel, pivotOf, routeWire, terminalWorld } from './model'
import { sheetConflicts } from './checks'
import { blockBox, frameBox } from './sheet'

const item = (symbolId: string, rot: Rot = 0, x = 200, y = 200, label = ''): Item => ({
  id: 'i1', symbolId, x, y, rot, label,
})

describe('geometry', () => {
  it('keeps every terminal on the grid for every symbol and rotation', () => {
    for (const def of SYMBOLS) {
      for (const rot of [0, 90, 180, 270] as Rot[]) {
        for (const t of def.terminals) {
          const p = terminalWorld(item(def.id, rot), def, t.id)!
          expect(p.x % GRID, `${def.id}.${t.id}@${rot} x`).toBe(0)
          expect(p.y % GRID, `${def.id}.${t.id}@${rot} y`).toBe(0)
        }
      }
    }
  })

  it('rotates terminal direction with the symbol', () => {
    const def = getSymbol('circuit-breaker-1p')!
    const top = terminalWorld(item(def.id, 0), def, 'L1')!
    expect([top.dx, top.dy]).toEqual([0, -1])
    const r90 = terminalWorld(item(def.id, 90), def, 'L1')!
    expect([r90.dx, r90.dy]).toEqual([1, 0])
    const r180 = terminalWorld(item(def.id, 180), def, 'L1')!
    expect([r180.dx, r180.dy]).toEqual([0, 1])
  })

  it('swaps bounding box width and height on a quarter turn', () => {
    const def = getSymbol('contactor-3p')!
    const a = itemBounds(item(def.id, 0), def)
    const b = itemBounds(item(def.id, 90), def)
    expect([a.w, a.h]).toEqual([def.width, def.height])
    expect([b.w, b.h]).toEqual([def.height, def.width])
  })

  it('has a grid-aligned pivot', () => {
    for (const def of SYMBOLS) {
      const pv = pivotOf(def)
      expect(pv.x % GRID).toBe(0)
      expect(pv.y % GRID).toBe(0)
    }
  })
})

describe('routeWire', () => {
  const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

  it('only produces axis-aligned segments and starts/ends on the terminals', () => {
    const p1 = { x: 100, y: 100 }
    for (const d1 of dirs) {
      for (const d2 of dirs) {
        for (const p2 of [{ x: 100, y: 240 }, { x: 260, y: 240 }, { x: 40, y: 20 }, { x: 260, y: 100 }]) {
          const pts = routeWire(p1, d1, p2, d2)
          expect(pts[0]).toEqual(p1)
          expect(pts[pts.length - 1]).toEqual(p2)
          for (let i = 1; i < pts.length; i++) {
            expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true)
          }
        }
      }
    }
  })

  it('collapses to a straight line for facing, aligned terminals', () => {
    const pts = routeWire({ x: 20, y: 60 }, [0, 1], { x: 20, y: 120 }, [0, -1])
    expect(pts).toEqual([{ x: 20, y: 60 }, { x: 20, y: 120 }])
  })
})

describe('labels', () => {
  it('numbers parts per reference letter', () => {
    const q = getSymbol('circuit-breaker-3p')!
    const k = getSymbol('contactor-3p')!
    const items = [item(q.id, 0, 0, 0, 'Q1'), { ...item(q.id), id: 'i2', label: 'Q3' }]
    expect(nextLabel(items, q)).toBe('Q4')
    expect(nextLabel(items, k)).toBe('K1')
    expect(nextLabel(items, getSymbol('supply-3ph-n-pe')!)).toBe('')
  })
})

describe('history reducer', () => {
  it('deleting an item also deletes its wires, and undo restores both', () => {
    let h = initHistory(dolStarterExample())
    const before = h.present
    h = reducer(h, { type: 'delete-items', ids: ['e-k1'] })
    expect(h.present.items.find((i) => i.id === 'e-k1')).toBeUndefined()
    expect(h.present.wires.some((w) => w.a.item === 'e-k1' || w.b.item === 'e-k1')).toBe(false)
    h = reducer(h, { type: 'undo' })
    expect(h.present).toBe(before)
    h = reducer(h, { type: 'redo' })
    expect(h.present.items.find((i) => i.id === 'e-k1')).toBeUndefined()
  })

  it('ignores duplicate and self wires', () => {
    let h = initHistory(dolStarterExample())
    const n = h.present.wires.length
    h = reducer(h, { type: 'wire', a: { item: 'e-q1', term: 'T1' }, b: { item: 'e-k1', term: '1' } })
    h = reducer(h, { type: 'wire', a: { item: 'e-k1', term: '1' }, b: { item: 'e-q1', term: 'T1' } })
    h = reducer(h, { type: 'wire', a: { item: 'e-k1', term: '1' }, b: { item: 'e-k1', term: '1' } })
    expect(h.present.wires).toHaveLength(n)
    expect(h.past).toHaveLength(0)
  })

  it('rotates by quarter turns', () => {
    let h = initHistory(dolStarterExample())
    for (let i = 0; i < 4; i++) h = reducer(h, { type: 'rotate', ids: ['e-m1'] })
    expect(h.present.items.find((i) => i.id === 'e-m1')!.rot).toBe(0)
  })
})

describe('example + export', () => {
  const doc = dolStarterExample()

  it('routes the example starter with straight vertical wires', () => {
    const geoms = wireGeometries(doc)
    expect(geoms).toHaveLength(doc.wires.length)
    for (const g of geoms) expect(g.points).toHaveLength(2)
  })

  it('has no junctions in the plain starter', () => {
    expect(junctions(doc)).toHaveLength(0)
  })

  it('exports a standalone SVG including labels', () => {
    const { svg } = diagramToSvg(doc, { background: '#fff' })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('>Q1<')
    expect(svg).toContain('>M1<')
    expect(svg.match(/<path d=/g)!.length).toBe(doc.wires.length)
  })
})

describe('drawing sheet in the document', () => {
  it('exports the full paper at true size when the sheet is on', () => {
    const doc = dolStarterExample()
    const { svg, width, height } = diagramToSvg(doc)
    expect(doc.sheet.enabled).toBe(true)
    expect([width, height]).toEqual([1680, 1188])
    expect(svg).toContain('width="420mm" height="297mm"')
    expect(svg).toContain('viewBox="0 0 1680 1188"')
    expect(svg).toContain('>MURIEL<')
    expect(svg).toContain('>DOL starter, power circuit<')
  })

  it('keeps the example circuit inside the frame and clear of the title block', () => {
    const doc = dolStarterExample()
    const f = frameBox(doc.sheet.size)
    const blk = blockBox(doc.sheet.size)
    for (const it of doc.items) {
      const b = itemBounds(it, getSymbol(it.symbolId)!)
      expect(b.x).toBeGreaterThan(f.x)
      expect(b.y).toBeGreaterThan(f.y)
      expect(b.x + b.w).toBeLessThan(f.x + f.w)
      expect(b.y + b.h).toBeLessThan(blk.y)
    }
  })

  it('crops to the parts when the sheet is off', () => {
    const doc = { ...dolStarterExample(), sheet: { ...dolStarterExample().sheet, enabled: false } }
    const { svg, width } = diagramToSvg(doc)
    expect(width).toBeLessThan(600)
    expect(svg).not.toContain('>MURIEL<')
  })

  it('edits sheet fields through the reducer, undoably and without touching other fields', () => {
    let h = initHistory(dolStarterExample())
    const before = h.present.sheet.fields.organization
    h = reducer(h, { type: 'sheet', patch: { fields: { project: 'Pump station' } } })
    expect(h.present.sheet.fields.project).toBe('Pump station')
    expect(h.present.sheet.fields.organization).toBe(before)
    h = reducer(h, { type: 'sheet', patch: { size: 'A4' } })
    expect(h.present.sheet).toMatchObject({ size: 'A4', enabled: true })
    h = reducer(h, { type: 'undo' })
    h = reducer(h, { type: 'undo' })
    expect(h.present.sheet.fields.project).toBe('Motor control demo')
  })

  it('keeps the sheet when parts are deleted', () => {
    let h = initHistory(dolStarterExample())
    h = reducer(h, { type: 'delete-items', ids: h.present.items.map((i) => i.id) })
    expect(h.present.items).toHaveLength(0)
    expect(h.present.sheet.enabled).toBe(true)
  })
})

describe('sheetConflicts', () => {
  it('is quiet for the example on A3 and warns when it no longer fits on A4', () => {
    const doc = dolStarterExample()
    expect(sheetConflicts(doc)).toBe(false)
    expect(sheetConflicts({ ...doc, sheet: { ...doc.sheet, size: 'A4' } })).toBe(true)
  })

  it('ignores conflicts when the sheet is off', () => {
    const doc = dolStarterExample()
    expect(sheetConflicts({ ...doc, sheet: { ...doc.sheet, size: 'A4', enabled: false } })).toBe(false)
  })
})
