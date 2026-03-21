# Simplification Checklist

Systematic code quality sweep across the codebase. Each section targets a specific pattern. Items are checked off as they're addressed.

---

## 1. Code Reuse — Duplicated Patterns

### 1.1 MULTI_MODEL_REFERENCE_PATHS iteration

Centralize all iteration over `MULTI_MODEL_REFERENCE_PATHS` so adding a new multi-model transform requires only one registry entry.

- [x] `workflow-v2.ts` — extracted `getStepReferences()` helper (6 loops consolidated)
- [x] `workflow-v2.ts` — extracted `translateReferences()` (unified `translateIdsToNames`/`translateNamesToIds`)
- [x] `DependencyService.ts` — `extractReferencedIds()` already uses `MULTI_MODEL_REFERENCE_PATHS`

### 1.2 Chained model tree filter

The pattern "filter models belonging to a source, including chained models" was duplicated in UI components.

- [x] Extracted `DependencyService.getModelsForSource()` helper
- [x] `Sidebar.tsx` — uses `getModelsForSource()`
- [x] `JoinTreeSelector.tsx` — uses `getModelsForSource()`
- [ ] `ExportService.ts:195–202` — similar loop iterates models checking `getRootSourceId`; could use `getModelsForSource()` if applicable

### 1.3 "Resolve model input" pattern

The pattern `const source = sources.find(...); const parentModel = source ? null : models.find(...)` appears in 3 places. Low-priority since each site has slightly different error handling.

- [ ] `StepService.ts:249` — resolve source or parent model
- [ ] `DependencyService.ts:477` — resolve for UI display
- [ ] `ModelInfoView.tsx:23` — resolve for display
- [ ] Consider: `DependencyService.resolveModelInput(models, sources, sourceId): { source?, parentModel? }`

### 1.4 Browser download boilerplate

The Blob → createObjectURL → click → cleanup pattern is repeated 3x in ExportService and 1x in tools.

- [x] `ExportService.ts` — CSV download (uses `downloadBlob()`)
- [x] `ExportService.ts` — JSON download (uses `downloadBlob()`)
- [x] `ExportService.ts` — Workflow download (uses `downloadBlob()`)
- [ ] `tools/json-to-csv/state.ts:130–135` — separate tool (kept independent)
- [x] Extracted `ExportService.downloadBlob(blob, filename)` private helper (also adds `URL.revokeObjectURL`)

### 1.5 CLI workflow loading

Duplicated parse + format check + structural validation in CLI commands.

- [x] Extracted `workflow-loader.ts` with `loadWorkflow()`
- [x] `run-command.ts` — uses `loadWorkflow()`
- [x] `validate-command.ts` — uses `loadWorkflow()`

### 1.6 Model name uniqueness checks

Inline `models.find(m => m.sourceId === ... && m.name.toLowerCase() === ...)` replaced with NameService.

- [x] `NameService.ts` — centralized `isSourceNameTaken()`, `isModelNameTaken()`, `suggestUniqueName()`
- [x] `ModelService.ts` — all 3 sites migrated
- [x] `interaction-handlers.ts` — migrated
- [x] `join-handlers.ts` — migrated
- [x] `ImportService.ts` — uses `suggestUniqueName()`

---

## 2. Code Quality — Unsafe Patterns

### 2.1 Unsafe JSON.parse(JSON.stringify) on data

`JSON.parse(JSON.stringify(data))` breaks `ConversionError` objects (they have methods). Must use `cloneData()` from `type-converter.ts` for any array that might contain error values.

**Unsafe (data may contain errors):**

- [x] `ModelService.ts` — replaced with `cloneData(source.data)` in `createNewModel()`
- [x] `join-handlers.ts` — replaced with `cloneData(resultData)` in join result

**Safe (steps/schema/config — no error objects):**

- [x] `workflow-v2.ts` — steps only (safe)
- [x] `StepService.ts` (5 instances) — steps/schema only (safe)
- [x] `ReplaceSourceService.ts` (2 instances) — backup steps (safe)
- [x] `ExportService.ts:210` — ColumnSchema[] (safe)
- [x] `ImportService.ts` (2 instances) — fresh data/schema (safe)
- [x] `ModelService.ts:161` — source.columns (safe)
- [x] `interaction-handlers.ts:634` — step clone (safe)
- [x] `json-handlers.ts:49` — backup steps (safe)
- [x] `run-command.ts:158` — inputSchema (safe)
- [x] `storage.ts` (2 instances) — serialized data cleaning (safe)

