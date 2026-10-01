/** Input types where typing edits text, so single-key shortcuts must stay out of the way. */
const TEXT_INPUTS = new Set(['text', 'search', 'number', 'email', 'url', 'tel', 'password', 'date', ''])

interface Target {
  tagName?: string
  type?: string
}

const tag = (t: Target | null) => (t?.tagName ?? '').toUpperCase()
const kind = (t: Target | null) => (t?.type ?? '').toLowerCase()

/** True when a key press is going into a field the user is typing in. Checkboxes and buttons are not such fields. */
export function isTextTarget(t: EventTarget | Target | null): boolean {
  const el = t as Target | null
  if (tag(el) === 'TEXTAREA' || tag(el) === 'SELECT') return true
  return tag(el) === 'INPUT' && TEXT_INPUTS.has(kind(el))
}

/** Controls that use Space themselves (a focused button or checkbox is toggled by it), so Space must not pan. */
export function usesSpace(t: EventTarget | Target | null): boolean {
  const el = t as Target | null
  return tag(el) === 'BUTTON' || tag(el) === 'A' || (tag(el) === 'INPUT' && ['checkbox', 'radio'].includes(kind(el)))
}