import { cleanNetName, isNetLabel, netKey, netNameOf, NET_TERMINAL } from './netlabel'
import type { ProjectSheet } from './project'
import { zoneOf } from './sheet'

/** A net label somewhere in the project, with where it sits. */
export interface NetLabelRef {
  sheetId: string
  /** 0-based position of its sheet in the project. */
  sheetIndex: number
  itemId: string
  name: string
  /** Zone letter and number like "C4", or null when that sheet is not showing its frame. */
  zone: string | null
  /** Order of appearance across the whole project, for stable sorting. */
  order: number
}

/** Every net label in the project, sheet by sheet in the order they were placed. */
export function collectLabels(sheets: ProjectSheet[]): NetLabelRef[] {
  const out: NetLabelRef[] = []
  sheets.forEach((s, sheetIndex) => {
    for (const it of s.doc.items) {
      if (!isNetLabel(it)) continue
      out.push({
        sheetId: s.id,
        sheetIndex,
        itemId: it.id,
        name: netNameOf(it),
        zone: s.doc.sheet.enabled ? zoneOf(s.doc.sheet.size, it.x, it.y) : null,
        order: out.length,
      })
    }
  })
  return out
}

/** All the labels that share one name. */
export interface NetGroup {
  key: string
  /** The name as first typed. */
  name: string
  labels: NetLabelRef[]
}

/** Named nets in order of first appearance. Labels without a name belong to no net. */
export function netGroups(sheets: ProjectSheet[]): NetGroup[] {
  const groups = new Map<string, NetGroup>()
  for (const ref of collectLabels(sheets)) {
    if (!ref.name) continue
    const key = netKey(ref.name)
    const g = groups.get(key)
    if (g) g.labels.push(ref)
    else groups.set(key, { key, name: ref.name, labels: [ref] })
  }
  return [...groups.values()]
}

/** How one label is pointed at from another: "C4" on the same sheet, "2/C4" on another, "2" when there are no zones. */
export function refText(target: NetLabelRef, fromSheetIndex: number): string {
  if (target.sheetIndex === fromSheetIndex) return target.zone ?? 'this sheet'
  return target.zone ? `${target.sheetIndex + 1}/${target.zone}` : `${target.sheetIndex + 1}`
}

const MAX_REFS = 3

/**
 * The cross-reference text for every net label on one sheet, keyed by item id: where the other labels with the
 * same name are. Labels that have no partners get no entry.
 */
export function xrefLabels(sheets: ProjectSheet[], sheetId: string): Map<string, string> {
  const out = new Map<string, string>()
  const sheetIndex = sheets.findIndex((s) => s.id === sheetId)
  if (sheetIndex < 0) return out
  for (const g of netGroups(sheets)) {
    if (g.labels.length < 2) continue
    for (const mine of g.labels) {
      if (mine.sheetId !== sheetId) continue
      const others = g.labels.filter((l) => l !== mine)
      const shown = others.slice(0, MAX_REFS).map((l) => refText(l, sheetIndex))
      const more = others.length - shown.length
      out.set(mine.itemId, `→ ${shown.join(', ')}${more > 0 ? ` +${more}` : ''}`)
    }
  }
  return out
}

/** Name for a freshly placed label: pair up with the oldest name used only once, otherwise the next free NETn. */
export function suggestNetName(sheets: ProjectSheet[]): string {
  const groups = netGroups(sheets)
  const lonely = groups.find((g) => g.labels.length === 1)
  if (lonely) return lonely.name
  const used = new Set(groups.map((g) => g.key))
  for (let n = 1; ; n++) {
    const name = cleanNetName(`NET${n}`)
    if (!used.has(netKey(name))) return name
  }
}

export type NetIssueKind = 'conflict' | 'unnamed' | 'unwired' | 'single'

export interface NetIssue {
  kind: NetIssueKind
  message: string
  /** The labels involved; the first is where "go to" lands. */
  labels: NetLabelRef[]
}

/** Tiny union-find over string keys. */
class Sets {
  private parent = new Map<string, string>()
  find(a: string): string {
    let r = this.parent.get(a) ?? a
    if (r !== a) {
      r = this.find(r)
      this.parent.set(a, r)
    }
    return r
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

const nodeKey = (sheetId: string, item: string, term: string) => `${sheetId}|${item}|${term}`

/**
 * Things worth a second look: two differently named labels on one wire (that would short two nets), labels with
 * no name, labels with no wire, and names that appear only once so they link nowhere.
 */
export function netIssues(sheets: ProjectSheet[]): NetIssue[] {
  const labels = collectLabels(sheets)
  if (!labels.length) return []

  const sets = new Sets()
  const wired = new Set<string>()
  for (const s of sheets) {
    for (const w of s.doc.wires) {
      const a = nodeKey(s.id, w.a.item, w.a.term)
      const b = nodeKey(s.id, w.b.item, w.b.term)
      wired.add(a)
      wired.add(b)
      sets.union(a, b)
    }
  }

  const issues: NetIssue[] = []
  const labelNode = (l: NetLabelRef) => nodeKey(l.sheetId, l.itemId, NET_TERMINAL)

  for (const l of labels) {
    if (!l.name) issues.push({ kind: 'unnamed', message: 'This net label has no name.', labels: [l] })
    else if (!wired.has(labelNode(l))) issues.push({ kind: 'unwired', message: `"${l.name}" is not connected to a wire.`, labels: [l] })
  }

  // Joining labels of the same name is what makes them one net; two names meeting in one place is the mistake.
  const first = new Map<string, NetLabelRef>()
  for (const l of labels) {
    if (!l.name) continue
    const k = netKey(l.name)
    const head = first.get(k)
    if (head) sets.union(labelNode(head), labelNode(l))
    else first.set(k, l)
  }
  const byRoot = new Map<string, NetLabelRef[]>()
  for (const l of labels) {
    if (!l.name || !wired.has(labelNode(l))) continue
    const root = sets.find(labelNode(l))
    byRoot.set(root, [...(byRoot.get(root) ?? []), l])
  }
  for (const group of byRoot.values()) {
    const names = [...new Map(group.map((l) => [netKey(l.name), l.name])).values()]
    if (names.length > 1) issues.push({ kind: 'conflict', message: `Wired together but named differently: ${names.join(', ')}.`, labels: group })
  }

  for (const g of netGroups(sheets)) {
    if (g.labels.length === 1) issues.push({ kind: 'single', message: `"${g.name}" appears only once, so it links nowhere yet.`, labels: g.labels })
  }

  return issues.sort((a, b) => a.labels[0].order - b.labels[0].order)
}

/** Ids of labels on one sheet that have at least one issue, for drawing a warning ring around them. */
export function flaggedLabels(issues: NetIssue[], sheetId: string): Set<string> {
  const out = new Set<string>()
  for (const issue of issues) for (const l of issue.labels) if (l.sheetId === sheetId) out.add(l.itemId)
  return out
}
