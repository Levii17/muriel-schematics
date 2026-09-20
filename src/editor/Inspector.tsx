import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlignBottomIcon, AlignCenterIcon, AlignLeftIcon, AlignMiddleIcon, AlignRightIcon, AlignTopIcon, DistributeHIcon,
  DistributeVIcon, DuplicateIcon, FlipHIcon, FlipVIcon, MinusIcon, PlusIcon, RotateIcon, TrashIcon,
} from '../components/Icons'
import { SCALES } from '../data/scale'
import type { AlignMode, Axis } from './align'
import type { FitPlan } from './checks'
import type { Doc, Endpoint } from './model'
import { defOf, itemScale, scaleDrawing } from './model'
import type { Selection } from './select'
import { FIELD_DEFS, PAPER_ORDER } from './sheet'
import type { PaperSize, SheetConfig, TitleFields } from './sheet'

export interface InspectorProps {
  doc: Doc
  selection: Selection
  fitPlan: FitPlan
  shrinkPlan: { factor: number } | null
  conflictCount: number
  onLabel: (id: string, label: string) => void
  onSheet: (patch: { enabled?: boolean; size?: PaperSize; fields?: Partial<TitleFields> }) => void
  onResize: (dir: 1 | -1) => void
  onSetScale: (scale: number) => void
  onRotate: () => void
  onFlip: (axis: Axis) => void
  onDuplicate: () => void
  onDelete: () => void
  onAlign: (mode: AlignMode) => void
  onDistribute: (axis: Axis) => void
  onFitSheet: () => void
  onShrink: () => void
  onScaleAll: (factor: number) => void
}

const ALIGN_BUTTONS: { mode: AlignMode; label: string; icon: ReactNode }[] = [
  { mode: 'left', label: 'Align left edges', icon: <AlignLeftIcon /> },
  { mode: 'center', label: 'Align centres horizontally', icon: <AlignCenterIcon /> },
  { mode: 'right', label: 'Align right edges', icon: <AlignRightIcon /> },
  { mode: 'top', label: 'Align top edges', icon: <AlignTopIcon /> },
  { mode: 'middle', label: 'Align centres vertically', icon: <AlignMiddleIcon /> },
  { mode: 'bottom', label: 'Align bottom edges', icon: <AlignBottomIcon /> },
]

/** Rotate, flip, duplicate, delete: shared by the one-part and many-parts views. */
function PartActions({ onRotate, onFlip, onDuplicate, onDelete }: Pick<InspectorProps, 'onRotate' | 'onFlip' | 'onDuplicate' | 'onDelete'>) {
  return (
    <div className="row">
      <button className="btn small" onClick={onRotate} title="Rotate (R)"><RotateIcon /> Rotate</button>
      <button className="btn small" onClick={() => onFlip('h')} title="Flip left-right (F)"><FlipHIcon /> Flip H</button>
      <button className="btn small" onClick={() => onFlip('v')} title="Flip top-bottom (Shift+F)"><FlipVIcon /> Flip V</button>
      <button className="btn small" onClick={onDuplicate} title="Duplicate (Ctrl+D)"><DuplicateIcon /> Duplicate</button>
      <button className="btn small danger" onClick={onDelete} title="Delete (Del)"><TrashIcon /> Delete</button>
    </div>
  )
}

function ArrangeControls({ count, onAlign, onDistribute }: { count: number; onAlign: (m: AlignMode) => void; onDistribute: (a: Axis) => void }) {
  return (
    <div className="field">
      <span>Align</span>
      <div className="icon-row" role="group" aria-label="Align selected parts">
        {ALIGN_BUTTONS.map((b) => (
          <button key={b.mode} className="icon-btn boxed" onClick={() => onAlign(b.mode)} aria-label={b.label} title={b.label}>{b.icon}</button>
        ))}
      </div>
      <span>Distribute</span>
      <div className="icon-row" role="group" aria-label="Distribute selected parts">
        <button className="icon-btn boxed" disabled={count < 3} onClick={() => onDistribute('h')} aria-label="Distribute horizontally" title={count < 3 ? 'Select three or more parts' : 'Even gaps, left to right'}><DistributeHIcon /></button>
        <button className="icon-btn boxed" disabled={count < 3} onClick={() => onDistribute('v')} aria-label="Distribute vertically" title={count < 3 ? 'Select three or more parts' : 'Even gaps, top to bottom'}><DistributeVIcon /></button>
      </div>
    </div>
  )
}

