import { describe, expect, it } from 'vitest'

import { conflictingNoteIds, drawingBox, planFit, sheetConflicts } from '@/editor/actions/checks'
import { clonePayload, copyPayload } from '@/editor/actions/clipboard'
import { initHistory, reducer } from '@/editor/actions/history'
import { bodyIds, countOf, EMPTY, notesInBox } from '@/editor/actions/select'
import { groupCenter, snapEven, transformDoc } from '@/editor/actions/transform'
import { dolStarterExample } from '@/editor/examples'
import { diagramToSvg, noteSvg } from '@/editor/io/export'
import { sanitizeDoc, sanitizeNotes } from '@/editor/io/persist'
import { scaleDrawing } from '@/editor/model/doc'
import { itemBounds } from '@/editor/model/geometry'
import { LABEL_LINE_H, labelBox, labelLines, labelPos } from '@/editor/model/labels'
import { NOTE_LINE, NOTE_SIZES, noteBounds, noteLocalBox } from '@/editor/model/notes'
import { blockBox, frameBox } from '@/editor/model/sheet'
import type { Doc, Item, TextNote } from '@/editor/model/types'
import { getSymbol } from '@/symbols'

const note = (extra: Partial<TextNote> = {}): TextNote => ({ id: 'n1', x: 200, y: 100, text: 'Hello', size: 14, ...extra })
const base = (): Doc => dolStarterExample()

describe('text note geometry', () => {
  it('anchors the box on the first baseline according to alignment', () => {
    const start = noteLocalBox(note())
    const mid = noteLocalBox(note({ align: 'middle' }))
    const end = noteLocalBox(note({ align: 'end' }))
    expect(start.x).toBe(0)
    expect(mid.x).toBeCloseTo(-start.w / 2)
    expect(end.x).toBeCloseTo(-start.w)
    expect(start.y).toBe(-14) // the text sits above its baseline
  })

  it('grows with line count, line length, size and weight', () => {
    const one = noteLocalBox(note({ text: 'abc' }))
    expect(noteLocalBox(note({ text: 'abc\ndef\nghi' })).h).toBeCloseTo(one.h * 3)
    expect(noteLocalBox(note({ text: 'abcdef' })).w).toBeCloseTo(one.w * 2)
    expect(noteLocalBox(note({ text: 'abc', size: 28 })).w).toBeCloseTo(one.w * 2)
    expect(noteLocalBox(note({ text: 'abc', bold: true })).w).toBeGreaterThan(one.w)
  })

  it('measures the longest line, not the total', () => {
    expect(noteLocalBox(note({ text: 'ab\nabcdefgh' })).w).toBeCloseTo(noteLocalBox(note({ text: 'abcdefgh' })).w)
  })

  it('swaps width and height for a quarter turn about the anchor', () => {
    const flat = noteBounds(note({ text: 'Long label here', size: 12 }))
    const up = noteBounds(note({ text: 'Long label here', size: 12, rot: 90 }))
    expect(up.w).toBeCloseTo(flat.h)
    expect(up.h).toBeCloseTo(flat.w)
    // Turning 180 degrees keeps the size but flips the box to the other side of the anchor.
    const upside = noteBounds(note({ text: 'Long label here', size: 12, rot: 180 }))
    expect(upside.w).toBeCloseTo(flat.w)
    expect(upside.x).toBeLessThan(200)
  })
})

