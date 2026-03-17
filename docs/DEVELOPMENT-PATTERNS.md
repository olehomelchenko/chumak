# Syto — Development Patterns

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures and transform format
> - **[UX-SPECIFICATION.md](UX-SPECIFICATION.md)**: UI/UX design guidelines
> - **[I18N-GUIDE.md](I18N-GUIDE.md)**: Complete i18n reference

This document describes established patterns for developing Syto. Follow these conventions when adding features or modifying existing code.

---

## 0. AI Development Rules

**Prohibited Actions**:

- **NEVER** run `git add`, `git commit`, `git stash`, or `git push`.
- All staging and committing must be done by the USER.

---

## 1. Adding a New Transform

Adding a transform requires changes across multiple files. All transform logic must be **non-destructive** — sources immutable, transforms return new tables, no side effects. See [SPECIFICATION.md §4.1](SPECIFICATION.md) for the full non-destructive principles.

### 1.1 Checklist

**Core layer** (portable, no browser APIs):

| Step | File                                           | What to Add                                           |
| ---- | ---------------------------------------------- | ----------------------------------------------------- |
| 1    | `src/core/transforms/types.ts`                 | Add to `FullTransformStep` + `KNOWN_TRANSFORM_KEYS`   |
| 2    | `src/core/schema-engine.ts`                    | Add to `TransformStep` interface + schema propagation |
| 3    | `src/core/transforms/handlers/<category>.ts`   | Transform implementation                              |
| 4    | `src/core/transforms/handlers/index.ts`        | Register handler in `TRANSFORM_HANDLERS`              |
| 5    | `src/core/transforms/describers/<category>.ts` | Human-readable description                            |
| 6    | `src/core/transforms/describers/index.ts`      | Register describer in `TRANSFORM_DESCRIBERS`          |

**App layer** (dialog, state, UI):

| Step | File                                           | What to Add                                                   |
| ---- | ---------------------------------------------- | ------------------------------------------------------------- |
| 7    | `src/app/types.ts`                             | Add to `DialogName` union type                                |
| 8    | `src/app/stores/dialogs/<category>/*-state.ts` | Dialog state signals + reset function                         |
| 9    | `src/app/stores/dialogs/<category>/index.ts`   | Export new state                                              |
| 10   | `src/app/stores/DialogStore.ts`                | Import + add static field                                     |
| 11   | `src/app/handlers/transform/*-handlers.ts`     | Construct step, preview, apply handlers                       |
| 12   | `src/app/components/*Dialog.tsx`               | Dialog UI component                                           |
| 13   | `src/app/components/index.ts`                  | Export dialog component                                       |
| 14   | `src/app/components/App.tsx`                   | Render dialog in slide-panel section                          |
| 15   | `src/app/dialog-registry.ts`                   | Registry entry (`applyHandler`, `getState`, `getError`, etc.) |
| 16   | `src/app/components/RibbonToolbar.tsx`         | Ribbon button                                                 |

**i18n + docs + tests:**

| Step | File                                       | What to Add                                      |
| ---- | ------------------------------------------ | ------------------------------------------------ |
| 17   | `src/i18n/locales/{en,uk}/dialogs.json`    | Dialog title + dialog-specific strings           |
| 18   | `src/i18n/locales/{en,uk}/transforms.json` | Describer translation (with plural forms for UK) |
| 19   | `src/i18n/locales/{en,uk}/ui.json`         | Ribbon button label + title                      |
| 20   | `src/core/transforms-*.test.ts`            | Core logic tests                                 |
| 21   | `docs/DATA-SPECIFICATION.md`               | Transform documentation                          |
| 22   | `src/app/handlers/*`                       | Cycle check (if external ref, e.g. join/concat)  |

### 1.2 Adding a One-Click Shortcut (No Dialog)

For simple one-click transforms that wrap a single expression (e.g., `upper()`, `round()`, `year()`) or convert a column type, use the shortcut registry instead of the full checklist above:

1. Add one entry to `SHORTCUT_REGISTRY` in `src/app/handlers/transform/shortcut-handlers.ts`
2. Add i18n keys (`label`, `title`) in both `en/ui.json` and `uk/ui.json` under `ribbon.popovers.{category}.shortcuts`

No changes needed in `AppController`, `RibbonToolbar`, or other files — rendering and execution are data-driven.

### 1.3 Core Implementation (`transforms/handlers/`)

Transforms are organized into category files in `src/core/transforms/handlers/`. Pattern for transform logic:

```typescript
// In src/core/transforms/handlers/your-category.ts
export function applyYourTransform(
  table: ColumnTable,
  params: YourTransformParams,
  schema: ColumnSchema[]
): ColumnTable {
  const { param1, param2 } = params;

  // 1. Validate inputs
  if (!param1) {
    throw new Error('param1 is required');
  }

  // 2. Apply transformation using Arquero
  const result = table.derive({ newCol: (d) => d.existingCol * 2 });

  // 3. Return modified table
  return result;
}
```

Then register in `src/core/transforms/handlers/index.ts` and add a describer in `src/core/transforms/describers/`.

Key conventions:

- Each transform is a single-key object (only one transform type per step)
- Use Arquero verbs when possible (`filter`, `derive`, `select`, `groupby`, etc.)
- Throw descriptive errors for invalid inputs
- Handle null/undefined values gracefully

**Two expression styles in transforms:**

- **Row-wise** (derive, filter, conditional): Full AST pipeline — `parseExpression()` → `validateAST()` → `interpretAST()` per row. See §7.
- **Arquero op-based** (window, aggregate): String `"op.func('col')"` parsed by regex, called as `aq.op.func()`. Aggregate functions in window context **must** be wrapped with `aq.rolling(opResult, frame)` — plain `op.sum` in `derive()` gives the whole-group total, not a running aggregate. Default frame `[-Infinity, 0]` gives SQL-consistent cumulative behavior.

### 1.4 Schema Propagation (`schema-engine.ts`)

Every transform must define how it affects the schema:

```typescript
// In deriveNextSchema()
if (transform.yourTransform) {
  // Option A: Transform produces a new column set from sample data (join, lookup, selectPattern, etc.)
  if (sampleData && sampleData.length > 0) {
    return this.inferSchemaFromSample(currentSchema, sampleData, { updatePositions: true });
  }

  // Option B: Add/modify specific columns
  return [...schema, { name: outputColumn, type: 'string' }];

  // Option C: Remove columns
  return schema.filter((col) => col.name !== removedColumn);
}
```

