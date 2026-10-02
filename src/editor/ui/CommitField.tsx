import { useEffect, useState } from 'react'

export interface CommitFieldProps {
  label: string
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  maxLength: number
  mono?: boolean
  /** Id of a <datalist> offering suggestions. Picking a suggestion commits straight away. */
  list?: string
  /** Select the whole text when the field is focused, so typing replaces it. */
  selectOnFocus?: boolean
  /** Hide the caption (the label is still read out by screen readers). */
  compact?: boolean
}

/** Text input that commits on blur or Enter, so typing does not flood the undo history. */
export function CommitField({ label, value, onCommit, placeholder, maxLength, mono = false, list, selectOnFocus = false, compact = false }: CommitFieldProps) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value]) // follow undo/redo and external changes
  const commit = () => v.trim() !== value && onCommit(v.trim())
  return (
    <label className={`field${mono ? ' mono-field' : ''}`}>
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
      <input
        value={v}
        maxLength={maxLength}
        list={list}
        onChange={(e) => {
          setV(e.target.value)
          // Choosing from the suggestion list is a decision; typing is not, so only a pick commits at once.
          if (list && (e.nativeEvent as InputEvent).inputType === 'insertReplacementText' && e.target.value.trim() !== value) onCommit(e.target.value.trim())
        }}
        onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
      />
    </label>
  )
}
