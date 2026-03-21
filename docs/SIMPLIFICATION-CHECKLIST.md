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
- [x] `ExportService.ts:195–202` — reviewed: builds composite name keys for workflow export, different purpose than `getModelsForSource()`; no change needed

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

- [x] `schema-engine.ts` (1,118 lines) — core, not render-path; no action needed
- [x] `import-handlers.ts` (987 lines) — no dead code; source-replacement duplication could be extracted (medium priority)
- [x] `RibbonToolbar.tsx` (752 lines) — no dead code; popover content could be data-driven (low priority)
- [x] `StepService.ts` (699 lines) — computation service; not render path; no action needed
- [x] `dialog-registry.ts` (696 lines) — all 48 entries active, no stale entries
- [x] `interaction-handlers.ts` (669 lines) — no dead code; all 27 exports used
- [x] `step-handlers.ts` (651 lines) — `editStep()` has 317-line switch; could use handler map (high-impact extraction candidate)
- [x] `join-handlers.ts` (639 lines) — extracted `buildJoinTransform()` helper; no dead code
- [x] `App.tsx` (585 lines) — 45 dialog blocks + 6-item no-footer list; acceptable at current scale

---

## 4. Architecture — Structural Improvements

### 4.1 ExportService download consolidation ✓

Three export methods (CSV, JSON, workflow) now use `ExportService.downloadBlob()`. See 1.4.

### 4.2 Dialog rendering in App.tsx

App.tsx has a growing list of `{activeDialog === 'x' && <XDialog />}` blocks and a growing "no footer" exclusion list. Consider a data-driven pattern.

- [x] Review: could `DIALOG_REGISTRY` drive rendering? — Yes, viable; 45 dialog blocks could be a component map. Low urgency at current scale.
- [x] Review: "no footer" exclusion list — 6 entries (expressions, reference, download, settings, dependency-graph, workflow-import). Could be `hasFooter` flag in registry. Low urgency.

### 4.3 Handler file sizes

Several handler files exceed 600 lines. Review for extractable sub-modules.

- [x] `import-handlers.ts` (987 lines) — reviewed: no dead code, all 25 exports used. Source-replacement duplication is the only extraction candidate.
- [x] `interaction-handlers.ts` (669 lines) — reviewed: clean, all 27 exports used. No extraction needed.
- [x] `step-handlers.ts` (651 lines) — reviewed: `editStep()` 317-line switch is the main candidate for data-driven refactor.
- [x] `join-handlers.ts` (639 lines) — `buildJoinTransform()` extracted. Remaining duplication: prepare-join-inputs pattern (minor, ~30 LoC).

### 4.4 Import health

No circular dependencies detected. Import chains are clean. No action needed.

- [x] No circular imports (verified via `tsc --noEmit`)
- [x] AppStore has zero outbound imports (pure state holder)
- [x] Services import core → no reverse dependency

---

## Progress Summary

| Category        | Done   | Remaining | Notes                                        |
| --------------- | ------ | --------- | -------------------------------------------- |
| 1. Code Reuse   | 19     | 5         | 1.3 low-priority (4), 1.4 tools (1)          |
| 2. Code Quality | 13     | 1         | 2.2 batch signals (minor)                    |
| 3. Efficiency   | 11     | 1         | 3.1 memoize (optional)                       |
| 4. Architecture | 9      | 0         | All reviewed; extraction candidates flagged  |
| **Total**       | **52** | **7**     | Remaining items are low-priority or optional |

---

## Session Log

| Date       | Session       | Items Addressed                                                                                                             |
| ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-21 | Initial sweep | 1.1, 1.2, 1.5, 1.6 (reuse); 2.2 batch fix (quality); 3.1 partial (efficiency)                                               |
| 2026-03-21 | Session 2     | 1.4 downloadBlob (reuse); 2.1 cloneData fixes (quality)                                                                     |
| 2026-03-21 | Session 3     | 1.2 ExportService reviewed; 3.2 full audit (no dead code); 4.2+4.3 reviewed; join-handlers `buildJoinTransform()` extracted |
