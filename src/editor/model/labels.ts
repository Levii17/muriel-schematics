import type { Pt, Rect } from '@/shared/geometry'

import { defOf, itemBounds } from './geometry'
import type { Item } from './types'

/** One line of a part's label block. */
export interface LabelLine {
  text: string
  kind: 'ref' | 'rating' | 'desc'
}

export const LABEL_LINE_H = 16
/** Font sizes and (estimated) glyph widths per line kind, shared by the canvas, export and hit areas. */
export const LABEL_STYLE = {
  ref: { size: 14, char: 8.4 },
  rating: { size: 12, char: 7 },
  desc: { size: 12, char: 7 },
} as const

const MAX_CHARS = 32
const clip = (s: string) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS - 1)}…` : s)

/** Reference, rating and description, in that order; empty ones are skipped. */
export function labelLines(item: Item): LabelLine[] {
  const out: LabelLine[] = []
  if (item.label) out.push({ text: item.label, kind: 'ref' })
  if (item.rating) out.push({ text: clip(item.rating), kind: 'rating' })
  if (item.description) out.push({ text: clip(item.description), kind: 'desc' })
  return out
}

/** First baseline of the label block: just right of the part, plus however far the user has dragged it. */
export function labelPos(item: Item): Pt {
  const b = itemBounds(item, defOf(item))
  const o = item.labelOffset ?? { x: 0, y: 0 }
  return { x: b.x + b.w + 10 + o.x, y: b.y + 16 + o.y }
}

/** The whole label block as a rectangle (also its drag handle), or null when there is nothing to draw. */
export function labelBox(item: Item): Rect | null {
  const lines = labelLines(item)
  if (!lines.length) return null
  const p = labelPos(item)
  const w = Math.max(...lines.map((l) => l.text.length * LABEL_STYLE[l.kind].char))
  return { x: p.x - 3, y: p.y - 14, w: w + 6, h: (lines.length - 1) * LABEL_LINE_H + 20 }
}