import { circle, line, link, path, pole, POLE_H, poly, rect, term, text, thermalMark } from './primitives'
import type { Prim, SymbolDef, Terminal } from './types'

/* ------------------------------------------------------------------ */
/* Builders shared by several symbols                                  */
/* ------------------------------------------------------------------ */

/** 1-, 2- or 3-pole switching device (breaker or isolator). Poles sit on a 40 px pitch. */
function multiPole(n: 1 | 2 | 3, mark: 'breaker' | 'isolator') {
  const xs = Array.from({ length: n }, (_, i) => 20 + 40 * i)
  const body: Prim[] = xs.flatMap((x) => pole(x, 'no', mark))
  if (n > 1) body.push(link(xs[0] + 8, xs[n - 1] + 8))
  const terminals: Terminal[] = xs.flatMap((x, i) => [
    term(`L${i + 1}`, `L${i + 1}`, `Line side, phase L${i + 1}`, x, 0, 'in', 'up'),
    term(`T${i + 1}`, `T${i + 1}`, `Load side, phase L${i + 1}`, x, POLE_H, 'out', 'down'),
  ])
  return { width: 40 * n, height: POLE_H, body, terminals }
}

const poleWord = { 1: 'single-pole', 2: 'double-pole', 3: 'triple-pole' } as const

/** Round meter / lamp style circle with two vertical terminals. */
function roundDevice(inner: Prim[], top: Terminal, bottom: Terminal) {
  return {
    width: 80,
    height: 100,
    body: [line(40, 0, 40, 20), circle(40, 50, 30), line(40, 80, 40, 100), ...inner],
    terminals: [top, bottom],
  }
}

/** Star-point style motor lead: vertical stub then a diagonal into the circle. */
const motorLead = (x: number, y0: number, y1: number, cx: number, cy: number, up: boolean): Prim[] => {
  const side = x < cx ? -1 : 1
  const ex = cx + side * 26
  const ey = cy + (up ? -15 : 15)
  return [poly([x, y0], [x, y1], [ex, ey])]
}

/* ------------------------------------------------------------------ */
/* Symbols                                                             */
/* ------------------------------------------------------------------ */

const breakers: SymbolDef[] = ([1, 2, 3] as const).map((n) => ({
  id: `circuit-breaker-${n}p`,
  name: `Circuit breaker, ${n}-pole`,
  category: 'switching' as const,
  reference: 'Q',
  summary: `${n}-pole switching device that carries current and trips automatically on overload or short circuit.`,
  usage:
    'Install at the start of a circuit to protect the wiring and equipment downstream. The cross on each pole distinguishes it from a plain isolator. Supply connects to the top (L) terminals, load to the bottom (T).',
  tags: ['breaker', 'mcb', 'mccb', 'protection', 'trip', `${n} pole`, poleWord[n]],
  ...multiPole(n, 'breaker'),
}))

const isolators: SymbolDef[] = ([1, 2, 3] as const).map((n) => ({
  id: `isolator-${n}p`,
  name: `Isolator, ${n}-pole`,
  category: 'switching' as const,
  reference: 'Q',
  summary: `${n}-pole disconnector that provides a visible, secure air gap for isolating equipment from its supply.`,
  usage:
    'Use to isolate a circuit for maintenance. Unless marked as a load-break (switch-disconnector) type it is not rated to make or break load current, so switch the load off first.',
  tags: ['isolator', 'disconnector', 'switch-disconnector', 'isolation', `${n} pole`, poleWord[n]],
  ...multiPole(n, 'isolator'),
}))

const fuse: SymbolDef = {
  id: 'fuse',
  name: 'Fuse',
  category: 'switching',
  reference: 'F',
  summary: 'Sacrificial element that melts and opens the circuit on sustained overcurrent.',
  usage: 'Place in series with the conductor being protected. Replace after operation, never bridge it.',
  tags: ['fuse', 'protection', 'overcurrent', 'cartridge'],
  width: 40,
  height: 100,
  body: [rect(8, 20, 24, 60), line(20, 0, 20, 100)],
  terminals: [
    term('1', '1', 'Supply side', 20, 0, 'in', 'up'),
    term('2', '2', 'Load side', 20, 100, 'out', 'down'),
  ],
}

