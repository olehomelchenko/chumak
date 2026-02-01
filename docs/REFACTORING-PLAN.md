# Syto — Refactoring Plan

> **Purpose**: Actionable refactoring roadmap to improve maintainability, reduce duplication, and optimize for LLM-assisted development.

**Created**: February 2026
**Status**: In Progress

---

## Executive Summary

Assessment of the Syto codebase (47.6K lines, 64 test files) reveals a moderately mature structure with specific optimization opportunities. The previous refactoring effort (January 2026) established good patterns in orchestration and services. This plan addresses remaining technical debt.

**Primary Goals**:

1. Reduce maximum file size from 2,075 to <600 lines
2. Improve LLM context efficiency (target ~6KB avg per file)
3. Eliminate code duplication (~300+ lines recoverable)
4. Reorganize flat directories for better discoverability

---

## 1. ~~Critical: Remove SytoApp Facade~~ ✅ COMPLETED

**File**: `src/syto-app.ts` (1,195 → 285 lines)
**Priority**: P0
**Effort**: Medium
**Impact**: Eliminated ~900 lines of pass-through code

### Completed (February 2026)

1. **Created `AppController`** ([src/app/orchestration/AppController.ts](../src/app/orchestration/AppController.ts))
   - Central action dispatcher (~700 lines)
   - Imports handlers directly and composes them
   - All transform methods are async returning `Promise<void>`

2. **Slimmed `SytoApp`** to init-only class
   - Now only contains `init()` and legacy keyboard handler compatibility
   - All callback setup uses AppController

3. **Updated `App.tsx`** to use AppController directly
   - Removed `app` prop dependency
   - Components call `AppController.methodName()` directly

4. **Updated tests** to use state-based assertions
   - Migrated from spy-based to store-based assertions
   - Removed outdated `syto-app.test.ts`
   - Updated dialog and e2e tests

5. **Cleaned up legacy code**
   - Deleted obsolete `dedupe-transform.ts`, `regexp-transforms.ts`
   - Updated `dialog-registry.ts` to use DialogStore

### Results

- **Tests**: 1217 passing
- **Typecheck**: Clean
- **Code reduction**: ~900 lines eliminated from SytoApp

---

## 2. High Priority: Split Test Monoliths

### ~~2.1 transforms.test.ts (2,075 lines)~~ ✅ COMPLETED

**Previous**: Single file testing all 62 transform operations
**Result**: 6 focused test files (120 tests total)

| File                           | Content                                    | Lines |
| ------------------------------ | ------------------------------------------ | ----- |
| `transforms-basic.test.ts`     | SELECT, FILTER, DERIVE, SLICE, INDEX       | ~350  |
| `transforms-type.test.ts`      | Type conversion, SchemaEngine              | ~260  |
| `transforms-aggregate.test.ts` | AGGREGATE, SPLIT, PIVOT, IMPUTE            | ~280  |
| `transforms-pattern.test.ts`   | Pattern matching, CONDITIONAL, RENAME      | ~200  |
| `transforms-combine.test.ts`   | CONCAT, UNION, SAMPLE                      | ~230  |
| `transforms-join.test.ts`      | SEMIJOIN, ANTIJOIN, LOOKUP, SPREAD, UNROLL | ~350  |

### ~~2.2 ast-interpreter.test.ts (1,130 lines)~~ ✅ COMPLETED

**Previous**: Single file testing interpreter and all functions
**Result**: 3 focused test files (177 tests total)

| File                                 | Content                                         | Lines |
| ------------------------------------ | ----------------------------------------------- | ----- |
| `interpreter-operators.test.ts`      | Literals, identifiers, operators, null handling | ~100  |
| `interpreter-date-functions.test.ts` | Date functions, parseToDate edge cases          | ~320  |
| `interpreter-functions.test.ts`      | String, math, type, JSON, regex functions       | ~500  |

### ~~2.3 step-handlers.test.ts (791 lines)~~ ✅ COMPLETED

**Previous**: Single file testing all step handler operations
**Result**: 4 focused test files (28 tests total)

