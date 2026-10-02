import { describe, expect, it } from 'vitest'

import { emptyDoc } from './doc'
import { NET_LABEL_SYMBOL, NET_TERMINAL } from './netlabel'
import { collectLabels, flaggedLabels, netGroups, netIssues, refText, suggestNetName, xrefLabels } from './nets'
import type { ProjectSheet } from './project'
import type { Doc, Item, Wire } from './types'

const label = (id: string, net: string | undefined, x = 200, y = 200): Item => ({
  id, symbolId: NET_LABEL_SYMBOL, x, y, rot: 0, label: '', ...(net !== undefined ? { net } : {}),
})
const wire = (id: string, a: string, b: string): Wire => ({ id, a: { item: a, term: NET_TERMINAL }, b: { item: b, term: NET_TERMINAL } })
const junction = (id: string): Item => ({ id, symbolId: 'junction', x: 100, y: 100, rot: 0, label: '' })

const sheet = (id: string, items: Item[], wires: Wire[] = [], on = false): ProjectSheet => {
  const doc: Doc = { ...emptyDoc(), items, wires }
  doc.sheet = { ...doc.sheet, enabled: on, size: 'A3' }
  return { id, doc }
}

describe('collecting labels', () => {
  it('lists labels sheet by sheet with their sheet index', () => {
    const refs = collectLabels([sheet('a', [label('1', 'L1')]), sheet('b', [label('2', 'N'), label('3', 'PE')])])
    expect(refs.map((r) => [r.itemId, r.sheetIndex, r.name])).toEqual([['1', 0, 'L1'], ['2', 1, 'N'], ['3', 1, 'PE']])
  })

  it('ignores parts that are not net labels', () => {
    expect(collectLabels([sheet('a', [junction('j')])])).toEqual([])
  })

  it('works out the zone only when the sheet frame is showing', () => {
    const off = collectLabels([sheet('a', [label('1', 'L1', 100, 100)], [], false)])[0]
    expect(off.zone).toBeNull()
    const on = collectLabels([sheet('a', [label('1', 'L1', 100, 100)], [], true)])[0]
    expect(on.zone).toBe('A1')
  })

  it('groups names without regard to case or spacing', () => {
    const groups = netGroups([sheet('a', [label('1', 'l1')]), sheet('b', [label('2', ' L1 ')])])
    expect(groups).toHaveLength(1)
    expect(groups[0].labels).toHaveLength(2)
    expect(groups[0].name).toBe('l1')
  })

  it('leaves unnamed labels out of every net', () => {
    expect(netGroups([sheet('a', [label('1', undefined), label('2', '  ')])])).toEqual([])
  })
})

describe('cross references', () => {
  const sheets = [
    sheet('a', [label('1', 'L1', 100, 100)], [], true),
    sheet('b', [label('2', 'L1', 1000, 600), label('3', 'L1', 100, 100)], [], true),
    sheet('c', [label('4', 'L1', 100, 100), label('5', 'LONELY')], [], false),
  ]

  it('points at labels on other sheets as sheet/zone and at this sheet as the zone alone', () => {
    const x = xrefLabels(sheets, 'b')
    expect(x.get('2')).toBe('→ 1/A1, A1, 3')
    expect(x.get('3')).toBe('→ 1/A1, D5, 3')
  })

  it('gives labels without partners no cross reference', () => {
    expect(xrefLabels(sheets, 'c').has('5')).toBe(false)
  })

  it('shortens a long list', () => {
    const many = [sheet('a', [label('1', 'X', 100, 100), label('2', 'X'), label('3', 'X'), label('4', 'X'), label('5', 'X')], [], true)]
    expect(xrefLabels(many, 'a').get('1')).toMatch(/\+1$/)
  })

  it('formats a reference to the same sheet without a zone', () => {
    const [ref] = collectLabels([sheet('a', [label('1', 'L1')])])
    expect(refText(ref, 0)).toBe('this sheet')
    expect(refText(ref, 1)).toBe('1')
  })

  it('returns nothing for a sheet that does not exist', () => {
    expect(xrefLabels(sheets, 'zzz').size).toBe(0)
  })
})

