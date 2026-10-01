import { describe, expect, it } from 'vitest'

import { conflictingShapeIds, drawingBox, planFit, sheetConflicts } from '@/editor/actions/checks'
import { clonePayload, copyPayload } from '@/editor/actions/clipboard'
import { initHistory, reducer } from '@/editor/actions/history'
import { EMPTY, bodyIds, countOf, isEmpty, sel, shapesInBox } from '@/editor/actions/select'
import { groupCenter, transformDoc } from '@/editor/actions/transform'
import { dolStarterExample } from '@/editor/examples'
import { diagramToSvg, shapeSvg } from '@/editor/io/export'
import { sanitizeDoc, sanitizeShapes } from '@/editor/io/persist'
import { scaleDrawing } from '@/editor/model/doc'
import {
  ARROW_HALF_WIDTH,
  ARROW_LENGTH,
  MIN_SIZE,
  arrowHead,
  arrowsOf,
  constrainAngle,
  fillContains,
  flipShapeH,
  flipShapeV,
  handlesOf,
  isUsable,
  moveShape,
  outlineOf,
  resizeShape,
  scaleShape,
  segmentHitsRect,
  shapeBounds,
  shapeCentre,
  shapeFromDrag,
  shapeInBox,
  snapShape,
  turnShape,
} from '@/editor/model/shapes'
import { blockBox, frameBox } from '@/editor/model/sheet'
import type { Doc, EllipseShape, LineShape, RectShape, Shape } from '@/editor/model/types'

const line = (extra: Partial<LineShape> = {}): LineShape => ({ id: 'l', kind: 'line', x1: 100, y1: 100, x2: 200, y2: 140, ...extra })
const rect = (extra: Partial<RectShape> = {}): RectShape => ({ id: 'r', kind: 'rect', x: 100, y: 100, w: 100, h: 60, ...extra })
const ellipse = (extra: Partial<EllipseShape> = {}): EllipseShape => ({ id: 'e', kind: 'ellipse', cx: 200, cy: 100, rx: 50, ry: 30, ...extra })
const all = (): Shape[] => [line(), rect(), ellipse()]
const base = (): Doc => dolStarterExample()

describe('shape geometry', () => {
  it('reports bounds for each kind, whichever way a line runs', () => {
    expect(shapeBounds(line())).toEqual({ x: 100, y: 100, w: 100, h: 40 })
    expect(shapeBounds(line({ x1: 200, y1: 140, x2: 100, y2: 100 }))).toEqual({ x: 100, y: 100, w: 100, h: 40 })
    expect(shapeBounds(rect())).toEqual({ x: 100, y: 100, w: 100, h: 60 })
    expect(shapeBounds(ellipse())).toEqual({ x: 150, y: 70, w: 100, h: 60 })
    expect(shapeCentre(rect())).toEqual({ x: 150, y: 130 })
  })

  it('moves every kind rigidly', () => {
    for (const s of all()) {
      const b = shapeBounds(s)
      const m = shapeBounds(moveShape(s, 30, -20))
      expect([m.x - b.x, m.y - b.y, m.w, m.h]).toEqual([30, -20, b.w, b.h])
    }
  })
})