/* ---- Control devices ---- */

const pushButtonNo: SymbolDef = {
  id: 'push-button-no',
  name: 'Push button, normally open (start)',
  category: 'control',
  reference: 'S',
  summary: 'Momentary contact that closes while pressed and springs back open when released.',
  usage: 'The usual START button. Terminals 13 and 14 follow the normally-open numbering convention.',
  tags: ['push button', 'pushbutton', 'start', 'momentary', 'no', 'normally open', 'green'],
  width: 80,
  height: 80,
  body: [...pole(20, 'no'), link(28, 52), line(52, 28, 52, 52)],
  terminals: [
    term('13', '13', 'Contact terminal', 20, 0, 'in', 'up'),
    term('14', '14', 'Contact terminal', 20, 80, 'out', 'down'),
  ],
}

const pushButtonNc: SymbolDef = {
  id: 'push-button-nc',
  name: 'Push button, normally closed (stop)',
  category: 'control',
  reference: 'S',
  summary: 'Momentary contact that opens while pressed and springs back closed when released.',
  usage: 'The usual STOP button, wired in series with the contactor coil so pressing it drops the contactor out.',
  tags: ['push button', 'pushbutton', 'stop', 'momentary', 'nc', 'normally closed', 'red'],
  width: 80,
  height: 80,
  body: [...pole(20, 'nc'), link(28, 52), line(52, 28, 52, 52)],
  terminals: [
    term('21', '21', 'Contact terminal', 20, 0, 'in', 'up'),
    term('22', '22', 'Contact terminal', 20, 80, 'out', 'down'),
  ],
}

const eStop: SymbolDef = {
  id: 'emergency-stop',
  name: 'Emergency stop',
  category: 'control',
  reference: 'S',
  summary: 'Latching mushroom-head push button with a normally-closed contact.',
  usage: 'Opens the control circuit and stays latched until deliberately reset (twist or pull). Wire the NC contact in series with the control supply.',
  tags: ['emergency', 'e-stop', 'estop', 'mushroom', 'safety', 'stop', 'nc'],
  width: 80,
  height: 80,
  body: [...pole(20, 'nc'), link(28, 44), path('M44,26 A14,14 0 0 1 44,54')],
  terminals: [
    term('21', '21', 'Contact terminal', 20, 0, 'in', 'up'),
    term('22', '22', 'Contact terminal', 20, 80, 'out', 'down'),
  ],
}

const manualSwitch: SymbolDef = {
  id: 'manual-switch',
  name: 'Manual switch, single-pole',
  category: 'control',
  reference: 'S',
  summary: 'Maintained (latching) manual switch that makes or breaks one conductor.',
  usage: 'Stays in the position it is left in, unlike a push button. Typical for lighting and on/off control.',
  tags: ['switch', 'manual', 'maintained', 'latching', 'toggle', 'single pole', 'spst'],
  width: 80,
  height: 80,
  body: [...pole(20, 'no'), link(28, 48), poly([48, 40], [48, 26], [56, 26])],
  terminals: [
    term('1', '1', 'Contact terminal', 20, 0, 'in', 'up'),
    term('2', '2', 'Contact terminal', 20, 80, 'out', 'down'),
  ],
}

/** Changeover blade arrangement; `left` is the NC stem x, `right` the NO stem x. */
const changeover = (left: number, right: number): Prim[] => {
  const hinge = (left + right) / 2
  return [
    line(left, 0, left, 24),
    line(left, 24, left + 8, 24),
    line(right, 0, right, 24),
    line(hinge, 56, hinge, 80),
    line(hinge, 56, left + 8, 24),
  ]
}

