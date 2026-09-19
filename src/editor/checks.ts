import type { Doc, Rect } from './model'
import { defOf, itemBounds, scaleDrawing, snap } from './model'
import { labelPos } from './export'
import { BLOCK_H, BLOCK_W, PAPER_ORDER, blockBox, frameBox } from './sheet'
import type { PaperSize } from './sheet'

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/** Ids of parts that poke outside the drawing frame or overlap the title block (sheet on only). */
export function conflictingItemIds(doc: Doc): string[] {
  if (!doc.sheet.enabled) return []
  const f = frameBox(doc.sheet.size)
  const t = blockBox(doc.sheet.size)
  return doc.items
    .filter((it) => {
      const b = itemBounds(it, defOf(it))
      const outside = b.x < f.x || b.y < f.y || b.x + b.w > f.x + f.w || b.y + b.h > f.y + f.h
      return outside || overlaps(b, t)
    })
    .map((it) => it.id)
}

/** True when the sheet is on and at least one part is misplaced. Parts are never moved automatically. */
export const sheetConflicts = (doc: Doc) => conflictingItemIds(doc).length > 0

/** Bounding box of every part plus its label, or null for an empty drawing. */
export function drawingBox(doc: Doc): Rect | null {
  if (!doc.items.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const it of doc.items) {
    const b = itemBounds(it, defOf(it))
    const lp = labelPos(it)
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w, it.label ? lp.x + it.label.length * 9 : 0)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

const PAD = 20

export type FitPlan =
  | { ok: true; size: PaperSize; dx: number; dy: number }
  | { ok: false; needW: number; needH: number }

/**
 * Work out how to get the drawing onto a sheet. Tries the current paper first, then larger ones.
 * On each sheet it looks for a spot clear of the title block (the band above it, or the strip to
 * its left) and centres the drawing there on the 20 px grid. Nothing is resized.
 */
export function planFit(doc: Doc): FitPlan {
  const box = drawingBox(doc)
  if (!box) return { ok: true, size: doc.sheet.size, dx: 0, dy: 0 }
  const start = PAPER_ORDER.indexOf(doc.sheet.size)
  for (const size of PAPER_ORDER.slice(start)) {
    const f = frameBox(size)
    const regions: Rect[] = [
      { x: f.x + PAD, y: f.y + PAD, w: f.w - PAD * 2, h: f.h - BLOCK_H - PAD * 2 }, // above the title block
      { x: f.x + PAD, y: f.y + PAD, w: f.w - BLOCK_W - PAD * 2, h: f.h - PAD * 2 }, // left of it
    ]
    for (const r of regions) {
      if (box.w > r.w || box.h > r.h) continue
      const dx = snap(r.x + (r.w - box.w) / 2 - box.x)
      const dy = snap(r.y + (r.h - box.h) / 2 - box.y)
      const placed = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }
      const inside = placed.x >= r.x && placed.y >= r.y && placed.x + placed.w <= r.x + r.w && placed.y + placed.h <= r.y + r.h
      if (inside) return { ok: true, size, dx, dy }
    }
  }
  return { ok: false, needW: Math.ceil(box.w), needH: Math.ceil(box.h) }
}

/** Factors offered for shrinking, gentlest first. */
export const SHRINK_FACTORS = [0.75, 0.5]

/**
 * When the drawing is too big for any sheet, find the gentlest whole-drawing shrink after which it
 * can be placed. Returns the factor and the placement that follows it, or null if none works.
 */
export function planShrink(doc: Doc): { factor: number; plan: Extract<FitPlan, { ok: true }> } | null {
  for (const factor of SHRINK_FACTORS) {
    const scaled = scaleDrawing(doc, factor)
    if (!scaled) continue
    const plan = planFit(scaled)
    if (plan.ok) return { factor, plan }
  }
  return null
}