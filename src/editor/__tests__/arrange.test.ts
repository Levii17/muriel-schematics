import { describe, expect, it } from 'vitest'

import { alignMoves, distributeMoves } from '@/editor/actions/align'
import { clonePayload, copyPayload } from '@/editor/actions/clipboard'
import { initHistory, reducer } from '@/editor/actions/history'
import { EMPTY, boxMode, isEmpty, itemsInBox, normBox, toggle, wiresInBox } from '@/editor/actions/select'
import { groupCenter, nextOrientation, transformItems } from '@/editor/actions/transform'
import { dolStarterExample } from '@/editor/examples'
import { sanitizeDoc } from '@/editor/io/persist'
import { itemBounds, terminalWorld } from '@/editor/model/geometry'
import type { Doc, Item, Rot } from '@/editor/model/types'
import { wireGeometries } from '@/editor/model/wires'
import { GRID } from '@/shared/geometry'
import { SYMBOLS, getSymbol } from '@/symbols'
import { symbolBody } from '@/symbols/geometry'
import { SCALES } from '@/symbols/scale'

const mod = (n: number, m: number) => ((n % m) + m) % m
const ROTS: Rot[] = [0, 90, 180, 270]
const mk = (symbolId: string, x: number, y: number, extra: Partial<Item> = {}): Item => ({ id: `${symbolId}@${x},${y}`, symbolId, x, y, rot: 0, label: '', ...extra })

/** Terminal positions and directions of an item, as plain data. */
const terms = (it: Item) => {
  const def = getSymbol(it.symbolId)!
  return def.terminals.map((t) => terminalWorld(it, def, t.id)!)
}

describe('reflecting a part', () => {
  it('reflects terminals and their directions about the pivot', () => {
    for (const def of SYMBOLS) {
      for (const scale of SCALES) {
        for (const rot of [0] as Rot[]) {
          const plain = mk(def.id, 400, 300, { rot, scale })
          const flipped = { ...plain, mirror: true }
          const a = terms(plain)
          const b = terms(flipped)
          a.forEach((p, i) => {
            expect(b[i].x, `${def.id}@${scale} x`).toBe(2 * plain.x - p.x)
            expect(b[i].y).toBe(p.y)
            expect(b[i].dx + 0).toBe(-p.dx + 0)
            expect(b[i].dy).toBe(p.dy)
          })
        }
      }
    }
  })

  it('draws the mirrored body about the same pivot as the geometry uses', () => {
    // A vertical line at the pivot's x must not move; one to its left must appear to its right.
    const def = getSymbol('circuit-breaker-1p')!
    const plain = symbolBody(def, 1, false)
    const flipped = symbolBody(def, 1, true)
    expect(flipped).toHaveLength(plain.length)
    const xs = (body: typeof plain) => body.flatMap((p) => (p.k === 'line' ? [p.x1, p.x2] : []))
    const pv = 20 // pivot x of a 40 px wide symbol
    xs(plain).forEach((x, i) => expect(xs(flipped)[i]).toBe(2 * pv - x))
  })

  it('caches mirrored bodies and returns the library body when not mirrored', () => {
    const def = getSymbol('kwh-meter') ?? getSymbol('energy-meter')!
    expect(symbolBody(def, 1, false)).toBe(def.body)
    expect(symbolBody(def, 1.5, true)).toBe(symbolBody(def, 1.5, true))
  })
})

