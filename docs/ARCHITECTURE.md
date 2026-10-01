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
    ui/                   Inspector, ShapeView, PaletteButton, editor state types, key helpers
    actions/              pure operations on a document: history reducer, transform (rotate/flip),
                          align/distribute, selection, clipboard, fit-to-sheet checks
    io/                   persist (validate + load), export (SVG/PNG serialisers)
    model/                document types and geometry: types, geometry, notes, doc, routing, magnet,
                          shapes, wires, sheet (paper + title block), labels
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

## Known follow-up

`editor/Editor.tsx` is still one ~1,200 line component. The natural next cut is to move the pointer
state machine (`onPointerDown/Move/Up`) into a `useCanvasPointer` hook and the keyboard handler into
`useEditorKeys`, but that is best done alongside UI tests, which the project does not have yet.