describe('drawing a shape by dragging', () => {
  it('builds a box or ellipse from two corners, dragged in any direction', () => {
    const a = { x: 100, y: 100 }
    for (const b of [{ x: 160, y: 200 }, { x: 40, y: 200 }, { x: 160, y: 40 }, { x: 40, y: 40 }]) {
      const r = shapeFromDrag('rect', 'r', a, b) as RectShape
      expect(r).toMatchObject({ w: 60, h: Math.abs(b.y - 100) })
      expect([r.x, r.x + r.w].sort((p, q) => p - q)).toEqual([Math.min(a.x, b.x), Math.max(a.x, b.x)])
      const e = shapeFromDrag('ellipse', 'e', a, b) as EllipseShape
      expect(shapeBounds(e)).toEqual({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: 60, h: Math.abs(b.y - 100) })
    }
  })

  it('Shift makes a box square and grows away from the start', () => {
    const r = shapeFromDrag('rect', 'r', { x: 100, y: 100 }, { x: 40, y: 160 }, true) as RectShape
    expect(r).toMatchObject({ x: 40, y: 100, w: 60, h: 60 })
    const c = shapeFromDrag('ellipse', 'e', { x: 100, y: 100 }, { x: 180, y: 130 }, true) as EllipseShape
    expect(c.rx).toBe(c.ry)
  })

  it('snaps a line to horizontal, vertical or 45 degrees with Shift', () => {
    const from = { x: 0, y: 0 }
    expect(constrainAngle(from, { x: 100, y: 20 })).toEqual({ x: 100, y: 0 })
    expect(constrainAngle(from, { x: 20, y: 100 })).toEqual({ x: 0, y: 100 })
    expect(constrainAngle(from, { x: 60, y: 50 })).toEqual({ x: 60, y: 60 })
    expect(constrainAngle(from, { x: -60, y: 50 })).toEqual({ x: -60, y: 60 })
    const l = shapeFromDrag('line', 'l', from, { x: 100, y: 20 }, true) as LineShape
    expect([l.x2, l.y2]).toEqual([100, 0])
  })

  it('throws away a click that made nothing you could grab', () => {
    expect(isUsable(line({ x2: 104, y2: 103 }))).toBe(false)
    expect(isUsable(line({ x2: 110, y2: 100 }))).toBe(true)
    expect(isUsable(rect({ w: 5 }))).toBe(false)
    expect(isUsable(rect({ w: MIN_SIZE, h: MIN_SIZE }))).toBe(true)
    expect(isUsable(ellipse({ rx: 4 }))).toBe(false)
  })
})

describe('resize handles', () => {
  it('gives a line two handles and boxes and ellipses eight', () => {
    expect(handlesOf(line()).map((h) => h.id)).toEqual(['a', 'b'])
    expect(handlesOf(rect()).map((h) => h.id).sort()).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w'])
    expect(handlesOf(rect()).find((h) => h.id === 'se')!.at).toEqual({ x: 200, y: 160 })
    expect(handlesOf(ellipse()).find((h) => h.id === 'n')!.at).toEqual({ x: 200, y: 70 })
  })

  it('moves one end of a line and leaves the other', () => {
    expect(resizeShape(line(), 'a', { x: 60, y: 60 })).toMatchObject({ x1: 60, y1: 60, x2: 200, y2: 140 })
    expect(resizeShape(line(), 'b', { x: 300, y: 300 })).toMatchObject({ x1: 100, y1: 100, x2: 300, y2: 300 })
    expect(resizeShape(line({ x2: 100, y2: 100 }), 'b', { x: 190, y: 120 }, true)).toMatchObject({ x2: 190, y2: 100 }) // Shift keeps it level
  })

  it('resizes a box from a corner or an edge, holding the opposite side still', () => {
    expect(resizeShape(rect(), 'se', { x: 260, y: 220 })).toMatchObject({ x: 100, y: 100, w: 160, h: 120 })
    expect(resizeShape(rect(), 'nw', { x: 60, y: 80 })).toMatchObject({ x: 60, y: 80, w: 140, h: 80 })
    expect(resizeShape(rect(), 'w', { x: 180, y: 999 })).toMatchObject({ x: 180, y: 100, w: 20, h: 60 }) // an edge handle moves one side only
    expect(resizeShape(rect(), 'n', { x: 0, y: 130 })).toMatchObject({ x: 100, y: 130, w: 100, h: 30 })
  })

  it('never lets a box collapse below the minimum size', () => {
    expect(resizeShape(rect(), 'w', { x: 500, y: 0 })).toMatchObject({ x: 190, w: MIN_SIZE })
    expect(resizeShape(rect(), 'e', { x: 105, y: 0 })).toMatchObject({ x: 100, w: MIN_SIZE })
    expect(resizeShape(rect(), 'n', { x: 0, y: 999 })).toMatchObject({ y: 150, h: MIN_SIZE })
  })

  it('resizes an ellipse through its bounding box', () => {
    expect(resizeShape(ellipse(), 'e', { x: 300, y: 0 })).toMatchObject({ cx: 225, cy: 100, rx: 75, ry: 30 })
    const corner = resizeShape(ellipse(), 'nw', { x: 100, y: 40 }) as EllipseShape
    expect(shapeBounds(corner)).toEqual({ x: 100, y: 40, w: 150, h: 90 })
  })
})

