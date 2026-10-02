import { cleanNetName, isNetLabel, netKey } from '@/editor/model/netlabel'
import type { ProjectSheet } from '@/editor/model/project'
import { blankLike, MAX_SHEETS } from '@/editor/model/project'
import type { Doc, Item } from '@/editor/model/types'

import type { Action } from './history'
import { applyAction } from './history'

/**
 * Undo history for a whole drawing, which may have several sheets. Each step is a snapshot of every sheet;
 * sheets are immutable, so a snapshot only costs a new array plus whichever sheet actually changed.
 * Which sheet is open is not part of the history, so undo never "un-switches" a tab.
 */
export interface ProjectHistory {
  past: ProjectSheet[][]
  present: ProjectSheet[]
  future: ProjectSheet[][]
  /** Id of the sheet being edited. */
  active: string
}

export type ProjectAction =
  | Action
  | { type: 'project-open-sheet'; id: string }
  /** `id` is supplied by the caller so the reducer stays pure. The new sheet opens after the current one. */
  | { type: 'project-add-sheet'; id: string }
  | { type: 'project-delete-sheet'; id: string }
  | { type: 'project-move-sheet'; id: string; dir: -1 | 1 }
  /** Rename every net label called `from` (compared without regard to case) to `to`. */
  | { type: 'project-rename-net'; from: string; to: string }

const LIMIT = 100

export function initProject(sheets: ProjectSheet[], active?: string): ProjectHistory {
  return { past: [], present: sheets, future: [], active: active && sheets.some((s) => s.id === active) ? active : sheets[0].id }
}

/** The open sheet's document. */
export function activeDoc(h: ProjectHistory): Doc {
  return (h.present.find((s) => s.id === h.active) ?? h.present[0]).doc
}

const commit = (h: ProjectHistory, present: ProjectSheet[], active = h.active): ProjectHistory => ({
  past: [...h.past, h.present].slice(-LIMIT),
  present,
  future: [],
  active,
})

/**
 * After undo or redo, which sheet to show. The sheet the change happened on, so the person sees what changed:
 * a sheet that came back, else the open sheet if it changed, else the first sheet that did, else the nearest.
 */
function focusAfter(from: ProjectSheet[], to: ProjectSheet[], active: string): string {
  const returned = to.find((s) => !from.some((f) => f.id === s.id))
  if (returned) return returned.id
  const changed = to.filter((s) => from.find((f) => f.id === s.id)?.doc !== s.doc)
  if (changed.length) return changed.some((s) => s.id === active) ? active : changed[0].id
  if (to.some((s) => s.id === active)) return active
  const was = Math.max(0, from.findIndex((s) => s.id === active))
  return to[Math.min(was, to.length - 1)].id
}

function renameNet(sheets: ProjectSheet[], from: string, to: string): ProjectSheet[] {
  const key = netKey(from)
  const name = cleanNetName(to)
  if (!key) return sheets
  let any = false
  const next = sheets.map((s) => {
    let changed = false
    const items = s.doc.items.map((i): Item => {
      if (!isNetLabel(i) || netKey(i.net ?? '') !== key || (i.net ?? '') === name) return i
      changed = true
      const out: Item = { ...i }
      if (name) out.net = name
      else delete out.net
      return out
    })
    if (!changed) return s
    any = true
    return { ...s, doc: { ...s.doc, items } }
  })
  return any ? next : sheets
}

export function projectReducer(h: ProjectHistory, action: ProjectAction): ProjectHistory {
  switch (action.type) {
    case 'undo': {
      if (!h.past.length) return h
      const previous = h.past[h.past.length - 1]
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future], active: focusAfter(h.present, previous, h.active) }
    }
    case 'redo': {
      if (!h.future.length) return h
      const [next, ...rest] = h.future
      return { past: [...h.past, h.present], present: next, future: rest, active: focusAfter(h.present, next, h.active) }
    }
    case 'project-open-sheet':
      return action.id !== h.active && h.present.some((s) => s.id === action.id) ? { ...h, active: action.id } : h
    case 'project-add-sheet': {
      if (h.present.length >= MAX_SHEETS || h.present.some((s) => s.id === action.id)) return h
      const at = h.present.findIndex((s) => s.id === h.active)
      const source = h.present[at] ?? h.present[0]
      const sheet: ProjectSheet = { id: action.id, doc: blankLike(source.doc) }
      const present = [...h.present.slice(0, at + 1), sheet, ...h.present.slice(at + 1)]
      return commit(h, present, sheet.id)
    }
    case 'project-delete-sheet': {
      const at = h.present.findIndex((s) => s.id === action.id)
      if (at < 0 || h.present.length < 2) return h
      const present = h.present.filter((s) => s.id !== action.id)
      const active = action.id === h.active ? present[Math.min(at, present.length - 1)].id : h.active
      return commit(h, present, active)
    }
    case 'project-move-sheet': {
      const at = h.present.findIndex((s) => s.id === action.id)
      const to = at + action.dir
      if (at < 0 || to < 0 || to >= h.present.length) return h
      const present = [...h.present]
      ;[present[at], present[to]] = [present[to], present[at]]
      return commit(h, present)
    }
    case 'project-rename-net': {
      const present = renameNet(h.present, action.from, action.to)
      return present === h.present ? h : commit(h, present)
    }
    default: {
      const at = h.present.findIndex((s) => s.id === h.active)
      if (at < 0) return h
      const doc = applyAction(h.present[at].doc, action)
      if (doc === h.present[at].doc) return h
      const present = h.present.map((s, i) => (i === at ? { ...s, doc } : s))
      return commit(h, present)
    }
  }
}
