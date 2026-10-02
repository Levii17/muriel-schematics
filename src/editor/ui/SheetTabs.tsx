import { PlusIcon } from '@/shared/Icons'

import type { SheetSummary } from './ProjectPanel'

/** The strip of sheet tabs under the canvas. */
export function SheetTabs({ sheets, onOpen, onAdd }: { sheets: SheetSummary[]; onOpen: (id: string) => void; onAdd: () => void }) {
  return (
    <div className="sheet-tabs" role="tablist" aria-label="Sheets">
      {sheets.map((s, i) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.active}
          className={`sheet-tab${s.active ? ' is-active' : ''}`}
          onClick={() => onOpen(s.id)}
          title={s.name}
        >
          <span className="mono">{i + 1}</span>
          <span className="sheet-tab-name">{s.name}</span>
        </button>
      ))}
      <button className="icon-btn sheet-tab-add" onClick={onAdd} aria-label="Add sheet" title="Add a sheet">
        <PlusIcon />
      </button>
    </div>
  )
}
