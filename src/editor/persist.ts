import { getSymbol } from '../data'
import type { Doc } from './model'
import { mergeSheet } from './sheet'

/**
 * Validate a document read from storage. Drops parts whose symbol no longer exists, wires whose
 * endpoints are gone, and fills in the drawing sheet. Documents saved before the sheet existed
 * load with it switched off so their parts are not suddenly covered by a border.
 */
export function sanitizeDoc(raw: unknown): Doc | null {
  const r = raw as Partial<Doc> | null
  if (!r || !Array.isArray(r.items) || !Array.isArray(r.wires)) return null
  const items = r.items.filter(
    (i) => i && getSymbol(i.symbolId) && Number.isFinite(i.x) && Number.isFinite(i.y) && [0, 90, 180, 270].includes(i.rot),
  )
  const byId = new Map(items.map((i) => [i.id, i]))
  const hasTerminal = (e: { item: string; term: string } | undefined) => {
    const it = e && byId.get(e.item)
    return !!it && !!getSymbol(it.symbolId)?.terminals.some((t) => t.id === e.term)
  }
  const wires = r.wires.filter((w) => w && hasTerminal(w.a) && hasTerminal(w.b))
  return { items, wires, sheet: mergeSheet(r.sheet) }
}