const changeoverSwitch: SymbolDef = {
  id: 'changeover-switch',
  name: 'Changeover switch, two-way',
  category: 'control',
  reference: 'S',
  summary: 'Manual single-pole double-throw switch routing one common terminal to either of two outputs.',
  usage: 'Used for two-way lighting, selecting between two supplies or between two control paths.',
  tags: ['switch', 'changeover', 'two-way', 'two way', 'spdt', 'manual', 'selector'],
  width: 120,
  height: 80,
  body: [...changeover(40, 80), link(54, 100), poly([100, 40], [100, 28], [108, 28])],
  terminals: [
    term('1', '1', 'Common', 60, 80, 'in', 'down'),
    term('2', '2', 'Output A (closed at rest)', 40, 0, 'out', 'up'),
    term('3', '3', 'Output B (open at rest)', 80, 0, 'out', 'up'),
  ],
}

/* ---- Coils & contactors ---- */

const coil: SymbolDef = {
  id: 'coil',
  name: 'Operating coil',
  category: 'coils',
  reference: 'K',
  summary: 'Electromagnetic operating coil of a contactor or relay.',
  usage: 'Energising A1–A2 pulls in every contact that carries the same reference. Check the coil voltage (for example 24 V or 230 V) before wiring.',
  tags: ['coil', 'contactor coil', 'relay coil', 'a1', 'a2', 'operating'],
  width: 40,
  height: 100,
  body: [line(20, 0, 20, 20), rect(0, 20, 40, 60), line(20, 80, 20, 100)],
  terminals: [
    term('A1', 'A1', 'Coil terminal (positive / phase)', 20, 0, 'io', 'up'),
    term('A2', 'A2', 'Coil terminal (negative / neutral)', 20, 100, 'io', 'down'),
  ],
}

const contactor3p: SymbolDef = {
  id: 'contactor-3p',
  name: 'Contactor, 3-pole',
  category: 'coils',
  reference: 'K',
  summary: 'Three power contacts operated together by one coil, drawn with the mechanical linkage to the coil.',
  usage: 'Power poles are 1-2, 3-4 and 5-6; the coil is A1–A2. The dashed line shows that the coil operates all three poles at once.',
  tags: ['contactor', '3 pole', 'triple pole', 'three phase', 'motor starter', 'power', 'k1'],
  width: 220,
  height: 80,
  body: [
    ...[20, 60, 100].flatMap((x) => pole(x, 'no')),
    link(28, 160),
    line(180, 0, 180, 20),
    rect(160, 20, 40, 40),
    line(180, 60, 180, 80),
  ],
  terminals: [
    term('1', '1', 'Power in, L1', 20, 0, 'in', 'up'),
    term('2', '2', 'Power out, T1', 20, 80, 'out', 'down'),
    term('3', '3', 'Power in, L2', 60, 0, 'in', 'up'),
    term('4', '4', 'Power out, T2', 60, 80, 'out', 'down'),
    term('5', '5', 'Power in, L3', 100, 0, 'in', 'up'),
    term('6', '6', 'Power out, T3', 100, 80, 'out', 'down'),
    term('A1', 'A1', 'Coil terminal', 180, 0, 'io', 'up'),
    term('A2', 'A2', 'Coil terminal', 180, 80, 'io', 'down'),
  ],
}

/* ---- Contacts ---- */

const auxContact = (
  id: string,
  name: string,
  kind: 'no' | 'nc',
  summary: string,
  usage: string,
  tags: string[],
  t1: [string, string],
  extra: Prim[] = [],
  reference = 'K',
): SymbolDef => ({
  id,
  name,
  category: 'contacts',
  reference,
  summary,
  usage,
  tags,
  width: 40,
  height: 80,
  body: [...pole(20, kind), ...extra],
  terminals: [
    term(t1[0], t1[0], 'Contact terminal', 20, 0, 'in', 'up'),
    term(t1[1], t1[1], 'Contact terminal', 20, 80, 'out', 'down'),
  ],
})

