import { describe, expect, it } from 'vitest'
import { SYMBOLS, getSymbol } from '../data'
import { CATEGORIES } from '../data/categories'
import { searchSymbols } from '../lib/search'
import { clonePayload, copyPayload } from './clipboard'
import { dolStarterExample } from './examples'
import { diagramToSvg } from './export'
import { initHistory, reducer } from './history'
import type { Doc, Item, Pt, Wire } from './model'
import { itemBounds, routeWire, scaleDrawing, terminalWorld } from './model'
import { sanitizeDoc } from './persist'
import { transformDoc } from './transform'
import {
  JUNCTION_SYMBOL, JUNCTION_TERMINAL, junctions, nearestWirePoint, routeThrough, shiftSegment, shiftWires, splitWire, tapPoint, tapWire,
  wireGeometries, wireGeometry, wireStroke,
} from './wires'

const up: [number, number] = [0, -1]
const down: [number, number] = [0, 1]
const left: [number, number] = [-1, 0]
const right: [number, number] = [1, 0]
const dirs = [up, down, left, right]

const onPath = (pts: Pt[], p: Pt) =>
  pts.some((q, i) => i > 0 && Math.min(pts[i - 1].x, q.x) - 1e-6 <= p.x && p.x <= Math.max(pts[i - 1].x, q.x) + 1e-6 && Math.min(pts[i - 1].y, q.y) - 1e-6 <= p.y && p.y <= Math.max(pts[i - 1].y, q.y) + 1e-6)
const orthogonal = (pts: Pt[]) => pts.every((p, i) => i === 0 || p.x === pts[i - 1].x || p.y === pts[i - 1].y)
const length = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + Math.abs(p.x - pts[i - 1].x) + Math.abs(p.y - pts[i - 1].y) : 0), 0)

/** Two fuses joined by a hand-routed Z-shaped wire. */
function zDoc(): Doc {
  const a: Item = { id: 'a', symbolId: 'fuse', x: 100, y: 100, rot: 0, label: 'F1' }
  const b: Item = { id: 'b', symbolId: 'fuse', x: 300, y: 300, rot: 0, label: 'F2' }
  const wire: Wire = { id: 'w', a: { item: 'a', term: '2' }, b: { item: 'b', term: '1' }, via: [{ x: 100, y: 200 }, { x: 300, y: 200 }], style: { dash: 'dashed', width: 3 } }
  return { ...dolStarterExample(), items: [a, b], wires: [wire], notes: [] }
}