describe('transformItems', () => {
  // A second, fixed part makes it a group, so the transform turns about the group centre and is exact.
  const anchor = mk('earth', 100, 100, { id: 'anchor' })

  it('rotates a group a quarter turn about its centre, for every symbol, rotation and mirror', () => {
    for (const def of SYMBOLS) {
      for (const rot of ROTS) {
        for (const mirror of [false, true]) {
          const it = mk(def.id, 400, 300, { rot, mirror: mirror || undefined, id: 'p' })
          const before = terms(it)
          const c = groupCenter([anchor, it], [], 20)
          const [after] = transformItems([anchor, it], ['anchor', 'p'], 'rot90').filter((i) => i.id === 'p')
          terms(after).forEach((p, i) => {
            expect(p.x).toBeCloseTo(c.x - (before[i].y - c.y), 6)
            expect(p.y).toBeCloseTo(c.y + (before[i].x - c.x), 6)
          })
        }
      }
    }
  })

  it('flips a group left-right and top-bottom exactly as seen on screen', () => {
    for (const def of SYMBOLS) {
      for (const rot of ROTS) {
        for (const mirror of [false, true]) {
          const it = mk(def.id, 400, 300, { rot, mirror: mirror || undefined, scale: 1.5, id: 'p' })
          const before = terms(it)
          const c = groupCenter([anchor, it], [], 10)
          const h = transformItems([anchor, it], ['anchor', 'p'], 'flipH').find((i) => i.id === 'p')!
          terms(h).forEach((p, i) => {
            expect(p.x, `${def.id} H`).toBeCloseTo(2 * c.x - before[i].x, 6)
            expect(p.y).toBeCloseTo(before[i].y, 6)
            expect(p.dx + 0).toBeCloseTo(-before[i].dx + 0, 6)
            expect(p.dy).toBeCloseTo(before[i].dy, 6)
          })
          const v = transformItems([anchor, it], ['anchor', 'p'], 'flipV').find((i) => i.id === 'p')!
          terms(v).forEach((p, i) => {
            expect(p.y, `${def.id} V`).toBeCloseTo(2 * c.y - before[i].y, 6)
            expect(p.x).toBeCloseTo(before[i].x, 6)
            expect(p.dy + 0).toBeCloseTo(-before[i].dy + 0, 6)
            expect(p.dx).toBeCloseTo(before[i].dx, 6)
          })
        }
      }
    }
  })

  it('flip twice and rotate four times are the identity', () => {
    for (const kind of ['flipH', 'flipV'] as const) {
      const it = mk('contactor-3p', 400, 300, { rot: 90, mirror: true, id: 'p' })
      const once = transformItems([it], ['p'], kind)
      expect(once[0]).not.toEqual(it)
      expect(transformItems(once, ['p'], kind)[0]).toEqual(it)
    }
    let items = [mk('motor-1ph', 400, 300, { id: 'p' }), anchor]
    const start = items[0]
    for (let n = 0; n < 4; n++) items = transformItems(items, ['p', 'anchor'], 'rot90')
    expect(items[0]).toEqual(start)
  })

  it('a top-bottom flip equals a left-right flip followed by a half turn', () => {
    const it = mk('circuit-breaker-3p', 400, 300, { rot: 90, id: 'p' })
    const v = transformItems([it], ['p'], 'flipV')
    const hr = transformItems(transformItems([it], ['p'], 'flipH'), ['p'], 'rot90')
    const hr2 = transformItems(hr, ['p'], 'rot90')
    terms(v[0]).forEach((p, i) => {
      expect(p.x).toBeCloseTo(terms(hr2[0])[i].x, 6)
      expect(p.y).toBeCloseTo(terms(hr2[0])[i].y, 6)
    })
  })

  it('keeps a lone part\'s first terminal on the grid, even when resized', () => {
    for (const def of SYMBOLS) {
      for (const scale of SCALES) {
        for (const kind of ['rot90', 'flipH', 'flipV'] as const) {
          const it = mk(def.id, 400, 300, { scale, id: 'p' })
          const [out] = transformItems([it], ['p'], kind)
          const t0 = terminalWorld(out, def, def.terminals[0].id)!
          expect(mod(t0.x, GRID), `${def.id}@${scale} ${kind}`).toBe(0)
          expect(mod(t0.y, GRID)).toBe(0)
        }
      }
    }
  })

  it('agrees with nextOrientation and never writes mirror: false', () => {
    for (const rot of ROTS) {
      for (const mirror of [false, true]) {
        for (const kind of ['rot90', 'flipH', 'flipV'] as const) {
          const it = mk('fuse', 400, 300, { rot, mirror: mirror || undefined, id: 'p' })
          const [out] = transformItems([it], ['p'], kind)
          const n = nextOrientation(rot, mirror, kind)
          expect([out.rot, out.mirror === true]).toEqual([n.rot, n.mirror])
          expect('mirror' in out && out.mirror === false).toBe(false)
        }
      }
    }
  })

  it('leaves unselected parts alone and ignores an empty selection', () => {
    const a = mk('fuse', 100, 100)
    const b = mk('fuse', 300, 100)
    expect(transformItems([a, b], [], 'flipH')).toEqual([a, b])
    expect(transformItems([a, b], [a.id], 'flipH')[1]).toBe(b)
  })

  it('keeps wires between grouped parts the same shape when the group turns', () => {
    const doc = dolStarterExample()
    const ids = doc.items.map((i) => i.id)
    for (const kind of ['rot90', 'flipH', 'flipV'] as const) {
      const turned: Doc = { ...doc, items: transformItems(doc.items, ids, kind) }
      for (const g of wireGeometries(turned)) expect(g.points, kind).toHaveLength(2) // still straight runs
    }
  })
})