For transforms that produce a new column set from sample data, use `inferSchemaFromSample()` instead of writing the inference loop manually. It accepts options: `updatePositions` (override `originalPosition`), `promoteTypes` (use `getPromotedType` for existing columns), `sampleSize` (default 20).

### 1.5 Dialog State (`stores/dialogs/`)

Dialog states are organized in `src/app/stores/dialogs/` by category (transform, column, aggregate, combine, text, pattern, import). Create a new state file in the appropriate category:

```typescript
// In src/app/stores/dialogs/<category>/your-transform-state.ts
import { signal } from '@preact/signals';
import { registerReset } from '../reset-registry';

export const yourTransformState = {
  param1: signal(''),
  param2: signal<string[]>([]),
  error: signal<string | null>(null),
  previewData: signal<DataRow[] | null>(null),
};

// Register reset function
registerReset(() => {
  yourTransformState.param1.value = '';
  yourTransformState.param2.value = [];
  yourTransformState.error.value = null;
  yourTransformState.previewData.value = null;
});
```

Then export from the category's `index.ts` and the main `dialogs/index.ts`.

### 1.6 Dialog Component

Standard dialog structure:

```tsx
export function YourTransformDialog() {
  const state = DialogStore.yourTransformState;
  const columns = AppStore.columns.value; // Available columns

  // Validation effect
  useSignalEffect(() => {
    const value = state.param1.value;
    if (!value) {
      state.error.value = 'Parameter is required';
    } else {
      state.error.value = null;
      debouncedUpdatePreview();
    }
  });

  return (
    <SlidePanel
      title="Your Transform"
      onClose={() => DialogStore.closeDialog('yourTransform')}
      footer={
        <button onClick={handleApply} disabled={!!state.error.value}>
          Apply
        </button>
      }
    >
      <div class={styles.field}>
        <ColumnSelector
          label="Target Column"
          columns={columns}
          selectedColumns={state.param1.value}
          onSelectionChange={(val) => (state.param1.value = val as string)}
          mode="single"
          display="chip"
        />
      </div>
      {state.error.value && <div class={styles.error}>{state.error.value}</div>}
    </SlidePanel>
  );
}
```

### 1.7 Handler Functions

Handlers are organized in `src/app/handlers/` subdirectories by category:

- `transform/` — aggregate, derive, filter, join, pivot handlers, etc.
- `import/` — csv, json, generate handlers
- `dialog/` — column-editor, interaction handlers
- `core/` — step, keyboard, notification handlers

Handlers use stores directly and leverage shared utilities from `preview-engine.ts` and `validation-engine.ts` at the handlers root.

**Using Preview Engine** (recommended for new handlers):

```typescript
import { createDebouncedPreview } from './preview-engine';

const previewHandle = createDebouncedPreview({
  compute: () => {
    // Read dialog state, build transform, apply to AppStore.currentTable
    // Return { title, stats, columns, newColumns, rows } or null
  },
  onError: (error) => {
    state.error.value = error.message;
  },
});

export const debouncedUpdatePreview = previewHandle.trigger;
export const clearYourTransformPreview = previewHandle.clear;
```

**Preview column selection**: Each transform handler decides which columns to show in its preview. Prefer showing columns relevant to the operation — e.g., derive shows columns referenced in the expression (via `computeTokens()` from `expression-token-extractor.ts`) + the output column; merge shows selected merge columns + output. Avoid arbitrary slicing like `columns.slice(0, N)`.

See existing handlers (e.g., `filter-handlers.ts`) for full examples including `applyTransform` and `StepService.runTransform` patterns.

**Using Validation Engine** (for expression/regex validation):

```typescript
import { validateExpression, validateRegexPattern } from './validation-engine';

// Returns { valid, ast } — writes error to signal automatically
validateExpression(expression, columns, { errorSignal: state.error });

// Returns { valid, regex }
validateRegexPattern(pattern, { errorSignal: state.error, flags: 'gi' });
```

**Callback Pattern** (for UI integration):

```typescript
let callbacks: YourHandlerCallbacks | null = null;

// Called by AppOrchestrator.wireHandlerCallbacks() during initialization
export function setCallbacks(cb: YourHandlerCallbacks) {
  callbacks = cb;
}

// Handlers use callbacks for UI operations
export function handleAction() {
  callbacks?.openDialog('yourDialog');
}
```

---

## 2. State Management

### 2.1 Two-Store Architecture

Syto uses two signal-based stores with distinct responsibilities:

| Store         | Purpose                                       | Lifetime         |
| ------------- | --------------------------------------------- | ---------------- |
| `AppStore`    | Application state (data, navigation, UI mode) | Session          |
| `DialogStore` | Form state for dialogs                        | Dialog lifecycle |

**AppStore** contains:

- Data state: `sources`, `models`, `currentTable`, `schema`
- Navigation: `activeSourceId`, `activeModelId`, `activeStepIndex`
- UI state: `selectedColumns`, `selectedCell`, `currentPage`
- Mode flags: `isJsonEditorOpen`, `isEdaVisible`

**DialogStore** contains:

- Per-dialog form values (inputs, selections)
- Validation errors
- Preview data
- Dialog open/close state

### 2.2 When to Use Each Store

```
User clicks "Filter" button
  → DialogStore.openDialog('filter')     // Dialog opens
  → DialogStore.filterState.expression   // Form input
  → DialogStore.filterState.error        // Validation feedback
  → DialogStore.filterState.previewData  // Preview rows

User clicks "Apply"
  → StepService.runTransform()           // Executes transform
  → AppStore.models updated              // New step added
  → AppStore.currentTable updated        // Data changes
  → DialogStore.closeDialog('filter')    // Dialog closes
  → DialogStore.resetAll()               // Form state cleared
```

### 2.3 Signal Patterns

Reading signals in components:

```tsx
// Direct read (triggers re-render on change)
const value = AppStore.someSignal.value;

// Computed (derived from other signals)
const hasData = computed(() => AppStore.sources.value.length > 0);
```

Writing signals:

