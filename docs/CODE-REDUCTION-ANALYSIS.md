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

## 2. `deriveNextSchema` Branch Deduplication ✅ Done

**File**: `schema-engine.ts`
**Savings**: ~26 net LoC (1133 → 1107), 5 duplicated blocks → 1 shared helper
**Status**: Completed (March 2026)

Extracted `inferSchemaFromSample()` helper with options for the three behavioral variants (`updatePositions`, `promoteTypes`, `sampleSize`). Replaced verbatim blocks in: selectPattern, removePattern, join, lookup, concat/union. `renamePattern` kept its specialized rename-tracking logic. Branches with unique logic (aggregate, fold, pivot, window, split, spread) unchanged.

---

## 3. AppController Pass-Through Reduction ✅ Done

**File**: `AppController.ts`
**Savings**: ~282 net LoC (712 → 430)
**Status**: Completed (March 2026)

Removed all ~120 pure pass-through re-exports from AppController. Consumers (App.tsx, EventRouter.ts, keyboard-handlers.ts, AppOrchestrator.ts) now import handler functions directly. AppController retains only orchestration methods that compose multiple handler/service calls or inject callbacks (~40 methods). Also moved `initializePivotDialog` inline logic to `pivot-handlers.ts`.

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

| Area                        | Current  | After                      | Savings         | Priority |
| --------------------------- | -------- | -------------------------- | --------------- | -------- |
| Shortcut data table         | ~570 LoC | ~335 LoC                   | **~235** ✅     | Done     |
| `deriveNextSchema` dedup    | ~65 LoC  | 1 helper + 5 calls         | **~26** ✅      | Done     |
| AppController pass-throughs | ~712 LoC | ~430 LoC                   | **~282** ✅     | Done     |
| TransformDialog.module.css  | 846 LoC  | same LoC, better structure | maintainability | Low      |
| **Total**                   |          |                            | **~543 LoC**    |          |

Remaining: TransformDialog.module.css decomposition.
