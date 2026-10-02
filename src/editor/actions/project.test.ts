import { describe, expect, it } from 'vitest'

import { emptyDoc } from '@/editor/model/doc'
import { NET_LABEL_SYMBOL } from '@/editor/model/netlabel'
import type { ProjectSheet } from '@/editor/model/project'
import type { Item } from '@/editor/model/types'

import type { ProjectAction, ProjectHistory } from './project'
import { activeDoc, initProject, projectReducer } from './project'

const part = (id: string, x = 200): Item => ({ id, symbolId: 'junction', x, y: 200, rot: 0, label: '' })
const label = (id: string, net: string): Item => ({ id, symbolId: NET_LABEL_SYMBOL, x: 200, y: 200, rot: 0, label: '', net })

const start = (): ProjectHistory => initProject([{ id: 'a', doc: emptyDoc() }])
const run = (h: ProjectHistory, ...actions: ProjectAction[]) => actions.reduce(projectReducer, h)
const ids = (h: ProjectHistory) => h.present.map((s) => s.id)

describe('editing the open sheet', () => {
  it('sends edits to the open sheet only', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' }, { type: 'add', item: part('p1') })
    expect(h.active).toBe('b')
    expect(h.present[1].doc.items.map((i) => i.id)).toEqual(['p1'])
    expect(h.present[0].doc.items).toEqual([])
  })

  it('keeps the other sheets as the same objects, so a snapshot stays cheap', () => {
    const before = run(start(), { type: 'project-add-sheet', id: 'b' })
    const after = projectReducer(before, { type: 'add', item: part('p1') })
    expect(after.present[0]).toBe(before.present[0])
  })

  it('ignores an edit that changes nothing, leaving the history alone', () => {
    const h = start()
    expect(projectReducer(h, { type: 'net-name', id: 'nope', name: 'L1' })).toBe(h)
  })

  it('names a net label and tidies the name', () => {
    const h = run(start(), { type: 'add', item: label('n1', 'x') }, { type: 'net-name', id: 'n1', name: '  l1   long   name that is far too long ' })
    expect(activeDoc(h).items[0].net).toBe('l1 long name')
  })

  it('does not give a name to a part that is not a net label', () => {
    const h = run(start(), { type: 'add', item: part('p1') })
    expect(projectReducer(h, { type: 'net-name', id: 'p1', name: 'L1' })).toBe(h)
  })
})

describe('sheets', () => {
  it('adds a sheet after the open one and opens it, copying the paper and title block', () => {
    const doc = emptyDoc()
    doc.sheet = { ...doc.sheet, enabled: true, size: 'A2', fields: { ...doc.sheet.fields, project: 'Plant', title: 'Power', details: 'x' } }
    const h = run(initProject([{ id: 'a', doc }, { id: 'z', doc: emptyDoc() }]), { type: 'project-add-sheet', id: 'b' })
    expect(ids(h)).toEqual(['a', 'b', 'z'])
    expect(h.active).toBe('b')
    const added = h.present[1].doc
    expect(added.sheet).toMatchObject({ enabled: true, size: 'A2' })
    expect(added.sheet.fields).toMatchObject({ project: 'Plant', title: '', details: '' })
    expect(added.items).toEqual([])
  })

  it('refuses a duplicate id', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' })
    expect(projectReducer(h, { type: 'project-add-sheet', id: 'b' })).toBe(h)
  })

  it('opens a sheet without touching the history', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' })
    const opened = projectReducer(h, { type: 'project-open-sheet', id: 'a' })
    expect(opened.active).toBe('a')
    expect(opened.past).toBe(h.past)
    expect(projectReducer(opened, { type: 'project-open-sheet', id: 'a' })).toBe(opened)
    expect(projectReducer(opened, { type: 'project-open-sheet', id: 'nope' })).toBe(opened)
  })

  it('deletes a sheet and moves to its neighbour, but never the last one', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' }, { type: 'project-add-sheet', id: 'c' })
    const gone = projectReducer(h, { type: 'project-delete-sheet', id: 'c' })
    expect(ids(gone)).toEqual(['a', 'b'])
    expect(gone.active).toBe('b')
    const one = run(gone, { type: 'project-delete-sheet', id: 'b' })
    expect(projectReducer(one, { type: 'project-delete-sheet', id: 'a' })).toBe(one)
  })

  it('keeps the open sheet open when another one is deleted', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' })
    expect(projectReducer(h, { type: 'project-delete-sheet', id: 'a' }).active).toBe('b')
  })

  it('reorders sheets and stops at the ends', () => {
    const h = run(start(), { type: 'project-add-sheet', id: 'b' }, { type: 'project-add-sheet', id: 'c' })
    expect(ids(projectReducer(h, { type: 'project-move-sheet', id: 'c', dir: -1 }))).toEqual(['a', 'c', 'b'])
    expect(projectReducer(h, { type: 'project-move-sheet', id: 'c', dir: 1 })).toBe(h)
    expect(projectReducer(h, { type: 'project-move-sheet', id: 'a', dir: -1 })).toBe(h)
  })

  it('stops adding at the sheet limit', () => {
    let h = start()
    for (let i = 0; i < 60; i++) h = projectReducer(h, { type: 'project-add-sheet', id: `s${i}` })
    expect(h.present.length).toBeLessThanOrEqual(40)
  })
})

