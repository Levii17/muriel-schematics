import { CopyIcon, DownloadIcon } from '@/shared/Icons'
import { SymbolSvg } from '@/symbols/Glyph'
import type { SymbolDef } from '@/symbols/types'

interface Props {
  def: SymbolDef
  showTerminals: boolean
  onOpen: (def: SymbolDef) => void
  onCopy: (def: SymbolDef) => void
  onDownload: (def: SymbolDef) => void
}

// Fit the glyph inside the fixed-size canvas area; most symbols render at 1.25x.
const cardScale = (def: SymbolDef) => Math.min(1.25, 196 / (def.height + 48), 236 / (def.width + 48))

export function SymbolCard({ def, showTerminals, onOpen, onCopy, onDownload }: Props) {
  return (
    <article className="card" id={`sym-${def.id}`}>
      <button type="button" className="card-main" onClick={() => onOpen(def)} aria-label={`${def.name} — view details`}>
        <span className="card-canvas">
          <SymbolSvg def={def} showTerminals={showTerminals} scale={cardScale(def)} />
        </span>
        <span className="card-meta">
          <span className="card-name">{def.name}</span>
          <span className="card-sub">
            {def.reference && <span className="chip mono">{def.reference}</span>}
            <span>{def.terminals.length} terminal{def.terminals.length === 1 ? '' : 's'}</span>
          </span>
        </span>
      </button>
      <div className="card-actions">
        <button type="button" className="icon-btn" onClick={() => onCopy(def)} aria-label={`Copy ${def.name} as SVG`} title="Copy SVG">
          <CopyIcon />
        </button>
        <button type="button" className="icon-btn" onClick={() => onDownload(def)} aria-label={`Download ${def.name} as SVG`} title="Download SVG">
          <DownloadIcon />
        </button>
      </div>
    </article>
  )
}