/**
 * Time-delay "parachute" mark (IEC 60617): a semicircle whose apex touches the middle of the moving
 * blade. The contact movement is delayed in the direction of the arc's centre, so the arc sits on the
 * side of the blade the contact moves towards (closing for NO, opening for NC) and opens that way.
 * The blade runs from hinge (20,56) to tip (36,24).
 */
const parachute = (towards: 'closing' | 'opening'): Prim => {
  const R = 8
  const m = { x: 28, y: 40 }
  const len = Math.hypot(16, -32)
  const u = { x: 16 / len, y: -32 / len } // along the blade
  // Unit normals to the blade: NO closes towards the fixed contact's side (left), NC opens away (right).
  const n = towards === 'closing' ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x }
  const c = { x: m.x + R * n.x, y: m.y + R * n.y }
  const e1 = { x: c.x + R * u.x, y: c.y + R * u.y }
  const e2 = { x: c.x - R * u.x, y: c.y - R * u.y }
  // Sweep flag: is e1 -> apex -> e2 clockwise on screen (y down)?
  const cross = (m.x - e1.x) * (e2.y - m.y) - (m.y - e1.y) * (e2.x - m.x)
  const r = (v: number) => Math.round(v * 100) / 100
  return path(`M${r(e1.x)},${r(e1.y)} A${R},${R} 0 0 ${cross > 0 ? 1 : 0} ${r(e2.x)},${r(e2.y)}`)
}

const contacts: SymbolDef[] = [
  auxContact(
    'contact-no',
    'Contact, normally open',
    'no',
    'Normally-open contact operated by a contactor or relay coil.',
    'Closes when the coil carrying the same reference is energised. Terminals 13–14 follow the NO numbering convention.',
    ['contact', 'auxiliary', 'no', 'normally open', 'contactor', 'relay', 'hold-in', 'seal-in'],
    ['13', '14'],
  ),
  auxContact(
    'contact-nc',
    'Contact, normally closed',
    'nc',
    'Normally-closed contact operated by a contactor or relay coil.',
    'Opens when the coil carrying the same reference is energised. Terminals 21–22 follow the NC numbering convention.',
    ['contact', 'auxiliary', 'nc', 'normally closed', 'contactor', 'relay', 'interlock'],
    ['21', '22'],
  ),
  auxContact(
    'contact-no-on-delay',
    'Timer contact, NO, on-delay',
    'no',
    'Normally-open contact that closes a set time after the timer coil is energised.',
    'Opens again immediately when the timer coil de-energises. Common in star-delta changeover and sequential start circuits. Terminals 67–68 follow the NO time-delay numbering.',
    ['timer', 'time delay', 'on-delay', 'ton', 'delay on', 'no', 'normally open', 'star-delta'],
    ['67', '68'],
    [parachute('closing')],
  ),
  auxContact(
    'contact-nc-on-delay',
    'Timer contact, NC, on-delay',
    'nc',
    'Normally-closed contact that opens a set time after the timer coil is energised.',
    'Re-closes immediately when the timer coil de-energises. Terminals 55–56 follow the NC time-delay numbering.',
    ['timer', 'time delay', 'on-delay', 'ton', 'delay on', 'nc', 'normally closed'],
    ['55', '56'],
    [parachute('opening')],
  ),
  {
    id: 'contact-changeover',
    name: 'Contact, changeover',
    category: 'contacts',
    reference: 'K',
    summary: 'One common terminal that connects to a normally-closed output at rest and a normally-open output when operated.',
    usage: 'Terminal 11 is common, 12 is the NC output and 14 the NO output. Typical relay contact set.',
    tags: ['contact', 'changeover', 'spdt', 'relay', 'common', 'nc', 'no'],
    width: 80,
    height: 80,
    body: changeover(20, 60),
    terminals: [
      term('11', '11', 'Common', 40, 80, 'in', 'down'),
      term('12', '12', 'Normally closed output', 20, 0, 'out', 'up'),
      term('14', '14', 'Normally open output', 60, 0, 'out', 'up'),
    ],
  },
  auxContact(
    'contact-overload-nc',
    'Overload relay contact, NC',
    'nc',
    'Normally-closed auxiliary contact of a thermal overload relay.',
    'Opens when the overload relay trips. Wire terminals 95–96 in series with the contactor coil so an overload drops the motor out.',
    ['overload', 'thermal', 'trip', 'contact', 'nc', '95', '96', 'protection'],
    ['95', '96'],
    [link(28, 56), thermalMark(56, 40)],
    'F',
  ),
]

