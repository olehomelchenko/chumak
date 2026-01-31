# App Layer Refactoring Plan

> Architectural assessment and refactoring roadmap for the `src/app/` layer

**Date:** 2026-01-31
**Status:** Proposed

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

| Priority | Task                          | Effort    | Impact                            |
| -------- | ----------------------------- | --------- | --------------------------------- |
| **P1**   | Extract shared preview engine | 4-5 days  | Eliminates 10+ duplicates         |
| **P2**   | Extract validation framework  | 2-3 days  | Eliminates 5+ duplicates          |
| **P3**   | Decompose SytoApp             | 1-2 weeks | Enables testing, clear boundaries |
| **P4**   | Consolidate handler modules   | 3-4 days  | Reduces cognitive load            |
| **P5**   | Add handler tests             | 5-7 days  | Safety net for refactoring        |
| **P6**   | Extract dialog state factory  | 2-3 days  | Simplifies DialogStore            |
| **P7**   | Split oversized components    | 3-5 days  | Improves testability              |

---

## 4. Detailed Recommendations

### 4.1 Extract Preview Engine (P1)

**Create `src/app/handlers/preview-engine.ts`**

```typescript
export interface PreviewConfig {
  computePreview: () => PreviewResult | null;
  onSuccess?: (result: PreviewResult) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

export function createDebouncedPreview(config: PreviewConfig) {
  // Single implementation of debounced preview pattern
}

export function updatePreviewState(result: PreviewResult) {
  // Centralized DialogStore.previewState mutation
}

export function clearPreviewState() {
  // Single clear implementation
}
```

**Migration**: Replace all `debouncedUpdate*Preview()` functions with calls to shared engine.

### 4.2 Extract Validation Framework (P2)

**Create `src/app/handlers/validation-engine.ts`**

```typescript
export function validateExpression(
  expression: string,
  columns: string[],
  errorSignal: Signal<string | null>
): ValidationResult {
  // Single validation implementation
}

export function formatValidationError(error: Error, expression: string): string {
  // Consistent error formatting
}
```

**Migration**: Replace duplicate validation in filter, derive, regexp handlers.

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

### Phase 1: Foundation (Week 1-2)

- [ ] Extract preview engine → single source of truth
- [ ] Extract validation engine → eliminate duplicates
- [ ] Create test helpers for handler testing
- [ ] Add tests for preview and validation engines

**Deliverable**: Shared utilities, reduced duplication

### Phase 2: Handler Consolidation (Week 3-4)

- [ ] Build handler testing framework
- [ ] Add tests for critical handlers (join, import, aggregate)
- [ ] Consolidate handlers into logical groups
- [ ] Migrate handlers to use shared engines

**Deliverable**: Better test coverage, organized handler structure

### Phase 3: Architecture (Week 5-6)

- [ ] Decompose SytoApp into focused modules
- [ ] Remove AppStore proxy pattern
- [ ] Update components to use AppStore directly
- [ ] Refactor services to separate framework concerns

**Deliverable**: Clear separation of concerns, testable modules

### Phase 4: Polish (Week 7)

- [ ] Split oversized components
- [ ] Address remaining test gaps
- [ ] Update documentation (SPECIFICATION.md)
- [ ] Performance profiling

**Deliverable**: Maintainable component structure

---

## 6. Technical Debt Summary

| Issue                         | Severity  | Debt Cost        | Refactoring Effort |
| ----------------------------- | --------- | ---------------- | ------------------ |
| Duplicated preview/validation | 🔴 High   | ~2,000 LoC duped | 4-5 days           |
| SytoApp God Object            | 🔴 High   | Blocks testing   | 1-2 weeks          |
| Handler module explosion      | 🔴 High   | Cognitive load   | 3-4 days           |
| Oversized components          | 🟡 Medium | Hard to test     | 3-5 days           |
| Handler test coverage (16%)   | 🟡 Medium | Risky refactors  | 5-7 days           |
| Component test coverage (38%) | 🟡 Medium | Missing UI tests | 5-7 days           |
| DialogStore signal sprawl     | 🟡 Medium | Scaling problem  | 2-3 days           |

---

## Decision Log

| Date       | Decision                                                  | Rationale                                          |
| ---------- | --------------------------------------------------------- | -------------------------------------------------- |
| 2026-01-31 | Prioritize duplication removal over SytoApp decomposition | Higher ROI, lower risk, enables future refactoring |
| 2026-01-31 | Keep core layer unchanged                                 | Already well-structured, no issues identified      |

---

## References

- [SPECIFICATION.md](SPECIFICATION.md) - Current architecture documentation
- [DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md) - Development conventions
- [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) - Transform design analysis
