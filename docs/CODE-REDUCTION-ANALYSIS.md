# Code Reduction Analysis

**Date**: March 2026
**Scope**: Patterns that were reasonable at small scale but became repetitive as the codebase grew

---

## 1. Shortcut Handlers → Data Table ✅ Done

**Files**: `shortcut-handlers.ts`, `AppController.ts`, `RibbonToolbar.tsx`
**Savings**: ~490 LoC → achieved ~235 net reduction (-533/+298)
**Status**: Completed (March 2026)

Replaced 25 individual shortcut functions with a declarative `SHORTCUT_REGISTRY` array + single `executeShortcut(id, callbacks)` function. AppController proxies a single method. RibbonToolbar renders popovers data-driven via `renderShortcutSections()`. Adding a new shortcut is now a one-line registry entry.

---

## 2. `deriveNextSchema` Branch Deduplication

**File**: `schema-engine.ts`
**Current cost**: ~600 LoC (method body), 1133 LoC total file
**After refactor**: ~250 LoC method body
**Savings**: ~350 LoC
**Priority**: Medium

### Problem

`deriveNextSchema()` has 15+ branches for different transform types. Many share the same "infer schema from sample data, preserving known columns" pattern:

```ts
if (sampleData && sampleData.length > 0) {
  const names = Object.keys(sampleData[0]);
  return names.map((name, i) => {
    const existing = currentSchema.find((c) => c.name === name);
    if (existing) return { ...existing };
    const sample = sampleData.slice(0, 20).map((row) => row[name]);
    return { name, type: this.inferType(sample), format: {}, originalPosition: i };
  });
}
```

This exact block (or close variants) appears in: join, lookup, selectPattern, removePattern, renamePattern, concat/union, split, spread — **6-7 times verbatim**.

### Solution

Extract a helper:

```ts
inferSchemaFromSample(
  currentSchema: ColumnSchema[],
  sampleData: Record<string, any>[],
  options?: { preserveExisting?: boolean; sampleSize?: number }
): ColumnSchema[]
```

Each branch that currently repeats this pattern calls the helper instead. Branches with unique logic (aggregate, fold, pivot, window) keep their specialized code.

---

## 3. AppController Pass-Through Reduction

**File**: `AppController.ts`
**Current cost**: ~737 LoC, of which ~400 are pure re-exports
**After refactor**: ~350 LoC
**Savings**: ~300 LoC (gradual)
**Priority**: Low (stop the bleeding, don't refactor all at once)

### Problem

AppController was originally a class with `this` context, so proxying made sense. Now that handlers are standalone functions, ~80 entries are pure pass-throughs:

```ts
openDialog: DialogHandlers.openDialog,
closeDialog: DialogHandlers.closeDialog,
// ...
```

Components import `AppController` for everything, even dialog-specific functions like `validateFilterExpression` or `debouncedUpdateSplitPreview` that are only used in one dialog component.

### Solution

- **Keep AppController** as the public API for cross-cutting actions (navigation, notifications, step management, settings).
- **Dialog-specific handlers** (preview, validation, state manipulation) should be imported directly by the dialog component that uses them. No need to route through AppController.
- **Stop adding new pass-throughs.** New handler functions go directly to the consuming component.
- Over time, remove pass-throughs that are only used by a single component.

---

## 4. TransformDialog.module.css Decomposition

**File**: `TransformDialog.module.css`
**Current cost**: 846 lines — the largest CSS file
**Savings**: Maintainability, not LoC
**Priority**: Low

### Problem

This file styles 15+ different dialog types: column editors, date option tables, download modals, theme pickers, JSON views, warning boxes, expression docs, radio/checkbox controls, and more. The name "TransformDialog" no longer reflects its contents.

### Solution

Split into purpose-specific modules when touching these areas:

- `form-controls.module.css` — inputs, labels, checkboxes, radio buttons, toggle buttons
- `expression-help.module.css` — dynamic docs, example grids, operator tags
- `column-editor.module.css` — drag/drop list, item styles
- Remaining dialog-specific styles stay with their component CSS modules

This makes dead CSS visible and prevents the file from growing further.

---

## Summary

| Area                        | Current  | After                      | Savings         | Priority      |
| --------------------------- | -------- | -------------------------- | --------------- | ------------- |
| Shortcut data table         | ~570 LoC | ~335 LoC                   | **~235** ✅     | Done          |
| `deriveNextSchema` dedup    | ~600 LoC | ~250 LoC                   | **~350**        | Medium        |
| AppController pass-throughs | ~400 LoC | ~100 LoC                   | **~300**        | Low (gradual) |
| TransformDialog.module.css  | 846 LoC  | same LoC, better structure | maintainability | Low           |
| **Total**                   |          |                            | **~1,140 LoC**  |               |

Recommended order: shortcuts first (highest payoff, self-contained), then schema engine, then gradual AppController cleanup.
