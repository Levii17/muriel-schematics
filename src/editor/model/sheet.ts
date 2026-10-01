import type { Prim, PrimStyle } from '@/symbols/types'

/**
 * Drawing sheet: paper, border with zone references, and an ISO 7200-style title block.
 * Everything is expressed as ordinary drawing primitives so the canvas and the SVG/PNG export
 * render it with exactly the same code as the symbols. Scale is 4 px per mm, so the 20 px
 * snap grid is 5 mm and the 40 px border is the usual 10 mm.
 */

export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1'

export interface TitleFields {
  organization: string
  project: string
  title: string
  details: string
  drawnBy: string
  drawingNo: string
  date: string
  scale: string
  revision: string
  sheet: string
}

export interface SheetConfig {
  enabled: boolean
  size: PaperSize
  fields: TitleFields
}

/** Landscape paper in px, with the number of zone columns / rows along each edge. */
export const PAPER: Record<PaperSize, { w: number; h: number; cols: number; rows: number }> = {
  A4: { w: 1188, h: 840, cols: 6, rows: 4 },
  A3: { w: 1680, h: 1188, cols: 8, rows: 6 },
  A2: { w: 2376, h: 1680, cols: 12, rows: 8 },
  A1: { w: 3364, h: 2376, cols: 16, rows: 12 },
}

/** Smallest to largest, for "pick a bigger sheet" logic. */
export const PAPER_ORDER: PaperSize[] = ['A4', 'A3', 'A2', 'A1']

export const MARGIN = 40
export const BLOCK_W = 720
export const BLOCK_H = 144
const LOGO_W = 152
const ROW_H = 48

export interface FieldDef {
  key: keyof TitleFields
  label: string
  placeholder: string
  maxLength: number
}

/** Order here is the order of the form in the inspector. */
export const FIELD_DEFS: FieldDef[] = [
  { key: 'organization', label: 'Organisation', placeholder: 'Company or school', maxLength: 40 },
  { key: 'project', label: 'Project', placeholder: 'Project name', maxLength: 40 },
  { key: 'title', label: 'Drawing title', placeholder: 'What this sheet shows', maxLength: 40 },
  { key: 'details', label: 'Details', placeholder: 'Voltage, notes…', maxLength: 48 },
  { key: 'drawnBy', label: 'Drawn by', placeholder: 'Name', maxLength: 20 },
  { key: 'drawingNo', label: 'Drawing no.', placeholder: 'e.g. MUR-001', maxLength: 20 },
  { key: 'date', label: 'Date', placeholder: 'YYYY-MM-DD', maxLength: 12 },
  { key: 'scale', label: 'Scale', placeholder: 'NTS', maxLength: 8 },
  { key: 'revision', label: 'Rev.', placeholder: 'A', maxLength: 4 },
  { key: 'sheet', label: 'Sheet', placeholder: '1 / 1', maxLength: 8 },
]

export const todayIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const defaultSheet = (): SheetConfig => ({
  enabled: false,
  size: 'A3',
  fields: {
    organization: '',
    project: '',
    title: '',
    details: '',
    drawnBy: '',
    drawingNo: '',
    date: todayIso(),
    scale: 'NTS',
    revision: '',
    sheet: '1 / 1',
  },
})

