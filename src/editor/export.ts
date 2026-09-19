import { getSymbol } from '../data'
import { bodyToSvg, escapeXml, styledGroup } from '../lib/svg'
import type { Doc, Pt } from './model'
import { PAPER, sheetPrims } from './sheet'
import { defOf, itemBounds, pivotOf, pointsToPath, terminalWorld, routeWire } from './model'

export interface WireGeometry {
  id: string
  points: Pt[]
}

/** Route every wire from the current item positions. Wires with a missing endpoint are skipped. */
export function wireGeometries(doc: Doc): WireGeometry[] {
  const items = new Map(doc.items.map((i) => [i.id, i]))
  const out: WireGeometry[] = []
  for (const w of doc.wires) {
    const ia = items.get(w.a.item)
    const ib = items.get(w.b.item)
    if (!ia || !ib) continue
    const a = terminalWorld(ia, defOf(ia), w.a.term)
    const b = terminalWorld(ib, defOf(ib), w.b.term)
    if (!a || !b) continue
    out.push({ id: w.id, points: routeWire(a, [a.dx, a.dy], b, [b.dx, b.dy]) })
  }
  return out
}

/** Terminals that have two or more wires attached get a junction dot. */
export function junctions(doc: Doc): Pt[] {
  const counts = new Map<string, number>()
  for (const w of doc.wires) {
    for (const e of [w.a, w.b]) counts.set(`${e.item}|${e.term}`, (counts.get(`${e.item}|${e.term}`) ?? 0) + 1)
  }
  const items = new Map(doc.items.map((i) => [i.id, i]))
  const pts: Pt[] = []
  for (const [key, n] of counts) {
    if (n < 2) continue
    const [itemId, termId] = key.split('|')
    const item = items.get(itemId)
    const p = item && terminalWorld(item, defOf(item), termId)
    if (p) pts.push({ x: p.x, y: p.y })
  }
  return pts
}

/** Where an item's label sits: just right of its bounding box. */
export function labelPos(item: Doc['items'][number]): Pt {
  const b = itemBounds(item, defOf(item))
  return { x: b.x + b.w + 10, y: b.y + 16 }
}

export function diagramToSvg(doc: Doc, opts: { ink?: string; background?: string | null } = {}) {
  const { ink = '#111111', background = null } = opts
  const sheetOn = doc.sheet.enabled

  let x: number, y: number, w: number, h: number
  if (sheetOn) {
    // The whole sheet is exported so the frame, zones and title block stay in the picture.
    ;({ x, y, w, h } = { x: 0, y: 0, ...PAPER[doc.sheet.size] })
  } else {
    const margin = 40
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const item of doc.items) {
      const b = itemBounds(item, defOf(item))
      const lp = labelPos(item)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w, lp.x + item.label.length * 8)
      maxY = Math.max(maxY, b.y + b.h)
    }
    if (!isFinite(minX)) {
      minX = minY = 0
      maxX = maxY = 200
    }
    x = minX - margin
    y = minY - margin
    w = maxX - minX + margin * 2
    h = maxY - minY + margin * 2
  }

  const wires = wireGeometries(doc)
    .map((g) => `<path d="${pointsToPath(g.points)}"/>`)
    .join('')
  const dots = junctions(doc)
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${ink}" stroke="none"/>`)
    .join('')
  const items = doc.items
    .map((item) => {
      const def = getSymbol(item.symbolId)
      if (!def) return ''
      const pv = pivotOf(def)
      return `<g transform="translate(${item.x} ${item.y}) rotate(${item.rot}) translate(${-pv.x} ${-pv.y})">${bodyToSvg(def.body)}</g>`
    })
    .join('')
  const labels = doc.items
    .filter((i) => i.label)
    .map((i) => {
      const p = labelPos(i)
      return `<text x="${p.x}" y="${p.y}" font-size="14" font-weight="600" fill="${ink}" stroke="none">${escapeXml(i.label)}</text>`
    })
    .join('')
  const paper = sheetOn ? `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="none"/>` : ''
  const sheet = sheetOn ? bodyToSvg(sheetPrims(doc.sheet)) : ''
  const bg = !sheetOn && background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : ''
  // A sheet is sized in millimetres (4 px per mm) so it opens at true paper size in other tools.
  const size = sheetOn ? `width="${w / 4}mm" height="${h / 4}mm"` : `width="${w}" height="${h}"`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="${x} ${y} ${w} ${h}">` +
    bg +
    paper +
    styledGroup(sheet + wires + items + dots + labels, ink) +
    `</svg>`
  return { svg, width: w, height: h }
}