describe('turning, flipping and scaling shapes', () => {
  const c = { x: 200, y: 200 }

  it('turns a quarter turn about a point, and four turns come back exactly', () => {
    const r = turnShape(rect({ x: 100, y: 100, w: 40, h: 20 }), c) as RectShape
    expect(r).toMatchObject({ x: 280, y: 100, w: 20, h: 40 })
    for (const s of all()) {
      let t = s
      for (let i = 0; i < 4; i++) t = turnShape(t, c)
      expect(t).toEqual(s)
    }
  })

  it('swaps an ellipse\'s radii and moves its centre on a turn', () => {
    const e = turnShape(ellipse(), c) as EllipseShape
    expect([e.rx, e.ry]).toEqual([30, 50])
    expect(shapeCentre(e)).toEqual({ x: 200 - (100 - 200), y: 200 + (200 - 200) })
  })

  it('reflects about a line, and reflecting twice is the identity', () => {
    expect(flipShapeH(rect({ x: 100, y: 100, w: 40, h: 20 }), 200)).toMatchObject({ x: 260, y: 100, w: 40, h: 20 })
    expect(flipShapeV(rect({ x: 100, y: 100, w: 40, h: 20 }), 200)).toMatchObject({ x: 100, y: 280, w: 40, h: 20 })
    expect(flipShapeH(line(), 150)).toMatchObject({ x1: 200, y1: 100, x2: 100, y2: 140 })
    for (const s of all()) {
      expect(flipShapeH(flipShapeH(s, 170), 170)).toEqual(s)
      expect(flipShapeV(flipShapeV(s, 170), 170)).toEqual(s)
    }
  })

  it('scales positions and sizes about a point, but not the line weight', () => {
    expect(scaleShape(rect({ x: 10, y: 20, w: 30, h: 40, radius: 10, style: { width: 3 } }), 0, 0, 2)).toMatchObject({ x: 20, y: 40, w: 60, h: 80, radius: 20, style: { width: 3 } })
    expect(scaleShape(ellipse(), 100, 100, 0.5)).toMatchObject({ cx: 150, cy: 100, rx: 25, ry: 15 })
    expect(scaleShape(line(), 100, 100, 3)).toMatchObject({ x2: 400, y2: 220 })
  })

  it('puts a box back on the 10 px grid', () => {
    const s = snapShape(rect({ x: 115, y: 85, w: 20, h: 50 })) as RectShape
    expect([s.x % 10, s.y % 10, s.w, s.h]).toEqual([0, 0, 20, 50])
    expect(snapShape(line())).toEqual(line())
  })
})

describe('outlines, hit tests and box selection', () => {
  it('describes each outline as a polyline', () => {
    expect(outlineOf(line())).toHaveLength(2)
    const r = outlineOf(rect())
    expect(r).toHaveLength(5)
    expect(r[0]).toEqual(r[4])
    const e = ellipse()
    for (const p of outlineOf(e)) expect(((p.x - e.cx) / e.rx) ** 2 + ((p.y - e.cy) / e.ry) ** 2).toBeCloseTo(1, 9)
  })

  it('clips a segment against a rectangle', () => {
    const box = { x: 10, y: 10, w: 20, h: 20 }
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 40, y: 40 }, box)).toBe(true) // through it
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 5, y: 5 }, box)).toBe(false) // stops short
    expect(segmentHitsRect({ x: 0, y: 20 }, { x: 40, y: 20 }, box)).toBe(true) // horizontal through
    expect(segmentHitsRect({ x: 0, y: 40 }, { x: 40, y: 40 }, box)).toBe(false) // horizontal past
    expect(segmentHitsRect({ x: 20, y: 0 }, { x: 20, y: 40 }, box)).toBe(true) // vertical through
    expect(segmentHitsRect({ x: 15, y: 15 }, { x: 25, y: 25 }, box)).toBe(true) // wholly inside
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 10, y: 10 }, box)).toBe(true) // touching the corner
    expect(segmentHitsRect({ x: 40, y: 0 }, { x: 0, y: 40 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(false) // misses a corner
  })

  it('a window needs the whole shape inside; a crossing needs to touch the outline', () => {
    const r = rect({ x: 0, y: 0, w: 200, h: 200 })
    expect(shapeInBox(r, { x: -10, y: -10, w: 220, h: 220 }, 'window')).toBe(true)
    expect(shapeInBox(r, { x: 0, y: 0, w: 100, h: 100 }, 'window')).toBe(false)
    expect(shapeInBox(r, { x: 90, y: -10, w: 20, h: 20 }, 'cross')).toBe(true) // over the top edge
  })

  it('a box drawn inside an unfilled enclosure does not pick the enclosure', () => {
    const enclosure = rect({ x: 0, y: 0, w: 400, h: 400 })
    expect(shapeInBox(enclosure, { x: 100, y: 100, w: 50, h: 50 }, 'cross')).toBe(false)
    expect(shapeInBox(ellipse({ cx: 200, cy: 200, rx: 190, ry: 190 }), { x: 190, y: 190, w: 20, h: 20 }, 'cross')).toBe(false)
    expect(shapesInBox([enclosure], { x: 100, y: 100, w: 50, h: 50 }, 'cross')).toEqual([])
  })

  it('a filled shape can be picked from inside', () => {
    const filled = rect({ x: 0, y: 0, w: 400, h: 400, fill: true })
    expect(shapeInBox(filled, { x: 100, y: 100, w: 50, h: 50 }, 'cross')).toBe(true)
    expect(fillContains(filled, { x: 10, y: 10 })).toBe(true)
    expect(fillContains(filled, { x: 500, y: 10 })).toBe(false)
    expect(fillContains(ellipse({ fill: true }), { x: 200, y: 100 })).toBe(true)
    expect(fillContains(ellipse({ fill: true }), { x: 100, y: 100 })).toBe(false)
    expect(fillContains(line(), { x: 100, y: 100 })).toBe(false)
  })

  it('selects a line by crossing it and not by drawing beside it', () => {
    expect(shapeInBox(line(), { x: 140, y: 110, w: 10, h: 10 }, 'cross')).toBe(true)
    expect(shapeInBox(line(), { x: 100, y: 200, w: 10, h: 10 }, 'cross')).toBe(false)
  })
})