```typescript
// Direct assignment
AppStore.someSignal.value = newValue;

// Batch updates (no built-in batching, just assign sequentially)
AppStore.signal1.value = value1;
AppStore.signal2.value = value2;
```

**Signal subscription trap**: Any `.value` read during a component's render — including inside helper functions called during render — subscribes that component to the signal. A parent component that calls `helperThatReadsSignal()` during render will re-render whenever that signal changes, cascading to all children. Use `useComputed()` to isolate derived values:

```tsx
// BAD: App subscribes to expression.value, error.value via hasError() internals
const dialogError = activeDialogHasError();

// GOOD: App subscribes only to the computed boolean result
const dialogError = useComputed(() => activeDialogHasError());
// use dialogError.value in JSX
```

Effects for side-effects:

```typescript
useSignalEffect(() => {
  // Runs when any accessed signal changes
  const expr = DialogStore.filterState.expression.value;
  validateExpression(expr);
});
```

---

## 3. Testing Patterns

### 3.1 Test Organization

| Test Type   | Location                        | Purpose                                  |
| ----------- | ------------------------------- | ---------------------------------------- |
| Unit        | `src/core/*.test.ts`            | Core logic (transforms, parsing, schema) |
| Integration | `src/core/integration.test.ts`  | Multi-step pipelines                     |
| Handler     | `src/app/handlers/*.test.ts`    | Handler logic and state management       |
| Component   | `src/app/components/*.test.tsx` | UI interaction                           |

### 3.2 Handler Test Utilities

Use shared utilities from `src/app/handlers/test-utils.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetStores, setTestData, TestData, suppressConsole } from './test-utils';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';

describe('your-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores(); // Reset all store signals
    setTestData(TestData.simple); // Load test data into stores
    consoleSpy = suppressConsole(); // Suppress console.error/warn
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  it('does something', () => {
    // Your test
  });
});
```

**Available Test Data**:

| Factory              | Description                              |
| -------------------- | ---------------------------------------- |
| `TestData.simple`    | Basic name/age/city data (3 rows)        |
| `TestData.withNulls` | Data with null values for impute testing |
| `TestData.numeric`   | Numeric columns for aggregation testing  |
| `TestData.joinPair`  | Two related datasets for join testing    |

**Preview Assertions**:

```typescript
import { expectPreviewState, expectPreviewCleared } from './test-utils';

// Assert preview has specific values
expectPreviewState({
  title: 'Filter',
  columns: ['name', 'age'],
  rowCount: 2,
});

// Assert preview is cleared
expectPreviewCleared();
```

### 3.3 Core Logic Tests

Pattern for core transform tests:

```typescript
import { describe, it, expect } from 'vitest';
import { applyTransform } from './transforms';
import { fromArrow } from 'arquero';

describe('yourTransform', () => {
  // Helper to create test data
  const createTestTable = () =>
    fromArrow({
      name: ['Alice', 'Bob', 'Carol'],
      age: [30, 25, 35],
    });

  it('transforms data correctly', () => {
    const table = createTestTable();
    const transform = { yourTransform: { param1: 'value' } };

    const result = applyTransform(table, transform, [
      { name: 'name', type: 'string' },
      { name: 'age', type: 'integer' },
    ]);

    expect(result.numRows()).toBe(3);
    expect(result.columnNames()).toContain('newColumn');
  });

  it('handles edge cases', () => {
    const table = createTestTable();
    const transform = { yourTransform: { param1: '' } };

    expect(() => applyTransform(table, transform, [])).toThrow('param1 is required');
  });
});
```

### 3.4 Component Tests

Pattern for dialog tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { YourDialog } from './YourDialog';
import { DialogStore } from '../stores/DialogStore';

describe('YourDialog', () => {
  beforeEach(() => {
    DialogStore.resetAll();
  });

  it('validates input on change', async () => {
    const { getByLabelText } = render(<YourDialog />);

    const input = getByLabelText('Parameter 1');
    fireEvent.input(input, { target: { value: 'test' } });

    expect(DialogStore.yourTransformState.error.value).toBeNull();
  });

  it('shows error for invalid input', async () => {
    const { getByLabelText } = render(<YourDialog />);

    const input = getByLabelText('Parameter 1');
    fireEvent.input(input, { target: { value: '' } });

    expect(DialogStore.yourTransformState.error.value).toBe('Parameter is required');
  });
});
```

### 3.5 Mocking Guidelines

When to mock:

| Scenario              | Mock?     | Approach                                  |
| --------------------- | --------- | ----------------------------------------- |
| External APIs (fetch) | Yes       | `vi.spyOn(global, 'fetch')`               |
| IndexedDB             | Yes       | Mock storage module                       |
| Arquero operations    | No        | Use real library                          |
| Signal stores         | Sometimes | Reset in `beforeEach`, mock for isolation |
| Date/time             | Yes       | `vi.useFakeTimers()`                      |

**Shared mock factories**: Handler tests must use `MockFactories` from `test-utils.ts` instead of inline mock definitions. This centralizes mock shapes so interface changes only need one update:

```typescript
vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);
```

Available factories: `stepService`, `stepServiceFull` (adds `applyStepResult`), `notificationHandlers`, `previewEngine`, `validationEngineExpression`, `validationEngineRegex`.

---

## 4. Error Handling

### 4.1 Error Types

| Type              | Where Used      | User Visibility                 |
| ----------------- | --------------- | ------------------------------- |
| Validation errors | Dialog forms    | Inline red text                 |
| Expression errors | Filter/Derive   | Formatted with position pointer |
| Transform errors  | Step execution  | Toast notification              |
| Data errors       | Type conversion | Error cell in table             |

### 4.2 Validation Errors

For form validation in dialogs:

```typescript
// Store error in dialog state
DialogStore.filterState.error.value = 'Expression is required';

// Display in component
{state.error.value && (
  <div class={styles.error}>{state.error.value}</div>
)}
```

### 4.3 Expression Errors

For user-written expressions, use the error formatter:

```typescript
import { formatError } from '../core/error-formatter';

