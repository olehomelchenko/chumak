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

_Status: 🚧 In Progress_

### Setup ✅

- [x] **Dependencies**: `preact`, `@preact/signals`, `@preact/preset-vite`, `@testing-library/preact`
- [x] **Vite Config**: Preact preset configured (TSX only, preserves decorator support in TS files)
- [x] **TSConfig**: JSX settings for Preact (`jsx: react-jsx`, `jsxImportSource: preact`)
- [x] **Testing**: Vitest + testing-library working with TSX components
- [x] **Bridge Wired**: PreactBridge connected to Alpine modal lifecycle

### Artifacts

- `src/app/components/PreactBridge.tsx` — `mountComponent()`, `unmountComponent()`
- `src/app/components/index.ts` — Barrel exports

**Migrated Components:**

- [x] `SortDialog.tsx` (was `sort-modal.html`)
- [x] `IndexDialog.tsx` (was `index-modal.html`)
- [x] `ReplaceDialog.tsx` (was `replace-modal.html`)
- [x] `SliceRowsDialog.tsx` (was `slice-rows-modal.html`)
- [x] `UnpivotDialog.tsx` (was `unpivot-modal.html` / "Fold")
- [x] `FilterDialog.tsx` (was `filter-modal.html`)
- [x] `PivotDialog.tsx` (was `pivot-modal.html`)
- [x] `DateDialog.tsx` (was `date-modal.html`)
- [x] `DeriveDialog.tsx` (was `derive-modal.html`)
- [x] `SplitDialog.tsx` (was `split-column-modal.html`)
- [x] `JoinDialog.tsx` (was `join-modal.html`)

### Remaining Dialogs to Migrate

Priority list based on complexity:

- [x] `AggregateDialog.tsx` (was `aggregate-modal.html`)

### Remaining Dialogs to Migrate

Priority list based on complexity:

- [x] `ImportCsvDialog.tsx` (was `import-csv-modal.html`)

### Remaining Dialogs to Migrate

Priority list based on complexity:

- [x] `ColumnEditorDialog.tsx` (was `column-editor-modal.html`)

### Remaining Dialogs to Migrate

Priority list based on complexity:

- [x] `SettingsDialog.tsx` (was `settings-modal.html`)

### Remaining Dialogs to Migrate

Priority list based on complexity:

_(All planned dialogs migrated)_

### Migration Recipe (SortDialog Example)

Use this pattern when converting a dialog from Alpine HTML to Preact TSX:

#### 1. Create the TSX Component

```tsx
// src/app/components/SortDialog.tsx
import { Signal } from '@preact/signals';

export interface SortDialogProps {
  columns: string[];
  field: Signal<string>;
  order: Signal<'asc' | 'desc'>;
}

export function SortDialog({ columns, field, order }: SortDialogProps) {
  return <div class="dialog-content">{/* Convert x-for to .map(), x-model to signal.value */}</div>;
}
```

#### 2. Add Component Tests

```tsx
// src/app/components/SortDialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';

it('selects column when clicked', () => {
  const field = signal('');
  render(<SortDialog columns={['a', 'b']} field={field} order={signal('asc')} />);
  fireEvent.click(screen.getByText('b'));
  expect(field.value).toBe('b');
});
```

#### 3. Wire to Alpine in `dialog-handlers.ts`

```typescript
// At module level:
import { signal, effect } from '@preact/signals';
import { mountComponent, unmountComponent } from '../components/PreactBridge';
import { SortDialog } from '../components/SortDialog';

let sortFieldSignal = signal('');
let sortOrderSignal = signal<'asc' | 'desc'>('asc');
let sortEffectCleanup: (() => void) | null = null;

// In initDialogState():
if (dialogName === 'sort') {
  this.sortDialogState = { field: this.columns[0] || '', order: 'asc' };

  const container = document.getElementById('sort-modal-container');
  if (container) {
    sortFieldSignal.value = this.sortDialogState.field;
    sortOrderSignal.value = this.sortDialogState.order;

    // Sync signals → Alpine state
    sortEffectCleanup = effect(() => {
      this.sortDialogState.field = sortFieldSignal.value;
      this.sortDialogState.order = sortOrderSignal.value;
    });

    mountComponent(container, SortDialog, {
      columns: this.columns,
      field: sortFieldSignal,
      order: sortOrderSignal,
    });
  }
}

// In closeDialog():
if (this.activeDialog === 'sort') {
  const container = document.getElementById('sort-modal-container');
  if (container) unmountComponent(container);
  sortEffectCleanup?.();
  sortEffectCleanup = null;
}
```

#### 4. Cleanup

- Remove template from `getTemplateConfigs()` in `model-handlers.ts`
- Delete `public/templates/sort-modal.html`

---

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