describe('arrowheads', () => {
  it('put the tip on the end and the base behind it, symmetric about the line', () => {
    const [tip, a, b] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(tip).toEqual({ x: 100, y: 0 })
    expect(a).toEqual({ x: 100 - ARROW_LENGTH, y: ARROW_HALF_WIDTH })
    expect(b).toEqual({ x: 100 - ARROW_LENGTH, y: -ARROW_HALF_WIDTH })
    const [, c, d] = arrowHead({ x: 0, y: 0 }, { x: 0, y: 50 }) // works at any angle
    expect(c.y).toBeCloseTo(50 - ARROW_LENGTH)
    expect(Math.abs(c.x)).toBeCloseTo(ARROW_HALF_WIDTH)
    expect(c.x + d.x).toBeCloseTo(0)
  })

  it('appear only on lines, on the ends asked for', () => {
    expect(arrowsOf(line())).toEqual([])
    expect(arrowsOf(line({ arrow: 'end' }))).toHaveLength(1)
    expect(arrowsOf(line({ arrow: 'end' }))[0][0]).toEqual({ x: 200, y: 140 })
    const both = arrowsOf(line({ arrow: 'both' }))
    expect(both.map((h) => h[0])).toEqual([{ x: 200, y: 140 }, { x: 100, y: 100 }])
    expect(arrowsOf(rect())).toEqual([])
  })
})

