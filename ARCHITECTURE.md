# Architecture

Muriel is a React + TypeScript app with a hash router and no backend. The source is organised by
**feature** at the top level and by **layer** inside the editor. Dependencies only point downwards;
`src/architecture.test.ts` fails the build if that rule is broken.

## Layout

```
src/
  main.tsx              entry: fonts, global styles, mounts <App />
  app/                  shell: App (routes + lazy editor), Header, theme and toast hooks
  library/              the symbol library screen: Library, SymbolCard, SymbolDrawer
  editor/               the schematic editor (lazy-loaded chunk)
    Editor.tsx            canvas, pointer handling and layout (the one big component)
    ui/                   Inspector, ShapeView, PaletteButton, SheetTabs, ProjectPanel (sheets, nets,
                          net label fields), CommitField, editor state types, key helpers
    actions/              pure operations: history reducer (one sheet), project reducer (all sheets,
                          one undo history), transform (rotate/flip), align/distribute, selection,
                          clipboard, fit-to-sheet checks
    io/                   persist (validate + load, project migration), export (SVG/PNG serialisers)
    model/                document types and geometry: types, geometry, notes, doc, routing, magnet,
                          shapes, wires, sheet (paper, zones, title block), labels, project (sheets),
                          netlabel (names, what a label draws), nets (cross-references, issues)
    examples.ts           starter circuit
    __tests__/            cross-cutting integration tests
  symbols/              symbol definitions as data, plus how to draw them
    symbols.ts, primitives.ts, categories.ts, types.ts, scale.ts, geometry.ts   (data + sizing)
    Glyph.tsx             React renderer      svg.ts   standalone SVG serialiser      search.ts
  shared/               framework-light utilities with no feature knowledge
    geometry.ts (grid, Pt, Rect), router.ts, storage.ts, download.ts, print.ts, Icons.tsx
  styles/               tokens.css (design tokens), app.css, editor.css
```

## Dependency rules

```
app ──► library ──► symbols ──► shared
 │                    ▲
 └────► editor/ui ──► editor/actions ─┐
                  └─► editor/io ──────┼─► editor/model ──► symbols ──► shared
```

| Layer | May import from |
| --- | --- |
| `shared` | nothing |
| `symbols` | `shared` |
| `editor/model` | `shared`, `symbols` |
| `editor/actions`, `editor/io` | `shared`, `symbols`, `editor/model` |
| `editor/ui`, `editor/Editor.tsx` | everything in `editor`, plus `shared`, `symbols` |
| `library` | `shared`, `symbols` |
| `app` | everything above |

Practical consequences: the library never needs the editor to render a symbol, the editor's maths can
be tested without React, and the editor can stay a lazy chunk because nothing outside `app` imports it.

## Imports

Use the `@/` alias (`@/editor/model/geometry`) for anything outside the current folder and `./name`
for siblings. The alias is declared in `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`).

## Where does new code go?

- A new symbol: `symbols/symbols.ts` (tests in `symbols/symbols.test.ts` pick it up automatically).
- A new document field or shape of data: `editor/model/types.ts`, then `io/persist.ts` to validate it.
- A new edit operation: a pure function in `editor/actions/`, a case in `history.ts`, then wire the UI.
- A new export format: `editor/io/`.
- A new screen: a feature folder beside `library/` and a route in `shared/router.ts` + `app/App.tsx`.

## Sheets and net labels

A drawing is a **project**: an ordered list of sheets, each a `Doc` with a stable id (`model/project.ts`).
`actions/project.ts` wraps the single-document reducer: an edit is applied to the open sheet, and every
undo step is a snapshot of the sheet list (sheets are immutable, so a snapshot only costs the sheet that
changed). The open sheet is not part of the history; undo and redo switch to whichever sheet the change was
on. The project is stored under `es.project.v2`; a drawing saved earlier under `es.doc.v1` is wrapped as a
one-sheet project the first time it loads.

A **net label** is an ordinary library symbol (`net-label`, one terminal) whose `Item.net` holds its name.
Two labels are the same net when their names match, ignoring case and spacing, wherever they are in the
project. `model/nets.ts` derives everything from that: cross-references drawn under each label, the Nets
list, and the issues (a name used once, an unnamed label, a label with no wire, two names on one wire).
Nothing derived is stored, so it can never go stale. `model/netlabel.ts` draws the name inside the flag
and keeps it readable when the label is mirrored or upside down.

## Known follow-up

`editor/Editor.tsx` is still one ~1,200 line component. The natural next cut is to move the pointer
state machine (`onPointerDown/Move/Up`) into a `useCanvasPointer` hook and the keyboard handler into
`useEditorKeys`, but that is best done alongside UI tests, which the project does not have yet.