describe('undo and redo across sheets', () => {
  it('undoes an edit on another sheet and shows that sheet', () => {
    let h = run(start(), { type: 'project-add-sheet', id: 'b' }, { type: 'add', item: part('p1') })
    h = projectReducer(h, { type: 'project-open-sheet', id: 'a' })
    h = projectReducer(h, { type: 'undo' })
    expect(h.active).toBe('b')
    expect(h.present[1].doc.items).toEqual([])
    h = projectReducer(h, { type: 'redo' })
    expect(h.active).toBe('b')
    expect(h.present[1].doc.items.map((i) => i.id)).toEqual(['p1'])
  })

  it('brings a deleted sheet back with undo, contents included', () => {
    let h = run(start(), { type: 'project-add-sheet', id: 'b' }, { type: 'add', item: part('p1') })
    h = projectReducer(h, { type: 'project-delete-sheet', id: 'b' })
    expect(ids(h)).toEqual(['a'])
    h = projectReducer(h, { type: 'undo' })
    expect(ids(h)).toEqual(['a', 'b'])
    expect(h.active).toBe('b')
    expect(h.present[1].doc.items).toHaveLength(1)
  })

  it('lands on a sheet that still exists when undoing the sheet you are on', () => {
    let h = run(start(), { type: 'project-add-sheet', id: 'b' })
    expect(h.active).toBe('b')
    h = projectReducer(h, { type: 'undo' })
    expect(ids(h)).toEqual(['a'])
    expect(h.active).toBe('a')
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const h = start()
    expect(projectReducer(h, { type: 'undo' })).toBe(h)
    expect(projectReducer(h, { type: 'redo' })).toBe(h)
  })

  it('drops the redo stack after a new edit', () => {
    let h = run(start(), { type: 'add', item: part('p1') }, { type: 'undo' })
    expect(h.future).toHaveLength(1)
    h = projectReducer(h, { type: 'add', item: part('p2') })
    expect(h.future).toEqual([])
  })

  it('caps the history', () => {
    let h = start()
    for (let i = 0; i < 130; i++) h = projectReducer(h, { type: 'add', item: part(`p${i}`) })
    expect(h.past.length).toBe(100)
  })
})

describe('renaming a net', () => {
  const two = (): ProjectHistory => {
    const sheets: ProjectSheet[] = [
      { id: 'a', doc: { ...emptyDoc(), items: [label('1', 'NET1'), label('2', 'net1'), label('3', 'OTHER')] } },
      { id: 'b', doc: { ...emptyDoc(), items: [label('4', 'Net1')] } },
    ]
    return initProject(sheets)
  }

  it('renames every label of that name on every sheet in one undo step', () => {
    let h = projectReducer(two(), { type: 'project-rename-net', from: 'NET1', to: 'L1' })
    expect(h.present[0].doc.items.map((i) => i.net)).toEqual(['L1', 'L1', 'OTHER'])
    expect(h.present[1].doc.items.map((i) => i.net)).toEqual(['L1'])
    h = projectReducer(h, { type: 'undo' })
    expect(h.present[0].doc.items.map((i) => i.net)).toEqual(['NET1', 'net1', 'OTHER'])
  })

  it('leaves untouched sheets as the same objects', () => {
    const before = two()
    const after = projectReducer(before, { type: 'project-rename-net', from: 'OTHER', to: 'Z' })
    expect(after.present[1]).toBe(before.present[1])
  })

  it('does nothing for a name nobody uses or a rename to the same text', () => {
    const h = two()
    expect(projectReducer(h, { type: 'project-rename-net', from: 'NOPE', to: 'X' })).toBe(h)
    expect(projectReducer(h, { type: 'project-rename-net', from: 'OTHER', to: 'OTHER' })).toBe(h)
  })
})