describe('part labels and properties', () => {
  const q1 = () => base().items.find((i) => i.id === 'e-q1')!

  it('lists reference, rating and description in order and skips empty ones', () => {
    expect(labelLines(q1()).map((l) => l.kind)).toEqual(['ref', 'rating', 'desc'])
    expect(labelLines({ ...q1(), rating: undefined }).map((l) => l.kind)).toEqual(['ref', 'desc'])
    expect(labelLines({ ...q1(), label: '', rating: undefined, description: undefined })).toEqual([])
  })

  it('shortens very long text so a label cannot run across the sheet', () => {
    const [, rating] = labelLines({ ...q1(), rating: 'x'.repeat(80) })
    expect(rating.text.length).toBeLessThanOrEqual(32)
    expect(rating.text.endsWith('…')).toBe(true)
  })

  it('puts the label right of the part, and moves it with the drag offset', () => {
    const it = q1()
    const b = itemBounds(it, getSymbol(it.symbolId)!)
    const home = labelPos(it)
    expect(home.x).toBeGreaterThan(b.x + b.w)
    expect(labelPos({ ...it, labelOffset: { x: -200, y: 30 } })).toEqual({ x: home.x - 200, y: home.y + 30 })
  })

  it('sizes the drag handle to the whole block', () => {
    const one = labelBox({ ...q1(), rating: undefined, description: undefined })!
    const three = labelBox(q1())!
    expect(three.h - one.h).toBe(2 * LABEL_LINE_H)
    expect(labelBox({ ...q1(), label: '', rating: undefined, description: undefined })).toBeNull()
  })

  it('edits properties through history: trims, clips, deletes when empty, and skips no-ops', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'props', id: 'e-q1', patch: { rating: '  63 A  ', partNo: 'X'.repeat(90) } })
    const it = h.present.items.find((i) => i.id === 'e-q1')!
    expect(it.rating).toBe('63 A')
    expect(it.partNo).toHaveLength(60)
    expect(it.description).toBe('Main breaker') // untouched
    const same = reducer(h, { type: 'props', id: 'e-q1', patch: { rating: '63 A' } })
    expect(same).toBe(h)
    h = reducer(h, { type: 'props', id: 'e-q1', patch: { rating: '   ' } })
    expect('rating' in h.present.items.find((i) => i.id === 'e-q1')!).toBe(false)
    h = reducer(h, { type: 'undo' })
    expect(h.present.items.find((i) => i.id === 'e-q1')!.rating).toBe('63 A')
  })

  it('moves and resets a label, without recording a zero move', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'label-offset', id: 'e-q1', offset: { x: -120, y: 40 } })
    expect(h.present.items.find((i) => i.id === 'e-q1')!.labelOffset).toEqual({ x: -120, y: 40 })
    const zero = reducer(h, { type: 'label-offset', id: 'e-k1', offset: { x: 0, y: 0 } })
    expect(zero).toBe(h)
    h = reducer(h, { type: 'label-offset', id: 'e-q1', offset: null })
    expect('labelOffset' in h.present.items.find((i) => i.id === 'e-q1')!).toBe(false)
  })

  it('carries properties and label position through copy and paste', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'label-offset', id: 'e-q1', offset: { x: -80, y: 10 } })
    const p = copyPayload(h.present, { items: ['e-q1'], wires: [], notes: [], shapes: [] })!
    const clone = clonePayload(h.present, p, 40, 40)
    expect(clone.items[0]).toMatchObject({ label: 'Q2', rating: '32 A, 10 kA', description: 'Main breaker', labelOffset: { x: -80, y: 10 } })
    // The copy has its own offset object, so moving one label cannot move the other.
    expect(clone.items[0].labelOffset).not.toBe(h.present.items.find((i) => i.id === 'e-q1')!.labelOffset)
  })
})

describe('notes in the document', () => {
  it('adds, edits and removes notes as undoable steps', () => {
    let h = initHistory(base())
    const n0 = h.present.notes.length
    h = reducer(h, { type: 'add-note', note: note() })
    expect(h.present.notes).toHaveLength(n0 + 1)
    h = reducer(h, { type: 'edit-note', id: 'n1', patch: { text: 'Changed', bold: true, size: 24 } })
    expect(h.present.notes.find((n) => n.id === 'n1')).toMatchObject({ text: 'Changed', bold: true, size: 24 })
    h = reducer(h, { type: 'edit-note', id: 'n1', patch: { bold: undefined } })
    expect('bold' in h.present.notes.find((n) => n.id === 'n1')!).toBe(false)
    const same = reducer(h, { type: 'edit-note', id: 'n1', patch: { text: 'Changed' } })
    expect(same).toBe(h)
    h = reducer(h, { type: 'delete', items: [], wires: [], notes: ['n1'] })
    expect(h.present.notes).toHaveLength(n0)
    h = reducer(h, { type: 'undo' })
    expect(h.present.notes).toHaveLength(n0 + 1)
  })

  it('moves notes together with parts', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'move', ids: ['e-n1', 'e-q1'], dx: 20, dy: 40 })
    expect(h.present.notes.find((n) => n.id === 'e-n1')).toMatchObject({ x: 120, y: 240 })
    expect(h.present.notes.find((n) => n.id === 'e-n2')).toMatchObject({ x: 100, y: 228 }) // not selected
  })

  it('deletes a mixed selection in one step', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'delete', items: ['e-m1'], wires: [], notes: ['e-n1'] })
    expect(h.present.items.some((i) => i.id === 'e-m1')).toBe(false)
    expect(h.present.notes.some((n) => n.id === 'e-n1')).toBe(false)
    expect(h.past).toHaveLength(1)
  })

  it('copies and pastes notes with new ids and the requested offset', () => {
    const doc = base()
    const p = copyPayload(doc, { items: [], wires: [], notes: ['e-n2'], shapes: [] })!
    expect(p.items).toHaveLength(0)
    const clone = clonePayload(doc, p, 30, 50)
    expect(clone.notes[0]).toMatchObject({ x: 130, y: 278, size: 12 })
    expect(clone.notes[0].id).not.toBe('e-n2')
    let h = initHistory(doc)
    h = reducer(h, { type: 'paste', payload: clone })
    expect(h.present.notes).toHaveLength(doc.notes.length + 1)
    expect(copyPayload(doc, EMPTY)).toBeNull()
  })

  it('selects by box, window and crossing', () => {
    const doc = base()
    const n = doc.notes.find((x) => x.id === 'e-n1')!
    const b = noteBounds(n)
    expect(notesInBox(doc.notes, { x: b.x - 5, y: b.y - 5, w: b.w + 10, h: b.h + 10 }, 'window')).toContain('e-n1')
    const nip = { x: b.x + 2, y: b.y + 2, w: 4, h: 4 }
    expect(notesInBox(doc.notes, nip, 'window')).not.toContain('e-n1')
    expect(notesInBox(doc.notes, nip, 'cross')).toContain('e-n1')
    expect(bodyIds({ items: ['a'], wires: ['w'], notes: ['n'], shapes: [] })).toEqual(['a', 'n'])
    expect(countOf({ items: ['a'], wires: ['w'], notes: ['n'], shapes: [] })).toBe(3)
  })
})