/* ---- Overload relays ---- */

const overloadPoles = (n: 1 | 3): Prim[] => {
  const xs = n === 1 ? [20] : [20, 60, 100]
  return xs.flatMap((x): Prim[] => [
    line(x, 0, x, 32),
    poly([x, 32], [x + 10, 32], [x + 10, 68], [x, 68]),
    line(x, 68, x, 100),
  ])
}

const overloadRelays: SymbolDef[] = ([1, 3] as const).map((n) => {
  const xs = n === 1 ? [20] : [20, 60, 100]
  return {
    id: `overload-relay-${n}p`,
    name: `Thermal overload relay, ${n}-pole`,
    category: 'overload' as const,
    reference: 'F',
    summary: `Thermal elements in ${n === 1 ? 'the' : 'each'} motor supply conductor${n === 1 ? '' : 's'} that trip an auxiliary contact on sustained overcurrent.`,
    usage: 'Sits between the contactor and the motor. Set the current dial to the motor full-load current; its NC contact (95–96) goes in the control circuit.',
    tags: ['overload', 'thermal', 'relay', 'motor protection', `${n} pole`, n === 3 ? 'three phase' : 'single phase'],
    width: n === 1 ? 40 : 120,
    height: 100,
    body: [rect(0, 20, n === 1 ? 40 : 120, 60), ...overloadPoles(n)],
    terminals: xs.flatMap((x, i) => [
      term(`L${i + 1}`, `L${i + 1}`, `Line side, phase L${i + 1}`, x, 0, 'in', 'up'),
      term(`T${i + 1}`, `T${i + 1}`, `Load side, phase L${i + 1}`, x, 100, 'out', 'down'),
    ]),
  }
})

/* ---- Motors ---- */