export function Inspector(p: InspectorProps) {
  const { doc, selection } = p
  const items = doc.items.filter((i) => selection.items.includes(i.id))
  const wires = doc.wires.filter((w) => selection.wires.includes(w.id))
  const name = (e: Endpoint) => `${doc.items.find((i) => i.id === e.item)?.label || 'part'}·${e.term}`

  if (items.length === 0 && wires.length > 0) {
    return (
      <div className="inspector-body">
        <p className="eyebrow">Selected</p>
        {wires.length === 1 ? (
          <>
            <h2>Wire</h2>
            <p className="mono">{name(wires[0].a)} → {name(wires[0].b)}</p>
          </>
        ) : (
          <h2>{wires.length} wires</h2>
        )}
        <button className="btn danger" onClick={p.onDelete}><TrashIcon /> Delete {wires.length === 1 ? 'wire' : 'wires'}</button>
      </div>
    )
  }

  if (items.length === 1) {
    const item = items[0]
    const def = defOf(item)
    const conns = doc.wires.flatMap((w) => {
      const other = (e: Endpoint, o: Endpoint) => (e.item === item.id ? [{ term: e.term, to: name(o) }] : [])
      return [...other(w.a, w.b), ...other(w.b, w.a)]
    })
    return (
      <div className="inspector-body">
        <p className="eyebrow">Selected{wires.length ? ` · +${wires.length} ${wires.length === 1 ? 'wire' : 'wires'}` : ''}</p>
        <h2>{def.name}</h2>
        <LabelField key={item.id + item.label} value={item.label} onCommit={(v) => p.onLabel(item.id, v)} />
        <SizeControl scales={items.map(itemScale)} onStep={p.onResize} onSet={p.onSetScale} />
        <PartActions onRotate={p.onRotate} onFlip={p.onFlip} onDuplicate={p.onDuplicate} onDelete={p.onDelete} />
        <h3>Terminals</h3>
        <ul className="term-list">
          {def.terminals.map((t) => {
            const c = conns.filter((x) => x.term === t.id)
            return (
              <li key={t.id}>
                <span className={`dot dot-${t.role}`} aria-hidden="true" />
                <span className="mono">{t.label}</span>
                <span className="muted small">{c.length ? c.map((x) => x.to).join(', ') : t.name}</span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (items.length > 1) {
    return (
      <div className="inspector-body">
        <p className="eyebrow">Selected</p>
        <h2>{items.length} parts{wires.length ? ` and ${wires.length} ${wires.length === 1 ? 'wire' : 'wires'}` : ''}</h2>
        <SizeControl scales={items.map(itemScale)} onStep={p.onResize} onSet={p.onSetScale} />
        <PartActions onRotate={p.onRotate} onFlip={p.onFlip} onDuplicate={p.onDuplicate} onDelete={p.onDelete} />
        <p className="muted small">Rotate and flip turn the group as a whole, so wires between the parts keep their shape.</p>
        <ArrangeControls count={items.length} onAlign={p.onAlign} onDistribute={p.onDistribute} />
      </div>
    )
  }

  return (
    <div className="inspector-body">
      <p className="eyebrow">Editor</p>
      <h2>{doc.items.length} parts · {doc.wires.length} wires</h2>
      <p className="muted small">Your drawing is saved in this browser automatically.</p>
      <DrawingSize doc={doc} onScaleAll={p.onScaleAll} />
      <SheetForm sheet={doc.sheet} conflictCount={p.conflictCount} plan={p.fitPlan} shrink={p.shrinkPlan} onShrink={p.onShrink} onFit={p.onFitSheet} onChange={p.onSheet} />
      <h3>Shortcuts</h3>
      <dl className="shortcuts">
        <dt><kbd>V</kbd> <kbd>H</kbd></dt><dd>Select tool / Pan tool</dd>
        <dt><kbd>Space</kbd>+drag</dt><dd>Pan (also middle mouse)</dd>
        <dt>Drag empty area</dt><dd>Box select: left to right = inside only, right to left = touching</dd>
        <dt><kbd>Shift</kbd>+click</dt><dd>Add or remove from selection</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>A</kbd></dt><dd>Select all</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>C</kbd> <kbd>X</kbd> <kbd>V</kbd></dt><dd>Copy, cut, paste (wires between parts come too)</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>D</kbd></dt><dd>Duplicate</dd>
        <dt><kbd>R</kbd></dt><dd>Rotate</dd>
        <dt><kbd>F</kbd> <kbd>Shift</kbd>+<kbd>F</kbd></dt><dd>Flip left-right / top-bottom</dd>
        <dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>Smaller / larger part</dd>
        <dt><kbd>Del</kbd></dt><dd>Delete selection</dd>
        <dt><kbd>←↑↓→</kbd></dt><dd>Nudge (Shift = 5 cells)</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>Undo / <kbd>Shift</kbd> redo</dd>
        <dt><kbd>Esc</kbd></dt><dd>Cancel / deselect</dd>
        <dt>Scroll</dt><dd>Zoom</dd>
      </dl>
    </div>
  )
}

function LabelField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return <CommitField label="Label" value={value} onCommit={onCommit} placeholder="e.g. Q1" maxLength={16} mono />
}

/** Text input that commits on blur or Enter, so typing does not flood the undo history. */
function CommitField({
  label, value, onCommit, placeholder, maxLength, mono = false,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  maxLength: number
  mono?: boolean
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value]) // follow undo/redo and external changes
  const commit = () => v.trim() !== value && onCommit(v.trim())
  return (
    <label className={`field${mono ? ' mono-field' : ''}`}>
      <span>{label}</span>
      <input
        value={v}
        maxLength={maxLength}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
      />
    </label>
  )
}

/** Stepper for part size. Shows the shared size, or "mixed" when the selection differs. */
function SizeControl({ scales, onStep, onSet }: { scales: number[]; onStep: (dir: 1 | -1) => void; onSet: (scale: number) => void }) {
  const same = scales.every((v) => v === scales[0])
  const current = scales[0] ?? 1
  const pct = same ? `${Math.round(current * 100)}%` : 'Mixed'
  return (
    <div className="field size-control">
      <span>Size</span>
      <div className="stepper">
        <button className="icon-btn" onClick={() => onStep(-1)} disabled={same && current <= SCALES[0]} aria-label="Make smaller" title="Smaller ( [ )"><MinusIcon /></button>
        <span className="mono" aria-live="polite">{pct}</span>
        <button className="icon-btn" onClick={() => onStep(1)} disabled={same && current >= SCALES[SCALES.length - 1]} aria-label="Make larger" title="Larger ( ] )"><PlusIcon /></button>
        <button className="btn small" onClick={() => onSet(1)} disabled={same && current === 1}>Reset</button>
      </div>
    </div>
  )
}

const DRAWING_FACTORS = [0.5, 0.75, 1.25, 1.5, 2]

/** Scale every part and the spacing between them together. Buttons that would leave the preset sizes are disabled. */
function DrawingSize({ doc, onScaleAll }: { doc: Doc; onScaleAll: (factor: number) => void }) {
  if (!doc.items.length) return null
  return (
    <fieldset className="sheet-form">
      <legend>Whole drawing</legend>
      <div className="factor-row" role="group" aria-label="Scale the whole drawing">
        {DRAWING_FACTORS.map((f) => (
          <button key={f} className="btn small" disabled={!scaleDrawing(doc, f)} onClick={() => onScaleAll(f)} title={`Scale every part and the spacing to ${Math.round(f * 100)}%`}>
            {Math.round(f * 100)}%
          </button>
        ))}
      </div>
      <p className="muted small">Scales all parts and their spacing together, keeping wires aligned. Use it to fit a big drawing on a sheet.</p>
    </fieldset>
  )
}

const PAIRS: (keyof TitleFields)[][] = [['organization'], ['project'], ['title'], ['details'], ['drawnBy', 'drawingNo'], ['date', 'scale'], ['revision', 'sheet']]

function SheetForm({ sheet, conflictCount, plan, shrink, onShrink, onFit, onChange }: { sheet: SheetConfig; conflictCount: number; plan: FitPlan; shrink: { factor: number } | null; onShrink: () => void; onFit: () => void; onChange: (patch: { enabled?: boolean; size?: PaperSize; fields?: Partial<TitleFields> }) => void }) {
  return (
    <fieldset className="sheet-form">
      <legend>Drawing sheet</legend>
      <div className="row between">
        <label className="switch">
          <input type="checkbox" checked={sheet.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
          <span>Show sheet</span>
        </label>
        <label className="size-pick">
          <span className="sr-only">Paper size</span>
          <select value={sheet.size} onChange={(e) => onChange({ size: e.target.value as PaperSize })} aria-label="Paper size">
            {PAPER_ORDER.map((s) => (
              <option key={s} value={s}>{s} landscape</option>
            ))}
          </select>
        </label>
      </div>
      {sheet.enabled && conflictCount > 0 && (
        <div className="warn small" role="status">
          <p>{conflictCount} {conflictCount === 1 ? 'part sits' : 'parts sit'} outside the frame or under the title block.</p>
          {plan.ok ? (
            <button className="btn small" onClick={onFit}>
              {plan.size === sheet.size ? 'Move onto the sheet' : `Move onto ${plan.size}`}
            </button>
          ) : (
            <>
              <p>The drawing is too big for any sheet up to A1.</p>
              {shrink ? (
                <button className="btn small" onClick={onShrink}>Shrink to {Math.round(shrink.factor * 100)}% and fit</button>
              ) : (
                <p>Even shrunk it will not fit, so it needs splitting across sheets.</p>
              )}
            </>
          )}
        </div>
      )}
      {PAIRS.map((keys) => (
        <div key={keys.join()} className={keys.length > 1 ? 'pair' : undefined}>
          {keys.map((k) => {
            const def = FIELD_DEFS.find((d) => d.key === k)!
            return (
              <CommitField key={k} label={def.label} value={sheet.fields[k]} placeholder={def.placeholder} maxLength={def.maxLength} onCommit={(v) => onChange({ fields: { [k]: v } })} />
            )
          })}
        </div>
      ))}
    </fieldset>
  )
}