try {
  const ast = parseExpression(expression);
  validateAST(ast, schema);
} catch (e) {
  // formatError creates multi-line message with position pointer
  const formatted = formatError(e, expression);
  DialogStore.filterState.error.value = formatted;
}
```

### 4.4 Data Errors (Error Cells)

Type conversion failures and expression evaluation errors produce `ConversionError` objects that live in data cells (Power Query-style). See [DATA-SPECIFICATION.md §8](DATA-SPECIFICATION.md#8-error-objects) for the full specification.

**Key rules**:

- Always use `isConversionError()` from `src/core/type-converter.ts` to detect error values — never inline duck-type `v.type === 'error'`.
- **Never use `structuredClone` on `model.data`** — `ConversionError` objects have `toString()`/`valueOf()` methods which `structuredClone` cannot clone (throws `DataCloneError`). Use `cloneData()` from `type-converter.ts` when a data backup is needed (e.g., error recovery). Prefer recomputing from source + steps over cloning when creating new models.

**Error propagation in expressions**: Errors propagate through arithmetic, comparisons, and logical operators (like `null` propagation). `??` and `coalesce()` treat errors as missing. `is_error(value)` detects errors in user expressions.

---

## 5. Performance Patterns

### 5.1 Debouncing

Use the preview engine for debounced previews (see §1.6). For other operations:

```typescript
// Using preview engine (preferred for transform previews)
import { createDebouncedPreview } from './preview-engine';

const previewHandle = createDebouncedPreview({
  compute: () => computePreview(),
  debounceMs: 150, // Optional, defaults to 150ms
});

// Manual debouncing (for non-preview operations)
let timer: number | null = null;

export function debouncedAction() {
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(() => {
    performAction();
  }, 150);
}
```

Standard debounce times:

- Expression validation: 150ms
- Preview updates: 150ms
- Search/filter UI: 200ms

### 5.2 Preview Row Limits

Limit preview data to avoid rendering large datasets:

```typescript
import { getPreviewRowLimit } from './helper-handlers';

const previewRows = result.objects().slice(0, getPreviewRowLimit());
// Default: 100 rows, configurable in UX settings
```

### 5.3 Metrics Collection

Use the metrics collector for timing and tracking transform operations:

```typescript
import { metricsCollector, getDataShape } from '../core/metrics';

// Option 1: Use the measure helper (automatic timing)
const result = await metricsCollector.measure(
  'Filter',
  inputData,
  { modelId: model.id, stepIndex: 2 },
  () => applyTransform(table, transform, columns)
);

// Option 2: Record metrics manually
const inputShape = getDataShape(table);
const start = performance.now();
const result = applyTransform(table, transform, columns);
const duration = performance.now() - start;
const outputShape = getDataShape(result);

await metricsCollector.record({
  transformType: 'Filter',
  durationMs: duration,
  success: true,
  inputRows: inputShape.rows,
  inputCols: inputShape.cols,
  outputRows: outputShape.rows,
  outputCols: outputShape.cols,
  metadata: { modelId: model.id },
});
```

Console logging icons indicate performance:

- ⚡ < 50ms (fast)
- ✓ 50-200ms (acceptable)
- ⏱️ 200-500ms (slow)
- ⚠️ > 500ms (needs attention)

Metrics are stored in IndexedDB and can be viewed as a virtual dataset in the sidebar. Users can enable/disable metrics collection and console logging in Settings.

### 5.4 Pagination

Large tables are paginated in the UI:

```typescript
// AppStore signals
pageSize: signal(100),
currentPage: signal(0),
totalPages: computed(() => Math.ceil(rowCount / pageSize))

// Only render current page
const startIdx = currentPage * pageSize;
const pageData = allData.slice(startIdx, startIdx + pageSize);
```

---

## 6. Data Flow

### 6.1 Transform Execution Flow

```
User clicks Apply
    ↓
applyActiveTransform() → dialog registry applyHandler
    ↓
Handler function (e.g., filter-handlers.applyFilterTransform)
    ↓
StepService.runTransform(label, transform, callbacks)
    ├─ callbacks.onTransformStart(label)     → AppStore.isTransforming = true
    ├─ transforms.applyTransform(table, transform, columns)
    ├─ StepService.applyStepResult(...)      → updates model + AppStore signals
    └─ callbacks.onTransformEnd()            → AppStore.isTransforming = false
    ↓
UI re-renders via signal subscriptions
```

**Key signals**: `AppStore.isTransforming` (boolean, true during execution) and `AppStore.transformMessage` (label string shown in StatusBar). Both are set/cleared by `AppController.startTransformation()`/`endTransformation()`, wired as callbacks via `AppOrchestrator`.

**Callbacks**: `ExecutionCallbacks` (defined in `StepService.ts`) are created by `createExecutionCallbacks()` in `helper-handlers.ts` and passed through handlers to `StepService`.

### 6.2 Dialog Lifecycle

```
1. Open:    DialogStore.openDialog('filter')
2. Input:   User types → signal updates → validation runs
3. Preview: Debounced preview computation → previewData signal
4. Apply:   Handler builds transform → StepService executes
5. Close:   DialogStore.closeDialog('filter')
6. Reset:   DialogStore.resetAll() clears form state
```

### 6.3 Model Operations Flow

Model management operations (create, copy, fork, rename, delete) follow a different wiring pattern from transform dialogs. They are direct actions triggered from the Sidebar or toolbar — no dialog registry involved.

**File flow**: `ModelService` method → `AppController` orchestration → `Sidebar` prop → `App.tsx` wiring

**Adding a new model operation**:

1. **`ModelService.ts`** — Add a static method with the business logic (validation, data cloning, store update, persistence). Follow the `copyCurrentModel()` pattern for operations that create new models.
2. **`AppController.ts`** — Add an orchestration method that injects `NotificationHandlers` (prompt/alert/confirm) and `switchToModel` callback. Only needed when composing 2+ service/handler calls.
3. **`Sidebar.tsx`** — Add callback prop to `SidebarProps` interface and destructure it. Wire a button or menu item.
4. **`App.tsx`** — Wire the prop in `sidebarProps` to `AppController.methodName()`.
5. **i18n** — Add keys to both `en/common.json` and `uk/common.json` (prompts, notifications, button labels).

**ModelService vs StepService boundary**:

- `ModelService` — model lifecycle (create, copy, fork, rename, delete, switch). Owns the model list in AppStore.
- `StepService` — pipeline execution (compute steps, apply transforms, undo/redo). Owns step history and transform orchestration.
- Operations that both create models and compute pipelines (fork, copy) call `StepService.computeModelUpToStep()` from within `ModelService`.

### 6.4 Import Pipeline Flow

All import paths (file upload, drag-drop, paste, URL) converge on the same core flow. Understanding this pipeline is essential when modifying import behavior.

#### Entry Points → Shared Pipeline

```
File upload/drop  ──→  handleFileSelect() / handleFileDrop()  ──┐
Clipboard paste   ──→  handlePaste() / promptPaste()           ──┤
                                                                  ├──→  showImportDialog(file)
