import type { Item, Rect } from './model'
import { defOf, itemBounds } from './model'

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type Axis = 'h' | 'v'
export type Moves = Map<string, { dx: number; dy: number }>

const r5 = (v: number) => Math.round(v / 5) * 5 + 0

function boxes(items: Item[], ids: string[]): { it: Item; b: Rect }[] {
  return items.filter((i) => ids.includes(i.id)).map((it) => ({ it, b: itemBounds(it, defOf(it)) }))
}

/** How far each selected part must move so its edge or centre lines up with the group. Needs two or more parts. */
export function alignMoves(items: Item[], ids: string[], mode: AlignMode): Moves {
  const list = boxes(items, ids)
  const moves: Moves = new Map()
  if (list.length < 2) return moves
  const left = Math.min(...list.map(({ b }) => b.x))
  const right = Math.max(...list.map(({ b }) => b.x + b.w))
  const top = Math.min(...list.map(({ b }) => b.y))
  const bottom = Math.max(...list.map(({ b }) => b.y + b.h))
  for (const { it, b } of list) {
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = left - b.x
    else if (mode === 'right') dx = right - (b.x + b.w)
    else if (mode === 'center') dx = (left + right) / 2 - (b.x + b.w / 2)
    else if (mode === 'top') dy = top - b.y
    else if (mode === 'bottom') dy = bottom - (b.y + b.h)
    else dy = (top + bottom) / 2 - (b.y + b.h / 2)
    moves.set(it.id, { dx: r5(dx), dy: r5(dy) })
  }
  return moves
}

/**
 * Space parts evenly along an axis so the gaps between their edges are equal. The two outermost parts
 * stay where they are. Needs three or more parts.
 */
export function distributeMoves(items: Item[], ids: string[], axis: Axis): Moves {
  const list = boxes(items, ids)
  const moves: Moves = new Map()
  if (list.length < 3) return moves
  const start = (b: Rect) => (axis === 'h' ? b.x : b.y)
  const size = (b: Rect) => (axis === 'h' ? b.w : b.h)
  list.sort((a, c) => start(a.b) - start(c.b))
  const first = list[0]
  const last = list[list.length - 1]
  const span = start(last.b) + size(last.b) - start(first.b)
  const gap = (span - list.reduce((sum, { b }) => sum + size(b), 0)) / (list.length - 1)
  let cursor = start(first.b) + size(first.b) + gap
  for (const { it, b } of list.slice(1, -1)) {
    const target = r5(cursor)
    const delta = target - start(b)
    moves.set(it.id, axis === 'h' ? { dx: delta, dy: 0 } : { dx: 0, dy: delta })
    cursor += size(b) + gap
  }
  return moves
}