import type { Pt, Rect, Shape, WireStyle } from './model'

/* ------------------------------------------------------------------ */
/* Basic geometry                                                      */
/* ------------------------------------------------------------------ */

export const MIN_SIZE = 10
const snap10 = (v: number) => Math.round(v / 10) * 10 + 0
const clean = (v: number) => Math.round(v * 1e6) / 1e6 + 0

export function shapeBounds(s: Shape): Rect {
  switch (s.kind) {
    case 'line':
      return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) }
    case 'rect':
      return { x: s.x, y: s.y, w: s.w, h: s.h }
    case 'ellipse':
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 }
  }
}

export const shapeCentre = (s: Shape): Pt => {
  const b = shapeBounds(s)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

export function moveShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.kind) {
    case 'line':
      return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
    case 'rect':
      return { ...s, x: s.x + dx, y: s.y + dy }
    case 'ellipse':
      return { ...s, cx: s.cx + dx, cy: s.cy + dy }
  }
}

/** Build a shape from the two corners a drag produced. Shift makes lines 45-degree steps and boxes square. */
export function shapeFromDrag(kind: Shape['kind'], id: string, a: Pt, b: Pt, constrain = false): Shape {
  if (kind === 'line') {
    const e = constrain ? constrainAngle(a, b) : b
    return { id, kind, x1: a.x, y1: a.y, x2: e.x, y2: e.y }
  }
  let w = Math.abs(b.x - a.x)
  let h = Math.abs(b.y - a.y)
  if (constrain) w = h = Math.max(w, h)
  const x = b.x < a.x ? a.x - w : a.x
  const y = b.y < a.y ? a.y - h : a.y
  return kind === 'rect' ? { id, kind, x, y, w, h } : { id, kind, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 }
}

/** Snap the end of a line to the nearest of horizontal, vertical or 45 degrees from its start. */
export function constrainAngle(from: Pt, to: Pt): Pt {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax > ay * 2) return { x: to.x, y: from.y }
  if (ay > ax * 2) return { x: from.x, y: to.y }
  const d = snap10((ax + ay) / 2)
  return { x: from.x + Math.sign(dx) * d, y: from.y + Math.sign(dy) * d }
}

/** A drag is only worth keeping if it made something you can see and grab. */
export function isUsable(s: Shape): boolean {
  switch (s.kind) {
    case 'line':
      return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= MIN_SIZE
    case 'rect':
      return s.w >= MIN_SIZE && s.h >= MIN_SIZE
    case 'ellipse':
      return s.rx * 2 >= MIN_SIZE && s.ry * 2 >= MIN_SIZE
  }
}

/* ------------------------------------------------------------------ */
/* Handles and resizing                                                */
/* ------------------------------------------------------------------ */

export type HandleId = 'a' | 'b' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** Where the resize handles of a shape are. A line has one at each end; boxes and ellipses have eight. */
export function handlesOf(s: Shape): { id: HandleId; at: Pt }[] {
  if (s.kind === 'line') {
    return [
      { id: 'a', at: { x: s.x1, y: s.y1 } },
      { id: 'b', at: { x: s.x2, y: s.y2 } },
    ]
  }
  const b = shapeBounds(s)
  const mx = b.x + b.w / 2
  const my = b.y + b.h / 2
  return [
    { id: 'nw', at: { x: b.x, y: b.y } },
    { id: 'n', at: { x: mx, y: b.y } },
    { id: 'ne', at: { x: b.x + b.w, y: b.y } },
    { id: 'e', at: { x: b.x + b.w, y: my } },
    { id: 'se', at: { x: b.x + b.w, y: b.y + b.h } },
    { id: 's', at: { x: mx, y: b.y + b.h } },
    { id: 'sw', at: { x: b.x, y: b.y + b.h } },
    { id: 'w', at: { x: b.x, y: my } },
  ]
}

const rectShape = (s: Shape, r: Rect): Shape =>
  s.kind === 'rect'
    ? { ...s, x: r.x, y: r.y, w: r.w, h: r.h }
    : s.kind === 'ellipse'
      ? { ...s, cx: r.x + r.w / 2, cy: r.y + r.h / 2, rx: r.w / 2, ry: r.h / 2 }
      : s

