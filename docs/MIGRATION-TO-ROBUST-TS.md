# Architectural Migration: From "JS Drag" to Robust TypeScript

This document outlines the roadmap for modernizing the Chumak codebase, moving away from legacy JavaScript patterns (Alpine.js, `any` types, and untyped HTML templates) toward a statically verified, component-based architecture using **Preact**, **TSX**, and **Signals**.

## The Goal

- **100% Type Safety**: Eliminate all `any` types in Core and UI logic.
- **Verified UI**: Use TSX to ensure templates are verified by the compiler.
- **UX Flow Testing**: Implement headless testing for all user interactions.
- **Decoupled Architecture**: Move away from the 1200+ line "God Object" (`ChumakApp`), target < 300 lines.

---

## Boundary Contract: Alpine ↔ Preact

~~During migration, both systems coexist.~~ **Alpine.js has been removed.** All UI is now Preact-based.

---

## Phase 1: Foundation & Type Integrity

_Status: ✅ Complete_

### Key Artifacts

- **`src/app/types.ts`**: All app state interfaces (`Source`, `Model`, `DataRow`, dialog states)
- **`src/core/schema-engine.ts`**: `TransformStep`, `ColumnSchema`
- **`src/core/transforms.ts`**: `TransformContext`, `FullTransformStep`

### Tooling

```bash
npm run typecheck  # Verify types before commits
```

### Remaining `any` (~200 instances)

| Category                          | Reason                            |
| --------------------------------- | --------------------------------- |
| ~~Alpine.js (`$nextTick`, etc.)~~ | ~~Removed in Phase 4~~ ✅ Removed |
| Arquero table operations          | Library limitation                |
| JSON handling (`flattenData`)     | Inherently dynamic                |
| Error catch blocks                | Runtime-determined                |

---

## Phase 2: Componentization (The TSX Bridge)

_Status: ✅ Complete_

- [x] All dialogs migrated to Preact/TSX components.
- [x] ~~PreactBridge providing seamless interop with Alpine.js.~~ PreactBridge removed (no longer needed).
- [x] Unit tests for all components.
- [x] HTML Templates removed.

---

## Phase 3: Reactive State & Decoupling

_Status: ✅ Complete_

**Goal**: Break the 1200+ line `ChumakApp` "God Object" into manageable execution units.

### 3a: Logic Extraction (Store & Service Pattern)

- [x] **Global Signal Store**: Centralize global app state (`sources`, `models`, `activeModel`) into `AppStore` using Preact signals.
- [x] **Dialog State Stores**: Moved all dialog logic and state from `ChumakApp` into `DialogStore`.
  - [x] All dialogs (Sort, Join, Filter, Derive, Aggregate, Pivot, replacement, split, dedupe, etc.) are now signal-based.
- [x] **Service Extraction**: Business logic moved into standalone services.
  - [x] **ModelService**: Source/Model lifecycle management.
  - [x] **ExportService**: CSV/JSON/Workflow exports.
  - [x] **ImportService**: Core source creation logic (JSON/CSV).
  - [x] **StepService**: Step computation, removal, and update logic.
  - [x] **PersistenceService**: Strategy for auto-save and IndexedDB (migrated from `core/storage.ts`).
- [x] **Remove Mix-ins**: Replaced the `(this as any)` and `.call(this)` patterns.
  - [x] All handlers refactored to use services and stores.
  - [x] Removed 100+ legacy `this` context issues.

### 3b: Core Separation

- [x] **Pure Transforms**: `src/core` remains framework-agnostic (only type imports from `src/app/types.ts`).
- [x] **Execution Engine**: `StepService.runTransform()` and `StepService.applyStepResult()` now handle all transform execution.
  - [x] `ExecutionCallbacks` interface bridges UI callbacks without coupling to `ChumakApp`.
  - [x] `helper-handlers.ts` provides `createExecutionCallbacks(app)` for legacy compatibility.

### 3c: Testing Strategy

