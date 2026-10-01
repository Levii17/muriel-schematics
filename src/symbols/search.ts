import { CATEGORIES } from './categories'
import type { SymbolDef } from './types'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9~+ ]+/g, ' ').replace(/\s+/g, ' ').trim()

const categoryName = new Map(CATEGORIES.map((c) => [c.id, norm(c.name)]))

/** Score one token against one symbol; 0 means no match. */
function scoreToken(token: string, s: SymbolDef): number {
  let score = 0
  const name = norm(s.name)
  const nameWords = name.split(' ')
  if (nameWords.includes(token)) score += 10
  else if (nameWords.some((w) => w.startsWith(token))) score += 6
  else if (name.includes(token)) score += 3

  for (const tag of s.tags) {
    const t = norm(tag)
    if (t === token) score += 8
    else if (t.split(' ').some((w) => w.startsWith(token))) score += 4
    else if (t.includes(token)) score += 2
  }
  if (norm(s.reference) === token) score += 6
  if (s.terminals.some((t) => norm(t.label) === token)) score += 3
  if ((categoryName.get(s.category) ?? '').includes(token)) score += 2
  if (norm(s.summary).includes(token)) score += 1
  return score
}

/**
 * Every whitespace-separated token must match something (AND), results ordered by total score.
 * An empty query returns the input unchanged.
 */
export function searchSymbols(symbols: SymbolDef[], query: string): SymbolDef[] {
  const tokens = norm(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return symbols
  const scored: { s: SymbolDef; score: number; i: number }[] = []
  symbols.forEach((s, i) => {
    let total = 0
    for (const token of tokens) {
      const sc = scoreToken(token, s)
      if (sc === 0) return
      total += sc
    }
    scored.push({ s, score: total, i })
  })
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.s)
}
