import { getSymbol } from '../data'
import type { Doc, Item, Wire } from './model'
import { nextLabel, pivotOf } from './model'
import { defaultSheet } from './sheet'

/**
 * Direct-on-line motor starter, power circuit: supply -> breaker -> contactor -> overload -> motor.
 * Items are placed by their top-left origin so terminals line up on the grid.
 */
export function dolStarterExample(): Doc {
  // Offset keeps the circuit inside the drawing frame and clear of the title block.
  const OX = 700
  const OY = 140
  const items: Item[] = []
  const place = (id: string, symbolId: string, ox: number, oy: number): Item => {
    const def = getSymbol(symbolId)!
    const pv = pivotOf(def)
    const item: Item = { id, symbolId, x: OX + ox + pv.x, y: OY + oy + pv.y, rot: 0, label: nextLabel(items, def) }
    items.push(item)
    return item
  }
  place('e-supply', 'supply-3ph-n-pe', 0, 0)
  place('e-q1', 'circuit-breaker-3p', 0, 120)
  place('e-k1', 'contactor-3p', 0, 260)
  place('e-f1', 'overload-relay-3p', 0, 400)
  place('e-m1', 'motor-3ph-dol', 0, 560)

  const wires: Wire[] = []
  const wire = (a: string, at: string, b: string, bt: string) =>
    wires.push({ id: `ew${wires.length}`, a: { item: a, term: at }, b: { item: b, term: bt } })

  ;['L1', 'L2', 'L3'].forEach((p) => wire('e-supply', p, 'e-q1', p))
  ;['1', '3', '5'].forEach((t, i) => wire('e-q1', `T${i + 1}`, 'e-k1', t))
  ;['2', '4', '6'].forEach((t, i) => wire('e-k1', t, 'e-f1', `L${i + 1}`))
  ;['U', 'V', 'W'].forEach((t, i) => wire('e-f1', `T${i + 1}`, 'e-m1', t))
  const base = defaultSheet()
  const sheet = {
    enabled: true,
    size: 'A3' as const,
    fields: {
      ...base.fields,
      organization: 'Muriel Schematics',
      project: 'Motor control demo',
      title: 'DOL starter, power circuit',
      details: '3-phase, direct on line',
      drawingNo: 'MUR-001',
      revision: 'A',
    },
  }
  return { items, wires, sheet }
}
