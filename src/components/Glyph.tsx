import type { CSSProperties } from 'react'
import { symbolBody } from '../editor/model'
import type { Prim, PrimStyle, SymbolDef } from '../data/types'
import { DASH, STROKE } from '../lib/svg'

/** Only defined overrides are returned so they never clobber props set before the spread. */
function styleProps(st: PrimStyle | undefined, isText = false) {
  const out: { strokeWidth?: number; stroke?: string; fill?: string; opacity?: number; style?: CSSProperties } = {}
  if (!st) return out
  if (st.w !== undefined) out.strokeWidth = st.w
  if (st.stroke) out.stroke = st.stroke
  if (st.fill && !isText) out.fill = st.fill
  if (st.opacity !== undefined) out.opacity = st.opacity
  if (st.ls !== undefined) out.style = { letterSpacing: st.ls }
  return out
}

export function Prims({ prims }: { prims: Prim[] }) {
  return (
    <>
      {prims.map((p, i) => {
        switch (p.k) {
          case 'line':
            return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} strokeDasharray={p.dash ? DASH : undefined} {...styleProps(p.style)} />
          case 'rect':
            return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...styleProps(p.style)} />
          case 'circle':
            return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.solid ? 'currentColor' : undefined} {...styleProps(p.style)} />
          case 'path':
            return <path key={i} d={p.d} fill={p.solid ? 'currentColor' : undefined} {...styleProps(p.style)} />
          case 'poly':
            return <polyline key={i} points={p.pts.map(([x, y]) => `${x},${y}`).join(' ')} {...styleProps(p.style)} />
          case 'text':
            return (
              <text key={i} x={p.x} y={p.y} fontSize={p.size} fontWeight={p.weight} textAnchor={p.anchor} fill={p.style?.fill ?? 'currentColor'} stroke="none" {...styleProps(p.style, true)}>
                {p.text}
              </text>
            )
        }
      })}
    </>
  )
}

/** The symbol body with the shared stroke style. Colour comes from CSS `color`. */
export function GlyphBody({ def, scale = 1, mirror = false }: { def: SymbolDef; scale?: number; mirror?: boolean }) {
  return (
    <g className="glyph-body" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <Prims prims={symbolBody(def, scale, mirror)} />
    </g>
  )
}

const labelAnchor = {
  up: { x: 0, y: -11, anchor: 'middle' },
  down: { x: 0, y: 19, anchor: 'middle' },
  left: { x: -11, y: 4, anchor: 'end' },
  right: { x: 11, y: 4, anchor: 'start' },
} as const

/** Coloured terminal dots with labels, drawn in symbol space. */
export function TerminalOverlay({ def, labels = true }: { def: SymbolDef; labels?: boolean }) {
  return (
    <g className="terminals">
      {def.terminals.map((t) => {
        const la = labelAnchor[t.dir]
        return (
          <g key={t.id} className={`term term-${t.role}`} transform={`translate(${t.x} ${t.y})`}>
            <circle r={5} />
            {labels && (
              <text x={la.x} y={la.y} textAnchor={la.anchor}>
                {t.label}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

const PAD = 24

export function SymbolSvg({
  def,
  showTerminals = false,
  scale = 1,
  className,
}: {
  def: SymbolDef
  showTerminals?: boolean
  scale?: number
  className?: string
}) {
  const w = def.width + PAD * 2
  const h = def.height + PAD * 2
  return (
    <svg
      className={className ?? 'glyph'}
      viewBox={`${-PAD} ${-PAD} ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      role="img"
      aria-label={def.name}
    >
      <GlyphBody def={def} />
      {showTerminals && <TerminalOverlay def={def} />}
    </svg>
  )
}