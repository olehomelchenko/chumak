# Dialog Migration Guide

> Migrating dialogs from global DialogStore state to local `useDialogState` hook pattern.
> Addresses [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) priorities 1 and 2.

---

## The Pattern

### Before (old style)

Each transform dialog requires ~13 files touched (5 new, 8 modified):

```
NEW  src/app/stores/dialogs/transform/xxx-state.ts     # signal definitions + reset
NEW  src/app/components/XxxDialog.tsx                   # UI component
NEW  src/app/handlers/transform/xxx-handlers.ts         # validation + apply
NEW  src/core/transforms/handlers/xxx.ts                # core transform
NEW  src/core/transforms/describers/xxx.ts              # step description
MOD  src/app/stores/dialogs/transform/index.ts          # barrel export
MOD  src/app/stores/dialogs/reset-registry.ts           # register reset fn
MOD  src/app/dialog-registry.ts                         # registry entry
MOD  src/app/orchestration/DialogCoordinator.ts         # init case
MOD  src/core/transforms/handlers/index.ts              # register handler
MOD  src/core/transforms/describers/index.ts            # register describer
MOD  src/core/schema-engine.ts                          # type definition
MOD  src/core/transforms/types.ts                       # KNOWN_TRANSFORM_KEYS
```

### After (new style)

~9 files (4 new, 5 modified). No state file, no handler file, no DialogCoordinator case:

```
NEW  src/app/components/XxxDialog.tsx                   # uses useDialogState
NEW  src/core/transforms/handlers/xxx.ts                # core transform (unchanged)
NEW  src/core/transforms/describers/xxx.ts              # step description (unchanged)
MOD  src/app/dialog-registry.ts                         # bridgedDialogEntry()
MOD  src/core/transforms/handlers/index.ts              # register handler
MOD  src/core/transforms/describers/index.ts            # register describer
MOD  src/core/schema-engine.ts                          # type definition
MOD  src/core/transforms/types.ts                       # KNOWN_TRANSFORM_KEYS
```

---

## Infrastructure (completed)

| File                                         | Purpose                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/app/hooks/useDialogState.ts`            | Local signal state with bridge to existing lifecycle                             |
| `src/app/hooks/useTransformPreview.ts`       | Debounced preview hook wrapping `createDebouncedPreview()`                       |
| `src/app/infrastructure/executeTransform.ts` | Direct transform execution without callback wiring                               |
| `src/app/stores/DialogStore.ts`              | Bridge signals: `activeDialogState`, `activeDialogHasError`, `activeDialogError` |
| `src/app/dialog-registry.ts`                 | `bridgedDialogEntry()` helper                                                    |

---

## Lessons Learned

### Batch 3: verify implementation before trusting this checklist

During batch 3, the Preview column in the checklist below said "No" for regexpMatch and regexpExtract. The actual code had debounced preview via `createDebouncedPreview()` in `regexp-handlers.ts`. Trusting the checklist over the code led to:

1. **Preview dropped** — regex match/extract live preview was deleted with the handler file. Caught in review, restored via `useTransformPreview` hook.
2. **Inline validation regressed** — the old pattern-handlers set `error.value` on the dialog's signal (inline display). The new apply handlers called `cb.onError()` (toast). Caught in review, fixed by adding real-time `validatePattern()` on input.

**Rule for future batches:** Before migrating a dialog, read the handler file and component end-to-end. Do not rely on the Preview column or Complexity rating below — they may be inaccurate. Verify:

- Does the handler file have preview/debounce logic?
- Does the handler set error signals (inline) vs. call `cb.onError` (toast)?
- Are there quick actions in `interaction-handlers.ts` that pre-configure state?
- Are there **external callers** beyond quick actions? Grep for the handler's apply function — EDA handlers (`eda-handlers.ts`, `EdaPanel.tsx`) and other components may call it directly, bypassing the dialog entirely. These callers should use `StepService.runTransform()` directly after migration.
- Are there non-obvious side effects (e.g., clearing other state, triggering callbacks)?

### Batch 4a: mock preview vs debounced preview

`useTransformPreview` wraps `createDebouncedPreview()` and expects a `PreviewResult` return type. Dialogs with **mock previews** (e.g., impute uses hardcoded sample data and writes `previewRows.value` directly) don't fit this pattern. Use plain `useSignalEffect` for mock previews instead of `useTransformPreview`.

### Batches 1–3: reviewed, no regressions found

All prior batches were reviewed commit-by-commit. No dropped functionality was found. The migration actually fixed a few latent issues (inconsistent index reset default, missing `isRegex` on replace editing).

---

## Migration Steps for Each Dialog

### 1. Update the dialog component

Replace `DialogStore.xxxState` imports with `useDialogState`:

```tsx
import { signal } from '@preact/signals';
import { useDialogState } from '../hooks/useDialogState';