describe('shapes in the document', () => {
  it('adds, edits and deletes shapes as undoable steps, and skips no-ops', () => {
    let h = initHistory(base())
    const n0 = h.present.shapes.length
    h = reducer(h, { type: 'add-shape', shape: line({ id: 'x' }) })
    expect(h.present.shapes).toHaveLength(n0 + 1)
    const moved = line({ id: 'x', x2: 300 })
    h = reducer(h, { type: 'edit-shape', id: 'x', shape: moved })
    expect(h.present.shapes.find((s) => s.id === 'x')).toEqual(moved)
    expect(reducer(h, { type: 'edit-shape', id: 'x', shape: moved })).toBe(h)
    expect(reducer(h, { type: 'edit-shape', id: 'nope', shape: moved })).toBe(h)
    h = reducer(h, { type: 'delete', items: [], wires: [], notes: [], shapes: ['x'] })
    expect(h.present.shapes).toHaveLength(n0)
    h = reducer(h, { type: 'undo' })
    expect(h.present.shapes).toHaveLength(n0 + 1)
  })

  it('moves with parts and notes in one step', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'move', ids: ['e-s1', 'e-q1', 'e-n1'], dx: 20, dy: 40 })
    expect(h.present.shapes[0]).toMatchObject({ x: 660 + 20, y: 380 + 40 })
    expect(h.past).toHaveLength(1)
  })

  it('changes line style, weight, arrows, fill and radius, only where each applies', () => {
    let h = initHistory({ ...base(), shapes: [line({ id: 'a' }), rect({ id: 'b' }), ellipse({ id: 'c' })] })
    h = reducer(h, { type: 'shape-style', ids: ['a', 'b', 'c'], patch: { dash: 'dashed', width: 3 } })
    for (const s of h.present.shapes) expect(s.style).toEqual({ dash: 'dashed', width: 3 })
    h = reducer(h, { type: 'shape-style', ids: ['a', 'b', 'c'], patch: { arrow: 'both', fill: true, radius: 20 } })
    const [a, b, c] = h.present.shapes
    expect(a).toMatchObject({ arrow: 'both' })
    expect('fill' in a).toBe(false) // a line has no fill
    expect(b).toMatchObject({ fill: true, radius: 20 })
    expect('arrow' in b).toBe(false)
    expect(c).toMatchObject({ fill: true })
    expect('radius' in c).toBe(false) // only boxes have corners
    h = reducer(h, { type: 'shape-style', ids: ['a', 'b', 'c'], patch: { dash: null, width: 2, arrow: null, fill: false, radius: null } })
    for (const s of h.present.shapes) expect(s.style).toBeUndefined()
    expect(h.present.shapes[0]).not.toHaveProperty('arrow')
    expect(h.present.shapes[1]).not.toHaveProperty('fill')
    expect(reducer(h, { type: 'shape-style', ids: ['a'], patch: { dash: null } })).toBe(h) // already solid
  })

  it('copies and pastes shapes with new ids, the offset, and their own style objects', () => {
    const doc = base()
    const p = copyPayload(doc, sel({ shapes: ['e-s1'] }))!
    expect(p.items).toHaveLength(0)
    const clone = clonePayload(doc, p, 40, 60)
    expect(clone.shapes[0]).toMatchObject({ x: 700, y: 440, w: 400, h: 280, style: { dash: 'dashdot', width: 1 } })
    expect(clone.shapes[0].id).not.toBe('e-s1')
    expect(clone.shapes[0].style).not.toBe(doc.shapes[0].style)
    let h = initHistory(doc)
    h = reducer(h, { type: 'paste', payload: clone })
    expect(h.present.shapes).toHaveLength(doc.shapes.length + 1)
    h = reducer(h, { type: 'undo' })
    expect(h.present).toBe(doc)
    expect(copyPayload(doc, EMPTY)).toBeNull()
  })

  it('follows the drawing when it is fitted to the sheet or scaled', () => {
    const doc = base()
    const h = reducer(initHistory(doc), { type: 'fit-sheet', dx: 40, dy: 60, size: 'A3' })
    expect(h.present.shapes[0]).toMatchObject({ x: 700, y: 440 })
    const half = scaleDrawing(doc, 0.5)!
    expect(half.shapes[0].kind).toBe('rect')
    const r = half.shapes[0] as RectShape
    expect([r.w, r.h]).toEqual([200, 140])
    expect(r.style).toEqual({ dash: 'dashdot', width: 1 }) // line weight is not scaled
  })

  it('counts as part of the selection', () => {
    const s = sel({ items: ['a'], shapes: ['s1', 's2'] })
    expect(bodyIds(s)).toEqual(['a', 's1', 's2'])
    expect(countOf(s)).toBe(3)
    expect(isEmpty(sel({ shapes: ['s'] }))).toBe(false)
    expect(isEmpty(EMPTY)).toBe(true)
  })
})

