import { describe, expect, it } from 'vitest'
import { SYMBOLS, getSymbol } from '../data'
import { diagramToSvg, junctions, wireGeometries } from './export'
import { initHistory, reducer } from './history'
import { dolStarterExample } from './examples'
import type { Item, Rot } from './model'
import { SCALES } from '../data/scale'
import { GRID, alignDelta, itemBounds, noteBounds, scaleDrawing, terminalPoints, nextLabel, pivotOf, routeWire, snap, snapPlacement, stepScale, terminalWorld } from './model'
import { conflictingItemIds, planFit, planShrink, sheetConflicts } from './checks'
import { clonePayload, copyPayload } from './clipboard'
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

  it('crops to the parts and notes when the sheet is off', () => {
    const doc = { ...dolStarterExample(), sheet: { ...dolStarterExample().sheet, enabled: false } }
    const partsOnly = diagramToSvg({ ...doc, notes: [] })
    expect(partsOnly.width).toBeLessThan(600)
    expect(partsOnly.svg).not.toContain('>MURIEL<')
    // The example's notes sit well to the left of the circuit, so including them widens the picture.
    expect(diagramToSvg(doc).width).toBeGreaterThan(partsOnly.width)
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


const mod = (n: number, m: number) => ((n % m) + m) % m

describe('part size', () => {
  it('keeps every terminal on the 5 px lattice at every size and rotation', () => {
    for (const def of SYMBOLS) {
      for (const scale of SCALES) {
        for (const rot of [0, 90, 180, 270] as Rot[]) {
          for (const t of def.terminals) {
            const p = terminalWorld({ ...item(def.id, rot), scale }, def, t.id)!
            expect(mod(p.x, 5), `${def.id}.${t.id} x @${scale}/${rot}`).toBe(0)
            expect(mod(p.y, 5), `${def.id}.${t.id} y @${scale}/${rot}`).toBe(0)
          }
        }
      }
    }
  })

  it('scales the bounding box about the pivot', () => {
    const def = getSymbol('resistor')!
    const a = itemBounds(item(def.id), def)
    const b = itemBounds({ ...item(def.id), scale: 2 }, def)
    expect([b.w, b.h]).toEqual([a.w * 2, a.h * 2])
    // The pivot (item.x, item.y) stays put: distances from it double.
    const it = item(def.id)
    expect([b.x - it.x, b.y - it.y]).toEqual([(a.x - it.x) * 2, (a.y - it.y) * 2])
  })

  it('steps through presets and clamps at both ends', () => {
    expect(stepScale(1, 1)).toBe(1.25)
    expect(stepScale(1, -1)).toBe(0.75)
    expect(stepScale(0.5, -1)).toBe(0.5)
    expect(stepScale(3, 1)).toBe(3)
    expect(stepScale(1.3, 1)).toBe(1.5) // snaps to the nearest preset first
  })

  it('places a part so its first terminal, not its centre, is on the grid', () => {
    for (const def of SYMBOLS) {
      for (const scale of SCALES) {
        for (const rot of [0, 90, 180, 270] as Rot[]) {
          const at = snapPlacement(def, { x: 333, y: 517 }, scale, rot)
          const it: Item = { id: 'a', symbolId: def.id, x: at.x, y: at.y, rot, label: '', scale }
          const t0 = terminalWorld(it, def, def.terminals[0].id)!
          expect(mod(t0.x, GRID), `${def.id}@${scale}/${rot}`).toBe(0)
          expect(mod(t0.y, GRID)).toBe(0)
        }
      }
    }
  })

  it('leaves size-1 placement identical to snapping the pivot', () => {
    const def = getSymbol('circuit-breaker-3p')!
    expect(snapPlacement(def, { x: 333, y: 517 })).toEqual({ x: snap(333), y: snap(517) })
  })

  it('resizing keeps the first terminal (and so its wire) exactly in place', () => {
    const doc = dolStarterExample()
    for (const id of ['e-q1', 'e-k1', 'e-m1']) {
      let h = initHistory(doc)
      const it0 = h.present.items.find((i) => i.id === id)!
      const def = getSymbol(it0.symbolId)!
      const t0 = def.terminals[0].id
      const before = terminalWorld(it0, def, t0)!
      for (const dir of [1, 1, 1, -1, -1, -1, -1, -1] as (1 | -1)[]) {
        h = reducer(h, { type: 'resize', ids: [id], dir })
        const now = h.present.items.find((i) => i.id === id)!
        const after = terminalWorld(now, def, t0)!
        expect([after.x, after.y]).toEqual([before.x, before.y])
      }
    }
  })

  it('sets an exact size, ignores sizes outside the presets, and can be undone', () => {
    let h = initHistory(dolStarterExample())
    h = reducer(h, { type: 'set-scale', ids: ['e-q1'], scale: 1.25 })
    expect(h.present.items.find((i) => i.id === 'e-q1')!.scale).toBe(1.25)
    const same = reducer(h, { type: 'set-scale', ids: ['e-q1'], scale: 1.3 })
    expect(same).toBe(h)
    h = reducer(h, { type: 'undo' })
    expect(h.present.items.find((i) => i.id === 'e-q1')!.scale).toBeUndefined()
  })

  it('keeps terminals on the grid after rotating a resized part', () => {
    let h = initHistory(dolStarterExample())
    h = reducer(h, { type: 'set-scale', ids: ['e-m1'], scale: 0.75 })
    for (let i = 0; i < 4; i++) {
      h = reducer(h, { type: 'rotate', ids: ['e-m1'] })
      const it = h.present.items.find((x) => x.id === 'e-m1')!
      const p = terminalWorld(it, getSymbol(it.symbolId)!, 'U')!
      expect(mod(p.x, GRID)).toBe(0)
      expect(mod(p.y, GRID)).toBe(0)
    }
  })

  it('copies size when duplicating and exports resized parts', () => {
    let h = initHistory(dolStarterExample())
    h = reducer(h, { type: 'set-scale', ids: ['e-f1'], scale: 2 })
    const payload = copyPayload(h.present, { items: ['e-f1'], wires: [], notes: [] })!
    const clone = clonePayload(h.present, payload, 40, 40)
    h = reducer(h, { type: 'paste', payload: clone })
    expect(h.present.items.find((i) => i.id === clone.items[0].id)!.scale).toBe(2)
    const { svg } = diagramToSvg(h.present)
    expect(svg).toContain('translate(-') // scaled pivot offset is applied
  })
})

describe('wire routing around sideways terminals', () => {
  const up: [number, number] = [0, -1]
  const down: [number, number] = [0, 1]
  const left: [number, number] = [-1, 0]
  const right: [number, number] = [1, 0]
  const dirs = [up, down, left, right]
  const dot = (a: [number, number], b: { x: number; y: number }) => a[0] * b.x + a[1] * b.y

  it('never leaves against, or arrives from behind, a terminal, for any combination', () => {
    const p1 = { x: 200, y: 200 }
    const targets = [
      { x: 200, y: 340 }, { x: 260, y: 340 }, { x: 120, y: 340 }, { x: 200, y: 60 },
      { x: 320, y: 200 }, { x: 60, y: 200 }, { x: 240, y: 200 }, { x: 205, y: 260 },
    ]
    for (const d1 of dirs) for (const d2 of dirs) for (const p2 of targets) {
      const pts = routeWire(p1, d1, p2, d2)
      const n = pts.length
      expect(dot(d1, { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y }), 'leaves against d1').toBeGreaterThanOrEqual(0)
      expect(dot(d2, { x: pts[n - 2].x - pts[n - 1].x, y: pts[n - 2].y - pts[n - 1].y }), 'arrives from behind d2').toBeGreaterThanOrEqual(0)
      for (let i = 1; i < n; i++) expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true)
    }
  })

  it('runs straight down onto the end of a horizontal lead directly below', () => {
    const pts = routeWire({ x: 100, y: 100 }, down, { x: 100, y: 300 }, left)
    expect(pts).toEqual([{ x: 100, y: 100 }, { x: 100, y: 300 }])
  })

  it('goes round, not through, a part whose lead is to the left of the wire (the R1 case)', () => {
    // Wire drops from a breaker terminal; the resistor's left lead is 20 px left of it and 110 px down.
    const pts = routeWire({ x: 64, y: 118 }, down, { x: 44, y: 228 }, left)
    expect(pts.length - 2).toBeLessThanOrEqual(2) // at most two bends
    // It leaves straight down, not sideways along the row of neighbouring terminals.
    expect(pts[1].x).toBe(64)
    expect(pts[1].y).toBeGreaterThan(118)
    // And it never reaches the lead from the body side.
    expect(pts[pts.length - 2].x).toBeLessThanOrEqual(44)
  })

  it('never leaves a terminal sideways when a straight-out route exists', () => {
    // Breaker pole terminals face down; a target well to the right must not be reached by running along y = 118.
    const pts = routeWire({ x: 64, y: 118 }, down, { x: 300, y: 400 }, left)
    expect(pts[1].x).toBe(64)
  })

  it('routes a resized variable resistor across two breaker poles with straight wires', () => {
    const q = getSymbol('circuit-breaker-3p')!
    const r = getSymbol('variable-resistor')!
    const breaker: Item = { id: 'q', symbolId: q.id, x: 300, y: 200, rot: 0, label: 'Q1', scale: 1.25 }
    const t1 = terminalWorld(breaker, q, 'T1')!
    const t2 = terminalWorld(breaker, q, 'T2')!
    expect(t2.x - t1.x).toBe(50)
    // Resistor at 0.5x, turned sideways: its two leads are 50 px apart, matching the pole pitch.
    const probe: Item = { id: 'r', symbolId: r.id, x: 0, y: 0, rot: 90, label: 'R1', scale: 0.5 }
    const l = terminalWorld(probe, r, '2')!
    const rt = terminalWorld(probe, r, '1')!
    expect(rt.x - l.x).toBe(50)
    const res: Item = { ...probe, x: t1.x - l.x, y: t1.y + 160 - l.y }
    const a = terminalWorld(res, r, '2')!
    const b = terminalWorld(res, r, '1')!
    expect([a.x, b.x]).toEqual([t1.x, t2.x])
    for (const [from, to] of [[t1, a], [t2, b]] as const) {
      expect(routeWire(from, [from.dx, from.dy], to, [to.dx, to.dy])).toHaveLength(2)
    }
  })

  it('previews a wire being dragged with only the start constraint', () => {
    const pts = routeWire({ x: 100, y: 100 }, down, { x: 180, y: 260 }, null)
    expect(pts[1].y).toBeGreaterThanOrEqual(100)
    expect(pts.length).toBeLessThanOrEqual(3)
  })
})

describe('keeping a drawing on the sheet', () => {
  it('lists the parts that are off the sheet', () => {
    const doc = dolStarterExample()
    expect(conflictingItemIds(doc)).toEqual([])
    const off = { ...doc, items: doc.items.map((i) => (i.id === 'e-m1' ? { ...i, x: -400 } : i)) }
    expect(conflictingItemIds(off)).toEqual(['e-m1'])
  })

  it('moves an off-sheet drawing into the free space, undoably', () => {
    const doc = dolStarterExample()
    const a4 = { ...doc, sheet: { ...doc.sheet, size: 'A4' as const } }
    expect(sheetConflicts(a4)).toBe(true)
    const plan = planFit(a4)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    let h = initHistory(a4)
    h = reducer(h, { type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    expect(sheetConflicts(h.present)).toBe(false)
    expect(mod(plan.dx, GRID)).toBe(0)
    expect(mod(plan.dy, GRID)).toBe(0)
    h = reducer(h, { type: 'undo' })
    expect(sheetConflicts(h.present)).toBe(true)
  })

  it('picks a bigger sheet when the drawing has outgrown the current one', () => {
    let h = initHistory({ ...dolStarterExample(), sheet: { ...dolStarterExample().sheet, size: 'A4' } })
    h = reducer(h, { type: 'scale-all', factor: 3 })
    const plan = planFit(h.present)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(['A2', 'A1']).toContain(plan.size)
    h = reducer(h, { type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    expect(sheetConflicts(h.present)).toBe(false)
  })

  it('says so when nothing fits, instead of pretending', () => {
    const doc = dolStarterExample()
    const huge = { ...doc, items: doc.items.map((i, n) => ({ ...i, x: n * 4000 })) }
    expect(planFit(huge)).toMatchObject({ ok: false })
  })

  it('does nothing for an empty drawing or with the sheet off', () => {
    const doc = dolStarterExample()
    expect(planFit({ ...doc, items: [], wires: [], notes: [] })).toMatchObject({ ok: true, dx: 0, dy: 0 })
    expect(conflictingItemIds({ ...doc, sheet: { ...doc.sheet, enabled: false }, items: doc.items.map((i) => ({ ...i, x: -999 })) })).toEqual([])
  })
})


describe('scaling the whole drawing', () => {
  it('keeps every wire straight and aligned, at every factor', () => {
    for (const factor of [0.5, 0.75, 1.5, 2]) {
      const scaled = scaleDrawing(dolStarterExample(), factor)
      if (!scaled) continue
      for (const g of wireGeometries(scaled)) expect(g.points, `factor ${factor}`).toHaveLength(2)
    }
  })

  it('maps every terminal along a line from the top-left corner', () => {
    const doc = dolStarterExample()
    const scaled = scaleDrawing(doc, 0.5)!
    let ax = Infinity
    let ay = Infinity
    for (const it of doc.items) {
      const b = itemBounds(it, getSymbol(it.symbolId)!)
      ax = Math.min(ax, b.x)
      ay = Math.min(ay, b.y)
    }
    for (const n of doc.notes) {
      const b = noteBounds(n)
      ax = Math.min(ax, b.x)
      ay = Math.min(ay, b.y)
    }
    doc.items.forEach((it, n) => {
      const def = getSymbol(it.symbolId)!
      for (const t of def.terminals) {
        const a = terminalWorld(it, def, t.id)!
        const b = terminalWorld(scaled.items[n], def, t.id)!
        expect(b.x).toBeCloseTo(ax + (a.x - ax) * 0.5, 6)
        expect(b.y).toBeCloseTo(ay + (a.y - ay) * 0.5, 6)
      }
    })
  })

  it('refuses when a part would leave the preset sizes, and leaves the drawing unchanged', () => {
    const doc = dolStarterExample()
    expect(scaleDrawing(doc, 0.25)).toBeNull()
    expect(scaleDrawing(doc, 4)).toBeNull()
    const h = initHistory(doc)
    expect(reducer(h, { type: 'scale-all', factor: 0.25 })).toBe(h)
  })

  it('shrinks and fits a drawing that is too large for every sheet', () => {
    const doc = dolStarterExample()
    // Stretch it out sideways so it is wider than the biggest frame, but not by much.
    const wide = { ...doc, items: doc.items.map((i) => (i.id === 'e-m1' ? { ...i, x: i.x + 3300 } : i)) }
    expect(planFit(wide).ok).toBe(false)
    const shrink = planShrink(wide)
    expect(shrink).not.toBeNull()
    expect(shrink!.factor).toBe(0.75)
    let h = initHistory(wide)
    h = reducer(h, { type: 'scale-all', factor: shrink!.factor })
    h = reducer(h, { type: 'fit-sheet', dx: shrink!.plan.dx, dy: shrink!.plan.dy, size: shrink!.plan.size })
    expect(sheetConflicts(h.present)).toBe(false)
    expect(h.present.sheet.size).toBe(shrink!.plan.size)
  })

  it('round-trips 100% -> 50% -> 200% back to the original part sizes', () => {
    const doc = dolStarterExample()
    const half = scaleDrawing(doc, 0.5)!
    const back = scaleDrawing(half, 2)!
    expect(back.items.map((i) => i.scale ?? 1)).toEqual(doc.items.map((i) => i.scale ?? 1))
    back.items.forEach((it, n) => {
      expect(it.x).toBeCloseTo(doc.items[n].x, 6)
      expect(it.y).toBeCloseTo(doc.items[n].y, 6)
    })
  })
})


describe('magnetic alignment', () => {
  it('pulls a moving terminal onto a fixed one within the radius, per axis', () => {
    const r = alignDelta([{ x: 100, y: 100 }], [{ x: 150, y: 400 }], { x: 40, y: 60 })
    expect(r.delta).toEqual({ x: 50, y: 60 }) // x is 10 off -> pulled in; y is 240 off -> untouched
    expect(r.guideX).toBe(150)
    expect(r.guideY).toBeUndefined()
  })

  it('takes the closest of several candidates and ignores anything past the radius', () => {
    const r = alignDelta([{ x: 0, y: 0 }], [{ x: 14, y: 0 }, { x: 8, y: 0 }, { x: -3, y: 0 }], { x: 0, y: 0 })
    expect(r.delta.x).toBe(-3)
    expect(alignDelta([{ x: 0, y: 0 }], [{ x: 11, y: 11 }], { x: 0, y: 0 }).delta).toEqual({ x: 0, y: 0 })
  })

  it('lets a differently sized part line up exactly with the poles it bridges', () => {
    const q = getSymbol('circuit-breaker-3p')!
    const r = getSymbol('variable-resistor')!
    const breaker: Item = { id: 'q', symbolId: q.id, x: 300, y: 200, rot: 0, label: '', scale: 1.25 }
    const res: Item = { id: 'r', symbolId: r.id, x: 260, y: 460, rot: 90, label: '', scale: 0.5 }
    // Drag the resistor by a grid-snapped amount that lands a little off, then let alignment finish the job.
    const fixed = terminalPoints([breaker])
    const moving = terminalPoints([res])
    const t1 = terminalWorld(breaker, q, 'T1')!
    const lead = terminalWorld(res, r, '2')!
    const snapped = { x: snap(t1.x - lead.x), y: 0 }
    const a = alignDelta(moving, fixed, snapped)
    const moved = { ...res, x: res.x + a.delta.x, y: res.y + a.delta.y }
    const l2 = terminalWorld(moved, r, '2')!
    const l1 = terminalWorld(moved, r, '1')!
    const t2 = terminalWorld(breaker, q, 'T2')!
    expect(l2.x).toBe(t1.x)
    expect(l1.x).toBe(t2.x)
  })
})