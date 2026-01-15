# Architectural Migration: From "JS Drag" to Robust TypeScript

This document outlines the roadmap for modernizing the Chumak codebase, moving away from legacy JavaScript patterns (Alpine.js, `any` types, and untyped HTML templates) toward a statically verified, component-based architecture using **Preact**, **TSX**, and **Signals**.

## The Goal

- **100% Type Safety**: Eliminate all `any` types in Core and UI logic.
- **Verified UI**: Use TSX to ensure templates are verified by the compiler.
- **UX Flow Testing**: Implement headless testing for all user interactions.
- **Decoupled Architecture**: Move away from the 1200+ line "God Object" (`ChumakApp`), target < 300 lines.

---

## Boundary Contract: Alpine ↔ Preact

During migration, both systems coexist. The contract:

- **Alpine owns**: Modal shell (open/close state), top-level app routing
- **Preact owns**: Everything inside modal body, component-local state
- **Communication**: Props passed on mount + custom events (`dispatchEvent`) for callbacks

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

| Category                      | Reason             |
| ----------------------------- | ------------------ |
| Alpine.js (`$nextTick`, etc.) | Removed in Phase 4 |
| Arquero table operations      | Library limitation |
| JSON handling (`flattenData`) | Inherently dynamic |
| Error catch blocks            | Runtime-determined |

---

## Phase 2: Componentization (The TSX Bridge)

_Status: ✅ Complete_

- [x] All dialogs migrated to Preact/TSX components.
- [x] PreactBridge providing seamless interop with Alpine.js.
- [x] Unit tests for all components.
- [x] HTML Templates removed.

---

## Phase 3: Reactive State & Decoupling

_Status: 🚧 In Progress_

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

- [ ] **Integration Tests**: Verify stores work correctly without the UI layer.
- [ ] **E2E Smoke Tests**: Ensure the critical path (Import -> Transform -> Export) works.

**Done when**: `ChumakApp` is a thin shell (< 300 lines) coordinating stores and services.

---

## Technical Debt: The Reactive Bridge

During Phase 3, we use a "Reactive Bridge" to maintain compatibility with Alpine.js while moving the Source of Truth to Preact signals.

### 1. The `_rev` Counter

`ChumakApp` contains a `_rev` (revision) property. An `effect` in the app's constructor observes all signals in `AppStore` and `DialogStore`. When any signal changes, `_rev` is incremented.

### 2. Signal Proxies

To prevent Alpine.js from attempting to wrap Preact signals (which causes recursion/performance issues), we use `Proxy` objects:

- **`DialogStore.createSignalProxy(state)`**: Creates a JS Proxy that maps property access/assignment to `.value` of the underlying signals.
- **Getters/Setters**: `ChumakApp` properties are now getters/setters that depend on `_rev` and return/update these proxies or raw signal values.

This architecture ensures a **Single Source of Truth** in signals while letting legacy Alpine.js templates "see" the data as normal JS properties.

## Phase 4: Final Modernization

_Status: 🚧 In Progress_

### 4a: Replace Top-Level Alpine (Section by Section)

- [x] **RibbonToolbar**: Converted to Preact component (`src/app/components/RibbonToolbar.tsx`).
  - Removed 268 lines of Alpine directives from `index.html`.
  - Uses `AppStore.ribbonTab` and `AppStore.currentData` signals directly.
  - Mounted via `main.ts` after Alpine starts.
- [ ] **Header**: Convert tabs and settings buttons.
- [ ] **Sidebar**: Convert Sources/Models tree and Steps list.
- [ ] **Main Content**: Convert data table, pagination, and toolbars.
- [ ] **Remove Alpine.js**: Delete the dependency and `x-data` from `<body>`.

### 4b: Cleanup

- [ ] **Template Cleanup**: Delete the `public/templates/` directory.
- [ ] **CI Enforcement**: Add `tsc --noEmit` and `vitest` to the build pipeline to ensure no regressions.

**Done when**: Alpine dependency removed, all templates deleted, CI passes.

---

## Why Preact + TSX?

1. **Popularity & Longevity**: Preact is a stable, well-maintained ecosystem.
2. **Static Verification**: The compiler checks your HTML syntax and property names.
3. **Familiarity**: Uses standard JSX/TSX patterns familiar to modern web developers.
4. **Performance**: Significantly smaller (~3KB) and faster than Alpine for complex data-heavy applications.
5. **Testing**: Allows for true headless UI testing from the terminal.