describe('turning and flipping shapes with the drawing', () => {
  const ids = (d: Doc) => [...d.items.map((i) => i.id), ...d.notes.map((n) => n.id), ...d.shapes.map((s) => s.id)]

  it('a group flip reflects a shape about the group centre, exactly, and flipping back restores it', () => {
    const doc = base()
    const c = groupCenter(doc.items, doc.notes, 10, doc.shapes)
    const out = transformDoc(doc, ids(doc), 'flipH')
    const before = shapeBounds(doc.shapes[0])
    const after = shapeBounds(out.shapes![0])
    expect(after.x).toBeCloseTo(2 * c.x - (before.x + before.w), 6)
    expect([after.y, after.w, after.h]).toEqual([before.y, before.w, before.h])
    for (const kind of ['flipH', 'flipV'] as const) {
      const back = transformDoc(transformDoc(doc, ids(doc), kind), ids(doc), kind)
      expect(back.shapes).toEqual(doc.shapes)
    }
  })

  it('a group turn keeps a shape rigid with the parts', () => {
    const doc = base()
    let c: Parameters<typeof transformDoc>[0] = doc
    for (let i = 0; i < 4; i++) c = transformDoc(c, ids(doc), 'rot90')
    const dx = c.items[0].x - doc.items[0].x
    const dy = c.items[0].y - doc.items[0].y
    const a = doc.shapes[0] as RectShape
    const b = c.shapes![0] as RectShape
    expect([b.x - a.x, b.y - a.y, b.w, b.h]).toEqual([dx, dy, a.w, a.h])
  })

  it('a lone line turns about its first end; a lone box about its centre, back on the grid', () => {
    const only = (s: Shape) => transformDoc({ items: [], notes: [], shapes: [s] }, [s.id], 'rot90').shapes![0]
    expect(only(line({ x1: 100, y1: 100, x2: 200, y2: 100 }))).toMatchObject({ x1: 100, y1: 100, x2: 100, y2: 200 })
    const r = only(rect({ x: 100, y: 100, w: 50, h: 20 })) as RectShape
    expect([r.w, r.h]).toEqual([20, 50])
    expect([r.x % 10, r.y % 10]).toEqual([0, 0])
    expect(only(rect({ x: 100, y: 100, w: 60, h: 20 }))).toMatchObject({ x: 120, y: 80, w: 20, h: 60 })
  })

  it('flipping a lone box changes nothing; a lone line reflects about its own centre', () => {
    const flip = (s: Shape, k: 'flipH' | 'flipV') => transformDoc({ items: [], notes: [], shapes: [s] }, [s.id], k).shapes![0]
    expect(flip(rect(), 'flipH')).toEqual(rect())
    expect(flip(ellipse(), 'flipV')).toEqual(ellipse())
    expect(flip(line(), 'flipH')).toMatchObject({ x1: 200, y1: 100, x2: 100, y2: 140 })
    expect(flip(line(), 'flipV')).toMatchObject({ x1: 100, y1: 140, x2: 200, y2: 100 })
  })
})

describe('storage of shapes', () => {
  it('round-trips a drawing with shapes', () => {
    const doc = base()
    expect(sanitizeDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('loads drawings saved before shapes existed with none', () => {
    const { items, wires, sheet } = base()
    expect(sanitizeDoc({ items, wires, sheet })!.shapes).toEqual([])
  })

  it('keeps good shapes and gives each kind only its own fields', () => {
    const out = sanitizeShapes([
      { id: 'a', kind: 'line', x1: 0, y1: 0, x2: 10, y2: 10, arrow: 'both', fill: true, radius: 5, style: { dash: 'dotted', width: 1 } },
      { id: 'b', kind: 'rect', x: 0, y: 0, w: 50, h: 40, fill: true, radius: 500, arrow: 'end' },
      { id: 'c', kind: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 4, fill: false, radius: 9 },
    ])
    expect(out).toEqual([
      { id: 'a', kind: 'line', x1: 0, y1: 0, x2: 10, y2: 10, arrow: 'both', style: { dash: 'dotted', width: 1 } },
      { id: 'b', kind: 'rect', x: 0, y: 0, w: 50, h: 40, fill: true, radius: 100 },
      { id: 'c', kind: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 4 },
    ])
  })

  it('drops malformed, empty and unknown shapes, and bad styles', () => {
    const out = sanitizeShapes([
      { id: 'a', kind: 'line', x1: 0, y1: 0, x2: 'x', y2: 10 },
      { id: 'b', kind: 'rect', x: 0, y: 0, w: 0, h: 40 },
      { id: 'c', kind: 'ellipse', cx: 5, cy: 5, rx: -3, ry: 4 },
      { id: 'd', kind: 'star', x: 0, y: 0 },
      { kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1 },
      null,
      { id: 'e', kind: 'line', x1: 0, y1: 0, x2: 9, y2: 9, style: { dash: 'wavy', width: 7 }, arrow: 'both' },
    ])
    expect(out).toEqual([{ id: 'e', kind: 'line', x1: 0, y1: 0, x2: 9, y2: 9, arrow: 'both' }])
    expect(sanitizeShapes('nope')).toEqual([])
  })

  it('caps how many shapes it will load', () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ id: `s${i}`, kind: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }))
    expect(sanitizeShapes(many)).toHaveLength(2000)
  })
})

