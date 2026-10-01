import type { Pt } from '@/shared/geometry'
import { snap } from '@/shared/geometry'

import { mirrorPrim, scaleBody } from './scale'
import type { Prim, SymbolDef } from './types'

export const pivotOf = (def: SymbolDef): Pt => ({ x: snap(def.width / 2), y: snap(def.height / 2) })

const mirrorCache = new Map<string, Prim[]>()

/**
 * A symbol's drawing at a size, optionally reflected about its pivot. The reflection is baked into the
 * geometry (rather than applied as a negative scale) so text and arcs stay correct.
 */
export function symbolBody(def: SymbolDef, scale: number, mirror: boolean): Prim[] {
  const base = scaleBody(def, scale)
  if (!mirror) return base
  const key = `${def.id}@${scale}`
  let out = mirrorCache.get(key)
  if (!out) {
    const axis2 = 2 * pivotOf(def).x * scale
    out = base.map((p) => mirrorPrim(p, axis2))
    mirrorCache.set(key, out)
  }
  return out
}
