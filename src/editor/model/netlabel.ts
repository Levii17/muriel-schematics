import { pivotOf, symbolBody } from '@/symbols/geometry'
import { mirrorPrim, scalePrim } from '@/symbols/scale'
import type { Prim, SymbolDef } from '@/symbols/types'

import { itemMirror, itemScale } from './geometry'
import type { Item } from './types'

/** The library symbol for a net label, and its only terminal. */
export const NET_LABEL_SYMBOL = 'net-label'
export const NET_TERMINAL = '1'
/** Longest name a label can carry; the flag is sized so a name this long still fits. */
export const MAX_NET_NAME = 12

export const isNetLabel = (item: { symbolId: string }) => item.symbolId === NET_LABEL_SYMBOL

/** Tidy a typed name: collapse runs of spaces, trim, and cut to the length that fits the flag. */
export const cleanNetName = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NET_NAME)

/** What two labels are compared by: names match regardless of case and surrounding spaces. */
export const netKey = (name: string): string => name.trim().toUpperCase()

/** The name a net label carries ('' when it has none or the part is not a net label). */
export const netNameOf = (item: Item): string => (isNetLabel(item) ? cleanNetName(item.net ?? '') : '')

/** Text size that keeps a name of this length inside the flag. */
const nameSize = (len: number) => (len <= 8 ? 14 : len <= 10 ? 12 : 10.5)

/**
 * What a placed part draws. Most parts draw their library body; a net label swaps the placeholder text for
 * its own name. The name keeps reading left to right when the label is mirrored, and is turned over when the
 * label is upside down so it never reads backwards.
 */
export function itemPrims(item: Item, def: SymbolDef): Prim[] {
  const k = itemScale(item)
  const mirror = itemMirror(item)
  if (def.id !== NET_LABEL_SYMBOL) return symbolBody(def, k, mirror)

  const name = netNameOf(item)
  const shape = def.body.filter((p) => p.k !== 'text')
  const label: Prim[] = name
    ? [{ k: 'text', x: 67, y: 25, text: name, size: nameSize(name.length), weight: 600, anchor: 'middle', ...(item.rot === 180 ? { rot: 180 } : {}) }]
    : []
  const scaled = [...shape, ...label].map((p) => scalePrim(p, k))
  if (!mirror) return scaled
  const axis2 = 2 * pivotOf(def).x * k
  return scaled.map((p) => mirrorPrim(p, axis2))
}