describe('export of shapes', () => {
  it('draws a line with its dash, weight and arrowheads', () => {
    const svg = shapeSvg(line({ style: { dash: 'dashed', width: 3 }, arrow: 'end' }), '#111')
    expect(svg).toContain('<line x1="100" y1="100" x2="200" y2="140"')
    expect(svg).toContain('stroke-width="3"')
    expect(svg).toContain('stroke-dasharray="8 5"')
    expect(svg.match(/<polygon/g)).toHaveLength(1)
    expect(shapeSvg(line({ arrow: 'both' }), '#111').match(/<polygon/g)).toHaveLength(2)
    expect(shapeSvg(line(), '#111')).not.toContain('polygon')
  })

  it('draws boxes and ellipses with tint and radius only when set', () => {
    expect(shapeSvg(rect(), '#111')).toBe('<rect x="100" y="100" width="100" height="60"/>')
    const filled = shapeSvg(rect({ fill: true, radius: 10 }), '#111')
    expect(filled).toContain('rx="10"')
    expect(filled).toContain('fill="#111" fill-opacity="0.07"')
    expect(shapeSvg(ellipse(), '#111')).toBe('<ellipse cx="200" cy="100" rx="50" ry="30"/>')
    expect(shapeSvg(ellipse({ fill: true, style: { dash: 'dashdot' } }), '#111')).toContain('stroke-dasharray="10 4 2 4"')
  })

  it('puts shapes in the picture, behind the wires and parts, and counts them in the crop', () => {
    const doc = base()
    const { svg } = diagramToSvg(doc)
    expect(svg).toContain('<rect x="660" y="380" width="400" height="280"')
    expect(svg.indexOf('<rect x="660" y="380"')).toBeLessThan(svg.indexOf('<path d=')) // shapes come first
    const off: Doc = { ...doc, sheet: { ...doc.sheet, enabled: false }, items: [], wires: [], notes: [], shapes: [rect({ x: 500, y: 500, w: 200, h: 100 })] }
    const crop = diagramToSvg(off)
    expect(crop.svg).toContain('<rect x="500" y="500"')
    expect(crop.width).toBeGreaterThanOrEqual(200)
  })
})

describe('keeping shapes on the sheet', () => {
  it('the example enclosure sits inside the frame and clear of the title block', () => {
    const doc = base()
    const b = shapeBounds(doc.shapes[0])
    const f = frameBox(doc.sheet.size)
    const t = blockBox(doc.sheet.size)
    expect(b.x).toBeGreaterThan(f.x)
    expect(b.x + b.w).toBeLessThan(f.x + f.w)
    expect(b.y + b.h).toBeLessThan(t.y)
    expect(conflictingShapeIds(doc)).toEqual([])
    expect(sheetConflicts(doc)).toBe(false)
  })

  it('flags a shape that strays outside the frame, only while the sheet is on', () => {
    const doc = { ...base(), shapes: [rect({ id: 'out', x: -50, y: 10 })] }
    expect(conflictingShapeIds(doc)).toEqual(['out'])
    expect(sheetConflicts(doc)).toBe(true)
    expect(conflictingShapeIds({ ...doc, sheet: { ...doc.sheet, enabled: false } })).toEqual([])
  })

  it('counts shapes when working out the drawing box and fitting it to a sheet', () => {
    const doc = { ...base(), items: [], wires: [], notes: [], shapes: [rect({ id: 'far', x: 5, y: 5, w: 300, h: 200 })] }
    expect(drawingBox(doc)).toEqual({ x: 5, y: 5, w: 300, h: 200 })
    expect(drawingBox({ ...doc, shapes: [] })).toBeNull()
    const plan = planFit(doc)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    let h = initHistory(doc)
    h = reducer(h, { type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    expect(sheetConflicts(h.present)).toBe(false)
  })
})

describe('grab area around outlines', () => {
  it('stays about 14 screen pixels wide however far you zoom, within limits', async () => {
    const { hitWidth, HIT_SCREEN_PX } = await import('@/editor/ui/ShapeView')
    expect(hitWidth(1)).toBe(HIT_SCREEN_PX)
    expect(hitWidth(0.5) * 0.5).toBeCloseTo(HIT_SCREEN_PX) // zoomed out: a wider strip in canvas units
    expect(hitWidth(2) * 2).toBeCloseTo(HIT_SCREEN_PX)
    expect(hitWidth(0.01)).toBe(40) // never absurdly wide
    expect(hitWidth(100)).toBe(6) // never vanishing
  })
})