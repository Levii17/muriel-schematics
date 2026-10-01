import { CATEGORIES } from './categories'
import { SYMBOLS } from './symbols'
import type { CategoryId, SymbolDef } from './types'

export { CATEGORIES, SYMBOLS }
export type { CategoryId, SymbolDef }
export * from './types'

const byId = new Map(SYMBOLS.map((s) => [s.id, s]))
export const getSymbol = (id: string): SymbolDef | undefined => byId.get(id)

export function symbolsByCategory(): { category: (typeof CATEGORIES)[number]; symbols: SymbolDef[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    symbols: SYMBOLS.filter((s) => s.category === category.id),
  })).filter((g) => g.symbols.length > 0)
}