export function XxxDialog() {
  const { state } = useDialogState(
    (ctx) => ({
      // Default values for new dialog
      field: signal<string>(ctx.editingStep?.xxx?.field ?? 'default'),
      // Use ctx.selectedColumns, ctx.columns, ctx.schema for context-aware defaults
    }),
    {
      hasError: (s) => !s.field.value, // Apply button disabled when true
      getError: (s) => (!s.field.value ? 'Field required' : null), // tooltip
    }
  );
  // ... render using state.field instead of DialogStore.xxxState.field
}
```

### 2. Update the dialog registry entry

Replace the old entry with `bridgedDialogEntry()`:

```ts
xxx: bridgedDialogEntry({
  name: 'xxx',
  title: 'Xxx',
  type: 'slide-panel',
  applyHandler: async (cb) => {
    const state = DialogStore.activeDialogState.value;
    if (!state) return;
    // validate + call StepService.runTransform(...)
  },
}),
```

### 3. Remove the DialogCoordinator init case

Replace the `case 'xxx':` block with a no-op (or remove entirely once all dialogs are migrated):

```ts
case 'xxx':
  break;  // state managed by useDialogState hook
```

### 4. Update `editStep()` in step-handlers.ts

Remove DialogStore population — the hook's factory reads `editingStep` from AppStore:

```ts
} else if (step.xxx) {
  // State initialized by useDialogState hook via editingStep context
  callbacks?.openDialog('xxx');
}
```

### 5. Check `activeDialogError()` in dialog-handlers.ts

If the dialog has a hardcoded case in the switch statement, replace it with the bridge signal:

```ts
case 'xxx':
  return DialogStore.activeDialogHasError.value;
