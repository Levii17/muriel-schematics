import type { Pt } from '@/shared/geometry'
import { GRID } from '@/shared/geometry'

import { defOf, terminalWorld } from './geometry'
import type { Item } from './types'

export interface AlignResult {
  delta: Pt
  /** World x / y of the terminal line the part snapped onto, for drawing a guide. */
  guideX?: number
  guideY?: number
}

/**
 * Magnetic alignment: nudge a proposed move so a moving terminal lines up with a fixed terminal, if one is
 * within `radius` on that axis. X and Y are handled separately, each taking the closest match. This is what
 * lets a part of a different size (with a different terminal spacing) line up exactly with parts it connects to.
 */
export function alignDelta(moving: Pt[], fixed: Pt[], delta: Pt, radius = GRID / 2): AlignResult {
  let bestX = radius + 1
  let bestY = radius + 1
  const out: AlignResult = { delta: { ...delta } }
  for (const m of moving) {
    for (const f of fixed) {
      const ex = f.x - (m.x + delta.x)
      const ey = f.y - (m.y + delta.y)
      if (Math.abs(ex) <= radius && Math.abs(ex) < bestX) {
        bestX = Math.abs(ex)
        out.delta.x = delta.x + ex
        out.guideX = f.x
      }
      if (Math.abs(ey) <= radius && Math.abs(ey) < bestY) {
        bestY = Math.abs(ey)
        out.delta.y = delta.y + ey
        out.guideY = f.y
      }
    }
  }
  return out
}

/** World positions of every terminal of the given items. */
export function terminalPoints(items: Item[]): Pt[] {
  return items.flatMap((it) => {
    const def = defOf(it)
    return def.terminals.map((t) => {
      const p = terminalWorld(it, def, t.id)!
      return { x: p.x, y: p.y }
    })
  })
}