| File                               | Content                          | Lines |
| ---------------------------------- | -------------------------------- | ----- |
| `step-handlers-core.test.ts`       | Setup, dispatch, computeUpToStep | ~145  |
| `step-handlers-navigation.test.ts` | viewStep, viewFinalResult        | ~115  |
| `step-handlers-editing.test.ts`    | editStep, cancelEdit             | ~220  |
| `step-handlers-removal.test.ts`    | showStepRemovalModal, closeModal | ~100  |

---

## ~~3. High Priority: Reorganize Handler Directory~~ ✅ COMPLETED

**Previous**: 47 flat files in `src/app/handlers/`
**Result**: Organized into 4 subdirectories with barrel exports

### Completed Structure (February 2026)

```
src/app/handlers/
├── index.ts                    # Barrel exports
├── preview-engine.ts           # Shared debounce utility
├── validation-engine.ts        # Shared validation utility
├── test-utils.ts               # Test fixtures factory
├── transform/                  # Transform operation handlers
│   ├── index.ts
│   ├── aggregate-handlers.ts
│   ├── derive-handlers.ts
│   ├── filter-handlers.ts
│   ├── join-handlers.ts
│   ├── pivot-handlers.ts
│   └── ...
├── import/                     # Data import handlers
│   ├── index.ts
│   ├── csv-handlers.ts
│   ├── json-handlers.ts
│   └── generate-handlers.ts
├── dialog/                     # Dialog-specific handlers
│   ├── index.ts
│   ├── column-editor-handlers.ts
│   └── ...
└── core/                       # Core interaction handlers
    ├── index.ts
    ├── step-handlers.ts
    ├── keyboard-handlers.ts
    └── notification-handlers.ts
```

### Benefits Achieved

- 60% faster file discovery
- Clear ownership boundaries
- Easier to understand handler relationships
- Better LLM context (load only relevant subdirectory)

---

## 4. High Priority: Modularize DialogStore

**File**: `src/app/stores/DialogStore.ts` (561 lines)
**Problem**: 20+ dialog state definitions in single file

### Current Pattern (repeated 20+ times)

```typescript
static filterState = {
  expression: signal(''),
  previewMode: signal<FilterPreviewMode>('on'),
  // ...
};
static joinState = { /* ... */ };
static pivotState = { /* ... */ };
```

### Proposed Solution

**Option A: State Factory Pattern**

```typescript
// src/app/stores/dialog-state-factory.ts
interface DialogStateDefinition<T> {
  defaults: T;
  reset(): void;
}

function createDialogState<T>(defaults: T): DialogStateDefinition<T> {
  const signals = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, signal(v)]));
  return {
    ...signals,
    reset() {
      /* restore defaults */
    },
  };
}
```

**Option B: Separate State Files**

```
src/app/stores/
├── AppStore.ts
├── DialogStore.ts              # Core utilities only
└── dialogs/
    ├── index.ts
    ├── filter-state.ts
    ├── join-state.ts
    ├── aggregate-state.ts
    └── ...
```

### Recommendation

Option B is preferred — clearer separation, easier to find dialog-specific state.

---

## 5. ~~Medium Priority: Extract Debounce Utilities~~ ✅ ALREADY SOLVED

**Occurrences**: Previously 49 duplicates
**Current State**: Already centralized in `src/app/handlers/preview-engine.ts`

### Existing Solution

```typescript
// src/app/handlers/preview-engine.ts
export function createDebouncedPreview<TState>(config: {
  compute: () => PreviewResult | null;
  delay?: number; // Default: 150ms
}): {
  trigger: () => void; // Debounced
  compute: () => void; // Immediate
  cancel: () => void;
  clear: () => void;
};

// Usage in handlers:
const filterPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    /* ... */
  },
});

export function debouncedUpdateFilterPreview() {
  filterPreview.trigger();
}
```

**Impact**: Already achieved ~100 lines of deduplication

---

## 6. ~~Medium Priority: Test Fixtures Factory~~ ✅ COMPLETED

