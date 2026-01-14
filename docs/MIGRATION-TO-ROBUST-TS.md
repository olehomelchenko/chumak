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

### 3a: Logic Extraction (Store Pattern)

- [x] **Dialog State Stores**: Move logic from `dialog-handlers.ts` into dedicated stores.
  - [x] SortDialog (Example)
  - [x] JoinDialog
  - [x] FilterDialog
  - [ ] Other dialogs...
- [ ] **Service Extraction**: Move `Import`, `Export`, and `Persistence` logic into standalone services.
- [ ] **Remove Mix-ins**: Replace the `(this as any)` and `.call(this)` patterns with direct store/service usage.

### 3b: Core Separation

- [ ] **Pure Transforms**: Ensure `src/core` remains framework-agnostic.
- [ ] **Execution Engine**: Isolate the code that actually runs the transforms from the UI that configures them.

### 3c: Testing Strategy

- [ ] **Integration Tests**: Verify stores work correctly without the UI layer.
- [ ] **E2E Smoke Tests**: Ensure the critical path (Import -> Transform -> Export) works.

**Done when**: `ChumakApp` is a thin shell (< 300 lines) coordinating stores and services.

## Phase 4: Final Modernization

### 4a: Replace Top-Level Alpine

- [ ] **Preact Root**: Replace Alpine's top-level `x-data` with a Preact root + signals store.
- [ ] **Remove Alpine.js**: Delete the dependency and the `x-data` / `x-model` attributes from `index.html`.

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
