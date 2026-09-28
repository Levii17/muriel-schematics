import { getSymbol } from '../data'
import { bodyToSvg, escapeXml, styledGroup } from '../lib/svg'
import { LABEL_LINE_H, LABEL_STYLE, labelBox, labelLines, labelPos } from './labels'
import type { Doc, Shape, TextNote } from './model'
import { PAPER, sheetPrims } from './sheet'
import { arrowsOf, shapeBounds } from './shapes'
import { junctions, wireGeometries, wireStroke } from './wires'
import { NOTE_LINE, defOf, itemBounds, itemMirror, itemScale, noteBounds, noteLines, noteRot, pivotOf, pointsToPath, symbolBody } from './model'

export { junctions, wireGeometries } from './wires'
export type { WireGeometry } from './wires'

/** SVG for one part's label block: reference, then rating, then description. */
function labelSvg(item: Doc['items'][number], ink: string): string {
  const p = labelPos(item)
  return labelLines(item)
    .map((l, i) => {
      const style = LABEL_STYLE[l.kind]
      const weight = l.kind === 'ref' ? 600 : l.kind === 'rating' ? 500 : 400
      const opacity = l.kind === 'desc' ? ' opacity="0.7"' : ''
      return `<text x="${p.x}" y="${p.y + i * LABEL_LINE_H}" font-size="${style.size}" font-weight="${weight}" fill="${ink}" stroke="none"${opacity}>${escapeXml(l.text)}</text>`
    })
    .join('')
}

/** SVG for one graphic shape. Fill is a faint tint of the ink colour; stroke style follows the wire styles. */
export function shapeSvg(s: Shape, ink: string): string {
  const st = wireStroke(s.style)
  const extra = `${st.width !== 2 ? ` stroke-width="${st.width}"` : ''}${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}`
  const tint = (s.kind !== 'line' && s.fill ? ` fill="${ink}" fill-opacity="0.07"` : '')
  switch (s.kind) {
    case 'line': {
      const heads = arrowsOf(s)
        .map((h) => `<polygon points="${h.map((p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`).join(' ')}" fill="${ink}" stroke="none"/>`)
        .join('')
      return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"${extra}/>${heads}`
    }
    case 'rect':
      return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"${s.radius ? ` rx="${s.radius}"` : ''}${tint}${extra}/>`
    case 'ellipse':
      return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"${tint}${extra}/>`
  }
}

/** SVG for one free-text note. Empty lines get a no-break space so they keep their height. */
export function noteSvg(n: TextNote, ink: string): string {
  const spans = noteLines(n)
    .map((line, i) => `<tspan x="0" dy="${i === 0 ? 0 : Math.round(n.size * NOTE_LINE * 100) / 100}">${escapeXml(line) || '&#160;'}</tspan>`)
    .join('')
  const rot = noteRot(n)
  return (
    `<text transform="translate(${n.x} ${n.y})${rot ? ` rotate(${rot})` : ''}" font-size="${n.size}" font-weight="${n.bold ? 700 : 400}" ` +
    `text-anchor="${n.align ?? 'start'}" fill="${ink}" stroke="none">${spans}</text>`
  )
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
    const grow = (b: { x: number; y: number; w: number; h: number }) => {
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    for (const item of doc.items) {
      grow(itemBounds(item, defOf(item)))
      const lb = labelBox(item)
      if (lb) grow(lb)
    }
    for (const n of doc.notes) grow(noteBounds(n))
    for (const sh of doc.shapes) grow(shapeBounds(sh))
    if (!isFinite(minX)) {
      minX = minY = 0
      maxX = maxY = 200
    }
    x = minX - margin
    y = minY - margin
    w = maxX - minX + margin * 2
    h = maxY - minY + margin * 2
  }

  const wireStyles = new Map(doc.wires.map((w) => [w.id, w.style]))
  const wires = wireGeometries(doc)
    .map((g) => {
      const st = wireStroke(wireStyles.get(g.id))
      const extra = `${st.width !== 2 ? ` stroke-width="${st.width}"` : ''}${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}`
      return `<path d="${pointsToPath(g.points)}"${extra}/>`
    })
    .join('')
  const dots = junctions(doc)
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${ink}" stroke="none"/>`)
    .join('')
  const items = doc.items
    .map((item) => {
      const def = getSymbol(item.symbolId)
      if (!def) return ''
      const pv = pivotOf(def)
      const k = itemScale(item)
      return `<g transform="translate(${item.x} ${item.y}) rotate(${item.rot}) translate(${-pv.x * k} ${-pv.y * k})">${bodyToSvg(symbolBody(def, k, itemMirror(item)))}</g>`
    })
    .join('')
  const labels = doc.items.map((i) => labelSvg(i, ink)).join('')
  const notes = doc.notes.map((n) => noteSvg(n, ink)).join('')
  const shapes = doc.shapes.map((sh) => shapeSvg(sh, ink)).join('')
  const paper = sheetOn ? `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="none"/>` : ''
  const sheet = sheetOn ? bodyToSvg(sheetPrims(doc.sheet)) : ''
  const bg = !sheetOn && background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : ''
  // A sheet is sized in millimetres (4 px per mm) so it opens at true paper size in other tools.
  const size = sheetOn ? `width="${w / 4}mm" height="${h / 4}mm"` : `width="${w}" height="${h}"`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="${x} ${y} ${w} ${h}">` +
    bg +
    paper +
    styledGroup(sheet + shapes + wires + items + dots + labels + notes, ink) +
    `</svg>`
  return { svg, width: w, height: h }
}