describe('routeThrough', () => {
  it('goes straight when the points line up', () => {
    const r = routeThrough({ x: 0, y: 0 }, down, [{ x: 0, y: 100 }], { x: 0, y: 200 }, up)
    expect(r.points).toEqual([{ x: 0, y: 0 }, { x: 0, y: 200 }])
  })

  it('passes through every waypoint, stays right-angled and ends where it should, for any facing', () => {
    const p1 = { x: 200, y: 200 }
    const spots: Pt[] = [{ x: 320, y: 260 }, { x: 80, y: 140 }, { x: 200, y: 340 }, { x: 260, y: 200 }, { x: 60, y: 320 }]
    for (const d1 of dirs) for (const d2 of dirs) for (const p2 of [{ x: 400, y: 400 }, { x: 40, y: 60 }, { x: 200, y: 360 }]) {
      for (let n = 1; n <= 3; n++) {
        const via = spots.slice(0, n)
        const { points } = routeThrough(p1, d1, via, p2, d2)
        expect(points[0]).toEqual(p1)
        expect(points[points.length - 1]).toEqual(p2)
        expect(orthogonal(points)).toBe(true)
        for (const v of via) expect(onPath(points, v), `via ${JSON.stringify(v)}`).toBe(true)
      }
    }
  })

  it('leaves along the terminal direction and arrives against its facing when it can', () => {
    // Drop from a downward-facing terminal to a waypoint off to the side: go down first, not sideways.
    const r = routeThrough({ x: 100, y: 100 }, down, [{ x: 200, y: 200 }], { x: 200, y: 300 }, up)
    expect(r.points[1]).toEqual({ x: 100, y: 200 })
    // Arriving at an upward-facing terminal: the last leg comes down onto it.
    expect(r.points[r.points.length - 2].x).toBe(200)
    expect(r.points[r.points.length - 2].y).toBeLessThan(300)
  })

  it('visits a waypoint even when that means doubling back to it', () => {
    // The waypoint sits beyond the wire's own line; dropping it would leave the handle floating off the wire.
    const { points } = routeThrough({ x: 200, y: 200 }, up, [{ x: 320, y: 260 }], { x: 40, y: 60 }, left)
    expect(onPath(points, { x: 320, y: 260 })).toBe(true)
    expect(orthogonal(points)).toBe(true)
  })

  it('never turns straight back on itself when a better corner exists', () => {
    const { points } = routeThrough({ x: 100, y: 100 }, right, [{ x: 200, y: 160 }, { x: 320, y: 60 }], { x: 400, y: 200 }, left)
    for (let i = 2; i < points.length; i++) {
      const a = { x: points[i - 1].x - points[i - 2].x, y: points[i - 1].y - points[i - 2].y }
      const b = { x: points[i].x - points[i - 1].x, y: points[i].y - points[i - 1].y }
      expect(a.x * b.x + a.y * b.y, `reversal at ${i}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('numbers the segments by the waypoint gap they belong to', () => {
    const { points, pairs } = routeThrough({ x: 0, y: 0 }, down, [{ x: 100, y: 100 }, { x: 200, y: 200 }], { x: 300, y: 300 }, up)
    expect(pairs).toHaveLength(points.length - 1)
    expect([...pairs].sort((x, y) => x - y)).toEqual(pairs) // never goes backwards
    expect(new Set(pairs)).toEqual(new Set([0, 1, 2])) // every gap owns at least one segment
  })

  it('reproduces an automatic route exactly when its corners are used as waypoints', () => {
    // This is what makes "drag a handle on an automatic wire" keep the wire's shape.
    const p1 = { x: 200, y: 200 }
    for (const d1 of dirs) for (const d2 of dirs) for (const p2 of [{ x: 200, y: 340 }, { x: 320, y: 300 }, { x: 60, y: 120 }, { x: 260, y: 200 }, { x: 200, y: 60 }]) {
      const auto = routeWire(p1, d1, p2, d2)
      const manual = routeThrough(p1, d1, auto.slice(1, -1), p2, d2)
      expect(manual.points, `${d1} ${d2} ${JSON.stringify(p2)}`).toEqual(auto)
    }
  })
})

describe('wire geometry', () => {
  it('follows the waypoints of a hand-routed wire and routes itself otherwise', () => {
    const doc = zDoc()
    const g = wireGeometry(doc, doc.wires[0])!
    expect(g.points).toEqual([{ x: 100, y: 140 }, { x: 100, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 240 }])
    const { via: _v, ...auto } = doc.wires[0]
    void _v
    const gAuto = wireGeometry({ ...doc, wires: [auto] }, auto)!
    expect(gAuto.points).toEqual(routeWire({ x: 100, y: 140 }, [0, 1], { x: 300, y: 240 }, [0, -1]))
    expect(gAuto.pairs).toEqual(gAuto.points.slice(1).map((_, i) => i))
  })

  it('skips wires whose ends are missing', () => {
    const doc = zDoc()
    expect(wireGeometries({ ...doc, items: [doc.items[0]] })).toEqual([])
  })

  it('keeps every wire in the example straight and unchanged', () => {
    for (const g of wireGeometries(dolStarterExample())) expect(g.points).toHaveLength(2)
  })
})

describe('waypoints follow their parts', () => {
  const doc = zDoc()

  it('shifts only when both ends move', () => {
    expect(shiftWires(doc.wires, ['a', 'b'], 20, 40)[0].via).toEqual([{ x: 120, y: 240 }, { x: 320, y: 240 }])
    expect(shiftWires(doc.wires, ['a'], 20, 40)[0]).toBe(doc.wires[0])
    expect(shiftWires(doc.wires, ['a', 'b'], 0, 0)).toBe(doc.wires)
  })

  it('travels with a group move, and stays put when only one end moves', () => {
    let h = initHistory(doc)
    h = reducer(h, { type: 'move', ids: ['a', 'b'], dx: 20, dy: 0 })
    expect(h.present.wires[0].via).toEqual([{ x: 120, y: 200 }, { x: 320, y: 200 }])
    h = reducer(initHistory(doc), { type: 'move', ids: ['a'], dx: 20, dy: 0 })
    expect(h.present.wires[0].via).toEqual(doc.wires[0].via)
  })

  it('turns and flips with a group so its shape is kept', () => {
    const g = wireGeometry(doc, doc.wires[0])!
    for (const kind of ['rot90', 'flipH', 'flipV'] as const) {
      const out = transformDoc(doc, ['a', 'b'], kind)
      const g2 = wireGeometry({ ...doc, ...out }, out.wires![0])!
      expect(g2.points, kind).toHaveLength(g.points.length) // still the same Z, just turned or reflected
      expect(orthogonal(g2.points)).toBe(true)
      expect(length(g2.points)).toBeCloseTo(length(g.points), 6)
    }
  })

  it('scales with the whole drawing and shifts with fit-to-sheet', () => {
    const big = { ...doc, sheet: { ...doc.sheet, enabled: false } }
    const half = scaleDrawing(big, 0.5)!
    const lo = Math.min(...big.items.map((i) => itemBounds(i, getSymbol(i.symbolId)!).x))
    expect(half.wires[0].via![1].x).toBeCloseTo(lo + (300 - lo) * 0.5, 6)
    const h = reducer(initHistory(doc), { type: 'fit-sheet', dx: 40, dy: 60, size: 'A3' })
    expect(h.present.wires[0].via).toEqual([{ x: 140, y: 260 }, { x: 340, y: 260 }])
  })

  it('is copied with its style and offset when pasted', () => {
    const p = copyPayload(doc, { items: ['a', 'b'], wires: [], notes: [] })!
    const clone = clonePayload(doc, p, 40, 60)
    expect(clone.wires[0].via).toEqual([{ x: 140, y: 260 }, { x: 340, y: 260 }])
    expect(clone.wires[0].style).toEqual({ dash: 'dashed', width: 3 })
    expect(clone.wires[0].style).not.toBe(doc.wires[0].style) // no shared object
  })
})

describe('editing a wire through history', () => {
  it('sets, changes and clears the route, and skips no-ops', () => {
    const doc = zDoc()
    let h = initHistory(doc)
    h = reducer(h, { type: 'wire-route', id: 'w', via: [{ x: 100, y: 220 }] })
    expect(h.present.wires[0].via).toEqual([{ x: 100, y: 220 }])
    const same = reducer(h, { type: 'wire-route', id: 'w', via: [{ x: 100, y: 220 }] })
    expect(same).toBe(h)
    h = reducer(h, { type: 'wire-route', id: 'w', via: null })
    expect('via' in h.present.wires[0]).toBe(false)
    expect(reducer(h, { type: 'wire-route', id: 'w', via: [] })).toBe(h) // empty means automatic, and it already is
    h = reducer(h, { type: 'undo' })
    expect(h.present.wires[0].via).toEqual([{ x: 100, y: 220 }])
  })

  it('changes line style and weight on several wires at once, and clears them', () => {
    const doc = dolStarterExample()
    const ids = doc.wires.slice(0, 3).map((w) => w.id)
    let h = initHistory(doc)
    h = reducer(h, { type: 'wire-style', ids, patch: { dash: 'dotted', width: 1 } })
    for (const w of h.present.wires.slice(0, 3)) expect(w.style).toEqual({ dash: 'dotted', width: 1 })
    expect(h.present.wires[3].style).toBeUndefined()
    expect(h.past).toHaveLength(1)
    expect(reducer(h, { type: 'wire-style', ids, patch: { dash: 'dotted' } })).toBe(h)
    h = reducer(h, { type: 'wire-style', ids, patch: { dash: null } })
    expect(h.present.wires[0].style).toEqual({ width: 1 })
    h = reducer(h, { type: 'wire-style', ids, patch: { width: 2 } }) // the normal weight is stored as nothing
    expect(h.present.wires[0].style).toBeUndefined()
  })

  it('draws styles in the export', () => {
    const { svg } = diagramToSvg({ ...zDoc(), sheet: { ...zDoc().sheet, enabled: false } })
    expect(svg).toContain('stroke-width="3"')
    expect(svg).toContain('stroke-dasharray="8 5"')
    const plain = diagramToSvg({ ...dolStarterExample() }).svg
    expect(plain).not.toContain('stroke-dasharray="8 5"')
    expect(wireStroke()).toEqual({ width: 2 })
    expect(wireStroke({ dash: 'dashdot', width: 1 })).toEqual({ width: 1, dash: '10 4 2 4' })
  })
})

describe('finding a spot on a wire', () => {
  const doc = zDoc()
  const geoms = wireGeometries(doc)

  it('picks the closest point within reach', () => {
    const hit = nearestWirePoint(geoms, { x: 190, y: 206 }, 10)!
    expect(hit).toMatchObject({ wireId: 'w', segment: 1, point: { x: 190, y: 200 } })
    expect(nearestWirePoint(geoms, { x: 190, y: 230 }, 10)).toBeNull()
  })

  it('ignores excluded wires', () => {
    expect(nearestWirePoint(geoms, { x: 190, y: 200 }, 10, new Set(['w']))).toBeNull()
  })

  it('snaps the junction to the grid along the wire and refuses the wire ends', () => {
    const hit = nearestWirePoint(geoms, { x: 193, y: 203 }, 10)!
    expect(tapPoint(geoms[0], hit)).toEqual({ x: 200, y: 200 })
    const nearEnd = nearestWirePoint(geoms, { x: 100, y: 141 }, 10)!
    expect(tapPoint(geoms[0], nearEnd)).toBeNull()
  })
})

describe('splitting a wire at a junction', () => {
  it('adds a junction on the wire and keeps the picture identical', () => {
    const doc = zDoc()
    const before = wireGeometry(doc, doc.wires[0])!
    const r = splitWire(doc, 'w', { x: 200, y: 200 }, 'j', 'w2')!
    expect(r.point).toEqual({ x: 200, y: 200 })
    const j = r.doc.items.find((i) => i.id === 'j')!
    expect(j.symbolId).toBe(JUNCTION_SYMBOL)
    expect(terminalWorld(j, getSymbol(JUNCTION_SYMBOL)!, JUNCTION_TERMINAL)).toMatchObject({ x: 200, y: 200 })
    expect(r.doc.wires).toHaveLength(2)
    const [w1, w2] = r.doc.wires.map((w) => wireGeometry(r.doc, w)!)
    // The halves share the junction and, joined, trace the original wire.
    expect(w1.points[w1.points.length - 1]).toEqual({ x: 200, y: 200 })
    expect(w2.points[0]).toEqual({ x: 200, y: 200 })
    expect([...w1.points, ...w2.points.slice(1)]).toEqual([before.points[0], before.points[1], { x: 200, y: 200 }, before.points[2], before.points[3]])
    // Style is kept on both, and each half keeps only the corners on its own side.
    expect(r.doc.wires.map((w) => w.style)).toEqual([{ dash: 'dashed', width: 3 }, { dash: 'dashed', width: 3 }])
    expect(r.doc.wires[0].via).toEqual([{ x: 100, y: 200 }])
    expect(r.doc.wires[1].via).toEqual([{ x: 300, y: 200 }])
    expect(r.doc.wires[0].b).toEqual({ item: 'j', term: '1' })
    expect(r.doc.wires[1].a).toEqual({ item: 'j', term: '1' })
    expect(r.doc.wires[1].b).toEqual(doc.wires[0].b)
  })

  it('keeps straight wires straight when a junction is dropped in the middle', () => {
    const doc = dolStarterExample()
    const w = doc.wires.find((x) => x.a.item === 'e-q1' && x.a.term === 'T1')!
    const g = wireGeometry(doc, w)!
    const mid = { x: g.points[0].x, y: (g.points[0].y + g.points[1].y) / 2 }
    const r = splitWire(doc, w.id, mid, 'j', 'w2')!
    const halves = r.doc.wires.filter((x) => x.a.item === 'j' || x.b.item === 'j').map((x) => wireGeometry(r.doc, x)!)
    expect(halves).toHaveLength(2)
    for (const h of halves) expect(h.points).toHaveLength(2)
    expect(r.doc.wires).toHaveLength(doc.wires.length + 1)
  })

  it('can cut exactly at a corner', () => {
    const r = splitWire(zDoc(), 'w', { x: 300, y: 200 }, 'j', 'w2')!
    expect(r.point).toEqual({ x: 300, y: 200 })
    expect(r.doc.wires[0].via).toEqual([{ x: 100, y: 200 }])
    expect(r.doc.wires[1].via).toBeUndefined()
  })

  it('refuses a cut at either end of the wire, and for a missing wire', () => {
    expect(splitWire(zDoc(), 'w', { x: 100, y: 140 }, 'j', 'w2')).toBeNull()
    expect(splitWire(zDoc(), 'w', { x: 300, y: 240 }, 'j', 'w2')).toBeNull()
    expect(splitWire(zDoc(), 'nope', { x: 200, y: 200 }, 'j', 'w2')).toBeNull()
  })
})

describe('tapping into a wire', () => {
  const tapDoc = (): { doc: Doc; from: { item: string; term: string } } => {
    const doc = zDoc()
    const c: Item = { id: 'c', symbolId: 'fuse', x: 500, y: 100, rot: 0, label: 'F3' }
    return { doc: { ...doc, items: [...doc.items, c] }, from: { item: 'c', term: '2' } }
  }

  it('joins a terminal to the middle of a wire with one junction and three wires', () => {
    const { doc, from } = tapDoc()
    const out = tapWire(doc, { wireId: 'w', at: { x: 200, y: 200 }, from, junctionId: 'j', secondId: 'w2', newId: 'w3' })!
    expect(out.wires).toHaveLength(3)
    const atJ = out.wires.filter((w) => [w.a, w.b].some((e) => e.item === 'j'))
    expect(atJ).toHaveLength(3)
    expect(out.wires.find((w) => w.id === 'w3')).toMatchObject({ a: from, b: { item: 'j', term: '1' } })
    // The junction draws its own dot, so no second dot is added for its three wires.
    expect(junctions(out)).toEqual([])
    for (const w of out.wires) expect(wireGeometry(out, w)).not.toBeNull()
  })

  it('is one undoable step, and does nothing when the spot is a wire end', () => {
    const { doc, from } = tapDoc()
    let h = initHistory(doc)
    h = reducer(h, { type: 'tap', request: { wireId: 'w', at: { x: 200, y: 200 }, from, junctionId: 'j', secondId: 'w2', newId: 'w3' } })
    expect(h.present.wires).toHaveLength(3)
    expect(h.past).toHaveLength(1)
    h = reducer(h, { type: 'undo' })
    expect(h.present).toBe(doc)
    const noop = reducer(initHistory(doc), { type: 'tap', request: { wireId: 'w', at: { x: 100, y: 140 }, from, junctionId: 'j', secondId: 'w2', newId: 'w3' } })
    expect(noop.present).toBe(doc)
  })

  it('still draws dots where several wires meet at an ordinary terminal', () => {
    const doc = dolStarterExample()
    const extra: Wire = { id: 'x', a: { item: 'e-q1', term: 'T1' }, b: { item: 'e-f1', term: 'L1' } }
    expect(junctions({ ...doc, wires: [...doc.wires, extra] }).length).toBeGreaterThan(0)
  })
})

describe('the junction symbol', () => {
  const def = getSymbol(JUNCTION_SYMBOL)!

  it('has one omnidirectional terminal at its centre and a small hit area', () => {
    expect(def.terminals).toHaveLength(1)
    expect(def.terminals[0]).toMatchObject({ x: 20, y: 20, dir: 'any' })
    const b = itemBounds({ id: 'j', symbolId: def.id, x: 300, y: 200, rot: 0, label: '' }, def)
    expect(b).toEqual({ x: 292, y: 192, w: 16, h: 16 })
    expect(def.bounds!.x).toBeGreaterThanOrEqual(0)
    expect(def.bounds!.x + def.bounds!.w).toBeLessThanOrEqual(def.width)
  })

  it('lives in its own category and can be found by search', () => {
    expect(CATEGORIES.some((c) => c.id === def.category)).toBe(true)
    expect(searchSymbols(SYMBOLS, 'junction')[0].id).toBe(JUNCTION_SYMBOL)
    expect(searchSymbols(SYMBOLS, 'tee').map((s) => s.id)).toContain(JUNCTION_SYMBOL)
  })

  it('lets wires leave in any direction without a sideways penalty', () => {
    const p1 = { x: 100, y: 100 }
    // From a junction to a point down and to the right, the neat route is one bend, whichever way it goes first.
    const r = routeWire(p1, [0, 0], { x: 200, y: 200 }, down)
    expect(r.length - 2).toBeLessThanOrEqual(1)
    for (const d of dirs) expect(orthogonal(routeWire(p1, [0, 0], { x: 260, y: 40 }, d))).toBe(true)
  })

  it('never reports a junction part as needing an extra dot', () => {
    const doc = zDoc()
    const r = splitWire(doc, 'w', { x: 200, y: 200 }, 'j', 'w2')!
    expect(junctions(r.doc)).toEqual([])
  })
})

describe('storage of wires', () => {
  it('round-trips waypoints and styles', () => {
    const doc = zDoc()
    expect(sanitizeDoc(JSON.parse(JSON.stringify(doc)))!.wires).toEqual(doc.wires)
  })

  it('drops malformed waypoints and styles but keeps the wire', () => {
    const doc = zDoc()
    const raw = JSON.parse(JSON.stringify(doc))
    raw.wires[0].via = [{ x: 1, y: 2 }, { x: 'a', y: 2 }, null, { x: 5 }]
    raw.wires[0].style = { dash: 'wavy', width: 7 }
    const clean = sanitizeDoc(raw)!
    expect(clean.wires).toHaveLength(1)
    expect(clean.wires[0].via).toEqual([{ x: 1, y: 2 }])
    expect(clean.wires[0].style).toBeUndefined()
    raw.wires[0].via = 'nope'
    raw.wires[0].style = 'nope'
    const again = sanitizeDoc(raw)!
    expect('via' in again.wires[0]).toBe(false)
    expect('style' in again.wires[0]).toBe(false)
  })

  it('caps the number of waypoints', () => {
    const doc = zDoc()
    const raw = JSON.parse(JSON.stringify(doc))
    raw.wires[0].via = Array.from({ length: 500 }, (_, i) => ({ x: i, y: i }))
    expect(sanitizeDoc(raw)!.wires[0].via!.length).toBe(60)
  })

  it('keeps junction parts and the wires attached to them', () => {
    const r = splitWire(zDoc(), 'w', { x: 200, y: 200 }, 'j', 'w2')!
    const back = sanitizeDoc(JSON.parse(JSON.stringify(r.doc)))!
    expect(back.items.some((i) => i.id === 'j')).toBe(true)
    expect(back.wires).toHaveLength(2)
  })
})

describe('sliding a wire segment sideways', () => {
  const trace = (pts: Pt[], via: Pt[], d1: [number, number], d2: [number, number]) => routeThrough(pts[0], d1, via, pts[pts.length - 1], d2).points

  it('moves the middle of a Z-shaped wire and leaves everything else alone', () => {
    const pts = [{ x: 100, y: 140 }, { x: 100, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 240 }]
    const via = shiftSegment(pts, 1, -40)
    expect(via).toEqual([{ x: 100, y: 160 }, { x: 300, y: 160 }])
    expect(trace(pts, via, down, up)).toEqual([{ x: 100, y: 140 }, { x: 100, y: 160 }, { x: 300, y: 160 }, { x: 300, y: 240 }])
  })

  it('moves a vertical middle segment left or right', () => {
    const pts = [{ x: 100, y: 100 }, { x: 160, y: 100 }, { x: 160, y: 300 }, { x: 300, y: 300 }]
    expect(trace(pts, shiftSegment(pts, 1, 60), right, left)).toEqual([{ x: 100, y: 100 }, { x: 220, y: 100 }, { x: 220, y: 300 }, { x: 300, y: 300 }])
  })

  it('slides the corner along the next segment when the segment touches only one terminal', () => {
    // L-shape: terminal, corner, terminal. Sliding the first leg sideways keeps a short stub at the terminal.
    const pts = [{ x: 100, y: 100 }, { x: 100, y: 300 }, { x: 300, y: 300 }]
    const via = shiftSegment(pts, 0, 40)
    expect(via).toEqual([{ x: 100, y: 120 }, { x: 140, y: 120 }, { x: 140, y: 300 }])
    expect(trace(pts, via, down, left)).toEqual([{ x: 100, y: 100 }, { x: 100, y: 120 }, { x: 140, y: 120 }, { x: 140, y: 300 }, { x: 300, y: 300 }])
  })

  it('turns a straight wire into a bump, with stubs at both terminals', () => {
    const pts = [{ x: 100, y: 100 }, { x: 100, y: 300 }]
    const via = shiftSegment(pts, 0, 40)
    expect(via).toEqual([{ x: 100, y: 120 }, { x: 140, y: 120 }, { x: 140, y: 280 }, { x: 100, y: 280 }])
    expect(trace(pts, via, down, up)).toEqual([{ x: 100, y: 100 }, { x: 100, y: 120 }, { x: 140, y: 120 }, { x: 140, y: 280 }, { x: 100, y: 280 }, { x: 100, y: 300 }])
  })

  it('shortens the stub on a short segment instead of overshooting it', () => {
    const pts = [{ x: 100, y: 100 }, { x: 100, y: 140 }]
    const via = shiftSegment(pts, 0, 20)
    for (const v of via) expect(v.y).toBeGreaterThan(100), expect(v.y).toBeLessThan(140)
  })

  it('a zero slide changes nothing, for every segment of every automatic route', () => {
    const p1 = { x: 200, y: 200 }
    for (const d1 of dirs) for (const d2 of dirs) for (const p2 of [{ x: 200, y: 340 }, { x: 320, y: 300 }, { x: 60, y: 120 }, { x: 260, y: 200 }]) {
      const pts = routeWire(p1, d1, p2, d2).map((p) => ({ x: p.x, y: p.y }))
      for (let k = 0; k < pts.length - 1; k++) {
        expect(trace(pts, shiftSegment(pts, k, 0), d1, d2), `${d1} ${d2} ${JSON.stringify(p2)} k=${k}`).toEqual(pts)
      }
    }
  })

  it('always keeps the wire right-angled and attached to the same terminals, whatever the slide', () => {
    const p1 = { x: 200, y: 200 }
    for (const d1 of dirs) for (const d2 of dirs) for (const p2 of [{ x: 200, y: 340 }, { x: 320, y: 300 }, { x: 60, y: 120 }]) {
      const pts = routeWire(p1, d1, p2, d2).map((p) => ({ x: p.x, y: p.y }))
      for (let k = 0; k < pts.length - 1; k++) {
        for (const offset of [-60, -20, 20, 50, 100]) {
          const via = shiftSegment(pts, k, offset)
          const out = trace(pts, via, d1, d2)
          expect(out[0]).toEqual(pts[0])
          expect(out[out.length - 1]).toEqual(pts[pts.length - 1])
          expect(orthogonal(out)).toBe(true)
          for (const v of via) expect(onPath(out, v)).toBe(true)
        }
      }
    }
  })

  it('leaves a fixed distance between the moved segment and where it started', () => {
    const pts = [{ x: 100, y: 140 }, { x: 100, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }]
    for (const offset of [-20, 20, 60]) {
      const out = trace(pts, shiftSegment(pts, 1, offset), down, up)
      expect(out.some((p, i) => i > 0 && p.y === 200 + offset && out[i - 1].y === 200 + offset && p.x !== out[i - 1].x)).toBe(true)
    }
  })
})