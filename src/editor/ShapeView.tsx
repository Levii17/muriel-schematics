import type { Shape } from './model'
import { arrowsOf } from './shapes'
import { wireStroke } from './wires'

/** How wide, in screen pixels, the invisible strip around an outline is, so a thin line is easy to pick at any zoom. */
export const HIT_SCREEN_PX = 14

/** The strip's width in canvas units for a given zoom, kept within sensible limits. */
export const hitWidth = (zoom: number) => Math.min(40, Math.max(6, HIT_SCREEN_PX / zoom))

/**
 * One graphic shape on the canvas. The visible outline is drawn in the ink colour (accent when selected).
 * Picking uses a wide transparent stroke, so unfilled boxes and ellipses can only be picked by their outline
 * and never block what is inside them.
 */
export function ShapeView({ shape, selected = false, preview = false, zoom = 1 }: { shape: Shape; selected?: boolean; preview?: boolean; zoom?: number }) {
  const st = wireStroke(shape.style)
  const style = { strokeWidth: st.width + (selected ? 1 : 0), strokeDasharray: st.dash }
  const cls = `shape-stroke${shape.kind !== 'line' && shape.fill ? ' shape-fill' : ''}`
  const hit = { className: 'shape-hit', strokeWidth: hitWidth(zoom) }
  const geometry = (() => {
    switch (shape.kind) {
      case 'line':
        return (
          <>
            <line className={cls} style={style} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
            <line {...hit} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />
          </>
        )
      case 'rect':
        return (
          <>
            <rect className={cls} style={style} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.radius} />
            <rect {...hit} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.radius} />
          </>
        )
      case 'ellipse':
        return (
          <>
            <ellipse className={cls} style={style} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
            <ellipse {...hit} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
          </>
        )
    }
  })()
  return (
    <g className={`shape${selected ? ' selected' : ''}${preview ? ' preview' : ''}`} data-kind={preview ? undefined : 'shape'} data-id={shape.id}>
      {geometry}
      {arrowsOf(shape).map((h, i) => (
        <polygon key={i} className="shape-arrow" points={h.map((p) => `${p.x},${p.y}`).join(' ')} />
      ))}
    </g>
  )
}