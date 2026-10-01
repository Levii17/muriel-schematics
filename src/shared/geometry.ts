/** Canvas grid and the plain geometry types shared by the symbol library and the editor. */
export const GRID = 20

// "+ 0" turns -0 into 0 so coordinates never print as "-0".
export const snap = (v: number) => Math.round(v / GRID) * GRID + 0

export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