URL import        ──→  fetchAndImportFromUrl()                 ──┤
                       (fetches URL → creates synthetic File)    │
Text entry        ──→  confirmTextEntry()                      ──┘
                       (creates synthetic File from textarea)
```

All entry points create a `File` object and call `showImportDialog(file)` in `import-handlers.ts`.

#### Core Pipeline

```
showImportDialog(file)
    │
    ├── .json file?       →  FileReader  →  handleJsonPreview(file, data)
    │                                             │
    │                                             ├── Populates importCsvState signals:
    │                                             │   previewHeaders, previewDataRows,
    │                                             │   isJson, jsonData, suggestedJsonKeys, etc.
    │                                             │
    │                                             └── callbacks.openDialog('import-csv')
    │
    ├── .xls/.xlsx file?  →  handleExcelPreview(file)
    │                             │
    │                             ├── Lazy-loads SheetJS via dynamic import()
    │                             ├── Parses preview + full file → stores in excelData signal
    │                             ├── Populates importCsvState (isExcel, rawPreviewData, etc.)
    │                             └── callbacks.openDialog('import-csv')
    │
    └── .csv file?        →  handleCsvPreview(file)
                                  │
                                  ├── PapaParse preview (first N rows)
                                  ├── Populates importCsvState signals:
                                  │   rawPreviewData, delimiter, headerMode, etc.
                                  └── callbacks.openDialog('import-csv')
```

**Dialog reuse rule**: All formats share the `import-csv` dialog. Format-specific sections are toggled via flags (`isJson`, `isExcel`). Delimiter controls are hidden for Excel; JSON path controls are shown only for JSON. Header mode and preview table are shared by all formats.

#### Preview Mechanism

When the `import-csv` dialog opens, the preview panel in `App.tsx` renders because:

1. `hasPreviewData()` in `DialogCoordinator` checks `importCsvState.previewDataRows.value.length > 0`
2. Preview columns/rows come from `importCsvState.previewHeaders` and `previewDataRows`
3. When the user changes delimiter or header mode, `updateImportPreview()` (CSV only — re-parses with new delimiter) or `updateHeadersForPreview()` (JSON/Excel — no re-parse needed) updates these signals

For transform dialogs, preview data uses `DialogStore.previewState` signals instead (set by `preview-engine.ts`).

#### Transition Dialog Pattern

Some import paths use a **two-step dialog flow**: a simple entry dialog that transitions to `import-csv` for preview/configuration. This avoids duplicating parsing logic.

```
[Entry Dialog]  →  user provides input  →  Apply button
    │
    └── handler function (e.g., fetchAndImportFromUrl / confirmTextEntry)
            │
            ├── Convert input to a File object
            ├── Set flags on importCsvState (fromUrlImport / fromTextEntry)
            ├── Close entry dialog (without full state reset)
            └── showImportDialog(file)  →  opens import-csv with preview
```

**Key details:**

- Each entry dialog has its own state file (`import-url-state.ts`, `import-text-state.ts`)
- Flags like `fromUrlImport` / `fromTextEntry` on `importCsvState` enable a "Back to..." link in `ImportCsvDialog`
- The `backToUrlImport()` / `backToTextEntry()` functions save importCsvState text, close, restore, and reopen the entry dialog
- For edit flows, the entry dialog can set `isReplaceMode = true` on `importCsvState` to route through `ReplaceSourceService` instead of `createSource`

**To add a new transition dialog**, follow the URL/text pattern:

1. Create state file in `stores/dialogs/import/`
2. Create dialog component
3. Add handler that converts input → `File` → `showImportDialog(file)`
4. Add a `from*` flag to `importCsvState` and a `backTo*()` function
5. Wire the Apply button via `StepCallbacks` (see §7.1 "Non-Transform Dialogs")

#### Confirm and Source Creation

When the user clicks "Apply" in the `import-csv` dialog:

```
confirmImport()
    │
    ├── Validates source name
    ├── Processes data (flatten JSON, apply delimiter/headers)
    ├── Replace mode?  →  ReplaceSourceService.replaceSource()
    └── Normal mode?   →  callbacks.createSource()
                               │
                               └── ImportService.createSource()
                                       │
                                       ├── Creates Source object (id, name, columns, data)
                                       ├── Creates Model with initial steps (import + types)
                                       ├── Updates AppStore (sources, models, navigation)
                                       └── Auto-saves to IndexedDB