/**
 * Drag one handle to `p` (already snapped by the caller). The opposite edge or end stays where it is, and a
 * box never shrinks below the minimum size. Shift keeps a line at 0/45/90 degrees.
 */
export function resizeShape(s: Shape, handle: HandleId, p: Pt, constrain = false): Shape {
  if (s.kind === 'line') {
    if (handle === 'a') {
      const q = constrain ? constrainAngle({ x: s.x2, y: s.y2 }, p) : p
      return { ...s, x1: q.x, y1: q.y }
    }
    const q = constrain ? constrainAngle({ x: s.x1, y: s.y1 }, p) : p
    return { ...s, x2: q.x, y2: q.y }
  }
  const b = shapeBounds(s)
  let left = b.x
  let top = b.y
  let right = b.x + b.w
  let bottom = b.y + b.h
  if (handle.includes('w')) left = Math.min(p.x, right - MIN_SIZE)
  if (handle.includes('e')) right = Math.max(p.x, left + MIN_SIZE)
  if (handle.includes('n')) top = Math.min(p.y, bottom - MIN_SIZE)
  if (handle.includes('s')) bottom = Math.max(p.y, top + MIN_SIZE)
  return rectShape(s, { x: left, y: top, w: right - left, h: bottom - top })
}

/* ------------------------------------------------------------------ */
/* Transforms (used by group rotate / flip / scale)                    */
/* ------------------------------------------------------------------ */

/** Turn a quarter turn clockwise about c. */
export function turnShape(s: Shape, c: Pt): Shape {
  const at = (x: number, y: number): Pt => ({ x: clean(c.x - (y - c.y)), y: clean(c.y + (x - c.x)) })
  if (s.kind === 'line') {
    const a = at(s.x1, s.y1)
    const b = at(s.x2, s.y2)
    return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  const b = shapeBounds(s)
  const p = at(b.x, b.y)
  const q = at(b.x + b.w, b.y + b.h)
  return rectShape(s, { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y) })
}

/** Reflect left-right about x = cx. */
export function flipShapeH(s: Shape, cx: number): Shape {
  const m = (x: number) => clean(2 * cx - x)
  if (s.kind === 'line') return { ...s, x1: m(s.x1), x2: m(s.x2) }
  const b = shapeBounds(s)
  return rectShape(s, { x: m(b.x + b.w), y: b.y, w: b.w, h: b.h })
}

/** Reflect top-bottom about y = cy. */
export function flipShapeV(s: Shape, cy: number): Shape {
  const m = (y: number) => clean(2 * cy - y)
  if (s.kind === 'line') return { ...s, y1: m(s.y1), y2: m(s.y2) }
  const b = shapeBounds(s)
  return rectShape(s, { x: b.x, y: m(b.y + b.h), w: b.w, h: b.h })
}

/** Scale positions and sizes about (ax, ay). Line weight is not scaled, so weights stay uniform across a drawing. */
export function scaleShape(s: Shape, ax: number, ay: number, f: number): Shape {
  const px = (x: number) => clean(ax + (x - ax) * f)
  const py = (y: number) => clean(ay + (y - ay) * f)
  switch (s.kind) {
    case 'line':
      return { ...s, x1: px(s.x1), y1: py(s.y1), x2: px(s.x2), y2: py(s.y2) }
    case 'rect':
      return { ...s, x: px(s.x), y: py(s.y), w: clean(s.w * f), h: clean(s.h * f), ...(s.radius ? { radius: clean(s.radius * f) } : {}) }
    case 'ellipse':
      return { ...s, cx: px(s.cx), cy: py(s.cy), rx: clean(s.rx * f), ry: clean(s.ry * f) }
  }
}

/** Put a box-like shape's corner back on the 10 px grid (after turning it about its own centre). */
export function snapShape(s: Shape): Shape {
  if (s.kind === 'line') return s
  const b = shapeBounds(s)
  return rectShape(s, { x: snap10(b.x), y: snap10(b.y), w: b.w, h: b.h })
}

