# Cursor Rules for `electrical-schematics-app`

## 1. Project Structure

- **Entry Point**:  
  - The app starts at `src/index.tsx`, which renders the `App` component inside an `ErrorBoundary`.
  - The main UI composition is in `src/components/Layout.tsx`.

- **Component Organization**:  
  - All major UI components are in `src/components/`.
  - Symbol rendering logic is split between `SymbolElement.tsx` (Konva-based) and `SymbolSVG.tsx` (SVG-based).
  - The symbol catalog and related logic are in `src/symbols/`.

- **State Management**:  
  - Global state is managed with Zustand in `src/store/canvasStore.ts`.
  - All stateful actions (add, move, select, undo/redo, etc.) are defined as store actions.

- **Types**:  
  - All shared types and enums are in `src/types/index.ts`.

- **Utilities**:  
  - Symbol and wire creation helpers are in `src/utils/symbols.ts`.

## 2. Main Features & Flows

- **Symbol Library**:  
  - The symbol catalog is defined in `src/symbols/catalog.ts` as an array of `SymbolCatalogEntry`.
  - `SymbolLibrary.tsx` displays the catalog, supports search/filter, and drag-and-drop to the canvas.

- **Canvas Area**:  
  - `CanvasArea.tsx` is the main drawing surface, using Konva for rendering.
  - Handles drag-and-drop, grid snapping, zoom/pan, and selection.
  - All symbol and wire rendering is delegated to `SymbolElement.tsx` or `SymbolSVG.tsx`.

- **Properties Panel**:  
  - `PropertiesPanel.tsx` allows editing of selected elements' properties.
  - Supports batch editing and debounced updates.

- **Undo/Redo & Auto-save**:  
  - Implemented in the Zustand store (`canvasStore.ts`).
  - All state-changing actions should use store methods to ensure undo/redo works.

- **Export**:  
  - Export to PDF/SVG/PNG is stubbed; see `CanvasArea.tsx` for entry points.

## 3. Conventions

- **Component Naming**:  
  - Use PascalCase for React components.
  - Use camelCase for functions and variables.

- **Type Safety**:  
  - All components and functions should be fully typed.
  - Use types from `src/types/index.ts` for all symbol/wire/point data.

- **State Updates**:  
  - Always use Zustand store actions for modifying schematic state.
  - Never mutate state directly.

- **Symbol Catalog**:  
  - New symbols should be added to `src/symbols/catalog.ts` and follow the `SymbolCatalogEntry` structure.
  - Ensure connection points and display sizes are grid-aligned.

- **UI**:  
  - Use Material-UI components for layout and controls.
  - Keep UI responsive and accessible.

## 4. Navigation Tips

- **To add a new symbol**:  
  - Define it in `src/symbols/catalog.ts`.
  - If it needs a custom renderer, add it to `src/symbols/svgRenderers.tsx`.

- **To add a new tool or feature**:  
  - Update the tool enum/type in `src/types/index.ts`.
  - Add UI controls in `Layout.tsx` and logic in `CanvasArea.tsx` and/or the store.

- **To change state logic**:  
  - Edit `src/store/canvasStore.ts`.
  - Ensure all actions are undoable and update the correct state slices.

- **To update properties editing**:  
  - Edit `PropertiesPanel.tsx` and ensure changes propagate via the store.

## 5. Testing

- **Test files**:  
  - Basic tests are in `src/App.test.tsx`.
  - Add new tests alongside components or in a `__tests__` directory.

## 6. Miscellaneous

- **Error Handling**:  
  - Use `ErrorBoundary.tsx` for catching React errors.
- **Assets**:  
  - Place static images in `src/assets/` or `public/`.

---

**How to use these rules:**  
- Start at `Layout.tsx` to understand the UI structure.
- Use `canvasStore.ts` to trace all stateful logic.
- Refer to `catalog.ts` and `svgRenderers.tsx` for symbol definitions and rendering.
- Use the types in `types/index.ts` for all data structures. 