```

#### Key Files

| File                                         | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| `handlers/import/import-handlers.ts`         | All import logic (entry points, preview, confirm)         |
| `stores/dialogs/import/import-csv-state.ts`  | Signal state for the CSV import dialog                    |
| `stores/dialogs/import/import-url-state.ts`  | Signal state for the URL import dialog                    |
| `stores/dialogs/import/import-text-state.ts` | Signal state for the text entry dialog                    |
| `components/ImportCsvDialog.tsx`             | Import settings UI (delimiter, headers, JSON path)        |
| `components/ImportUrlDialog.tsx`             | URL input and dataset link list                           |
| `components/ImportTextDialog.tsx`            | Textarea for manual data entry                            |
| `services/ImportService.ts`                  | Source and model creation                                 |
| `orchestration/DialogCoordinator.ts`         | Preview data routing (`hasPreviewData`, `getPreviewRows`) |
| `core/excel-parser.ts`                       | SheetJS wrapper (lazy-loaded via dynamic `import()`)      |

#### Lazy-Loading for Heavy Parsers

Large parser libraries should be loaded on demand via dynamic `import()` so they don't bloat the initial bundle. Excel import demonstrates the pattern:

1. Parser wrapper lives in `src/core/` (portable, testable — no browser APIs)
2. Handler calls `await import('../../../core/excel-parser')` only when an Excel file is selected
3. `vite.config.ts` has a `manualChunks` entry to split the library into its own bundle chunk
4. Full parsed data is stored in a signal (e.g., `excelData`) to avoid re-loading the library on confirm

Apply the same pattern for any new dependency >50KB gzip that's only used for a specific import/export path.

#### Adding a New Import Format

Follow this checklist (Excel is the reference implementation):

1. **Parser wrapper** (`src/core/<format>-parser.ts`) — thin async wrapper over the library, returns `unknown[][]` (2D array matching PapaParse output shape)
2. **State signals** (`import-csv-state.ts`) — add `is<Format>` flag + any format-specific data signal; reset in `resetImportCsvState()`
3. **File detection** (`import-handlers.ts`) — update `handleFileDrop()`, `handlePaste()`, and `showImportDialog()` to accept new extensions/MIME types
4. **Preview function** (`import-handlers.ts`) — new `handle<Format>Preview()` that lazy-loads the parser, populates `importCsvState`, and opens the dialog
5. **Confirm branch** (`import-handlers.ts`) — add format branch in `confirmImport()` before CSV fallback; reuse `mapRawDataToRows()` + `finishImport()`
6. **Dialog UI** (`ImportCsvDialog.tsx`) — hide/show format-specific controls via the `is<Format>` flag
7. **Dialog title** (`dialog-registry.ts`) — add `is<Format>` case in `getDialogTitle()`
8. **Bundle splitting** (`vite.config.ts`) — add `manualChunks` entry for the new library
9. **i18n** — title key in `dialogs.json`, error key in `errors.json`, update `dropFile` message (en + uk)
10. **File accept** (`App.tsx`) — add extensions to the file input `accept` attribute

---

## 7. Expression Engine

### 7.1 Three-Stage Pipeline

User expressions go through three stages for security:

```
"sales > 1000"
    ↓
┌─────────────────────────────────────────────┐
│ Stage 1: PARSING (expression-parser.ts)     │
│ - jsep converts string to AST               │
│ - Bracket notation [Column] → identifier    │
│ - Custom operators (nullish coalescing ??)  │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Stage 2: VALIDATION (ast-validator.ts)      │
│ - Whitelist check (allowed node types)      │
│ - Operator whitelist (no assignment, etc.)  │
│ - Function whitelist (64 safe functions)    │
│ - Schema validation (column exists?)        │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Stage 3: INTERPRETATION (ast-interpreter.ts)│
│ - Safe recursive evaluation                 │
│ - No eval(), no Function()                  │
│ - Null propagation in arithmetic            │
│ - Function implementations                  │
└─────────────────────────────────────────────┘
    ↓
Result (boolean for filter, value for derive)
```

### 7.1 Adding a New Dialog

Syto uses a centralized dialog registry ([`dialog-registry.ts`](../src/app/dialog-registry.ts)) to avoid scattered updates.

**Checklist** (typically 6-8 files):

1. **[`dialog-registry.ts`](../src/app/dialog-registry.ts)** - Add metadata entry (name, title, type, buttonText)
2. **[`types.ts`](../src/app/types.ts)** - Add to `DialogName` union
3. **[`*Dialog.tsx`](../src/app/components/)** - Create component
4. **[`index.ts`](../src/app/components/index.ts)** - Export component
5. **[`App.tsx`](../src/app/components/App.tsx)** - Render dialog
6. **[`DialogStore.ts`](../src/app/stores/DialogStore.ts)** - Add state (if needed)
7. **[`dialog-handlers.ts`](../src/app/handlers/dialog/dialog-handlers.ts)** - Add init logic (if needed)
8. **Wire up Apply button** (if transform dialog) - see below

The registry eliminates the need to update `isSlidePanel()`, `getDialogTitle()`, etc. - these are auto-generated from metadata.

#### Step 8: Wiring Transform Apply Button

For transform dialogs, register the `applyHandler` directly in the dialog registry. This requires updates in **2 files**:

| File                                       | What to Add                                       |
| ------------------------------------------ | ------------------------------------------------- |
| `src/app/handlers/transform/*-handlers.ts` | `applyYourTransform(callbacks)` function          |
| `src/app/dialog-registry.ts`               | Add `applyHandler` to the dialog's registry entry |

The `applyActiveTransform()` function in `step-handlers.ts` automatically looks up the handler from the registry — no switch case, AppController method, or test-utils mock needed.

**Example:**

```typescript
// 1. Handler (src/app/handlers/transform/your-handlers.ts)
export async function applyYourTransform(callbacks: ExecutionCallbacks) {
  const transform = constructYourStep();
  await StepService.runTransform('Your Transform', transform, callbacks);
}

// 2. Registry entry (src/app/dialog-registry.ts)
yourDialog: {
  name: 'yourDialog',
  title: 'Your Transform',
  type: 'slide-panel',
  applyHandler: (cb) => YourHandlers.applyYourTransform(cb),
},
```

**Notification API**: All user-facing notifications are in `src/app/handlers/core/notification-handlers.ts`. Import directly — no `app` parameter needed:

- `showSuccess(message)` — auto-dismissing toast (3s)
- `showError(title, message)` — persistent error toast with optional step context
- `alert(message)` — blocking modal alert (returns Promise)
- `confirm(message, options?)` — blocking confirmation with optional `confirmLabel`
- `prompt(message, defaultValue?)` — blocking text input

**Error tooltips on Apply button**: If the dialog has an `.error` signal, add `getError: () => DialogStore.yourState.error.value` to the registry entry. This surfaces the error message as a tooltip on the disabled Apply button. The Apply button uses `aria-disabled` (not native `disabled`) so tooltips remain visible — `buttons.css` styles both identically.

#### Non-Transform Dialogs (Import/Utility)

Import dialogs (e.g., `import-url`, `import-text`) don't use `applyHandler` in the registry because they don't execute transforms — they transition to `import-csv` or perform custom logic. These use the **StepCallbacks** pattern instead:

| File                                       | What to Add                                    |
| ------------------------------------------ | ---------------------------------------------- |
| `src/app/handlers/import/*-handlers.ts`    | Handler function (e.g., `confirmTextEntry()`)  |
| `src/app/handlers/core/step-handlers.ts`   | Add to `StepCallbacks` interface + switch case |
| `src/app/handlers/test-utils.ts`           | Add mock to `createMockStepCallbacks()`        |
| `src/app/orchestration/AppOrchestrator.ts` | Wire callback in `wireHandlerCallbacks()`      |

The switch case in `applyActiveTransform()` dispatches to the callback:

```typescript
// In step-handlers.ts
case 'import-text': callbacks?.confirmTextEntry(); return;
```

**When to use which pattern:**

- **Registry `applyHandler`**: Dialog produces a `TransformStep` (filter, derive, sort, etc.)
- **StepCallbacks switch case**: Dialog has custom apply logic (import transitions, multi-step flows)

#### Immediate-Apply vs Deferred-Apply Dialogs

Dialogs fall into two categories for change detection:

- **Deferred-apply** (most transform dialogs): User configures options, then clicks "Apply". Include `getState` in the registry so that closing without applying triggers the "unsaved changes" confirmation.
- **Immediate-apply** (e.g., settings): Changes take effect instantly via callbacks (persisted to localStorage, UI updated). **Omit `getState`** from the registry — there are no "unsaved changes" to discard, so the confirmation dialog should never appear.

### 7.2 Adding a New Function

> **Full details**: See [FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md) for the complete documentation pipeline.

To add a whitelisted function:

1. **Implement** in the appropriate category file (`src/core/functions/<category>-functions.ts`) with JSDoc:

```typescript
/**
 * @category [Date|Text|Math|Regex|Conversion|JSON]
 * @description Brief description of what the function does
 * @param paramName - Parameter description
 * @returns Return value description
 * @example your_function(arg1)
 * @example your_function("value") → result
 */
