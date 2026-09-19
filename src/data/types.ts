/** Symbols are plain data: a list of drawing primitives plus connection terminals. */

export type Role = 'in' | 'out' | 'io'
export type Dir = 'up' | 'down' | 'left' | 'right'

/** Optional per-primitive overrides. Without them everything inherits the shared ink and 2 px stroke. */
export interface PrimStyle {
  /** Stroke width override. */
  w?: number
  stroke?: string
  fill?: string
  opacity?: number
  /** Letter spacing for text. */
  ls?: number
}

export type Prim = (
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; dash?: boolean }
  | { k: 'rect'; x: number; y: number; w: number; h: number }
  | { k: 'circle'; cx: number; cy: number; r: number; solid?: boolean }
  | { k: 'path'; d: string; solid?: boolean }
  | { k: 'poly'; pts: [number, number][] }
  | {
      k: 'text'
      x: number
      y: number
      text: string
      size: number
      weight: 400 | 600 | 700
      anchor: 'start' | 'middle' | 'end'
    }
) & { style?: PrimStyle }

export interface Terminal {
  /** Unique within the symbol. */
  id: string
  /** Short text shown next to the terminal, e.g. "L1" or "13". */
  label: string
  /** Human description, e.g. "Line side, phase L1". */
  name: string
  /** Position in symbol space (always a multiple of the 20 px grid). */
  x: number
  y: number
  role: Role
  /** Direction pointing away from the body; used for wire routing. */
  dir: Dir
}

export type CategoryId =
  | 'switching'
  | 'control'
  | 'coils'
  | 'contacts'
  | 'overload'
  | 'motors'
  | 'power'
  | 'measure'
  | 'passive'

export interface Category {
  id: CategoryId
  name: string
  blurb: string
}

export interface SymbolDef {
  id: string
  name: string
  category: CategoryId
  /** Traditional reference-designation letter(s), used to auto-label parts in the editor. */
  reference: string
  summary: string
  usage: string
  tags: string[]
  /** Bounding box in px. Always multiples of 20 so rotation pivots stay on the grid. */
  width: number
  height: number
  terminals: Terminal[]
  body: Prim[]
}