describe('suggesting a name', () => {
  it('starts at NET1 and counts up past names in use', () => {
    expect(suggestNetName([sheet('a', [])])).toBe('NET1')
    expect(suggestNetName([sheet('a', [label('1', 'NET1'), label('2', 'NET1')])])).toBe('NET2')
  })

  it('pairs a new label with the oldest name that is used only once', () => {
    const s = [sheet('a', [label('1', 'L1'), label('2', 'N'), label('3', 'N')])]
    expect(suggestNetName(s)).toBe('L1')
  })
})

describe('issues', () => {
  it('reports a name used only once', () => {
    const issues = netIssues([sheet('a', [label('1', 'L1')], [wire('w', '1', 'j')]), sheet('b', [])])
    expect(issues.some((i) => i.kind === 'single' && i.labels[0].itemId === '1')).toBe(true)
  })

  it('reports an unnamed label', () => {
    const issues = netIssues([sheet('a', [label('1', undefined), label('2', 'A'), label('3', 'A')], [wire('w', '2', '3')])])
    expect(issues.map((i) => i.kind)).toEqual(['unnamed'])
  })

  it('reports a wireless label', () => {
    const issues = netIssues([sheet('a', [label('1', 'A'), label('2', 'A')], [])])
    expect(issues.filter((i) => i.kind === 'unwired')).toHaveLength(2)
  })

  it('is quiet when two labels with the same name are both wired', () => {
    const s = [
      sheet('a', [label('1', 'L1'), junction('j1')], [{ id: 'w1', a: { item: '1', term: NET_TERMINAL }, b: { item: 'j1', term: '1' } }]),
      sheet('b', [label('2', 'L1'), junction('j2')], [{ id: 'w2', a: { item: '2', term: NET_TERMINAL }, b: { item: 'j2', term: '1' } }]),
    ]
    expect(netIssues(s)).toEqual([])
  })

  it('reports two differently named labels on one wire', () => {
    const s = [
      sheet('a', [label('1', 'L1'), label('2', 'L2')], [wire('w', '1', '2')]),
      sheet('b', [label('3', 'L1'), junction('j')], [{ id: 'w2', a: { item: '3', term: NET_TERMINAL }, b: { item: 'j', term: '1' } }]),
      sheet('c', [label('4', 'L2'), junction('k')], [{ id: 'w3', a: { item: '4', term: NET_TERMINAL }, b: { item: 'k', term: '1' } }]),
    ]
    const conflicts = netIssues(s).filter((i) => i.kind === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].message).toContain('L1')
    expect(conflicts[0].message).toContain('L2')
  })

  it('finds a conflict that only shows up through another sheet', () => {
    // L1 and L2 are wired apart on sheet a, but sheet b wires an L1 label to an L2 label.
    const s = [
      sheet('a', [label('1', 'L1'), label('2', 'L2'), junction('j')], [
        { id: 'w1', a: { item: '1', term: NET_TERMINAL }, b: { item: 'j', term: '1' } },
        { id: 'w2', a: { item: '2', term: NET_TERMINAL }, b: { item: 'j', term: '1' } },
      ]),
    ]
    expect(netIssues(s).some((i) => i.kind === 'conflict')).toBe(true)
  })

  it('sorts issues by where their first label sits and flags labels per sheet', () => {
    const s = [sheet('a', [label('1', undefined)]), sheet('b', [label('2', 'X')])]
    const issues = netIssues(s)
    expect(issues[0].labels[0].itemId).toBe('1')
    expect([...flaggedLabels(issues, 'a')]).toEqual(['1'])
    expect([...flaggedLabels(issues, 'b')]).toEqual(['2'])
  })

  it('has no issues without labels', () => {
    expect(netIssues([sheet('a', [])])).toEqual([])
  })
})