const motors: SymbolDef[] = [
  {
    id: 'motor-1ph',
    name: 'Motor, single-phase AC',
    category: 'motors',
    reference: 'M',
    summary: 'Single-phase alternating-current motor.',
    usage: 'Connect line and neutral to the motor terminals; check the nameplate for rotation reversing and capacitor requirements.',
    tags: ['motor', 'single phase', '1 phase', 'ac', 'machine'],
    width: 80,
    height: 100,
    body: [
      line(40, 0, 40, 20),
      circle(40, 50, 30),
      line(40, 80, 40, 100),
      text(40, 48, 'M', 20, 700),
      text(40, 68, '1~', 13, 600),
    ],
    terminals: [
      term('L', 'L', 'Line', 40, 0, 'io', 'up'),
      term('N', 'N', 'Neutral', 40, 100, 'io', 'down'),
    ],
  },
  {
    id: 'motor-3ph-dol',
    name: 'Motor, three-phase induction (direct on line)',
    category: 'motors',
    reference: 'M',
    summary: 'Three-phase induction motor drawn with three supply terminals.',
    usage: 'Terminals U, V and W connect to L1, L2 and L3. The star or delta link at the terminal box is set to match the supply voltage on the nameplate.',
    tags: ['motor', 'three phase', '3 phase', 'induction', 'dol', 'direct on line', 'ac', 'machine'],
    width: 120,
    height: 100,
    body: [
      ...motorLead(20, 0, 30, 60, 70, true),
      line(60, 0, 60, 40),
      ...motorLead(100, 0, 30, 60, 70, true),
      circle(60, 70, 30),
      text(60, 68, 'M', 20, 700),
      text(60, 88, '3~', 13, 600),
    ],
    terminals: [
      term('U', 'U', 'Phase U (L1)', 20, 0, 'io', 'up'),
      term('V', 'V', 'Phase V (L2)', 60, 0, 'io', 'up'),
      term('W', 'W', 'Phase W (L3)', 100, 0, 'io', 'up'),
    ],
  },
  {
    id: 'motor-3ph-star-delta',
    name: 'Motor, three-phase induction (star-delta)',
    category: 'motors',
    reference: 'M',
    summary: 'Three-phase induction motor with all six winding ends brought out.',
    usage: 'Used with a star-delta starter: the contactors connect U2, V2, W2 together for star start, then reconnect the windings in delta for running.',
    tags: ['motor', 'three phase', '3 phase', 'induction', 'star-delta', 'star delta', 'wye', 'six terminal', 'ac', 'machine'],
    width: 120,
    height: 160,
    body: [
      ...motorLead(20, 0, 30, 60, 80, true),
      line(60, 0, 60, 50),
      ...motorLead(100, 0, 30, 60, 80, true),
      ...motorLead(20, 160, 130, 60, 80, false),
      line(60, 160, 60, 110),
      ...motorLead(100, 160, 130, 60, 80, false),
      circle(60, 80, 30),
      text(60, 78, 'M', 20, 700),
      text(60, 98, '3~', 13, 600),
    ],
    terminals: [
      term('U1', 'U1', 'Start of winding U', 20, 0, 'io', 'up'),
      term('V1', 'V1', 'Start of winding V', 60, 0, 'io', 'up'),
      term('W1', 'W1', 'Start of winding W', 100, 0, 'io', 'up'),
      term('W2', 'W2', 'End of winding W', 20, 160, 'io', 'down'),
      term('U2', 'U2', 'End of winding U', 60, 160, 'io', 'down'),
      term('V2', 'V2', 'End of winding V', 100, 160, 'io', 'down'),
    ],
  },
]
/* ---- Supply, transformers & earthing ---- */

const supply: SymbolDef = {
  id: 'supply-3ph-n-pe',
  name: 'Three-phase supply (L1 L2 L3 N PE)',
  category: 'power',
  reference: '',
  summary: 'Three-phase, four-wire supply with a protective earth conductor.',
  usage: 'Starting point of a distribution or motor circuit. L1–L3 are the phases, N the neutral and PE the protective earth.',
  tags: ['supply', 'source', 'mains', 'three phase', '3 phase', 'busbar', 'distribution', 'l1', 'l2', 'l3', 'neutral', 'earth', 'pe'],
  width: 200,
  height: 60,
  body: [
    line(0, 20, 200, 20),
    ...[20, 60, 100, 140, 180].map((x) => line(x, 20, x, 60)),
    ...['L1', 'L2', 'L3', 'N', 'PE'].map((t, i) => text(20 + 40 * i, 12, t, 12, 600)),
  ],
  terminals: [
    term('L1', 'L1', 'Phase L1', 20, 60, 'out', 'down'),
    term('L2', 'L2', 'Phase L2', 60, 60, 'out', 'down'),
    term('L3', 'L3', 'Phase L3', 100, 60, 'out', 'down'),
    term('N', 'N', 'Neutral', 140, 60, 'out', 'down'),
    term('PE', 'PE', 'Protective earth', 180, 60, 'out', 'down'),
  ],
}

const transformer: SymbolDef = {
  id: 'transformer',
  name: 'Transformer, two-winding',
  category: 'power',
  reference: 'T',
  summary: 'Two magnetically coupled windings that step voltage up or down.',
  usage: 'Left winding is the primary, right winding the secondary (1U1–1U2 and 2U1–2U2). Check the VA rating and turns ratio for the load.',
  tags: ['transformer', 'winding', 'step down', 'step up', 'isolation', 'control transformer', 'primary', 'secondary'],
  width: 120,
  height: 100,
  body: [
    line(40, 0, 40, 25),
    circle(40, 50, 25),
    line(40, 75, 40, 100),
    line(80, 0, 80, 25),
    circle(80, 50, 25),
    line(80, 75, 80, 100),
  ],
  terminals: [
    term('1U1', '1U1', 'Primary, start', 40, 0, 'in', 'up'),
    term('1U2', '1U2', 'Primary, end', 40, 100, 'in', 'down'),
    term('2U1', '2U1', 'Secondary, start', 80, 0, 'out', 'up'),
    term('2U2', '2U2', 'Secondary, end', 80, 100, 'out', 'down'),
  ],
}