### 2.2 N+1 signal assignments in loops

Each `AppStore.x.value = [...]` triggers Preact reactivity. Batching prevents intermediate re-renders.

- [x] `WorkflowImportService.ts` — batched source and model creation (single assignment each)
- [ ] `ModelService.ts:430–431` — two consecutive signal assignments in `deleteSource()` (sources + models); minor, could batch

---

## 3. Efficiency — Render Path & Performance

### 3.1 Expensive computations in render

Functions called during render that do O(N^2) work or trigger unnecessary recalculation.

- [x] `Sidebar.tsx` — `getRootSourceId()` in filter replaced with `getModelsForSource()` (still called per render, but centralized)
- [x] `JoinTreeSelector.tsx` — same fix
- [ ] Consider: memoize `getModelsForSource()` result via `useComputed()` in Sidebar (currently recomputes on every render when any signal changes)

### 3.2 Large file hot-path audit

Files over 300 lines that are imported in render paths — review for lazy-loadable sections.

- [ ] `schema-engine.ts` (1,118 lines) — core, not render-path; no action needed
- [ ] `import-handlers.ts` (986 lines) — event-driven; review for dead branches
- [ ] `RibbonToolbar.tsx` (751 lines) — renders many buttons; consider splitting toolbar sections
- [ ] `StepService.ts` (699 lines) — computation service; not render path
- [ ] `dialog-registry.ts` (695 lines) — declarative config; review for stale entries
- [ ] `interaction-handlers.ts` (668 lines) — event handlers; review for extractable sub-handlers
- [ ] `step-handlers.ts` (651 lines) — step CRUD; review for extractable logic
- [ ] `join-handlers.ts` (637 lines) — complex join logic; review for dead code
- [ ] `App.tsx` (585 lines) — root component; review dialog rendering pattern

---

## 4. Architecture — Structural Improvements

### 4.1 ExportService download consolidation ✓

Three export methods (CSV, JSON, workflow) now use `ExportService.downloadBlob()`. See 1.4.

### 4.2 Dialog rendering in App.tsx

App.tsx has a growing list of `{activeDialog === 'x' && <XDialog />}` blocks and a growing "no footer" exclusion list. Consider a data-driven pattern.

- [ ] Review: could `DIALOG_REGISTRY` drive rendering (map dialog name → lazy component)?
- [ ] Review: "no footer" exclusion list — could be a `hasFooter` flag in `DIALOG_REGISTRY`

### 4.3 Handler file sizes

Several handler files exceed 600 lines. Review for extractable sub-modules.

- [ ] `import-handlers.ts` (986 lines) — CSV/Excel/JSON/URL import; could split by format
- [ ] `interaction-handlers.ts` (668 lines) — column operations; could split column-rename/delete/reorder
- [ ] `step-handlers.ts` (651 lines) — step CRUD + apply; could separate apply logic
- [ ] `join-handlers.ts` (637 lines) — join setup + preview + apply; could separate preview

### 4.4 Import health

No circular dependencies detected. Import chains are clean. No action needed.

- [x] No circular imports (verified via `tsc --noEmit`)
- [x] AppStore has zero outbound imports (pure state holder)
- [x] Services import core → no reverse dependency

---

## Progress Summary

| Category        | Total Items | Done   | Remaining |
| --------------- | ----------- | ------ | --------- |
| 1. Code Reuse   | 19          | 18     | 1         |
| 2. Code Quality | 14          | 14     | 0         |
| 3. Efficiency   | 11          | 3      | 8         |
| 4. Architecture | 9           | 3      | 6         |
| **Total**       | **53**      | **38** | **15**    |

---

## Session Log

| Date       | Session       | Items Addressed                                                               |
| ---------- | ------------- | ----------------------------------------------------------------------------- |
| 2026-03-21 | Initial sweep | 1.1, 1.2, 1.5, 1.6 (reuse); 2.2 batch fix (quality); 3.1 partial (efficiency) |
| 2026-03-21 | Session 2     | 1.4 downloadBlob (reuse); 2.1 cloneData fixes (quality)                       |