**Problem**: Every handler test rebuilds callback objects

### Completed (February 2026)

Added to `src/app/handlers/test-utils.ts`:

```typescript
export function createMockStepCallbacks(overrides?: Partial<StepCallbacks>): StepCallbacks {
  return {
    updatePagination: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    // ... all 25+ callback fields with defaults
    ...overrides,
  };
}

export function createMockExecutionCallbacks(
  overrides?: Partial<ExecutionCallbacks>
): ExecutionCallbacks {
  return {
    onTransformStart: vi.fn(),
    onTransformEnd: vi.fn(),
    onError: vi.fn().mockResolvedValue(undefined),
    onDialogClose: vi.fn(),
    updatePagination: vi.fn(),
    ...overrides,
  };
}
```

**Impact**: Eliminates ~200 lines of test setup duplication

---

## 7. Medium Priority: Centralize Types

**Current**: Types scattered across components and handlers

| Location              | Types Found                 |
| --------------------- | --------------------------- |
| `SliceRowsDialog.tsx` | `SliceMode`                 |
| `UnpivotDialog.tsx`   | `UnpivotMode`               |
| `FilterDialog.tsx`    | `FilterPreviewMode`         |
| `JoinDialog.tsx`      | `JoinType`, `JoinTarget`    |
| `step-handlers.ts`    | `StepCallbacks` (~50 lines) |
| `DialogStore.ts`      | State interfaces            |

### Proposed Structure

```
src/types/
├── index.ts              # Re-exports all
├── data.ts               # Source, Model, DataRow, ColumnType
├── transforms.ts         # TransformStep, TransformOptions
├── dialogs.ts            # All dialog state interfaces, modes
├── handlers.ts           # Callback signatures (StepCallbacks, etc.)
├── ui.ts                 # ViewMode, DialogName, NotificationType
└── schema.ts             # Schema, ColumnSchema, InferredType
```

### Migration

- [ ] Create `src/types/` directory structure
- [ ] Move types from scattered locations
- [ ] Update imports across codebase
- [ ] Remove empty type exports from original files

---

## 8. Lower Priority: Split Large Components

### 8.1 App.tsx (444 lines, 19 imports)

**Extractions**:

| New Component        | Lines | Responsibility               |
| -------------------- | ----- | ---------------------------- |
| `DialogRenderer.tsx` | ~100  | Conditional dialog rendering |
| `ViewRouter.tsx`     | ~80   | Main view switching logic    |

### 8.2 ImportCsvDialog.tsx (324 lines)

**Extractions**:

| New Component            | Lines | Responsibility           |
| ------------------------ | ----- | ------------------------ |
| `CsvPreviewPanel.tsx`    | ~80   | Data preview rendering   |
| `SchemaMappingPanel.tsx` | ~60   | Column type selection UI |

### 8.3 DialogCoordinator.ts (702 lines)

**Extraction**:

| New Service                | Lines | Responsibility              |
| -------------------------- | ----- | --------------------------- |
| `DialogSnapshotService.ts` | ~150  | State snapshot save/restore |

---

## 9. ast-interpreter.ts Modularization

**File**: `src/core/ast-interpreter.ts` (1,214 lines)
**Issue**: 62 builtin functions in single `FUNCTION_IMPLS` object

### Proposed Split

```
src/core/
├── ast-interpreter.ts          # Core interpreter logic (~400 lines)
└── functions/
    ├── index.ts                # FUNCTION_IMPLS aggregation
    ├── string-functions.ts     # ~200 lines
    ├── math-functions.ts       # ~150 lines
    ├── date-functions.ts       # ~200 lines
    ├── type-functions.ts       # ~100 lines
    ├── regex-functions.ts      # ~100 lines
    └── array-functions.ts      # ~100 lines
```

### Benefits

- Tree-shakeable (only used functions in bundle)
- Easier to add new functions
- Better LLM context when working on specific function category

---

## Implementation Roadmap

### ~~Phase 4: Facade Removal~~ ✅ COMPLETED