describe('turning and flipping text', () => {
  const only = (n: TextNote) => ({ items: [] as Item[], notes: [n] })
  const rect = (n: TextNote) => noteBounds(n)

  it('a lone note turns in place, a quarter turn at a time, and comes back after four', () => {
    let c = only(note())
    c = transformDoc(c, ['n1'], 'rot90')
    expect(c.notes[0]).toMatchObject({ x: 200, y: 100, rot: 90 })
    for (let i = 0; i < 3; i++) c = transformDoc(c, ['n1'], 'rot90')
    expect(c.notes[0].rot).toBeUndefined()
  })

  it('flipping a lone note changes nothing: it would only reflect about itself', () => {
    const c = only(note())
    expect(transformDoc(c, ['n1'], 'flipH')).toEqual(c)
    expect(transformDoc(c, ['n1'], 'flipV')).toEqual(c)
  })

  it('in a group the text block is reflected as a whole, never mirrored, and keeps its alignment', () => {
    const doc = base()
    const ids = [...doc.items.map((i) => i.id), ...doc.notes.map((n) => n.id)]
    const c = groupCenter(doc.items, doc.notes, 10)
    for (const n of doc.notes.concat([note({ id: 'x', x: 900, y: 700, align: 'middle', text: 'a\nbb', size: 18 })])) {
      const d: Doc = { ...doc, notes: [...doc.notes, ...(n.id === 'x' ? [n] : [])] }
      const ids2 = n.id === 'x' ? [...ids, 'x'] : ids
      const c2 = n.id === 'x' ? groupCenter(d.items, d.notes, 10) : c
      const h = transformDoc(d, ids2, 'flipH').notes.find((m) => m.id === n.id)!
      const before = rect(n)
      const after = rect(h)
      expect(after.x).toBeCloseTo(2 * c2.x - (before.x + before.w), 3)
      expect(after.y).toBeCloseTo(before.y, 3)
      expect(after.w).toBeCloseTo(before.w, 3)
      expect(h.align).toBe(n.align)
      const v = transformDoc(d, ids2, 'flipV').notes.find((m) => m.id === n.id)!
      expect(rect(v).y).toBeCloseTo(2 * c2.y - (before.y + before.h), 3)
      expect(rect(v).x).toBeCloseTo(before.x, 3)
    }
  })

  it('a group flip left-right then left-right again puts everything back', () => {
    const doc = base()
    const ids = [...doc.items.map((i) => i.id), ...doc.notes.map((n) => n.id)]
    for (const kind of ['flipH', 'flipV'] as const) {
      const back = transformDoc(transformDoc(doc, ids, kind), ids, kind)
      back.notes.forEach((n, i) => {
        expect(n.x).toBeCloseTo(doc.notes[i].x, 4)
        expect(n.y).toBeCloseTo(doc.notes[i].y, 4)
      })
      expect(back.items.map((i) => [i.x, i.y, i.rot])).toEqual(doc.items.map((i) => [i.x, i.y, i.rot]))
    }
  })

  it('a group turn moves the text block rigidly about the group centre', () => {
    const doc = base()
    const ids = [...doc.items.map((i) => i.id), ...doc.notes.map((n) => n.id)]
    const c = groupCenter(doc.items, doc.notes, 20)
    const out = transformDoc(doc, ids, 'rot90')
    doc.notes.forEach((n, i) => {
      const before = rect(n)
      const after = rect(out.notes[i])
      expect(out.notes[i].rot).toBe(90)
      expect(after.w).toBeCloseTo(before.h, 3)
      expect(after.h).toBeCloseTo(before.w, 3)
      const bc = { x: before.x + before.w / 2, y: before.y + before.h / 2 }
      expect(after.x + after.w / 2).toBeCloseTo(c.x - (bc.y - c.y), 3)
      expect(after.y + after.h / 2).toBeCloseTo(c.y + (bc.x - c.x), 3)
    })
  })

  it('keeps a group rigid through four turns, even though its centre may settle on a new grid point', () => {
    const doc = base()
    const ids = [...doc.items.map((i) => i.id), ...doc.notes.map((n) => n.id)]
    let c: { items: Item[]; notes: TextNote[] } = doc
    for (let i = 0; i < 4; i++) c = transformDoc(c, ids, 'rot90')
    expect(c.items.map((i) => i.rot)).toEqual(doc.items.map((i) => i.rot))
    const dx = c.items[0].x - doc.items[0].x
    const dy = c.items[0].y - doc.items[0].y
    c.items.forEach((it, i) => {
      expect(it.x - doc.items[i].x).toBe(dx)
      expect(it.y - doc.items[i].y).toBe(dy)
    })
    expect(Math.abs(dx) + Math.abs(dy)).toBeLessThanOrEqual(40) // never more than one grid step off
  })
})

