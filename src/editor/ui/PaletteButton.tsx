import { SymbolSvg } from '@/symbols/Glyph'
import type { SymbolDef } from '@/symbols/types'

export function PaletteButton({ def, armed, onPick }: { def: SymbolDef; armed: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`palette-item${armed ? ' armed' : ''}`} onClick={onPick} aria-pressed={armed}>
      <SymbolSvg def={def} className="mini-glyph" />
      <span>{def.name}</span>
    </button>
  )
}