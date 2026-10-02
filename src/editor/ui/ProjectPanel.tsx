import { MAX_NET_NAME, netKey, netNameOf } from '@/editor/model/netlabel'
import type { NetGroup, NetIssue, NetLabelRef } from '@/editor/model/nets'
import { refText } from '@/editor/model/nets'
import type { Item } from '@/editor/model/types'
import { CommitField } from '@/editor/ui/CommitField'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '@/shared/Icons'

/** What the panels need to know about one sheet. */
export interface SheetSummary {
  id: string
  name: string
  /** Parts, notes and shapes on it, so deleting a sheet with work on it can ask first. */
  content: number
  active: boolean
}

export interface SheetsPanelProps {
  sheets: SheetSummary[]
  onOpen: (id: string) => void
  onAdd: () => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: (id: string) => void
}

/** The list of sheets in the drawing, with ordering and removal. */
export function SheetsPanel({ sheets, onOpen, onAdd, onMove, onDelete }: SheetsPanelProps) {
  return (
    <fieldset className="sheet-form">
      <legend>Sheets</legend>
      <ol className="sheet-list">
        {sheets.map((s, i) => (
          <li key={s.id} className={s.active ? 'is-active' : undefined}>
            <button className="sheet-open" onClick={() => onOpen(s.id)} aria-current={s.active ? 'true' : undefined}>
              <span className="mono">{i + 1}</span>
              <span className="sheet-open-name">{s.name}</span>
            </button>
            <button className="icon-btn" onClick={() => onMove(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.name} earlier`} title="Move earlier">
              <ChevronUpIcon />
            </button>
            <button className="icon-btn" onClick={() => onMove(s.id, 1)} disabled={i === sheets.length - 1} aria-label={`Move ${s.name} later`} title="Move later">
              <ChevronDownIcon />
            </button>
            <button className="icon-btn" onClick={() => onDelete(s.id)} disabled={sheets.length < 2} aria-label={`Delete ${s.name}`} title="Delete sheet">
              <TrashIcon />
            </button>
          </li>
        ))}
      </ol>
      <button className="btn small" onClick={onAdd}><PlusIcon /> Add sheet</button>
      <p className="muted small">A new sheet copies the paper and title block of this one. Each sheet is named by its drawing title.</p>
    </fieldset>
  )
}

export interface NetsPanelProps {
  nets: NetGroup[]
  issues: NetIssue[]
  /** 0-based index of the open sheet, so references to it read "C4" and to others "2/C4". */
  activeIndex: number
  onRename: (from: string, to: string) => void
  onJump: (ref: NetLabelRef) => void
}

/** Every named net in the drawing, where its labels are, and anything that looks wrong. */
export function NetsPanel({ nets, issues, activeIndex, onRename, onJump }: NetsPanelProps) {
  return (
    <fieldset className="sheet-form">
      <legend>Nets</legend>
      {nets.length === 0 && issues.length === 0 ? (
        <p className="muted small">
          Place a <strong>Net label</strong> from Connections on a wire. Labels with the same name are connected, even on different sheets.
        </p>
      ) : (
        <ul className="net-list">
          {nets.map((g) => (
            <li key={g.key}>
              <CommitField label={`Rename net ${g.name}`} compact mono value={g.name} maxLength={MAX_NET_NAME} onCommit={(v) => onRename(g.name, v)} />
              <div className="net-refs">
                {g.labels.map((l) => (
                  <button key={l.itemId} className="ref-chip" onClick={() => onJump(l)} title="Go to this label">
                    {refText(l, activeIndex)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {issues.length > 0 && (
        <div className="warn small" role="status">
          {issues.map((issue, i) => (
            <p key={i}>
              {issue.message}{' '}
              <button className="link-btn" onClick={() => onJump(issue.labels[0])}>Go to</button>
            </p>
          ))}
        </div>
      )}
      {nets.length > 0 && <p className="muted small">Rename a net here to change it on every sheet.</p>}
    </fieldset>
  )
}

export interface NetLabelFieldsProps {
  item: Item
  /** The other labels that share this label's name. */
  partners: NetLabelRef[]
  sheetNames: string[]
  activeIndex: number
  /** Names already in use, offered as suggestions. */
  suggestions: string[]
  issues: NetIssue[]
  onName: (name: string) => void
  onJump: (ref: NetLabelRef) => void
}

const COMMON_NETS = ['L1', 'L2', 'L3', 'N', 'PE']

/** Inspector section for a selected net label: its name, and where its partners are. */
export function NetLabelFields({ item, partners, sheetNames, activeIndex, suggestions, issues, onName, onJump }: NetLabelFieldsProps) {
  const name = netNameOf(item)
  const offered = [...new Map([...suggestions, ...COMMON_NETS].map((n) => [netKey(n), n])).values()]
  const mine = issues.filter((i) => i.labels.some((l) => l.itemId === item.id))
  return (
    <>
      <CommitField label="Net name" mono selectOnFocus list="net-names" value={name} maxLength={MAX_NET_NAME} placeholder="e.g. L1" onCommit={onName} />
      <datalist id="net-names">
        {offered.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <p className="muted small">Labels with the same name are connected, on this sheet or any other.</p>
      {name && (
        <div className="field">
          <span>Also on</span>
          {partners.length ? (
            <div className="net-refs">
              {partners.map((l) => (
                <button key={l.itemId} className="ref-chip wide" onClick={() => onJump(l)} title="Go to this label">
                  {sheetNames[l.sheetIndex]}
                  {l.zone ? ` · ${l.zone}` : ''}
                  {l.sheetIndex === activeIndex ? ' (here)' : ''}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">Nothing else uses this name yet.</p>
          )}
        </div>
      )}
      {mine.length > 0 && (
        <div className="warn small" role="status">
          {mine.map((m, i) => (
            <p key={i}>{m.message}</p>
          ))}
        </div>
      )}
    </>
  )
}