const earth: SymbolDef = {
  id: 'earth',
  name: 'Earth (protective)',
  category: 'power',
  reference: 'PE',
  summary: 'Connection to the protective earth conductor.',
  usage: 'Bond exposed metalwork and the protective conductor here. Earth continuity must be maintained through the whole installation.',
  tags: ['earth', 'ground', 'protective earth', 'pe', 'bonding'],
  width: 40,
  height: 60,
  body: [line(20, 0, 20, 32), line(0, 32, 40, 32), line(7, 42, 33, 42), line(14, 52, 26, 52)],
  terminals: [term('PE', 'PE', 'Earth connection', 20, 0, 'io', 'up')],
}

/* ---- Measurement & indication ---- */

const meters: SymbolDef[] = [
  {
    id: 'energy-meter',
    name: 'Energy meter (kWh)',
    category: 'measure',
    reference: 'P',
    summary: 'Registers energy consumption in kilowatt-hours.',
    usage: 'Line and neutral pass through the meter on their way to the installation. Left terminals are the supply side, right terminals the load side.',
    tags: ['meter', 'energy', 'kwh', 'kilowatt hour', 'electricity meter', 'metering'],
    width: 120,
    height: 100,
    body: [
      rect(20, 0, 80, 100),
      line(20, 32, 100, 32),
      text(60, 72, 'kWh', 16, 600),
      line(0, 20, 20, 20),
      line(0, 80, 20, 80),
      line(100, 20, 120, 20),
      line(100, 80, 120, 80),
    ],
    terminals: [
      term('L-in', 'L', 'Line, supply side', 0, 20, 'in', 'left'),
      term('N-in', 'N', 'Neutral, supply side', 0, 80, 'in', 'left'),
      term('L-out', 'L', 'Line, load side', 120, 20, 'out', 'right'),
      term('N-out', 'N', 'Neutral, load side', 120, 80, 'out', 'right'),
    ],
  },
  {
    id: 'ammeter',
    name: 'Ammeter',
    category: 'measure',
    reference: 'PA',
    summary: 'Measures current.',
    usage: 'Connect in series with the load so the measured current flows through it. Use a current transformer for large currents.',
    tags: ['ammeter', 'current', 'amps', 'meter', 'instrument', 'measurement'],
    ...roundDevice(
      [text(40, 58, 'A', 24, 600)],
      term('1', 'IN', 'Current in', 40, 0, 'in', 'up'),
      term('2', 'OUT', 'Current out', 40, 100, 'out', 'down'),
    ),
  },
  {
    id: 'voltmeter',
    name: 'Voltmeter',
    category: 'measure',
    reference: 'PV',
    summary: 'Measures voltage.',
    usage: 'Connect in parallel (across) the load or supply being measured. Never connect it in series.',
    tags: ['voltmeter', 'voltage', 'volts', 'meter', 'instrument', 'measurement'],
    ...roundDevice(
      [text(40, 58, 'V', 24, 600)],
      term('1', '1', 'Measuring lead', 40, 0, 'io', 'up'),
      term('2', '2', 'Measuring lead', 40, 100, 'io', 'down'),
    ),
  },
  {
    id: 'lamp',
    name: 'Lamp / signal lamp',
    category: 'measure',
    reference: 'H',
    summary: 'Indicating (pilot) lamp or general lamp.',
    usage: 'Use as a pilot light for status such as RUN or FAULT, or as a lamp load in lighting circuits.',
    tags: ['lamp', 'pilot', 'indicator', 'signal', 'light', 'incandescent', 'status', 'led'],
    ...roundDevice(
      [line(18.8, 28.8, 61.2, 71.2), line(61.2, 28.8, 18.8, 71.2)],
      term('X1', 'X1', 'Lamp terminal', 40, 0, 'io', 'up'),
      term('X2', 'X2', 'Lamp terminal', 40, 100, 'io', 'down'),
    ),
  },
]