export const your_function = (arg1: any, arg2?: any) => {
  // Implementation
};
```

2. **Export** from `src/core/functions/index.ts` (ensure included in `FUNCTION_IMPLS`)

3. **Add to whitelist** in `ast-validator.ts` (both `ALLOWED_FUNCTIONS` and `FUNCTION_ARITY`):

```typescript
const ALLOWED_FUNCTIONS = [
  // ... existing functions
  'your_function',
];

const FUNCTION_ARITY: Record<string, [number, number]> = {
  // [min, max] arguments
  your_function: [1, 2],
};
```

4. **Regenerate documentation**: `npm run docs:generate`

5. **Verify**: `npm test -- function-docs-validation.test.ts`

6. Update `DATA-SPECIFICATION.md` §4.3 if adding a new category or significant function group.

---

## 8. Refactoring & Refinement Patterns

### 8.1 UI Logic Consolidation

When two operations share >80% of UI needs (e.g., _Concat_ vs. _Union_ or _Join_ variants), prefer a **Unified Dialog** (like `AppendDialog`) over separate components.

- **Toggle for Variant**: Use a simple checkbox or radio to switch between specific transform keys (e.g., `{concat: ...}` vs `{union: ...}`).
- **Parity through Patterns**: If a more complex operation (Join) already has a high-quality selector, reuse its UI components (`JoinTreeSelector`) and handler logic to bring simpler operations to parity.

### 8.2 Safe Graph State Mutations

For any transform that creates a reference from one model/source to another (Append, Join, Lookup):

- **DFS Cycle Detection**: Always run a check using `DependencyService.checkCircularDependency` at the handler level _before_ applying the transform.
- **Compute Order**: Ensure that for previews, the target table is fully computed up to its current last step using `StepService.computeModelUpToStep`.

### 8.3 Deterministic Type Promotion

When "stacking" or "merging" data from two different tables, follow the **Common Denominator Pattern**:

1.  Compare types for same-named columns.
2.  Use a centralized promotion utility (see `SchemaEngine.getPromotedType`).
3.  Standardize on: `integer` + `float` → `float`, `date` + `datetime` → `datetime`, otherwise → `string`.

### 8.4 Selection-Source Synchronization

When a dialog depends on a source that the user can change:

- **Automatic Refresh**: Implement an `onTargetChange` handler that resets/extracts columns from the new target and updates selection signals immediately.
- **Selection Persistence**: If the new source shares some columns with the old one, consider preserving matching selections; otherwise, default to "Select All" for discoverability.

### 8.5 Registry & Test Awareness

When adding or removing dialog names from the `DialogName` union:

- **Registry Check**: Verify [`dialog-registry.ts`](../src/app/dialog-registry.ts) matches the new types.
- **Completeness Tests**: Update [`dialog-registry.test.ts`](../src/app/dialog-registry.test.ts) to ensure automated tests don't break on "undefined" config lookups.

### 8.6 Known Repetitive Patterns (Tech Debt)

> **Full analysis**: [archive/CODE-REDUCTION-ANALYSIS.md](archive/CODE-REDUCTION-ANALYSIS.md)

Several patterns that were reasonable at small scale have become burdensome. Follow these rules to avoid making them worse while they await refactoring:

**Shortcut handlers** (`shortcut-handlers.ts` → `AppController.ts` → `RibbonToolbar.tsx`): ✅ **Refactored**

- All shortcuts are now declarative entries in `SHORTCUT_REGISTRY` (`shortcut-handlers.ts`). AppController exposes a single `executeShortcut(id)` method. RibbonToolbar renders popovers data-driven via `renderShortcutSections()`.
- **To add a new shortcut**: Add one entry to `SHORTCUT_REGISTRY`, add i18n keys in both locale files. No other files need changes.

**`deriveNextSchema()` in `schema-engine.ts`**: ✅ **Refactored**

- Shared `inferSchemaFromSample()` helper handles the "iterate sample data columns, preserve known types, infer new" pattern. Used by selectPattern, removePattern, join, lookup, concat/union.
- **To add a new sample-data-based branch**: Call `this.inferSchemaFromSample(currentSchema, sampleData, options)` — see §1.4.

**Transform linter** (`src/app/linters/transform-linter.ts`): ✅ **Refactored**

- Shared `validateStepExpressions()` generator validates filter/derive/conditional expressions in one place, consumed by `lintTransformJson`, `validateSteps`, and `getTransformJsonError`.
- **To add a new expression-bearing transform**: Add its validation to the generator, not to each consumer.

**AppController pass-throughs**: ✅ **Refactored**

- All pure pass-throughs removed. AppController now contains only orchestration methods that compose multiple handler/service calls or inject callbacks.
- **Rule**: Import handler functions directly at the call site. Only add methods to AppController when they genuinely compose logic from multiple modules (e.g., `switchToModel` coordinates `ModelService`, `InteractionHandlers`, `PaginationHandlers`, and URL state).

### 8.7 Accessibility Checklist

When adding a new component, verify these conventions (details in [UX-SPECIFICATION.md §9](UX-SPECIFICATION.md#9-accessibility-patterns)):

- **Dialogs**: `role="dialog"` or `"alertdialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title `id`
- **Close buttons**: `aria-label` with i18n key `buttons.close`
- **Iconify spans**: `aria-hidden="true"` on every `<span class="iconify">`
- **Icon-only buttons**: `aria-label` matching the `title` prop
- **Live regions**: Use `role="log"` / `role="status"` with `aria-live="polite"` for dynamic feedback areas

