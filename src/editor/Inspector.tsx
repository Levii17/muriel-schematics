import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlignBottomIcon, AlignCenterIcon, AlignLeftIcon, AlignMiddleIcon, AlignRightIcon, AlignTopIcon, DistributeHIcon,
  DistributeVIcon, DuplicateIcon, FlipHIcon, FlipVIcon, MinusIcon, PlusIcon, RotateIcon, TrashIcon,
} from '../components/Icons'
import { SCALES } from '../data/scale'
import type { AlignMode, Axis } from './align'
import type { FitPlan } from './checks'
import type { Doc, Endpoint, Item, TextNote, Wire, WireStyle } from './model'
import { NOTE_SIZES, defOf, itemScale, noteRot, scaleDrawing } from './model'
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
  onProps: (id: string, patch: Partial<Pick<Item, 'rating' | 'description' | 'partNo'>>) => void
  onResetLabel: (id: string) => void
  onWireStyle: (patch: { dash?: WireStyle['dash'] | null; width?: 1 | 2 | 3 | null }) => void
  onResetRoute: (id: string) => void
  onNote: (id: string, patch: Partial<Omit<TextNote, 'id'>>) => void
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
  const notes = doc.notes.filter((n) => selection.notes.includes(n.id))
  const name = (e: Endpoint) => {
    const it = doc.items.find((i) => i.id === e.item)
    return it?.symbolId === 'junction' ? 'junction' : `${it?.label || 'part'}·${e.term}`
  }

  if (items.length === 0 && notes.length === 0 && wires.length > 0) {
    return <WireFields wires={wires} ends={wires.length === 1 ? `${name(wires[0].a)} → ${name(wires[0].b)}` : ''} onStyle={p.onWireStyle} onReset={p.onResetRoute} onDelete={p.onDelete} />
  }

  if (items.length === 1 && notes.length === 0) {
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
        <CommitField label="Rating" value={item.rating ?? ''} placeholder="e.g. 32 A, 10 kA" maxLength={60} onCommit={(v) => p.onProps(item.id, { rating: v })} />
        <CommitField label="Description" value={item.description ?? ''} placeholder="e.g. Main breaker" maxLength={60} onCommit={(v) => p.onProps(item.id, { description: v })} />
        <CommitField label="Part no." value={item.partNo ?? ''} placeholder="Manufacturer code (not drawn)" maxLength={60} onCommit={(v) => p.onProps(item.id, { partNo: v })} />
        {item.labelOffset && (
          <button className="btn small" onClick={() => p.onResetLabel(item.id)}>Reset label position</button>
        )}
        <p className="muted small">Drag the label on the canvas to move it. Rating and description are drawn under it.</p>
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

  if (items.length === 0 && notes.length === 1) {
    return <NoteFields note={notes[0]} onNote={p.onNote} onRotate={p.onRotate} onDuplicate={p.onDuplicate} onDelete={p.onDelete} />
  }

  if (items.length + notes.length > 1) {
    const bits = [
      items.length && `${items.length} ${items.length === 1 ? 'part' : 'parts'}`,
      notes.length && `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`,
      wires.length && `${wires.length} ${wires.length === 1 ? 'wire' : 'wires'}`,
    ].filter(Boolean)
    return (
      <div className="inspector-body">
        <p className="eyebrow">Selected</p>
        <h2>{bits.join(' and ')}</h2>
        {items.length > 0 && <SizeControl scales={items.map(itemScale)} onStep={p.onResize} onSet={p.onSetScale} />}
        <PartActions onRotate={p.onRotate} onFlip={p.onFlip} onDuplicate={p.onDuplicate} onDelete={p.onDelete} />
        <p className="muted small">Rotate and flip turn the group as a whole, so wires between the parts keep their shape.</p>
        {items.length > 1 && <ArrangeControls count={items.length} onAlign={p.onAlign} onDistribute={p.onDistribute} />}
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
        <dt><kbd>V</kbd> <kbd>H</kbd> <kbd>T</kbd></dt><dd>Select / Pan / Text tool</dd>
        <dt>Double-click text</dt><dd>Edit it in place</dd>
        <dt>Drag onto a wire</dt><dd>Join a wire to the middle of another (adds a junction)</dd>
        <dt>Wire handles</dt><dd>Round: slide a stretch sideways. Square: move a bend</dd>
        <dt><kbd>Alt</kbd>+drag junction</dt><dd>Start a wire from a junction</dd>
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

/** Multi-line text box that commits on blur (not per keystroke), so typing stays out of the undo history. */
function CommitTextarea({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="note-area"
        value={v}
        rows={Math.min(8, Math.max(3, v.split('\n').length))}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.replace(/\s+$/g, '') !== value && v.trim() && onCommit(v.replace(/\s+$/g, ''))}
      />
    </label>
  )
}

const ALIGN_OPTIONS: { value: 'start' | 'middle' | 'end'; label: string }[] = [
  { value: 'start', label: 'Left' },
  { value: 'middle', label: 'Centre' },
  { value: 'end', label: 'Right' },
]

function NoteFields({
  note, onNote, onRotate, onDuplicate, onDelete,
}: { note: TextNote; onNote: InspectorProps['onNote']; onRotate: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const sizes = NOTE_SIZES.includes(note.size) ? NOTE_SIZES : [...NOTE_SIZES, note.size].sort((a, b) => a - b)
  return (
    <div className="inspector-body">
      <p className="eyebrow">Selected</p>
      <h2>Text</h2>
      <CommitTextarea label="Text" value={note.text} onCommit={(text) => onNote(note.id, { text })} />
      <div className="pair">
        <label className="field">
          <span>Size</span>
          <select className="select" value={note.size} onChange={(e) => onNote(note.id, { size: Number(e.target.value) })}>
            {sizes.map((s) => (
              <option key={s} value={s}>{s} px</option>
            ))}
          </select>
        </label>
        <label className="switch note-bold">
          <input type="checkbox" checked={note.bold === true} onChange={(e) => onNote(note.id, { bold: e.target.checked ? true : undefined })} />
          <span>Bold</span>
        </label>
      </div>
      <div className="field">
        <span>Alignment</span>
        <div className="row" role="group" aria-label="Text alignment">
          {ALIGN_OPTIONS.map((o) => (
            <button key={o.value} className="btn small" aria-pressed={(note.align ?? 'start') === o.value} onClick={() => onNote(note.id, { align: o.value === 'start' ? undefined : o.value })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="btn small" onClick={onRotate} title="Rotate (R)"><RotateIcon /> Rotate{noteRot(note) ? ` (${noteRot(note)}°)` : ''}</button>
        <button className="btn small" onClick={onDuplicate} title="Duplicate (Ctrl+D)"><DuplicateIcon /> Duplicate</button>
        <button className="btn small danger" onClick={onDelete} title="Delete (Del)"><TrashIcon /> Delete</button>
      </div>
      <p className="muted small">Double-click text on the canvas to edit it in place.</p>
    </div>
  )
}

const DASH_OPTIONS: { value: WireStyle['dash'] | null; label: string }[] = [
  { value: null, label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashdot', label: 'Dash-dot' },
]
const WIDTH_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'Thick' },
]

function WireFields({
  wires, ends, onStyle, onReset, onDelete,
}: { wires: Wire[]; ends: string; onStyle: InspectorProps['onWireStyle']; onReset: (id: string) => void; onDelete: () => void }) {
  const dash = wires.every((w) => (w.style?.dash ?? null) === (wires[0].style?.dash ?? null)) ? (wires[0].style?.dash ?? null) : undefined
  const width = wires.every((w) => (w.style?.width ?? 2) === (wires[0].style?.width ?? 2)) ? (wires[0].style?.width ?? 2) : undefined
  const single = wires.length === 1 ? wires[0] : null
  return (
    <div className="inspector-body">
      <p className="eyebrow">Selected</p>
      <h2>{single ? 'Wire' : `${wires.length} wires`}</h2>
      {ends && <p className="mono">{ends}</p>}
      <div className="field">
        <span>Line</span>
        <div className="row" role="group" aria-label="Line style">
          {DASH_OPTIONS.map((o) => (
            <button key={o.label} className="btn small" aria-pressed={dash === o.value} onClick={() => onStyle({ dash: o.value })}>{o.label}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Weight</span>
        <div className="row" role="group" aria-label="Line weight">
          {WIDTH_OPTIONS.map((o) => (
            <button key={o.label} className="btn small" aria-pressed={width === o.value} onClick={() => onStyle({ width: o.value })}>{o.label}</button>
          ))}
        </div>
      </div>
      {single && (
        <>
          <p className="muted small">
            {single.via?.length
              ? `Routed by hand through ${single.via.length} ${single.via.length === 1 ? 'point' : 'points'}.`
              : 'Routes itself between its two ends.'}
          </p>
          {single.via?.length ? <button className="btn small" onClick={() => onReset(single.id)}>Reset route</button> : null}
          <p className="muted small">Drag a round handle to slide that stretch of wire sideways, a square handle to move a bend. Double-click a square handle to remove it.</p>
        </>
      )}
      <button className="btn danger" onClick={onDelete}><TrashIcon /> Delete {single ? 'wire' : 'wires'}</button>
    </div>
  )
}