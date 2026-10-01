import type { Prim, SymbolDef } from './types'

/**
 * Sizes a placed part can take, as multiples of the library size. Quarter steps keep every terminal
 * on a 5 px lattice, and pole pitches like 40 px map onto useful values (1.25x = 50 px).
 */
export const SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const

const num = (n: number) => String(Math.round(n * 1000) / 1000)
const isCmd = (t: string) => /^[A-Za-z]$/.test(t)

/**
 * Scale an SVG path made of absolute M, L, A and Z commands (the only ones symbols use).
 * Arc flags and rotation are left alone; radii and end points scale.
 */
export function scalePath(d: string, s: number): string {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? []
  const parts: string[] = []
  let i = 0
  const nextNum = () => Number(tokens[i++])
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (!isCmd(cmd)) throw new Error(`Malformed path "${d}"`)
    const args: string[] = []
    if (cmd === 'M' || cmd === 'L') {
      while (i < tokens.length && !isCmd(tokens[i])) args.push(num(nextNum() * s), num(nextNum() * s))
    } else if (cmd === 'A') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const rx = nextNum() * s
        const ry = nextNum() * s
        const rot = nextNum()
        const large = nextNum()
        const sweep = nextNum()
        const x = nextNum() * s
        const y = nextNum() * s
        args.push(num(rx), num(ry), num(rot), num(large), num(sweep), num(x), num(y))
      }
    } else if (cmd !== 'Z') {
      throw new Error(`Unsupported path command ${cmd} in "${d}"`)
    }
    parts.push(args.length ? `${cmd}${args.join(' ')}` : cmd)
  }
  return parts.join(' ')
}

/** Geometry scales; stroke widths and dash lengths deliberately do not, so line weight stays uniform. */
export function scalePrim(p: Prim, s: number): Prim {
  const style = p.style ? { ...p.style, ...(p.style.ls !== undefined ? { ls: p.style.ls * s } : {}) } : undefined
  const base = style ? { style } : {}
  switch (p.k) {
    case 'line':
      return { ...p, ...base, x1: p.x1 * s, y1: p.y1 * s, x2: p.x2 * s, y2: p.y2 * s }
    case 'rect':
      return { ...p, ...base, x: p.x * s, y: p.y * s, w: p.w * s, h: p.h * s }
    case 'circle':
      return { ...p, ...base, cx: p.cx * s, cy: p.cy * s, r: p.r * s }
    case 'path':
      return { ...p, ...base, d: scalePath(p.d, s) }
    case 'poly':
      return { ...p, ...base, pts: p.pts.map(([x, y]) => [x * s, y * s] as [number, number]) }
    case 'text':
      return { ...p, ...base, x: p.x * s, y: p.y * s, size: p.size * s }
  }
}

const cache = new Map<string, Prim[]>()

/** A symbol's drawing at the given size (memoised). Size 1 returns the library primitives as they are. */
export function scaleBody(def: SymbolDef, s: number): Prim[] {
  if (s === 1) return def.body
  const key = `${def.id}@${s}`
  let out = cache.get(key)
  if (!out) {
    out = def.body.map((p) => scalePrim(p, s))
    cache.set(key, out)
  }
  return out
}

/**
 * Mirror an absolute M/L/A/Z path about a vertical line: x becomes `axis2 - x` (axis2 is twice the axis x).
 * A reflection reverses the direction of travel, so arc sweep flags flip and the ellipse rotation negates.
 */
export function mirrorPath(d: string, axis2: number): string {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? []
  const parts: string[] = []
  let i = 0
  const nextNum = () => Number(tokens[i++])
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (!isCmd(cmd)) throw new Error(`Malformed path "${d}"`)
    const args: string[] = []
    if (cmd === 'M' || cmd === 'L') {
      while (i < tokens.length && !isCmd(tokens[i])) args.push(num(axis2 - nextNum()), num(nextNum()))
    } else if (cmd === 'A') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const rx = nextNum()
        const ry = nextNum()
        const rot = nextNum()
        const large = nextNum()
        const sweep = nextNum()
        const x = nextNum()
        const y = nextNum()
        args.push(num(rx), num(ry), num(rot === 0 ? 0 : -rot), num(large), num(1 - sweep), num(axis2 - x), num(y))
      }
    } else if (cmd !== 'Z') {
      throw new Error(`Unsupported path command ${cmd} in "${d}"`)
    }
    parts.push(args.length ? `${cmd}${args.join(' ')}` : cmd)
  }
  return parts.join(' ')
}

/** Mirror one primitive about the vertical line x = axis2 / 2. Text keeps reading left to right: only its anchor point moves. */
export function mirrorPrim(p: Prim, axis2: number): Prim {
  const m = (x: number) => axis2 - x
  switch (p.k) {
    case 'line':
      return { ...p, x1: m(p.x1), x2: m(p.x2) }
    case 'rect':
      return { ...p, x: m(p.x + p.w) }
    case 'circle':
      return { ...p, cx: m(p.cx) }
    case 'path':
      return { ...p, d: mirrorPath(p.d, axis2) }
    case 'poly':
      return { ...p, pts: p.pts.map(([x, y]) => [m(x), y] as [number, number]) }
    case 'text':
      return { ...p, x: m(p.x), anchor: p.anchor === 'start' ? 'end' : p.anchor === 'end' ? 'start' : 'middle' }
  }
}