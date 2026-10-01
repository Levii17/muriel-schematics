import { describe, expect, it } from 'vitest'

import { isTextTarget, usesSpace } from './keys'

const input = (type: string) => ({ tagName: 'INPUT', type })

describe('keyboard shortcut guards', () => {
  it('leaves shortcuts alone while the user is typing in a text field', () => {
    for (const t of ['text', 'search', 'number', 'email', 'date']) expect(isTextTarget(input(t)), t).toBe(true)
    expect(isTextTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTextTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isTextTarget({ tagName: 'input', type: 'TEXT' })).toBe(true) // case does not matter
    expect(isTextTarget({ tagName: 'INPUT' })).toBe(true) // an input with no type is a text box
  })

  it('lets shortcuts through after a checkbox, radio, range or button has focus', () => {
    // Regression: toggling the Sheet checkbox used to leave R, F, Delete and the tool keys dead until you clicked elsewhere.
    for (const t of ['checkbox', 'radio', 'range', 'button', 'file']) expect(isTextTarget(input(t)), t).toBe(false)
    expect(isTextTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextTarget({ tagName: 'A' })).toBe(false)
    expect(isTextTarget({ tagName: 'DIV' })).toBe(false)
    expect(isTextTarget({ tagName: 'svg' })).toBe(false)
    expect(isTextTarget(null)).toBe(false)
    expect(isTextTarget({})).toBe(false)
  })

  it('does not steal Space from a control that uses it', () => {
    expect(usesSpace({ tagName: 'BUTTON' })).toBe(true)
    expect(usesSpace({ tagName: 'A' })).toBe(true)
    expect(usesSpace(input('checkbox'))).toBe(true)
    expect(usesSpace(input('radio'))).toBe(true)
    expect(usesSpace({ tagName: 'DIV' })).toBe(false)
    expect(usesSpace(input('range'))).toBe(false)
    expect(usesSpace(null)).toBe(false)
  })
})