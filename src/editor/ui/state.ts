import type { Pt } from '@/shared/geometry'

/** Constants and small state shapes used by the editor's pointer handling. */
/** The drawing as saved by earlier versions: a single document. Still read once, to carry it over. */
export const STORAGE_KEY = 'es.doc.v1'
/** The drawing with all its sheets. */
export const PROJECT_KEY = 'es.project.v2'
/** Low enough that an A1 sheet fits on a phone screen. */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 3
export const SNAP_RADIUS = 18
/** Screen pixels a press must travel before it counts as a drag rather than a click. */
export const DRAG_THRESHOLD = 4
/** Same idea for a finger, which wobbles more than a mouse. */
export const TOUCH_SLOP = 10
export const LABEL_SNAP = 5

export type Tool = 'select' | 'pan' | 'text' | 'line' | 'rect' | 'ellipse'
export const SHAPE_TOOLS: Tool[] = ['line', 'rect', 'ellipse']
export interface View {
  x: number
  y: number
  k: number
}
/**
 * A change being dragged on the selected wire. `via` is the full waypoint list as it would be if released now.
 * "move" drags one waypoint; "shift" slides the segment `k` of the current route sideways.
 */
export type WireEdit = {
  id: string
  via: Pt[]
  sx: number
  sy: number
  moved: boolean
} & ({ mode: 'move'; index: number } | { mode: 'shift'; pts: Pt[]; k: number })
export interface Marquee {
  from: Pt
  to: Pt
  additive: boolean
  sx: number
  sy: number
  moved: boolean
}