```

### 6. Delete dead code

- Delete `src/app/stores/dialogs/xxx-state.ts`
- Remove its export from `src/app/stores/dialogs/{category}/index.ts`
- Remove from `DialogStore.ts` imports and static properties
- Delete the handler function from `src/app/handlers/transform/xxx-handlers.ts`. If the file is shared (e.g., `simple-handlers.ts`, `pattern-handlers.ts`), delete only the migrated function; if the file was dedicated to this dialog, delete the file.
- Remove handler import from `dialog-registry.ts` (if no remaining callers)
- **Grep for all callers** of the apply function — check `interaction-handlers.ts` (quick actions), `eda-handlers.ts`, `EdaPanel.tsx`, and any other direct callers. Actions that bypass the dialog should use `StepService.runTransform()` directly.

### 7. Update tests

- **Component tests**: Set up `AppStore` context instead of `DialogStore.xxxState`. Add `initializes from editing step` test.
- **Handler editing tests**: Remove assertions on `DialogStore.xxxState`, keep `openDialog` assertion.
- **DialogCoordinator tests**: Update `getDialogState`/`hasError` tests to use bridge signals.
- **UX tests**: Remove direct `DialogStore.xxxState` manipulation.

---

## Migration Checklist

### Transform Dialogs (Slide Panels)

| Dialog        | State file                | Handler file                | Preview    | Complexity | Status |
| ------------- | ------------------------- | --------------------------- | ---------- | ---------- | ------ |
| sort          | `sort-state.ts`           | `simple-handlers.ts`        | No         | Low        | Done   |
| sliceRows     | `slice-state.ts`          | `simple-handlers.ts`        | No         | Low        | Done   |
| sample        | `sample-state.ts`         | `sample-handlers.ts`        | No         | Low        | Done   |
| index         | `index-state.ts`          | `simple-handlers.ts`        | No         | Low        | Done   |
| replace       | `replace-state.ts`        | `simple-handlers.ts`        | No         | Medium     | Done   |
| impute        | `impute-state.ts`         | `simple-handlers.ts`        | Yes (mock) | Medium     | Done   |
| promoteHeader | `promote-header-state.ts` | `simple-handlers.ts`        | No         | Low        | Done   |
| conditional   | `conditional-state.ts`    | `pattern-handlers.ts`       | No         | Medium     | Done   |
| filter        | `filter-state.ts`         | `filter-handlers.ts`        | Yes        | High       | Done   |
| derive        | `derive-state.ts`         | `derive-handlers.ts`        | Yes        | High       | Done   |
| dedupe        | `dedupe-state.ts`         | `dedupe-handlers.ts`        | Yes        | High       |        |
| spread        | `spread-state.ts`         | `spread-handlers.ts`        | No         | Medium     |        |
| unroll        | `unroll-state.ts`         | `unroll-handlers.ts`        | No         | Medium     |        |
| split         | `split-state.ts`          | `split-handlers.ts`         | Yes        | High       |        |
| merge         | `merge-state.ts`          | `merge-handlers.ts`         | Yes        | Medium     |        |
| text          | `text-state.ts`           | `text-handlers.ts`          | Yes        | Medium     |        |
| date          | `date-state.ts`           | `date-handlers.ts`          | Yes        | High       |        |
| parseDate     | `parse-date-state.ts`     | `parse-date-handlers.ts`    | Yes        | Medium     |        |
| regexpMatch   | `regexp-match-state.ts`   | `regexp-handlers.ts`        | Yes        | Medium     | Done   |
| regexpExtract | `regexp-extract-state.ts` | `regexp-handlers.ts`        | Yes        | Medium     | Done   |
| fold          | `fold-state.ts`           | `fold-handlers.ts`          | Yes        | Medium     |        |
| pivot         | `pivot-state.ts`          | `pivot-handlers.ts`         | Yes        | High       |        |
| aggregate     | `aggregate-state.ts`      | `aggregate-handlers.ts`     | Yes        | High       |        |
| describe      | `describe-state.ts`       | `describe-handlers.ts`      | Yes        | Medium     |        |
| window        | `window-state.ts`         | `window-handlers.ts`        | Yes        | High       |        |
| selectPattern | `select-pattern-state.ts` | `pattern-handlers.ts`       | No         | Medium     | Done   |
| removePattern | `remove-pattern-state.ts` | `pattern-handlers.ts`       | No         | Medium     | Done   |
| renamePattern | `rename-pattern-state.ts` | `pattern-handlers.ts`       | No         | Medium     | Done   |
| column-editor | `column-editor-state.ts`  | `column-editor-handlers.ts` | No         | High       |        |

### Combine Dialogs

| Dialog | State file        | Handler file         | Preview | Complexity | Status |
| ------ | ----------------- | -------------------- | ------- | ---------- | ------ |
| join   | `join-state.ts`   | `join-handlers.ts`   | No      | High       |        |
| append | `append-state.ts` | `append-handlers.ts` | No      | High       |        |

### Non-Transform Dialogs (out of scope)

These don't follow the transform pattern and don't benefit from migration:

- `import-csv`, `import-url`, `import-text`, `generate` — handled by special switch case in `applyActiveTransform`
- `settings`, `download`, `type-conversion` — no apply handler
- `expressions`, `reference`, `dependency-graph`, `workflow-import` — reference/info dialogs

---

## Suggested Migration Order

**Batch 1 — Simple transforms, no preview (done):**
sort, sliceRows, sample

**Batch 2 — Simple transforms, no preview (done):**
index, promoteHeader, conditional

**Batch 3 — Medium transforms with expression/regex validation (done):**
replace, regexpMatch, regexpExtract, selectPattern, removePattern, renamePattern

**Batch 4 — Transforms with preview (`useTransformPreview`):**
impute, dedupe, filter, derive, split, date

**Batch 5 — Multi-field transforms (all have preview except spread/unroll):**
fold, merge, spread, unroll, text, parseDate, describe

**Batch 6 — High-complexity transforms (all have preview):**
aggregate, pivot, window, column-editor, join, append

> **Note:** The Preview column above was corrected after batch 3. Only spread and unroll
> lack preview — every other remaining dialog has `createDebouncedPreview()` in its handler file.
> Verify handler code before each migration; do not rely on this table alone.

---

## When Migration Is Complete

Once all transform dialogs are migrated:

1. **Delete `DialogCoordinator.initDialogState`** — the entire 332-line switch
2. **Delete `reset-registry.ts`** — no global state to reset
3. **Remove `createExecutionCallbacks()` / `setTransformCallbacks()`** — replaced by `executeTransform()`
4. **Remove callback wiring from `AppOrchestrator.wireHandlerCallbacks()`**
5. **Simplify `activeDialogError()` switch** in `dialog-handlers.ts` — all dialogs use bridge signal
6. **Remove unused `DialogStore` static properties** as their state files are deleted
