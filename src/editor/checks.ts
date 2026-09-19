import type { Doc } from './model'
import { defOf, itemBounds } from './model'
import { blockBox, frameBox } from './sheet'

/**
 * True when the sheet is on and at least one part pokes outside the drawing frame or
 * overlaps the title block. Parts are never moved automatically, so this is only a warning.
 */
export function sheetConflicts(doc: Doc): boolean {
  if (!doc.sheet.enabled) return false
  const f = frameBox(doc.sheet.size)
  const t = blockBox(doc.sheet.size)
  return doc.items.some((it) => {
    const b = itemBounds(it, defOf(it))
    const outside = b.x < f.x || b.y < f.y || b.x + b.w > f.x + f.w || b.y + b.h > f.y + f.h
    const overlapsBlock = b.x < t.x + t.w && b.x + b.w > t.x && b.y < t.y + t.h && b.y + b.h > t.y
    return outside || overlapsBlock
  })
}