### 8.8 CSS Modules & DOM Queries

CSS Module class names are hashed at build time (dev: `Component__className___hash`, prod: hash-only). Never use CSS class selectors in `event.target.closest()`, `document.querySelector()`, or similar DOM queries from JavaScript — they won't match the hashed classes. Use **data attributes** (e.g., `[data-row-gutter]`, `[data-eda-panel="true"]`) for any element that needs to be found by event handlers or imperative DOM logic.

### 8.9 CSS Token Discipline

All visual properties that participate in theming or appear in multiple files must use tokens from `variables.css`:

- **Always token**: colors, box-shadow, z-index ≥1000, font-size, border-radius, icon dimensions (`.iconify` width/height)
- **Hardcoded OK**: local z-index (1–101 for sibling stacking), one-off layout dimensions (widths, heights, padding that aren't icon/spacing tiers), form control sizes that aren't icons
- **Never hardcode**: hex colors or `rgba(r,g,b,a)` with literal RGB — use `var(--color-*)` or `rgba(var(--*-rgb), opacity)` patterns so themes apply correctly

When adding a new color, check `variables.css` for an existing semantic token before creating one. Prefer reusing `--color-cyan`, `--color-dark-gray`, etc. over adding single-use tokens.

For button-specific tokens (`--btn-hover-bg`, `--btn-disabled-opacity`, etc.) and variant conventions, see [UX-SPECIFICATION.md §5.5](UX-SPECIFICATION.md).

---

## 9. Internationalization (i18n)

See **[I18N-GUIDE.md](I18N-GUIDE.md)** for the complete reference (adding languages, namespaces, plural rules, technical details).

**Quick reference** for everyday development:

- Use `useTranslation('namespace')` — namespaces: `common` (shared UI), `ui` (components), `dialogs` (transform dialogs), `settings`, `errors`
- Multiple namespaces: `useTranslation(['dialogs', 'common'])`, use `{ ns: 'common' }` for non-default
- Keys must exist in both `en` and `uk` locale files. Run `npm run i18n:check` to validate parity.
- Never use `dangerouslySetInnerHTML` with user-interpolated translation variables — split into JSX instead (see I18N-GUIDE.md § Common Patterns).
- Ukrainian has 3 plural forms — use `count` parameter; i18next handles form selection automatically.

---

## 10. Adding a Tool Page

Tool pages are standalone Preact mini-apps (e.g., JSON-to-CSV converter) served at `/tools/<name>/`. They share the site header/footer via `styles/content.css` but are fully independent of the main app — no AppStore, no DialogStore.

### 10.1 Key Constraints

- **Self-contained state**: Each tool uses its own signals in `src/tools/<name>/state.ts`. Never import from `app/stores/`.
- **Pure logic in `src/core/`**: Reusable data utilities go in `src/core/` with co-located tests, following the existing portability rule (no browser APIs, no Preact).
- **`tools` i18n namespace**: All user-facing strings go in `src/i18n/locales/{en,uk}/tools.json` under a tool-specific key (e.g., `jsonToCsv`). Components use `useTranslation('tools')`.
- **HTML is not templated**: Unlike content pages, each tool has a hand-crafted HTML file with its own SEO meta, structured data, and mount point. The site header/nav is duplicated (not generated from a template).

### 10.2 Checklist

**Files to create:**

| #   | Path                                 | Purpose                                                                                                              |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `tools/<name>/index.html`            | HTML shell: SEO meta, site header/nav, `<div id="tool-root">`, static SEO content, script tag pointing to `main.tsx` |
| 2   | `src/tools/<name>/main.tsx`          | Entry point: imports i18n, wraps root component in `<I18nextProvider>`, renders into `#tool-root`                    |
| 3   | `src/tools/<name>/<Name>App.tsx`     | Root component                                                                                                       |
| 4   | `src/tools/<name>/state.ts`          | Signal-based state (self-contained)                                                                                  |
| 5   | `src/tools/<name>/<Name>.module.css` | Tool-specific styles                                                                                                 |
| 6   | `src/tools/<name>/components/*.tsx`  | Sub-components                                                                                                       |
| 7   | `src/core/<utility>.ts` + `.test.ts` | Pure logic (if needed)                                                                                               |

**Files to update:**

| #   | File                             | Change                                                                                                                          |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 8   | `src/i18n/locales/en/tools.json` | Add tool-specific key with nested sections                                                                                      |
| 9   | `src/i18n/locales/uk/tools.json` | Matching Ukrainian translations                                                                                                 |
| 10  | `vite.config.ts`                 | Add Rollup input: `'<name>': resolve(__dirname, 'tools/<name>/index.html')`                                                     |
| 11  | Navigation links                 | Update nav in `index.html`, tool HTML files, and `{{tools-href}}` in content page build scripts if a tools index page is needed |

**No changes needed in**: `src/i18n/core.ts` (the `tools` namespace is already registered — just add keys to the JSON files), `scripts/content-pages-config.ts` (only for content pages).

### 10.3 Styling

Tool pages load `styles/content.css` for the shared site chrome (header, footer, layout). Tool-specific UI uses a CSS Module. Components from the main app (e.g., `DataTable.module.css`) can be imported if reuse is appropriate — note that imports from `src/tools/<name>/components/` to `src/app/components/` require three levels up (`../../../app/components/`), not two.

The `content.css` file includes a `.tool-page` section with layout rules for tool pages.

---

**End of Development Patterns**
