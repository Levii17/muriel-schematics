import type { Prim, PrimStyle, SymbolDef } from './types'

export const STROKE = 2
export const DASH = '6 4'

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Attribute string for a primitive's optional style overrides (text sets its own fill). */
function styleAttrs(st: PrimStyle | undefined, isText: boolean): string {
  if (!st) return ''
  let out = ''
  if (st.w !== undefined) out += ` stroke-width="${num(st.w)}"`
  if (st.stroke) out += ` stroke="${st.stroke}"`
  if (st.fill && !isText) out += ` fill="${st.fill}"`
  if (st.opacity !== undefined) out += ` opacity="${num(st.opacity)}"`
  if (st.ls !== undefined) out += ` letter-spacing="${num(st.ls)}"`
  return out
}

/** Serialise one primitive. Stroke/fill colour is inherited from the surrounding <g>. */
export function primToSvg(p: Prim): string {
  const st = styleAttrs(p.style, p.k === 'text')
  switch (p.k) {
    case 'line':
      return `<line x1="${num(p.x1)}" y1="${num(p.y1)}" x2="${num(p.x2)}" y2="${num(p.y2)}"${p.dash ? ` stroke-dasharray="${DASH}"` : ''}${st}/>`
    case 'rect':
      return `<rect x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}"${st}/>`
    case 'circle':
      return `<circle cx="${num(p.cx)}" cy="${num(p.cy)}" r="${num(p.r)}"${p.solid ? ' fill="currentColor"' : ''}${st}/>`
    case 'path':
      return `<path d="${p.d}"${p.solid ? ' fill="currentColor"' : ''}${st}/>`
    case 'poly':
      return `<polyline points="${p.pts.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')}"${st}/>`
    case 'text':
      return `<text x="${num(p.x)}" y="${num(p.y)}" font-size="${p.size}" font-weight="${p.weight}" text-anchor="${p.anchor}" fill="${p.style?.fill ?? 'currentColor'}" stroke="none"${st}>${escapeXml(p.text)}</text>`
  }
}

export const bodyToSvg = (prims: Prim[]) => prims.map(primToSvg).join('')

const FONT = "font-family=\"Helvetica, Arial, sans-serif\""

/** Wrap serialised content in a group carrying the shared stroke style. */
export const styledGroup = (inner: string, ink: string, extra = '') =>
  `<g ${FONT} fill="none" stroke="${ink}" color="${ink}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"${extra}>${inner}</g>`

export interface ExportOptions {
  ink?: string
  margin?: number
  background?: string | null
}

/** A standalone, dependency-free SVG file for one symbol. */
export function symbolToSvgString(def: SymbolDef, { ink = '#111111', margin = 12, background = null }: ExportOptions = {}) {
  const w = def.width + margin * 2
  const h = def.height + margin * 2
  const bg = background ? `<rect x="${-margin}" y="${-margin}" width="${w}" height="${h}" fill="${background}"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${-margin} ${-margin} ${w} ${h}" role="img" aria-label="${escapeXml(def.name)}">` +
    `<title>${escapeXml(def.name)}</title>${bg}${styledGroup(bodyToSvg(def.body), ink)}</svg>`
  )
}
