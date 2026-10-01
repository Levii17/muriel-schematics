import type { Rect } from '@/shared/geometry'

import { rotateVec } from './geometry'
import type { Rot, TextNote } from './types'

/** Sizes offered in the inspector. Any positive size is drawn, these are just the presets. */
export const NOTE_SIZES = [10, 12, 14, 18, 24, 32]
export const NOTE_LINE = 1.3

export const noteLines = (n: Pick<TextNote, 'text'>) => n.text.split('\n')
export const noteRot = (n: Pick<TextNote, 'rot'>): Rot => n.rot ?? 0

/** Text extent in the note's own frame (before rotation), origin at the first baseline's anchor. Widths are estimated. */
export function noteLocalBox(n: TextNote): Rect {
  const lines = noteLines(n)
  const w = Math.max(...lines.map((l) => l.length), 1) * n.size * (n.bold ? 0.62 : 0.58)
  const h = lines.length * n.size * NOTE_LINE
  const x = n.align === 'middle' ? -w / 2 : n.align === 'end' ? -w : 0
  return { x, y: -n.size, w, h }
}

/** Where a note sits on the canvas, as an axis-aligned box. */
export function noteBounds(n: TextNote): Rect {
  const b = noteLocalBox(n)
  const r = noteRot(n)
  const pts = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ].map(([x, y]) => rotateVec(x, y, r))
  const xs = pts.map((p) => n.x + p[0])
  const ys = pts.map((p) => n.y + p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