- [x] **Unit Tests**: All dialog components have comprehensive unit tests (354 tests passing).
- [ ] **Integration Tests**: Verify stores work correctly without the UI layer.
- [ ] **E2E Smoke Tests**: Ensure the critical path (Import -> Transform -> Export) works.

**Done when**: `ChumakApp` is a thin shell (< 300 lines) coordinating stores and services.

---

## Technical Debt: The Reactive Bridge

~~During Phase 3, we use a "Reactive Bridge" to maintain compatibility with Alpine.js while moving the Source of Truth to Preact signals.~~

**Status: ✅ Removed**

The Alpine.js reactive bridge has been fully cleaned up:

- ~~`_rev` counter~~ - Removed
- ~~Reactivity bridge effect~~ - Removed
- ~~`$nextTick`, `$watch`, `$dispatch` properties~~ - Removed
- ~~Alpine directives in `index.html`~~ - Removed

### Remaining Pattern: Signal Proxies

`DialogStore.createSignalProxy(state)` remains as it provides a convenient interface for handlers to access signal values without `.value` syntax. This is not Alpine-specific and simplifies the handler code.

## Phase 4: Final Modernization

_Status: ✅ Complete_

### 4a: Replace Top-Level Alpine (Section by Section)

- [x] **RibbonToolbar**: Converted to Preact component (`src/app/components/RibbonToolbar.tsx`).
- [x] **Header**: Converted to Preact component (`src/app/components/AppHeader.tsx`).
- [x] **Sidebar**: Converted to Preact component (`src/app/components/Sidebar.tsx`).
- [x] **Main Content**: Converted to Preact component (`src/app/components/MainContent.tsx`).
  - Includes Data Table, Pagination, Empty State, and Dataset Info.
- [x] **Type Menu**: Converted to Preact component (`src/app/components/TypeMenu.tsx`).

### 4b: Remaining Migration Targets

- [x] **EDA Panel**: Converted to `EdaPanel.tsx`.
- [x] **Floating Toolbars**:
  - `ColumnToolbar.tsx`
  - `CellToolbar.tsx`
- [x] **Global UI Elements**:
  - `ToastContainer.tsx`
  - `GlobalDialogs.tsx` (Alert/Confirm/Prompt)
  - `StepRemovalDialog.tsx`
  - `StatusBar.tsx`
- [x] **App Shell**:
  - [x] Convert the Slide-in Panel and Centered Modal shells to a main `App.tsx` layout.
  - [x] Replace `src/main.ts` with `src/main.tsx` as the app entry point.
  - [x] Replace `index.html` body with a single `#app-root`.
  - [x] Remove `x-data="chumakApp()"` and Alpine dependency.
- [x] **Dialog Components Refactored to Store-Based**:
  - [x] `JoinDialog` - uses `DialogStore.joinState` directly
  - [x] `ColumnEditorDialog` - uses `DialogStore.columnEditorState` directly
  - [x] `ImportCsvDialog` - uses `DialogStore.importCsvState` directly
  - [x] `SettingsDialog` - uses `DialogStore.settingsState` directly
  - [x] `RegexpMatchDialog` / `RegexpExtractDialog` - use stores directly
  - [x] `DedupeDialog` / `DownloadDialog` / `ImportUrlDialog` - use stores directly

### 4c: Cleanup

- [x] **Template Cleanup**: Deleted `public/templates/` directory (dedupe-modal.html, download-modal.html, import-url-modal.html, regexp-extract-modal.html, regexp-match-modal.html).
- [x] **PreactBridge Removed**: `LegacyContainer.tsx` and `PreactBridge.tsx` deleted.
- [x] **Unused Imports Cleaned**: Removed `signal`, `effect`, `batch` from dialog-handlers.ts and other files.
- [ ] **CI Enforcement**: Add `tsc --noEmit` and `vitest` to the build pipeline to ensure no regressions.

**Done when**: ~~Alpine dependency removed, all templates deleted, CI passes.~~ ✅ Alpine removed, templates deleted. CI enforcement pending.

---

## Phase 5: Design Revamp & Code Hygiene (CSS Modules)

_Status: ✅ Complete (Initial Migration)_

