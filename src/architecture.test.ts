import { describe, expect, it } from 'vitest'

/**
 * Guards the layering described in docs/ARCHITECTURE.md. Each layer may only import from the layers
 * listed for it, so the dependency graph stays one-directional as the project grows.
 */
const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

type Layer = 'shared' | 'symbols' | 'model' | 'actions' | 'io' | 'editor-ui' | 'library' | 'app' | 'entry'

function layerOf(path: string): Layer | null {
  const p = path.replace(/^\/src\//, '')
  if (p === 'main.tsx') return 'entry'
  if (p.startsWith('shared/')) return 'shared'
  if (p.startsWith('symbols/')) return 'symbols'
  if (p.startsWith('library/')) return 'library'
  if (p.startsWith('app/')) return 'app'
  if (p.startsWith('editor/model/')) return 'model'
  if (p.startsWith('editor/actions/')) return 'actions'
  if (p.startsWith('editor/io/') || p === 'editor/examples.ts') return 'io'
  if (p.startsWith('editor/')) return 'editor-ui'
  return null
}

const ALLOWED: Record<Layer, Layer[]> = {
  shared: [],
  symbols: ['shared'],
  model: ['shared', 'symbols'],
  actions: ['shared', 'symbols', 'model'],
  io: ['shared', 'symbols', 'model'],
  'editor-ui': ['shared', 'symbols', 'model', 'actions', 'io'],
  library: ['shared', 'symbols'],
  app: ['shared', 'symbols', 'library', 'editor-ui', 'app'],
  entry: ['app'],
}

const IMPORT = /(?:from|import)\s*\(?\s*'(@\/[^']+)'/g

describe('architecture', () => {
  const files = Object.entries(sources).filter(([path]) => !/\.test\.tsx?$/.test(path))

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  it('classifies every source file into a layer', () => {
    expect(files.filter(([path]) => layerOf(path) === null).map(([path]) => path)).toEqual([])
  })

  it('only imports from layers below or beside it', () => {
    const violations: string[] = []
    for (const [path, text] of files) {
      const from = layerOf(path)
      if (!from) continue
      for (const m of text.matchAll(IMPORT)) {
        const target = layerOf('/src/' + m[1].slice(2))
        if (!target || target === from) continue
        if (!ALLOWED[from].includes(target)) violations.push(`${path.replace('/src/', '')} (${from}) imports ${m[1]} (${target})`)
      }
    }
    expect(violations).toEqual([])
  })
})