describe('scaling a drawing with notes', () => {
  it('scales note positions and moves text size to the nearest preset', () => {
    const doc = base()
    const half = scaleDrawing(doc, 0.5)!
    expect(half.notes).toHaveLength(doc.notes.length)
    for (const n of half.notes) expect(NOTE_SIZES).toContain(n.size)
    expect(half.notes[0].size).toBeLessThan(doc.notes[0].size + 1)
    const a = doc.notes[0]
    const b = half.notes[0]
    expect(b.x).toBe(a.x) // this note holds the left edge of the drawing, which is the scaling anchor
    expect(b.y).toBeLessThan(a.y) // pulled up toward the top edge
    const circuit = doc.items[1].x
    expect(half.items[1].x).toBeLessThan(circuit) // the circuit, far to the right, moves in toward the anchor
  })

  it('scales label offsets with the drawing', () => {
    let h = initHistory(base())
    h = reducer(h, { type: 'label-offset', id: 'e-q1', offset: { x: -100, y: 40 } })
    const half = scaleDrawing(h.present, 0.5)!
    expect(half.items.find((i) => i.id === 'e-q1')!.labelOffset).toEqual({ x: -50, y: 20 })
  })
})

describe('storage', () => {
  it('keeps good notes, drops malformed ones and clamps the rest', () => {
    const clean = sanitizeNotes([
      { id: 'a', x: 1, y: 2, text: 'ok', size: 14 },
      { id: 'b', x: 1, y: 2, text: 'big', size: 500, bold: true, align: 'middle', rot: 90 },
      { id: 'c', x: 'x', y: 2, text: 'bad', size: 14 },
      { x: 1, y: 2, text: 'no id', size: 14 },
      { id: 'd', x: 1, y: 2, text: 5, size: 14 },
      { id: 'e', x: 1, y: 2, text: 'align', size: 2, align: 'start', rot: 45 },
      null,
    ])
    expect(clean.map((n) => n.id)).toEqual(['a', 'b', 'e'])
    expect(clean[1]).toMatchObject({ size: 96, bold: true, align: 'middle', rot: 90 })
    expect(clean[2]).toMatchObject({ size: 6 })
    expect('align' in clean[2]).toBe(false) // "start" is the default and is not stored
    expect('rot' in clean[2]).toBe(false)
    expect(sanitizeNotes('nope')).toEqual([])
  })

  it('round-trips a drawing with notes and properties', () => {
    const doc = base()
    expect(sanitizeDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('loads drawings saved before notes existed with none', () => {
    const { items, wires, sheet } = base()
    expect(sanitizeDoc({ items, wires, sheet })!.notes).toEqual([])
  })

  it('cleans stored part properties and label offsets', () => {
    const doc = base()
    const raw = JSON.parse(JSON.stringify(doc))
    raw.items[1].rating = 42
    raw.items[1].description = '  tidy  '
    raw.items[1].labelOffset = { x: 'a', y: 1 }
    raw.items[2].labelOffset = { x: 5, y: 6 }
    raw.items[2].partNo = 'Z'.repeat(100)
    const clean = sanitizeDoc(raw)!
    expect('rating' in clean.items[1]).toBe(false)
    expect(clean.items[1].description).toBe('tidy')
    expect('labelOffset' in clean.items[1]).toBe(false)
    expect(clean.items[2].labelOffset).toEqual({ x: 5, y: 6 })
    expect(clean.items[2].partNo).toHaveLength(60)
  })
})

describe('export of text', () => {
  it('draws ratings and descriptions under each label', () => {
    const { svg } = diagramToSvg(base())
    expect(svg).toContain('>32 A, 10 kA<')
    expect(svg).toContain('>Main breaker<')
    expect(svg).toContain('>Pump motor<')
  })

  it('writes multi-line notes as lines of one text element and escapes markup', () => {
    const svg = noteSvg(note({ text: 'a < b & "c"\n\nlast', size: 10 }), '#000')
    expect(svg).toContain('a &lt; b &amp; &quot;c&quot;')
    expect(svg.match(/<tspan/g)).toHaveLength(3)
    expect(svg).toContain(`dy="${10 * NOTE_LINE}"`)
    expect(svg).toContain('&#160;') // the blank line keeps its height
    expect(svg).not.toContain('rotate') // no rotation when there is none
    expect(noteSvg(note({ rot: 90, align: 'end', bold: true }), '#000')).toMatch(/rotate\(90\).*text-anchor="end"|text-anchor="end".*rotate\(90\)/)
  })

  it('includes notes and label blocks when working out the crop with the sheet off', () => {
    const doc: Doc = { ...base(), sheet: { ...base().sheet, enabled: false }, items: [], wires: [], notes: [note({ x: 500, y: 500, text: 'far' })] }
    const { svg, width } = diagramToSvg(doc)
    expect(svg).toContain('>far<')
    expect(width).toBeGreaterThan(80)
  })
})

describe('keeping text on the sheet', () => {
  it('the example, notes and labels included, sits inside the frame and clear of the title block', () => {
    const doc = base()
    const f = frameBox(doc.sheet.size)
    const t = blockBox(doc.sheet.size)
    for (const n of doc.notes) {
      const b = noteBounds(n)
      expect(b.x).toBeGreaterThan(f.x)
      expect(b.y).toBeGreaterThan(f.y)
      expect(b.x + b.w).toBeLessThan(t.x)
    }
    const box = drawingBox(doc)!
    expect(box.x).toBeGreaterThan(f.x)
    expect(box.x + box.w).toBeLessThan(f.x + f.w)
    expect(box.y + box.h).toBeLessThan(t.y)
    expect(sheetConflicts(doc)).toBe(false)
  })

  it('flags a note that strays outside the frame, and only when the sheet is on', () => {
    const doc = { ...base(), notes: [note({ x: 5, y: 5 })] }
    expect(conflictingNoteIds(doc)).toEqual(['n1'])
    expect(sheetConflicts(doc)).toBe(true)
    expect(conflictingNoteIds({ ...doc, sheet: { ...doc.sheet, enabled: false } })).toEqual([])
  })

  it('counts notes and labels when fitting the drawing to a sheet', () => {
    const doc = { ...base(), notes: [note({ x: 5, y: 5 })] }
    const plan = planFit(doc)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    let h = initHistory(doc)
    h = reducer(h, { type: 'fit-sheet', dx: plan.dx, dy: plan.dy, size: plan.size })
    expect(sheetConflicts(h.present)).toBe(false)
    expect(h.present.notes[0].x).toBe(5 + plan.dx)
  })
})

describe('snapEven', () => {
  it('rounds normally except that exact halves go to the even multiple', () => {
    expect(snapEven(12, 10)).toBe(10)
    expect(snapEven(18, 10)).toBe(20)
    expect(snapEven(15, 10)).toBe(20) // 1.5 -> 2
    expect(snapEven(25, 10)).toBe(20) // 2.5 -> 2
    expect(snapEven(35, 10)).toBe(40)
    expect(snapEven(-5, 10)).toBe(0)
    expect(Object.is(snapEven(-2, 10), -0)).toBe(false)
  })

  it('makes reflecting about the snapped centre repeatable', () => {
    // A centre exactly between grid lines used to land on a different line the second time.
    for (const centre of [505, 510, 515, 525, 1035]) {
      const c = snapEven(centre, 10)
      expect(snapEven(2 * c - centre, 10)).toBe(c)
    }
  })
})