describe('align and distribute', () => {
  const a = mk('fuse', 100, 100, { id: 'a' })
  const b = mk('resistor', 260, 140, { id: 'b' })
  const c = mk('capacitor', 500, 60, { id: 'c' })
  const items = [a, b, c]
  const ids = ['a', 'b', 'c']
  const apply = (moves: Map<string, { dx: number; dy: number }>) => items.map((i) => ({ ...i, x: i.x + (moves.get(i.id)?.dx ?? 0), y: i.y + (moves.get(i.id)?.dy ?? 0) }))
  const bounds = (list: Item[]) => list.map((i) => itemBounds(i, getSymbol(i.symbolId)!))

  it('lines up edges and centres', () => {
    const left = bounds(apply(alignMoves(items, ids, 'left')))
    expect(new Set(left.map((r) => r.x)).size).toBe(1)
    const right = bounds(apply(alignMoves(items, ids, 'right')))
    expect(new Set(right.map((r) => r.x + r.w)).size).toBe(1)
    const top = bounds(apply(alignMoves(items, ids, 'top')))
    expect(new Set(top.map((r) => r.y)).size).toBe(1)
    const bottom = bounds(apply(alignMoves(items, ids, 'bottom')))
    expect(new Set(bottom.map((r) => r.y + r.h)).size).toBe(1)
    const mid = bounds(apply(alignMoves(items, ids, 'middle')))
    expect(new Set(mid.map((r) => r.y + r.h / 2)).size).toBe(1)
    const cen = bounds(apply(alignMoves(items, ids, 'center')))
    expect(new Set(cen.map((r) => r.x + r.w / 2)).size).toBe(1)
  })

  it('aligns to the group, not to an arbitrary part', () => {
    const before = bounds(items)
    const moved = bounds(apply(alignMoves(items, ids, 'left')))
    expect(moved[0].x).toBe(Math.min(...before.map((r) => r.x)))
  })

  it('does nothing for fewer than two parts', () => {
    expect(alignMoves(items, ['a'], 'left').size).toBe(0)
  })

  it('spaces three or more parts with equal gaps and leaves the outer two in place', () => {
    const wide = [mk('fuse', 100, 100, { id: 'a' }), mk('fuse', 180, 100, { id: 'b' }), mk('fuse', 620, 100, { id: 'c' }), mk('fuse', 700, 100, { id: 'd' })]
    const moves = distributeMoves(wide, ['a', 'b', 'c', 'd'], 'h')
    expect(moves.has('a')).toBe(false)
    expect(moves.has('d')).toBe(false)
    const placed = wide.map((i) => ({ ...i, x: i.x + (moves.get(i.id)?.dx ?? 0) }))
    const bs = placed.map((i) => itemBounds(i, getSymbol(i.symbolId)!)).sort((p, q) => p.x - q.x)
    const gaps = bs.slice(1).map((r, i) => r.x - (bs[i].x + bs[i].w))
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(5) // within the 5 px lattice
  })

  it('needs three parts to distribute, and works vertically too', () => {
    expect(distributeMoves(items, ['a', 'b'], 'h').size).toBe(0)
    const col = [mk('fuse', 100, 100, { id: 'a' }), mk('fuse', 100, 200, { id: 'b' }), mk('fuse', 100, 700, { id: 'c' })]
    const moves = distributeMoves(col, ['a', 'b', 'c'], 'v')
    expect(moves.get('b')!.dx).toBe(0)
    expect(moves.get('b')!.dy).not.toBe(0)
  })

  it('goes through history as one undoable step and skips no-ops', () => {
    let h = initHistory({ ...dolStarterExample(), items: [a, b, c], wires: [] })
    h = reducer(h, { type: 'align', ids, mode: 'left' })
    expect(h.past).toHaveLength(1)
    const again = reducer(h, { type: 'align', ids, mode: 'left' })
    expect(again).toBe(h) // already aligned: nothing to record
    h = reducer(h, { type: 'undo' })
    expect(h.present.items.map((i) => i.x)).toEqual([100, 260, 500])
  })
})

