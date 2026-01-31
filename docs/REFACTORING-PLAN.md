# App Layer Refactoring Plan

> Architectural assessment and refactoring roadmap for the `src/app/` layer

**Date:** 2026-01-31
**Status:** In Progress (Phase 3 Foundation Complete)

---

## Executive Summary

The `src/core/` layer is well-structured with good separation of concerns. However, the `src/app/` layer has grown organically and now exhibits significant technical debt:

- **God object**: `syto-app.ts` at 1,491 LoC handling orchestration, state proxying, handlers, and events
- **Code duplication**: ~2,000 LoC of repeated preview/validation patterns across 15+ handler files
- **Handler sprawl**: 25 handler files with scattered, overlapping logic
- **Low test coverage**: 16% for handlers, 38% for components
- **Oversized components**: 7 components exceed 300 LoC mixing UI and business logic

**Recommendation**: Refactoring is warranted. Execute in phases over 6-7 weeks, starting with high-ROI duplication elimination.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Critical Issues](#2-critical-issues)
3. [Refactoring Priorities](#3-refactoring-priorities)
4. [Detailed Recommendations](#4-detailed-recommendations)
5. [Phased Roadmap](#5-phased-roadmap)
6. [Technical Debt Summary](#6-technical-debt-summary)

---

## 1. Current State Analysis

### What's Working Well

| Area                         | Assessment                                                          |
| ---------------------------- | ------------------------------------------------------------------- |
| **Core layer** (`src/core/`) | Excellent separation of concerns, 78% test coverage, pure functions |
| **Services concept**         | Good abstraction for business logic                                 |
| **Signal-based state**       | Modern, reactive pattern with Preact Signals                        |
| **Transform engine**         | Well-organized, thoroughly tested                                   |

### Structure Overview

```
src/app/                    [NEEDS REFACTORING] (~24k LoC)
├── stores/                 [Growing but centralized]
│   ├── AppStore.ts         (proxies 55+ signals)
│   └── DialogStore.ts      (561 LoC - dialog state)
│
├── components/             [Large, scattered UI] (66 components)
│   ├── App.tsx             (447 LoC)
│   ├── JoinDialog.tsx      (560 LoC)
│   ├── ColumnEditorDialog.tsx (458 LoC)
│   └── ... (63 more)
│
├── handlers/               [CRITICALLY SCATTERED] (25 files, ~3k LoC)
│   ├── dialog-handlers.ts  (605 LoC)
│   ├── join-handlers.ts    (652 LoC)
│   ├── import-handlers.ts  (709 LoC)
│   └── ... (22 more)
│
├── services/               [Core business logic] (7 files)
│   ├── StepService.ts      (435 LoC)
│   ├── DependencyService.ts (446 LoC)
│   └── ... (5 more)
│
└── syto-app.ts             [GOD OBJECT] (1,491 LoC)
```

---

## 2. Critical Issues

### 2.1 SytoApp God Object

`syto-app.ts` (1,491 LoC) simultaneously handles:

- State getters/setters (121 proxy pairs for AppStore)
- Handler delegation to 25+ handler modules
- Event listeners (keyboard, paste, click)
- Model/source management
- Import/export orchestration
- URL state synchronization

**Impact**: Impossible to test in isolation, unclear responsibility boundaries.

### 2.2 Duplicated Preview/Validation Patterns

Each dialog independently implements the same patterns:

```typescript
// This pattern exists 10+ times across handlers:
debouncedUpdateFilterPreview();
debouncedUpdateDerivePreview();
debouncedUpdateMergePreview();
debouncedUpdateSplitPreview();
// ... identical structure, different variable names
```

**Duplicated implementations**:

- 17 functions follow `debouncedUpdate*Preview()` pattern
- 219 lines of duplicate `DialogStore.previewState` mutations
- 5+ copies of expression validation logic

### 2.3 Handler Module Explosion

25 handler files with overlapping concerns:

| Handler Group     | Files                       | Issue                      |
| ----------------- | --------------------------- | -------------------------- |
| Expression-based  | filter, derive, regexp      | Duplicate validation logic |
| Multi-table       | join, append, merge, fold   | Duplicate preview patterns |
| Column operations | editor, pattern, text, date | Scattered column logic     |
| System            | dialog, step, helper        | Mixed responsibilities     |

### 2.4 Oversized Components

| Component              | Lines | Issues                                        |
| ---------------------- | ----- | --------------------------------------------- |
| JoinDialog.tsx         | 560   | Join config + key analysis + preview modal    |
| ColumnEditorDialog.tsx | 458   | Rename + select + remove mixed                |
| EdaPanel.tsx           | 440   | Stats + charts + brush selection              |
| GenerateDialog.tsx     | 432   | Generation logic + preview + column selection |
| ImportCsvDialog.tsx    | 324   | CSV parsing + header detection + JSON         |
| AppendDialog.tsx       | 324   | Model selection + column mapping              |

### 2.5 Test Coverage Gaps

| Layer          | Test Files | Coverage |
| -------------- | ---------- | -------- |
| Core           | 18         | 78% ✅   |
| App Services   | 4          | ~57% ⚠️  |
| App Components | 25         | ~38% ❌  |
| App Handlers   | 4          | ~16% ❌  |

---

## 3. Refactoring Priorities

| Priority | Task                          | Effort    | Impact                            | Status  |
| -------- | ----------------------------- | --------- | --------------------------------- | ------- |
| **P1**   | Extract shared preview engine | 4-5 days  | Eliminates 10+ duplicates         | ✅ Done |
| **P2**   | Extract validation framework  | 2-3 days  | Eliminates 5+ duplicates          | ✅ Done |
| **P3**   | Decompose SytoApp             | 1-2 weeks | Enables testing, clear boundaries | Pending |
| **P4**   | Consolidate handler modules   | 3-4 days  | Reduces cognitive load            | Pending |
| **P5**   | Add handler tests             | 5-7 days  | Safety net for refactoring        | Pending |
| **P6**   | Extract dialog state factory  | 2-3 days  | Simplifies DialogStore            | Pending |
| **P7**   | Split oversized components    | 3-5 days  | Improves testability              | Pending |

---

## 4. Detailed Recommendations

### 4.1 Extract Preview Engine (P1) ✅ COMPLETE

**Created `src/app/handlers/preview-engine.ts`** (~130 LoC, 15 tests)

```typescript
export interface PreviewResult {
  title: string;
  stats: string;
  columns: string[];
  newColumns?: string[];
  rows: DataRow[];
}

export interface PreviewHandle<TState = void> {
  trigger: (state?: TState) => void; // Debounced update
  compute: (state?: TState) => void; // Immediate update
  cancel: () => void; // Cancel pending
  clear: () => void; // Clear preview state
}

export function createDebouncedPreview<TState>(config: {
  compute: (state: TState) => PreviewResult | null;
  onError?: (error: Error) => void;
  debounceMs?: number;
}): PreviewHandle<TState>;

export function updatePreviewState(result: PreviewResult): void;
export function clearPreview(): void;
```

**Migrated**: 13 handlers now use `createDebouncedPreview()` instead of local debounce timers.

### 4.2 Extract Validation Framework (P2) ✅ COMPLETE

**Created `src/app/handlers/validation-engine.ts`** (~170 LoC, 31 tests)

```typescript
export function validateExpression(
  expression: string,
  columns: string[],
  options?: { errorSignal?: Signal<string | null> }
): { valid: boolean; error: string | null; ast: ASTNode | null };

export function validateRegexPattern(
  pattern: string,
  options?: { errorSignal?: Signal<string | null>; flags?: string; errorPrefix?: string }
): { valid: boolean; error: string | null; regex: RegExp | null };

export function isExpressionValid(expression: string, columns: string[]): boolean;
export function isRegexValid(pattern: string, flags?: string): boolean;
```

**Migrated**:

- `filter-handlers.ts`, `derive-handlers.ts` → use `validateExpression()`
- `regexp-handlers.ts`, `split-handlers.ts`, `pattern-handlers.ts` → use `validateRegexPattern()`

### 4.3 Decompose SytoApp (P3)

Split 1,491-line `syto-app.ts` into focused modules:

```
src/app/
├── orchestration/
│   ├── AppOrchestrator.ts    (~400 LoC) - Init, model/source management
│   ├── EventRouter.ts        (~200 LoC) - Keyboard, paste, click handlers
│   ├── DialogCoordinator.ts  (~300 LoC) - Dialog open/close, state init
│   └── UrlStateSync.ts       (~150 LoC) - URL hash synchronization
```

**Key change**: Remove AppStore proxy pattern - components use AppStore directly.

### 4.4 Consolidate Handler Modules (P4)

Group 25 handler files into logical modules:

```
handlers/
├── expression/
│   ├── filter.ts
│   ├── derive.ts
│   ├── regexp.ts
│   └── validation-engine.ts
├── table/
│   ├── sort.ts
│   ├── slice.ts
│   └── sample.ts
├── multi-table/
│   ├── join.ts
│   ├── append.ts
│   └── merge.ts
├── column/
│   ├── editor.ts
│   ├── pattern.ts
│   └── date.ts
├── data-io/
│   ├── import.ts
│   ├── generate.ts
│   └── preview-engine.ts
└── system/
    ├── dialog.ts
    ├── step.ts
    └── interaction.ts
```

### 4.5 Split Oversized Components (P7)

| Component                | Split Into                                     |
| ------------------------ | ---------------------------------------------- |
| JoinDialog (560)         | JoinDialogUI + KeyPairAnalyzer + JoinPreview   |
| ColumnEditorDialog (458) | ColumnEditorUI + RenameEditor + SelectionPanel |
| EdaPanel (440)           | EdaPanelUI + ChartRenderer + BrushHandler      |
| GenerateDialog (432)     | GenerateDialogUI + GenerationPreview           |
| ImportCsvDialog (324)    | ImportDialogUI + CsvParserPanel                |

---

## 5. Phased Roadmap

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE

- [x] Extract preview engine → `src/app/handlers/preview-engine.ts` (~130 LoC)
- [x] Extract validation engine → `src/app/handlers/validation-engine.ts` (~170 LoC)
- [x] Migrate 7 handler files to use shared engines
- [x] Add tests for preview engine (15 tests) and validation engine (31 tests)

**Deliverable**: Shared utilities, reduced duplication

**Files migrated:**

- `merge-handlers.ts` - uses `createDebouncedPreview`, exports `clearPreview`
- `generate-handlers.ts` - uses `createDebouncedPreview`
- `regexp-handlers.ts` - uses `createDebouncedPreview` (2x), `validateRegexPattern`
- `filter-handlers.ts` - uses `createDebouncedPreview`, `validateExpression`
- `derive-handlers.ts` - uses `createDebouncedPreview`, `validateExpression`
- `split-handlers.ts` - uses `createDebouncedPreview`, `validateRegexPattern`
- `pattern-handlers.ts` - uses `validateRegexPattern` (3 places)

### Phase 2: Handler Consolidation (Week 3-4) ✅ COMPLETE

- [x] Migrate remaining handlers to preview-engine (6 handlers)
- [x] Build handler testing framework
- [x] Add tests for critical handlers (join, import, aggregate)
- [x] Consolidate handlers into logical groups (documentation)

**Deliverable**: Better test coverage, organized handler structure

**Files migrated (Phase 2):**

- `aggregate-handlers.ts` - uses `createDebouncedPreview`
- `fold-handlers.ts` - uses `createDebouncedPreview`
- `pivot-handlers.ts` - uses `createDebouncedPreview`
- `dedupe-handlers.ts` - uses `createDebouncedPreview`
- `text-handlers.ts` - uses `createDebouncedPreview`
- `date-handlers.ts` - uses `createDebouncedPreview`

**Testing framework created:**

- `test-utils.ts` (~150 LoC) - Shared testing utilities with:
  - `TestData` factory - Standard test datasets (simple, withNulls, numeric, joinPair, etc.)
  - `resetStores()` - Store reset helper
  - `setTestData()` - Test data setup
  - `createMockApp()` - Mock SytoApp factory
  - `expectPreviewState()` / `expectPreviewCleared()` - Preview assertions

**New test files (95 tests total):**

- `aggregate-handlers.test.ts` (26 tests) - Aggregation operations, groupby, rollup
- `import-handlers.test.ts` (42 tests) - Path resolution, header handling, data flattening
- `join-handlers.test.ts` (27 tests) - Key pair management, key analysis, target resolution

**Deferred to Phase 3:**

- `join-handlers.ts` preview integration - complex async pattern with dual state storage
- Physical handler consolidation into subdirectories (defer to align with SytoApp decomposition)

### Phase 3: Architecture (Week 5-6) 🔄 IN PROGRESS

- [x] Create orchestration module structure (`src/app/orchestration/`)
- [x] Extract EventRouter - keyboard, paste, click event handling
- [x] Extract UrlStateSync - URL hash synchronization
- [x] Extract DialogCoordinator - dialog lifecycle, snapshots, state management
- [x] Create AppOrchestrator - initialization, theme, transformation state
- [x] Refactor pagination-handlers to use stores directly (no `this` context)
- [ ] Migrate remaining handlers to store-based pattern
- [ ] Update components to use orchestration modules directly
- [ ] Remove AppStore proxy pattern from SytoApp

**Deliverable**: Clear separation of concerns, testable modules

**New orchestration modules created:**

```
src/app/orchestration/
├── index.ts           - Module exports
├── AppOrchestrator.ts - App init, theme, transformation state (~120 LoC)
├── EventRouter.ts     - Keyboard, paste, click event routing (~100 LoC)
├── UrlStateSync.ts    - URL hash synchronization (~180 LoC)
└── DialogCoordinator.ts - Dialog lifecycle, state, preview (~520 LoC)
```

**Refactored handlers:**

- `pagination-handlers.ts` - Now uses stores directly, no `this` context needed

### Phase 4: Polish (Week 7)

- [ ] Split oversized components
- [ ] Address remaining test gaps
- [ ] Update documentation (SPECIFICATION.md)
- [ ] Performance profiling

**Deliverable**: Maintainable component structure

---

## 6. Technical Debt Summary

| Issue                         | Severity     | Debt Cost        | Refactoring Effort | Status      |
| ----------------------------- | ------------ | ---------------- | ------------------ | ----------- |
| Duplicated preview/validation | ✅ Resolved  | ~2,000 LoC duped | 4-5 days           | **Done**    |
| SytoApp God Object            | 🟡 Improving | Blocks testing   | 1-2 weeks          | In Progress |
| Handler module explosion      | 🟡 Medium    | Cognitive load   | 3-4 days           | Phase 3     |
| Oversized components          | 🟡 Medium    | Hard to test     | 3-5 days           | Phase 4     |
| Handler test coverage (16%)   | ✅ Improved  | Risky refactors  | 5-7 days           | ~24%        |
| Component test coverage (38%) | 🟡 Medium    | Missing UI tests | 5-7 days           | Phase 4     |
| DialogStore signal sprawl     | 🟡 Medium    | Scaling problem  | 2-3 days           | Phase 3     |
| Handler `this` context        | 🟡 Improving | Hard to test     | 2-3 days           | In Progress |

---

## Decision Log

| Date       | Decision                                                   | Rationale                                                  |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| 2026-01-31 | Prioritize duplication removal over SytoApp decomposition  | Higher ROI, lower risk, enables future refactoring         |
| 2026-01-31 | Keep core layer unchanged                                  | Already well-structured, no issues identified              |
| 2026-01-31 | Phase 1 complete: preview-engine and validation-engine     | 7 handlers migrated, 46 new tests, all tests pass          |
| 2026-01-31 | Phase 2 migration: 6 additional handlers to preview-engine | 13 total handlers now use shared preview engine            |
| 2026-01-31 | Defer join-handlers.ts to Phase 3                          | Complex async pattern with dual state needs arch refactor  |
| 2026-01-31 | Created handler testing framework (test-utils.ts)          | Enables consistent testing patterns, reduces boilerplate   |
| 2026-01-31 | Added 95 new handler tests (aggregate, import, join)       | Critical handlers now tested, coverage improved to ~24%    |
| 2026-01-31 | Defer physical handler consolidation to Phase 3            | Better to align with SytoApp decomposition to reduce churn |
| 2026-01-31 | Phase 2 complete                                           | 232 total handler tests, testing framework established     |
| 2026-01-31 | Create orchestration module structure                      | Provides foundation for SytoApp decomposition              |
| 2026-01-31 | Extract EventRouter, UrlStateSync, DialogCoordinator       | Separates concerns into testable modules                   |
| 2026-01-31 | Refactor pagination-handlers to store-based pattern        | First handler migrated away from `this` context            |
| 2026-01-31 | Use hybrid callbacks pattern for handlers                  | Keep ExecutionCallbacks for UI, direct imports for state   |
| 2026-01-31 | Phase 3 foundation complete                                | Orchestration modules created, 1063 tests passing          |

---

## References

- [SPECIFICATION.md](SPECIFICATION.md) - Current architecture documentation
- [DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md) - Development conventions
- [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) - Transform design analysis