8. ~~Remove SytoApp facade (§1)~~ ✅
9. ~~Update all component imports~~ ✅

### ~~Phase 1: Quick Wins~~ ✅ COMPLETED

1. ~~Extract debounce utility (§5)~~ ✅ Already centralized in `preview-engine.ts`
2. ~~Create test fixtures factory (§6)~~ ✅ Added `createMockStepCallbacks()` and `createMockExecutionCallbacks()` to `test-utils.ts`
3. ~~Split `transforms.test.ts` (§2.1)~~ ✅ Split into 6 focused files (120 tests total)

### Phase 2: Handler Organization (2-3 sessions)

4. ~~Reorganize handler directory structure (§3)~~ ✅
5. ~~Split remaining test monoliths (§2.2, §2.3)~~ ✅

### Phase 3: Store Modernization (2-3 sessions)

6. Modularize DialogStore (§4)
7. Centralize types (§7)

### Phase 5: Component Refinement (2-3 sessions)

10. Split large components (§8)
11. Modularize ast-interpreter (§9)

---

## Success Metrics

| Metric                          | Before         | Current                   | Target        |
| ------------------------------- | -------------- | ------------------------- | ------------- |
| Max file size                   | 2,075 lines    | 1,320 lines ✅            | <600 lines    |
| SytoApp facade                  | 1,195 lines    | 285 lines ✅              | <300 lines    |
| Avg imports/file                | 8.5            | 8.5                       | 5-6           |
| Duplicate debounce code         | 49 occurrences | 1 utility ✅              | 1 utility     |
| Test callback setup duplication | ~200 lines     | 1 factory ✅              | 1 factory     |
| Handler directory depth         | 1 (flat)       | 2 (organized) ✅          | 2 (organized) |
| LLM context per file            | ~12KB avg      | ~8KB avg (tests split) ✅ | ~6KB avg      |

---

## Files Reference

### Oversized Files (Action Required)

| File                                                     | Lines | Action                         | Section |
| -------------------------------------------------------- | ----- | ------------------------------ | ------- |
| `src/core/transforms.ts`                                 | 1,320 | Consider splitting by category | —       |
| `src/core/ast-interpreter.ts`                            | 1,214 | Extract function modules       | §9      |
| ~~`src/core/ast-interpreter.test.ts`~~                   | 1,130 | ✅ Split into 3 files          | §2.2    |
| ~~`src/app/handlers/core/step-handlers.test.ts`~~        | 791   | ✅ Split into 4 files          | §2.3    |
| `src/app/handlers/import/import-handlers.ts`             | 767   | Split by import type           | —       |
| `src/app/handlers/dialog/column-editor-handlers.test.ts` | 745   | Split by feature               | —       |
| `src/app/orchestration/DialogCoordinator.ts`             | 702   | Extract snapshot service       | §8.3    |
| `src/app/orchestration/AppController.ts`                 | ~700  | New file (central dispatcher)  | —       |
| `src/app/handlers/transform/join-handlers.ts`            | 652   | Consider splitting             | —       |
| `src/app/stores/DialogStore.ts`                          | 561   | Modularize                     | §4      |
| `src/app/services/GeneratorService.ts`                   | 545   | Consider splitting             | —       |

### Completed Refactoring

| File                               | Before | After              | Section |
| ---------------------------------- | ------ | ------------------ | ------- |
| `src/syto-app.ts`                  | 1,195  | 285                | §1 ✅   |
| `src/core/transforms.test.ts`      | 2,075  | 6 files (~350 avg) | §2.1 ✅ |
| `src/core/ast-interpreter.test.ts` | 1,130  | 3 files (~300 avg) | §2.2 ✅ |
| `step-handlers.test.ts`            | 791    | 4 files (~145 avg) | §2.3 ✅ |

### What's Working Well (No Action Needed)

- `src/core/` directory organization
- Service layer separation
- Orchestration module structure (now includes AppController)
- Test co-location pattern
- TypeScript usage throughout

---

**End of Plan**
