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

_Status: POC in progress (see `SortDialog.tsx`)_

- [ ] **Testing Setup Spike**: Confirm `@testing-library/preact` works with existing Vitest + happy-dom config.
- [ ] **Introduce Signals Early**: Add `@preact/signals` alongside first TSX components (no need to wait for Phase 3).
- [ ] **Create Component Library**: Move UI from `public/templates/*.html` to `src/app/components/*.tsx`.
- [ ] **UX Testing**: Add `*.test.tsx` for components using `@testing-library/preact`.
- [ ] **Mounting Bridge**: Implement a lightweight bridge to render Preact components inside the existing Alpine modal shell.
- [ ] **Data-Driven UI**: Ensure all component props are strictly typed to the interfaces defined in Phase 1.

**Done when**: All transform dialogs are TSX components with passing tests.

## Phase 3: Reactive State & Decoupling

_Merged from original Phases 3 & 4 — these can proceed together_

- [ ] **State Encapsulation**: Move dialog-specific logic (e.g., debouncing previews) out of `ChumakApp` and into component-local signals or dedicated stores.
- [ ] **Proxy Removal**: Stop relying on Alpine's recursive proxy, which causes circular reference errors.
- [ ] **Service Pattern**: Move Import/Export and Storage logic into dedicated, injectable services.
- [ ] **Eliminate Mix-ins**: Replace `.call(this)` pattern with proper composition or class instances.
- [ ] **Functional Transforms**: Ensure `src/core/transforms.ts` remains pure and separate from UI state.

**Done when**: `ChumakApp` is under 300 lines; no `.call(this)` or `(this as any)` patterns remain.

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