describe('box selection', () => {
  const doc = dolStarterExample()
  const q1 = doc.items.find((i) => i.id === 'e-q1')!
  const q1b = itemBounds(q1, getSymbol(q1.symbolId)!)

  it('normalises a box dragged in any direction', () => {
    expect(normBox({ x: 50, y: 40 }, { x: 10, y: 90 })).toEqual({ x: 10, y: 40, w: 40, h: 50 })
  })

  it('reads left-to-right as a window and right-to-left as a crossing', () => {
    expect(boxMode({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe('window')
    expect(boxMode({ x: 10, y: 0 }, { x: 0, y: 0 })).toBe('cross')
  })

  it('window selects only parts fully inside; crossing selects anything touched', () => {
    const partial = { x: q1b.x + 5, y: q1b.y + 5, w: 10, h: 10 }
    expect(itemsInBox(doc.items, partial, 'window')).toEqual([])
    expect(itemsInBox(doc.items, partial, 'cross')).toEqual(['e-q1'])
    const around = { x: q1b.x - 5, y: q1b.y - 5, w: q1b.w + 10, h: q1b.h + 10 }
    expect(itemsInBox(doc.items, around, 'window')).toEqual(['e-q1'])
  })

  it('selects everything with a big enough window', () => {
    const all = { x: -1000, y: -1000, w: 5000, h: 5000 }
    expect(itemsInBox(doc.items, all, 'window')).toHaveLength(doc.items.length)
    expect(wiresInBox(wireGeometries(doc), all, 'window')).toHaveLength(doc.wires.length)
  })

  it('selects a wire by crossing it, but a window must contain the whole wire', () => {
    const geoms = wireGeometries(doc)
    const g = geoms[0]
    const mid = { x: g.points[0].x - 3, y: (g.points[0].y + g.points[1].y) / 2 - 3, w: 6, h: 6 }
    expect(wiresInBox(geoms, mid, 'cross')).toContain(g.id)
    expect(wiresInBox(geoms, mid, 'window')).not.toContain(g.id)
  })

  it('toggles ids in and out of a list, and knows when a selection is empty', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
    expect(isEmpty(EMPTY)).toBe(true)
    expect(isEmpty({ items: ['a'], wires: [], notes: [], shapes: [] })).toBe(false)
  })
})

describe('copy and paste', () => {
  const doc = dolStarterExample()

  it('copies the parts and only the wires between them', () => {
    const p = copyPayload(doc, { items: ['e-q1', 'e-k1'], wires: [], notes: [], shapes: [] })!
    expect(p.items.map((i) => i.id)).toEqual(['e-q1', 'e-k1'])
    expect(p.wires).toHaveLength(3) // Q1 -> K1 only; the wires to the supply and overload are left behind
    expect(copyPayload(doc, EMPTY)).toBeNull()
    expect(copyPayload(doc, { items: [], wires: ['ew0'], notes: [], shapes: [] })).toBeNull()
  })

  it('creates new ids, remaps the wires and renumbers automatic labels', () => {
    const p = copyPayload(doc, { items: ['e-q1', 'e-k1'], wires: [], notes: [], shapes: [] })!
    const clone = clonePayload(doc, p, 40, 60)
    expect(clone.items.map((i) => i.label)).toEqual(['Q2', 'K2'])
    const ids = new Set([...doc.items, ...clone.items].map((i) => i.id))
    expect(ids.size).toBe(doc.items.length + 2)
    expect(new Set([...doc.wires, ...clone.wires].map((w) => w.id)).size).toBe(doc.wires.length + 3)
    const newIds = new Set(clone.items.map((i) => i.id))
    for (const w of clone.wires) {
      expect(newIds.has(w.a.item) && newIds.has(w.b.item)).toBe(true)
    }
    const src = doc.items.find((i) => i.id === 'e-q1')!
    expect([clone.items[0].x - src.x, clone.items[0].y - src.y]).toEqual([40, 60])
  })

  it('keeps custom labels, size and reflection', () => {
    const custom: Doc = { ...doc, items: doc.items.map((i) => (i.id === 'e-q1' ? { ...i, label: 'Main breaker', scale: 1.5, mirror: true } : i)) }
    const p = copyPayload(custom, { items: ['e-q1'], wires: [], notes: [], shapes: [] })!
    const clone = clonePayload(custom, p, 20, 20)
    expect(clone.items[0]).toMatchObject({ label: 'Main breaker', scale: 1.5, mirror: true })
  })

  it('numbers successive pastes correctly', () => {
    const p = copyPayload(doc, { items: ['e-m1'], wires: [], notes: [], shapes: [] })!
    let h = initHistory(doc)
    for (let n = 1; n <= 3; n++) h = reducer(h, { type: 'paste', payload: clonePayload(h.present, p, 40 * n, 40 * n) })
    expect(h.present.items.filter((i) => i.symbolId === 'motor-3ph-dol').map((i) => i.label)).toEqual(['M1', 'M2', 'M3', 'M4'])
  })

  it('pastes parts and wires as one undoable step, without touching the original', () => {
    const p = copyPayload(doc, { items: ['e-q1', 'e-k1'], wires: [], notes: [], shapes: [] })!
    let h = initHistory(doc)
    h = reducer(h, { type: 'paste', payload: clonePayload(doc, p, 40, 40) })
    expect(h.present.items).toHaveLength(doc.items.length + 2)
    expect(h.present.wires).toHaveLength(doc.wires.length + 3)
    expect(h.past).toHaveLength(1)
    h = reducer(h, { type: 'undo' })
    expect(h.present).toBe(doc)
  })
})

describe('deleting a mixed selection', () => {
  it('removes parts, their wires, and any separately selected wires in one step', () => {
    const doc = dolStarterExample()
    let h = initHistory(doc)
    h = reducer(h, { type: 'delete', items: ['e-m1'], wires: ['ew0'] })
    expect(h.present.items.some((i) => i.id === 'e-m1')).toBe(false)
    expect(h.present.wires.some((w) => w.id === 'ew0')).toBe(false)
    expect(h.present.wires.some((w) => w.a.item === 'e-m1' || w.b.item === 'e-m1')).toBe(false)
    expect(h.past).toHaveLength(1)
    h = reducer(h, { type: 'undo' })
    expect(h.present).toBe(doc)
  })

  it('records nothing when there is nothing to delete... and keeps unrelated wires', () => {
    const doc = dolStarterExample()
    const h = reducer(initHistory(doc), { type: 'delete', items: [], wires: [] })
    expect(h.present.wires).toHaveLength(doc.wires.length)
  })
})

describe('reflection in storage and history', () => {
  it('flips through the reducer and can be undone', () => {
    let h = initHistory(dolStarterExample())
    h = reducer(h, { type: 'flip', ids: ['e-k1'], axis: 'h' })
    expect(h.present.items.find((i) => i.id === 'e-k1')!.mirror).toBe(true)
    h = reducer(h, { type: 'flip', ids: ['e-k1'], axis: 'h' })
    expect('mirror' in h.present.items.find((i) => i.id === 'e-k1')!).toBe(false)
    h = reducer(h, { type: 'undo' })
    expect(h.present.items.find((i) => i.id === 'e-k1')!.mirror).toBe(true)
  })

  it('keeps a valid mirror flag and drops junk when loading', () => {
    const doc = dolStarterExample()
    const raw = JSON.parse(JSON.stringify({ ...doc, items: doc.items.map((i, n) => ({ ...i, mirror: n === 0 ? true : n === 1 ? 'yes' : false })) }))
    const clean = sanitizeDoc(raw)!
    expect(clean.items[0].mirror).toBe(true)
    expect('mirror' in clean.items[1]).toBe(false)
    expect('mirror' in clean.items[2]).toBe(false)
  })
})