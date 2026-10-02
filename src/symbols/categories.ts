import type { Category } from './types'

export const CATEGORIES: Category[] = [
  { id: 'switching', name: 'Switching & protection', blurb: 'Circuit breakers, isolators and fuses.' },
  { id: 'control', name: 'Control devices', blurb: 'Push buttons, emergency stop and manual switches.' },
  { id: 'coils', name: 'Coils & contactors', blurb: 'Operating coils and power contactors.' },
  { id: 'contacts', name: 'Contacts', blurb: 'Auxiliary contacts operated by coils, timers and relays.' },
  { id: 'overload', name: 'Overload relays', blurb: 'Thermal motor protection.' },
  { id: 'motors', name: 'Motors', blurb: 'Single-phase and three-phase machines.' },
  { id: 'power', name: 'Supply, transformers & earthing', blurb: 'Sources, transformers and earth connections.' },
  { id: 'measure', name: 'Measurement & indication', blurb: 'Meters and signal lamps.' },
  { id: 'passive', name: 'Passive components', blurb: 'Resistors and capacitors.' },
  { id: 'connect', name: 'Connections', blurb: 'Junctions, and net labels that link wires on one sheet or across sheets.' },
]