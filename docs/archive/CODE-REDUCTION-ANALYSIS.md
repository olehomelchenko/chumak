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

## 4. TransformDialog.module.css Decomposition ✅ Done

**File**: `TransformDialog.module.css`
**Current cost**: 846 lines — the largest CSS file
**Savings**: Maintainability, not LoC
**Status**: Completed (March 2026)

Split into 11 purpose-specific CSS modules: `form-controls.module.css` (universal form elements), `expression-help.module.css` (expression docs UI), `column-editor.module.css` (drag/drop column lists), plus 8 dialog-specific modules (SettingsDialog, DownloadDialog, DateDialog, ImportCsvDialog, preview-table, WindowDialog, AggregateDialog, GenerateDialog). Updated 47 consumer file imports. Original file deleted.

---

## Summary

| Area                        | Current  | After              | Savings            | Priority |
| --------------------------- | -------- | ------------------ | ------------------ | -------- |
| Shortcut data table         | ~570 LoC | ~335 LoC           | **~235** ✅        | Done     |
| `deriveNextSchema` dedup    | ~65 LoC  | 1 helper + 5 calls | **~26** ✅         | Done     |
| AppController pass-throughs | ~712 LoC | ~430 LoC           | **~282** ✅        | Done     |
| TransformDialog.module.css  | 846 LoC  | 11 focused modules | maintainability ✅ | Done     |
| **Total**                   |          |                    | **~543 LoC**       |          |

All items completed.
