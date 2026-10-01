import type { Pt } from '@/shared/geometry'
import { SCALES } from '@/symbols/scale'
import type { SymbolDef } from '@/symbols/types'

import { defOf, itemBounds, itemScale } from './geometry'
import { NOTE_SIZES, noteBounds } from './notes'
import { scaleShape, shapeBounds } from './shapes'
import { defaultSheet } from './sheet'
import type { Doc, Item } from './types'

export const emptyDoc = (): Doc => ({ items: [], wires: [], notes: [], shapes: [], sheet: defaultSheet() })

/** Next free reference like Q1, Q2, K1 for the given symbol; '' for symbols without a reference. */
export function nextLabel(items: Item[], def: SymbolDef): string {
  const prefix = def.reference
  if (!prefix) return ''
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const it of items) {
    const m = re.exec(it.label)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

export const uid = (() => {
  let n = 0
  return (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`
})()

/**
 * Scale the whole drawing about its top-left corner: positions and part sizes both multiply by
 * `factor`, so every terminal moves along a straight line from that corner and wires that were
 * aligned stay aligned. Returns null if any part would land on a size that is not a preset.
 */
export function scaleDrawing(doc: Doc, factor: number): Doc | null {
  if (!doc.items.length || factor === 1) return null
  const next: number[] = []
  for (const it of doc.items) {
    const target = SCALES.find((v) => Math.abs(v - itemScale(it) * factor) < 1e-9)
    if (target === undefined) return null
    next.push(target)
  }
  let ax = Infinity
  let ay = Infinity
  for (const it of doc.items) {
    const b = itemBounds(it, defOf(it))
    ax = Math.min(ax, b.x)
    ay = Math.min(ay, b.y)
  }
  for (const n of doc.notes) {
    const b = noteBounds(n)
    ax = Math.min(ax, b.x)
    ay = Math.min(ay, b.y)
  }
  for (const s of doc.shapes) {
    const b = shapeBounds(s)
    ax = Math.min(ax, b.x)
    ay = Math.min(ay, b.y)
  }
  const r = (v: number) => Math.round(v * 100) / 100
  // Text follows the drawing: its size moves to the nearest preset, so it never becomes unreadably small or huge.
  const nearestSize = (v: number) => NOTE_SIZES.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), NOTE_SIZES[0])
  const scaleVia = (v: Pt) => ({ x: r(ax + (v.x - ax) * factor), y: r(ay + (v.y - ay) * factor) })
  return {
    ...doc,
    wires: doc.wires.map((w) => (w.via ? { ...w, via: w.via.map(scaleVia) } : w)),
    items: doc.items.map((it, n) => ({
      ...it,
      scale: next[n] === 1 ? undefined : next[n],
      x: r(ax + (it.x - ax) * factor),
      y: r(ay + (it.y - ay) * factor),
      ...(it.labelOffset ? { labelOffset: { x: r(it.labelOffset.x * factor), y: r(it.labelOffset.y * factor) } } : {}),
    })),
    shapes: doc.shapes.map((s) => scaleShape(s, ax, ay, factor)),
    notes: doc.notes.map((n) => ({
      ...n,
      x: r(ax + (n.x - ax) * factor),
      y: r(ay + (n.y - ay) * factor),
      size: nearestSize(n.size * factor),
    })),
  }
}