**Goal**: Standardize component-scoped styling using CSS Modules, eliminating global CSS conflicts and removing brittle inline styles.

- [x] **Vite Integration**: Configured `generateScopedName` for readable class names in dev.
- [x] **Component Migration**:
  - [x] `Sidebar`: Migrated from `sidebar.css` + heavy inline styles.
  - [x] `EdaPanel`: Migrated from `eda-panel.css` + heavy inline styles.
  - [x] `DataTable`: Migrated from `table.css` + automated cell styling logic.
  - [x] `AppHeader` & `RibbonToolbar`: Migrated from global styles with better layout segregation.
  - [x] `App Shell`: Root layout moved to `App.module.css`.
- [x] **Global CSS Cleanup**:
  - [x] Deleted `sidebar.css`, `eda-panel.css`, `table.css`, `header.css`, `ribbon.css`.
  - [x] Removed imports from `index.css`.
- [x] **Logic Cleanup**:
  - [x] Removed `getCellClass` from `helper-handlers.ts`.
  - [x] Integrated dynamic styling directly into components using template literals and imported `styles`.

**Done when**: No component-specific styles remain in the global scope.

---

## Current State (Phase 5 in progress)

- **Typecheck**: ✅ Passes cleanly
- **Tests**: ✅ 354/354 passing
- **Build**: ✅ Successful production build
- **Alpine.js**: ✅ Removed from UI layer
- **HTML Templates**: ✅ All removed (100% TSX)
- **Styling**: ✅ Core components migrated to CSS Modules

### Remaining Technical Debt

1. **Integration/E2E Tests**: Not yet implemented.
2. **CI Pipeline**: Typecheck and test enforcement not yet added to build.
3. **CSS Modules Strategy (Remaining)**:
   - [ ] **Shared UI Components**:
     - [ ] `PaginationBar.tsx` (migrate from `pagination.css`)
     - [ ] `DatasetInfoView.tsx` (migrate from `dataset-info.css`)
     - [ ] `StatusBar.tsx` (migrate from `status-bar.css`)
     - [ ] `ToastContainer.tsx` (migrate from `toast.css`)
     - [ ] `TypeMenu.tsx` (migrate from global BEM classes)
   - [ ] **Contextual Toolbars**:
     - [ ] `ColumnToolbar.tsx` (currently mix of global/inline)
     - [ ] `CellToolbar.tsx` (currently mix of global/inline)
   - [ ] **Dialog System**:
     - [ ] `GlobalDialogs.tsx` & `StepRemovalDialog.tsx` (migrate from `modals.css`, `dialogs.css`, `step-removal.css`)
     - [ ] **Transform Dialog Dialogs** (Migrate from shared `modals.css`, `dialogs.css`, `forms.css`):
       - [ ] `AggregateDialog.tsx`
       - [ ] `ColumnEditorDialog.tsx`
       - [ ] `DateDialog.tsx`
       - [ ] `DeriveDialog.tsx`
       - [ ] `FilterDialog.tsx`
       - [ ] `ImportCsvDialog.tsx`
       - [ ] `JoinDialog.tsx`
       - [ ] `PivotDialog.tsx`
       - [ ] `RegexpExtractDialog.tsx` / `RegexpMatchDialog.tsx`
       - [ ] `SettingsDialog.tsx`
       - [ ] `SplitDialog.tsx`
       - [ ] `UnpivotDialog.tsx`
   - [ ] **Global CSS Audit**: Solidify what remains in `variables.css`, `base.css`, `typography.css`, `layout.css`, `buttons.css`, and `util.css`.

---

## Why Preact + TSX?

1. **Popularity & Longevity**: Preact is a stable, well-maintained ecosystem.
2. **Static Verification**: The compiler checks your HTML syntax and property names.
3. **Familiarity**: Uses standard JSX/TSX patterns familiar to modern web developers.
4. **Performance**: Significantly smaller (~3KB) and faster than Alpine for complex data-heavy applications.
5. **Testing**: Allows for true headless UI testing from the terminal.
