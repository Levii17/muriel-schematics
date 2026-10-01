import type { Pt } from '@/shared/geometry'

import type { SheetConfig } from './sheet'

export type Rot = 0 | 90 | 180 | 270

export interface Item {
  id: string
  symbolId: string
  /** Canvas position of the symbol's pivot (its box centre, snapped to the grid). */
  x: number
  y: number
  rot: Rot
  label: string
  /** Size relative to the library symbol (see SCALES). Absent means 1. */
  scale?: number
  /** Reflected left-to-right about the pivot, before rotation. Absent means not reflected. */
  mirror?: boolean
  /** Electrical rating, shown under the label, e.g. "32 A, 10 kA". */
  rating?: string
  /** Short description, shown under the rating, e.g. "Main breaker". */
  description?: string
  /** Manufacturer part number. Not drawn; kept for a future bill of materials. */
  partNo?: string
  /** How far the label block has been dragged from its default spot, in canvas px. */
  labelOffset?: { x: number; y: number }
}

/** Free text on the drawing: notes, titles, annotations. Several lines are separated by "\n". */
export interface TextNote {
  id: string
  /** Where the first line's baseline starts (or is centred / ends, per `align`). */
  x: number
  y: number
  text: string
  size: number
  bold?: boolean
  /** Which point of each line sits at x. Absent means the start (left for horizontal text). */
  align?: 'start' | 'middle' | 'end'
  rot?: Rot
}
export interface Endpoint {
  item: string
  term: string
}
/** How a wire is drawn. Absent fields mean the default: solid, normal weight. */
export interface WireStyle {
  dash?: 'dashed' | 'dotted' | 'dashdot'
  /** 1 = thin, 3 = thick; absent = 2. */
  width?: 1 | 3
}

/** Purely graphic geometry: enclosures, linkages, outlines. Shapes never connect to anything. */
export interface LineShape {
  id: string
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  style?: WireStyle
  arrow?: 'end' | 'both'
}
export interface RectShape {
  id: string
  kind: 'rect'
  x: number
  y: number
  w: number
  h: number
  style?: WireStyle
  /** Lightly tinted inside. Unfilled shapes can only be picked by their outline. */
  fill?: boolean
  radius?: number
}
export interface EllipseShape {
  id: string
  kind: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  style?: WireStyle
  fill?: boolean
}
export type Shape = LineShape | RectShape | EllipseShape

export interface Wire {
  id: string
  a: Endpoint
  b: Endpoint
  /**
   * Waypoints the wire passes through, in order from `a` to `b`. Absent means the wire routes itself.
   * The editor supplies the right-angle turns between waypoints.
   */
  via?: Pt[]
  style?: WireStyle
}
export interface Doc {
  items: Item[]
  wires: Wire[]
  notes: TextNote[]
  shapes: Shape[]
  /** Paper, border and title block. Drawn under the circuit when `sheet.enabled`. */
  sheet: SheetConfig
}