/** Defensive parse for data coming from localStorage. Unknown or malformed values fall back to defaults. */
export function mergeSheet(raw: unknown): SheetConfig {
  const base = defaultSheet()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<SheetConfig>
  const fields = { ...base.fields }
  if (r.fields && typeof r.fields === 'object') {
    for (const def of FIELD_DEFS) {
      const v = (r.fields as unknown as Record<string, unknown>)[def.key]
      if (typeof v === 'string') fields[def.key] = v.slice(0, def.maxLength)
    }
  }
  return {
    enabled: r.enabled === true,
    size: r.size && r.size in PAPER ? r.size : base.size,
    fields,
  }
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const paperBox = (size: PaperSize): Box => ({ x: 0, y: 0, w: PAPER[size].w, h: PAPER[size].h })

export const frameBox = (size: PaperSize): Box => {
  const { w, h } = PAPER[size]
  return { x: MARGIN, y: MARGIN, w: w - MARGIN * 2, h: h - MARGIN * 2 }
}

export const blockBox = (size: PaperSize): Box => {
  const f = frameBox(size)
  return { x: f.x + f.w - BLOCK_W, y: f.y + f.h - BLOCK_H, w: BLOCK_W, h: BLOCK_H }
}

/* ------------------------------------------------------------------ */

const line = (x1: number, y1: number, x2: number, y2: number, style?: PrimStyle): Prim => ({ k: 'line', x1, y1, x2, y2, style })
const rect = (x: number, y: number, w: number, h: number, style?: PrimStyle): Prim => ({ k: 'rect', x, y, w, h, style })
const text = (
  x: number, y: number, t: string, size: number, weight: 400 | 600 | 700,
  anchor: 'start' | 'middle' | 'end' = 'start', style?: PrimStyle,
): Prim => ({ k: 'text', x, y, text: t, size, weight, anchor, style })

/** Cut a string so it fits a cell, using an average glyph width estimate. */
export function fit(value: string, width: number, size: number): string {
  const max = Math.max(1, Math.floor(width / (size * 0.58)))
  return value.length <= max ? value : `${value.slice(0, Math.max(1, max - 1))}…`
}

interface Cell {
  key: keyof TitleFields
  label: string
  w: number
  big?: boolean
  small?: boolean
}

/** Widths of each row sum to the width of the field area (BLOCK_W - LOGO_W = 568). */
const ROWS: Cell[][] = [
  [
    { key: 'organization', label: 'Organisation', w: 284 },
    { key: 'project', label: 'Project', w: 284 },
  ],
  [
    { key: 'title', label: 'Drawing title', w: 284, big: true },
    { key: 'details', label: 'Details', w: 284 },
  ],
  [
    { key: 'drawnBy', label: 'Drawn by', w: 120, small: true },
    { key: 'drawingNo', label: 'Drawing no.', w: 128, small: true },
    { key: 'date', label: 'Date', w: 104, small: true },
    { key: 'scale', label: 'Scale', w: 72, small: true },
    { key: 'revision', label: 'Rev.', w: 48, small: true },
    { key: 'sheet', label: 'Sheet', w: 96, small: true },
  ],
]

const BRAND_BLUE = '#1e669e'

/** Vector recreation of the Muriel logo tile, so it stays sharp at any zoom and in exports. */
function logoTile(b: Box): Prim[] {
  const tx = b.x + 12
  const ty = b.y + 12
  const tw = LOGO_W - 24
  const th = b.h - 24
  const cx = tx + tw / 2
  const cy = ty + th / 2
  const soft = { stroke: '#a9cbe8', w: 1.5 }
  return [
    rect(tx, ty, tw, th, { fill: BRAND_BLUE, stroke: 'none' }),
    text(cx, cy + 9, 'MURIEL', 22, 400, 'middle', { fill: '#e4f0fa', ls: 3 }),
    // small resistor zig-zag top-left, plus mark top-right, plus on a rail below: the tile's motifs
    { k: 'poly', pts: [[cx - 48, cy - 26], [cx - 36, cy - 26], [cx - 33, cy - 31], [cx - 28, cy - 21], [cx - 23, cy - 31], [cx - 18, cy - 21], [cx - 15, cy - 26], [cx - 4, cy - 26]], style: soft },
    line(cx + 36, cy - 26, cx + 46, cy - 26, soft),
    line(cx + 41, cy - 31, cx + 41, cy - 21, soft),
    line(cx - 14, cy + 34, cx + 14, cy + 34, soft),
    line(cx, cy + 29, cx, cy + 39, soft),
  ]
}

/** All sheet artwork, in sheet coordinates (paper top-left is 0,0). */
export function sheetPrims(sheet: SheetConfig): Prim[] {
  const { w: W, h: H, cols, rows } = PAPER[sheet.size]
  const f = frameBox(sheet.size)
  const b = blockBox(sheet.size)
  const out: Prim[] = []

  // Zone references: ticks and labels in the margin, numbers along the top/bottom, letters down the sides.
  const thin = { w: 1 }
  const label = { opacity: 0.8 }
  for (let i = 0; i < cols; i++) {
    const x0 = f.x + (f.w * i) / cols
    const xc = x0 + f.w / cols / 2
    if (i > 0) out.push(line(x0, 0, x0, MARGIN, thin), line(x0, H - MARGIN, x0, H, thin))
    out.push(text(xc, 26, String(i + 1), 12, 600, 'middle', label), text(xc, H - 14, String(i + 1), 12, 600, 'middle', label))
  }
  for (let j = 0; j < rows; j++) {
    const y0 = f.y + (f.h * j) / rows
    const yc = y0 + f.h / rows / 2 + 4
    const letter = String.fromCharCode(65 + j)
    if (j > 0) out.push(line(0, y0, MARGIN, y0, thin), line(W - MARGIN, y0, W, y0, thin))
    out.push(text(20, yc, letter, 12, 600, 'middle', label), text(W - 20, yc, letter, 12, 600, 'middle', label))
  }
  out.push(rect(0, 0, W, H, { w: 1 }))
  out.push(rect(f.x, f.y, f.w, f.h, { w: 3 }))

  // Title block: caption top-left of each cell, value below it.
  const ax = b.x + LOGO_W
  out.push(...logoTile(b))
  out.push(line(ax, b.y, ax, b.y + b.h, { w: 1.5 }))
  ROWS.forEach((row, r) => {
    const y = b.y + r * ROW_H
    if (r > 0) out.push(line(ax, y, b.x + b.w, y, thin))
    let x = ax
    row.forEach((cell, c) => {
      if (c > 0) out.push(line(x, y, x, y + ROW_H, thin))
      const size = cell.big ? 17 : cell.small ? 14 : 15
      const value = fit(sheet.fields[cell.key], cell.w - 16, size)
      out.push(text(x + 8, y + 14, cell.label.toUpperCase(), 9, 600, 'start', { opacity: 0.65, ls: 0.6 }))
      if (value) out.push(text(x + 8, y + 37, value, size, cell.big ? 700 : 600))
      x += cell.w
    })
  })
  out.push(rect(b.x, b.y, b.w, b.h, { w: 2 }))
  return out
}