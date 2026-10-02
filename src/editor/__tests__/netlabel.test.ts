import { describe, expect, it } from 'vitest'

import { diagramToSvg } from '@/editor/io/export'
import { emptyDoc } from '@/editor/model/doc'
import { defOf, itemBounds, terminalWorld } from '@/editor/model/geometry'
import { labelBox, labelLines, labelPos } from '@/editor/model/labels'
import { cleanNetName, isNetLabel, itemPrims, MAX_NET_NAME, netKey, netNameOf, NET_LABEL_SYMBOL, NET_TERMINAL } from '@/editor/model/netlabel'
import type { Item, Rot } from '@/editor/model/types'
import { GRID } from '@/shared/geometry'
import { getSymbol } from '@/symbols'
import { SCALES } from '@/symbols/scale'
import { bodyToSvg } from '@/symbols/svg'
import type { Prim } from '@/symbols/types'

const label = (net: string | undefined, rot: Rot = 0, extra: Partial<Item> = {}): Item => ({
  id: 'n1', symbolId: NET_LABEL_SYMBOL, x: 200, y: 200, rot, label: '', ...(net !== undefined ? { net } : {}), ...extra,
})
const textOf = (prims: Prim[]) => prims.flatMap((p) => (p.k === 'text' ? [p] : []))

describe('net label names', () => {
  it('tidies, compares and reads names', () => {
    expect(cleanNetName('  a   b ')).toBe('a b')
    expect(cleanNetName('x'.repeat(40))).toHaveLength(MAX_NET_NAME)
    expect(netKey(' pe ')).toBe('PE')
    expect(netNameOf(label('  L1 '))).toBe('L1')
    expect(netNameOf({ ...label('L1'), symbolId: 'junction' })).toBe('')
    expect(isNetLabel(label('L1'))).toBe(true)
  })
})

describe('net label symbol', () => {
  const def = getSymbol(NET_LABEL_SYMBOL)!

  it('is in the library with one terminal at its point', () => {
    expect(def.category).toBe('connect')
    expect(def.terminals).toHaveLength(1)
    expect(def.terminals[0]).toMatchObject({ id: NET_TERMINAL, x: 0, y: 20, dir: 'left' })
  })

  it('keeps its terminal on the grid at every rotation, mirror and size', () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      for (const mirror of [false, true]) {
        for (const scale of SCALES) {
          const p = terminalWorld({ ...label('L1', rot), mirror, scale }, def, NET_TERMINAL)!
          // Positions land on a 5 px lattice at the smaller sizes, as for every symbol.
          expect(p.x % (GRID / 4), `${rot} ${mirror} ${scale} x`).toBe(0)
          expect(p.y % (GRID / 4), `${rot} ${mirror} ${scale} y`).toBe(0)
        }
      }
    }
  })

  it('points the wire out of the flag, and the other way when mirrored', () => {
    expect(terminalWorld(label('L1'), def, NET_TERMINAL)).toMatchObject({ dx: -1, dy: 0 })
    expect(terminalWorld({ ...label('L1'), mirror: true }, def, NET_TERMINAL)).toMatchObject({ dx: 1, dy: 0 })
  })
})

describe('what a net label draws', () => {
  const def = getSymbol(NET_LABEL_SYMBOL)!

  it('shows its own name instead of the placeholder', () => {
    const t = textOf(itemPrims(label('L1'), def))
    expect(t.map((p) => p.text)).toEqual(['L1'])
  })

  it('draws only the flag when it has no name', () => {
    expect(textOf(itemPrims(label(undefined), def))).toEqual([])
    expect(itemPrims(label(undefined), def).length).toBeGreaterThan(0)
  })

  it('shrinks long names so they stay inside the flag', () => {
    const size = (n: string) => textOf(itemPrims(label(n), def))[0].size
    expect(size('L1')).toBeGreaterThan(size('ABCDEFGHIJKL'))
  })

  it('moves the name with a mirror but keeps it reading left to right', () => {
    const [plain] = textOf(itemPrims(label('L1'), def))
    const [flipped] = textOf(itemPrims(label('L1', 0, { mirror: true }), def))
    expect(flipped.x).toBeLessThan(plain.x)
    expect(flipped.anchor).toBe('middle')
  })

  it('turns the name over when the flag is upside down, and only then', () => {
    expect(textOf(itemPrims(label('L1', 180), def))[0].rot).toBe(180)
    for (const rot of [0, 90, 270] as Rot[]) expect(textOf(itemPrims(label('L1', rot), def))[0].rot).toBeUndefined()
  })

  it('scales the name with the flag', () => {
    const base = textOf(itemPrims(label('L1'), def))[0]
    const big = textOf(itemPrims(label('L1', 0, { scale: 2 }), def))[0]
    expect(big.size).toBeCloseTo(base.size * 2)
  })

  it('leaves other parts drawing their library body', () => {
    const breaker = getSymbol('circuit-breaker-1p')!
    const it: Item = { id: 'b', symbolId: breaker.id, x: 0, y: 0, rot: 0, label: 'Q1' }
    expect(itemPrims(it, breaker)).toBe(breaker.body)
  })

  it('serialises the turn for export', () => {
    const svg = bodyToSvg(itemPrims(label('L1', 180), def))
    expect(svg).toMatch(/<text[^>]*transform="rotate\(180 /)
  })
})

describe('cross-reference label block', () => {
  it('is empty without a partner and shows the reference with one', () => {
    expect(labelLines(label('L1'))).toEqual([])
    expect(labelLines(label('L1'), '→ 2/C4')).toEqual([{ text: '→ 2/C4', kind: 'xref' }])
    expect(labelBox(label('L1'))).toBeNull()
    expect(labelBox(label('L1'), '→ 2/C4')).not.toBeNull()
  })

  it('sits under a flat flag and beside a vertical one', () => {
    const flat = label('L1', 0)
    const fb = itemBounds(flat, defOf(flat))
    expect(labelPos(flat).y).toBeGreaterThan(fb.y + fb.h)
    const tall = label('L1', 90)
    const tb = itemBounds(tall, defOf(tall))
    expect(labelPos(tall).x).toBeGreaterThan(tb.x + tb.w)
  })

  it('can be dragged like any other label', () => {
    const base = labelPos(label('L1'))
    const moved = labelPos(label('L1', 0, { labelOffset: { x: 20, y: -10 } }))
    expect(moved).toEqual({ x: base.x + 20, y: base.y - 10 })
  })
})

describe('exporting net labels', () => {
  const doc = { ...emptyDoc(), items: [label('L1')] }

  it('draws the name and the cross-reference', () => {
    const { svg } = diagramToSvg(doc, { xrefs: new Map([['n1', '→ 2/C4']]) })
    expect(svg).toContain('>L1</text>')
    expect(svg).toContain('→ 2/C4')
  })

  it('makes room for the cross-reference in the cropped picture', () => {
    const without = diagramToSvg(doc)
    const withRef = diagramToSvg(doc, { xrefs: new Map([['n1', '→ 12/C4, 13/A1, 14/B2']]) })
    expect(withRef.height).toBeGreaterThan(without.height)
  })

  it('fills the title block sheet number for a multi-sheet drawing', () => {
    const on = { ...doc, sheet: { ...doc.sheet, enabled: true } }
    expect(diagramToSvg(on, { position: { index: 2, total: 3 } }).svg).toContain('2 / 3')
    expect(diagramToSvg(on).svg).toContain('1 / 1')
  })
})