/* ---- Passive components ---- */

const passives: SymbolDef[] = [
  {
    id: 'resistor',
    name: 'Resistor',
    category: 'passive',
    reference: 'R',
    summary: 'Fixed resistor, non-polarised.',
    usage: 'Limits current or drops voltage. Either terminal can face the supply.',
    tags: ['resistor', 'resistance', 'fixed', 'ohm'],
    width: 40,
    height: 100,
    body: [line(20, 0, 20, 25), rect(8, 25, 24, 50), line(20, 75, 20, 100)],
    terminals: [term('1', '1', 'Terminal', 20, 0, 'io', 'up'), term('2', '2', 'Terminal', 20, 100, 'io', 'down')],
  },
  {
    id: 'variable-resistor',
    name: 'Variable resistor',
    category: 'passive',
    reference: 'R',
    summary: 'Resistor whose value can be adjusted.',
    usage: 'The diagonal arrow shows the resistance is adjustable, for example a rheostat or trimmer.',
    tags: ['resistor', 'variable', 'rheostat', 'potentiometer', 'trimmer', 'adjustable'],
    width: 40,
    height: 100,
    body: [
      line(20, 0, 20, 25),
      rect(8, 25, 24, 50),
      line(20, 75, 20, 100),
      line(4, 86, 34, 18),
      path('M36,14 L35.6,24.8 L28.3,21.5 Z', true),
    ],
    terminals: [term('1', '1', 'Terminal', 20, 0, 'io', 'up'), term('2', '2', 'Terminal', 20, 100, 'io', 'down')],
  },
  {
    id: 'capacitor',
    name: 'Capacitor',
    category: 'passive',
    reference: 'C',
    summary: 'Non-polarised capacitor.',
    usage: 'Stores charge between two plates. Used for power-factor correction, motor run and start duty, and filtering.',
    tags: ['capacitor', 'capacitance', 'condenser', 'power factor', 'filter'],
    width: 40,
    height: 100,
    body: [line(20, 0, 20, 42), line(4, 42, 36, 42), line(4, 58, 36, 58), line(20, 58, 20, 100)],
    terminals: [term('1', '1', 'Terminal', 20, 0, 'io', 'up'), term('2', '2', 'Terminal', 20, 100, 'io', 'down')],
  },
]

/* ---- Connections ---- */

const junction: SymbolDef = {
  id: 'junction',
  name: 'Junction',
  category: 'connect',
  reference: '',
  summary: 'A point where three or more wires meet, drawn as a solid dot.',
  usage:
    'Wires dropped onto another wire create one automatically. Place one by hand to branch a wire at an exact spot. Hold Alt and drag from the dot to start a wire from it.',
  tags: ['junction', 'node', 'tee', 'tap', 'branch', 'connection', 'dot', 'join'],
  width: 40,
  height: 40,
  bounds: { x: 12, y: 12, w: 16, h: 16 },
  body: [circle(20, 20, 4.5, true)],
  terminals: [term('1', '', 'Connection point', 20, 20, 'io', 'any')],
}

export const SYMBOLS: SymbolDef[] = [
  ...breakers,
  ...isolators,
  fuse,
  pushButtonNo,
  pushButtonNc,
  eStop,
  manualSwitch,
  changeoverSwitch,
  coil,
  contactor3p,
  ...contacts,
  ...overloadRelays,
  ...motors,
  supply,
  transformer,
  earth,
  ...meters,
  ...passives,
  junction,
]