/* ------------------------------------------------------------------ */
/* Outlines, hit-testing and selection                                 */
/* ------------------------------------------------------------------ */

const ELLIPSE_SEGMENTS = 48

/** The shape's outline as a polyline (closed shapes repeat their first point). */
export function outlineOf(s: Shape): Pt[] {
  switch (s.kind) {
    case 'line':
      return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]
    case 'rect':
      return [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y }, { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h }, { x: s.x, y: s.y }]
    case 'ellipse':
      return Array.from({ length: ELLIPSE_SEGMENTS + 1 }, (_, i) => {
        const t = (i / ELLIPSE_SEGMENTS) * Math.PI * 2
        return { x: s.cx + Math.cos(t) * s.rx, y: s.cy + Math.sin(t) * s.ry }
      })
  }
}

/** Does the segment p-q touch the rectangle? (Liang-Barsky clipping.) */
export function segmentHitsRect(p: Pt, q: Pt, r: Rect): boolean {
  let t0 = 0
  let t1 = 1
  const dx = q.x - p.x
  const dy = q.y - p.y
  const edges: [number, number][] = [
    [-dx, p.x - r.x],
    [dx, r.x + r.w - p.x],
    [-dy, p.y - r.y],
    [dy, r.y + r.h - p.y],
  ]
  for (const [pk, qk] of edges) {
    if (pk === 0) {
      if (qk < 0) return false
    } else {
      const t = qk / pk
      if (pk < 0) {
        if (t > t1) return false
        t0 = Math.max(t0, t)
      } else {
        if (t < t0) return false
        t1 = Math.min(t1, t)
      }
    }
  }
  return true
}

const insideRect = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Is this point inside a filled box or ellipse? */
export function fillContains(s: Shape, p: Pt): boolean {
  if (s.kind === 'rect') return insideRect(p, { x: s.x, y: s.y, w: s.w, h: s.h })
  if (s.kind === 'ellipse') return ((p.x - s.cx) / s.rx) ** 2 + ((p.y - s.cy) / s.ry) ** 2 <= 1
  return false
}

/**
 * Box selection. A window needs the whole shape inside. A crossing needs the box to touch the outline, or for a
 * filled shape, to touch its inside, so drawing a box inside an unfilled enclosure does not pick the enclosure.
 */
export function shapeInBox(s: Shape, box: Rect, mode: 'window' | 'cross'): boolean {
  const b = shapeBounds(s)
  if (mode === 'window') return b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h
  const line = outlineOf(s)
  if (line.some((p, i) => i > 0 && segmentHitsRect(line[i - 1], p, box))) return true
  if ((s.kind === 'rect' || s.kind === 'ellipse') && s.fill) {
    // The box may sit wholly inside the fill, touching no edge.
    return fillContains(s, { x: box.x, y: box.y })
  }
  return false
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

export const ARROW_LENGTH = 12
export const ARROW_HALF_WIDTH = 4.5

/** The three corners of an arrowhead whose tip is at `tip`, pointing away from `from`. */
export function arrowHead(from: Pt, tip: Pt): Pt[] {
  const dx = tip.x - from.x
  const dy = tip.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const bx = tip.x - ux * ARROW_LENGTH
  const by = tip.y - uy * ARROW_LENGTH
  return [
    { x: tip.x, y: tip.y },
    { x: bx - uy * ARROW_HALF_WIDTH, y: by + ux * ARROW_HALF_WIDTH },
    { x: bx + uy * ARROW_HALF_WIDTH, y: by - ux * ARROW_HALF_WIDTH },
  ]
}

/** Arrowheads a line needs, as polygons. */
export function arrowsOf(s: Shape): Pt[][] {
  if (s.kind !== 'line' || !s.arrow) return []
  const a = { x: s.x1, y: s.y1 }
  const b = { x: s.x2, y: s.y2 }
  return s.arrow === 'both' ? [arrowHead(a, b), arrowHead(b, a)] : [arrowHead(a, b)]
}

/** Every stroke-related option of a shape's style with defaults applied. */
export const styleOf = (s: { style?: WireStyle }) => ({ dash: s.style?.dash, width: s.style?.width ?? 2 })