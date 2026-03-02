# Syto — Development Patterns

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures and transform format
> - **[UX-SPECIFICATION.md](UX-SPECIFICATION.md)**: UI/UX design guidelines

This document describes established patterns for developing Syto. Follow these conventions when adding features or modifying existing code.

---

## 0. AI Development Rules

**Prohibited Actions**:

- **NEVER** run `git add`, `git commit`, `git stash`, or `git push`.
- All staging and committing must be done by the USER.

---

## 1. Adding a New Transform

Adding a transform requires changes across multiple files. Use this checklist:

### 1.1 Checklist

| Step | File                                        | What to Add                        |
| ---- | ------------------------------------------- | ---------------------------------- |
| 1    | `src/core/transforms/handlers/*.ts`         | Transform implementation           |
| 2    | `src/core/transforms/describers/*.ts`       | Human-readable description         |
| 3    | `src/core/schema-engine.ts`                 | Schema propagation logic           |
| 4    | `src/app/types.ts`                          | Dialog state interface (if needed) |
| 5    | `src/app/stores/dialogs/<category>/*.ts`    | Dialog state signals               |
| 6    | `src/app/components/*Dialog.tsx`            | Dialog UI component                |
| 7    | `src/app/handlers/<category>/*-handlers.ts` | Event handlers                     |
| 8    | `src/app/components/Ribbon.tsx`             | Ribbon button (if new action)      |
| 9    | `src/core/transforms/*.test.ts`             | Core logic tests                   |
| 10   | `src/app/handlers/*`                        | Cycle check (if external ref)      |
| 11   | `docs/DATA-SPECIFICATION.md`                | Transform documentation            |

---

## 2. Non-Destructive Transformation Pattern

Syto is built on the principle of **non-destructive data wrangling**. Developers MUST ensure that:

1. **Sources are Immutable to Transforms**: Never modify the `data` or `columns` of a `Source` object during transformation execution.
2. **Explicit Replacement with Backups**: If a user explicitly replaces a source's data, the application must maintain a `.backup` of the previous state to allow restoration (Undo/Redo).
3. **Transforms return new tables**: Always use Arquero verbs that return a new table instance or create a new set of objects.
4. **Traceability**: Every user action that changes data must be represented as a `TransformStep` in a `Model`. This allows the application to "replay" the pipeline from the raw source at any time.
5. **No Side Effects**: Transformation logic in `src/core/transforms/` must be pure and rely only on the input table, transform parameters, and schema.

This pattern enables technical rollback, experimental workflows, and reproducibility—core pillars of the Syto philosophy.

### 1.2 Core Implementation (`transforms/handlers/`)

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

### 1.3 Schema Propagation (`schema-engine.ts`)

Every transform must define how it affects the schema:

```typescript
// In deriveNextSchema()
if (transform.yourTransform) {
  const { outputColumn, sourceColumn } = transform.yourTransform;

  // Option A: Add new column
  return [...schema, { name: outputColumn, type: 'string' }];

  // Option B: Remove columns
  return schema.filter((col) => col.name !== removedColumn);

  // Option C: Modify existing column type
  return schema.map((col) => (col.name === sourceColumn ? { ...col, type: 'integer' } : col));
}
```

### 1.4 Dialog State (`stores/dialogs/`)

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

### 1.5 Dialog Component

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

### 1.6 Handler Functions

Handlers are organized in `src/app/handlers/` subdirectories by category:

- `transform/` — aggregate, derive, filter, join, pivot handlers, etc.
- `import/` — csv, json, generate handlers
- `dialog/` — column-editor, interaction handlers
- `core/` — step, keyboard, notification handlers

Handlers use stores directly and leverage shared utilities from `preview-engine.ts` and `validation-engine.ts` at the handlers root.

**Using Preview Engine** (recommended for new handlers):

```typescript
// In src/app/handlers/<category>/your-transform-handlers.ts
import { createDebouncedPreview, clearPreview } from './preview-engine';
import { validateExpression } from './validation-engine';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

// Create debounced preview handle
const previewHandle = createDebouncedPreview({
  compute: () => {
    const { param1 } = DialogStore.yourTransformState;
    if (!param1.value.trim()) return null;

    const transform = { yourTransform: { param1: param1.value } };
    const result = applyTransform(
      AppStore.currentTable.value,
      transform,
      AppStore.currentSchema.value
    );

    return {
      title: 'Your Transform',
      stats: `${result.numRows()} rows`,
      columns: ['existingCol'],
      newColumns: ['newCol'],
      rows: result.objects().slice(0, 100),
    };
  },
  onError: (error) => {
    DialogStore.yourTransformState.error.value = error.message;
  },
});

export const debouncedUpdatePreview = previewHandle.trigger;
export const clearYourTransformPreview = previewHandle.clear;

export function applyYourTransform(callbacks: ExecutionCallbacks) {
  const { param1 } = DialogStore.yourTransformState;

  if (!param1.value.trim()) {
    callbacks.onError('Parameter is required');
    return;
  }

  const transform = { yourTransform: { param1: param1.value } };

  StepService.runTransform('Your Transform', transform, callbacks, () =>
    callbacks.onDialogClose?.()
  );
}
```

**Using Validation Engine** (for expression/regex validation):

```typescript
import { validateExpression, validateRegexPattern } from './validation-engine';

// Validate user expressions
const result = validateExpression(expression, columns, {
  errorSignal: DialogStore.filterState.error,
});
if (result.valid) {
  // Use result.ast for further processing
}

// Validate regex patterns
const regexResult = validateRegexPattern(pattern, {
  errorSignal: DialogStore.regexpState.error,
  flags: 'gi',
});
if (regexResult.valid) {
  // Use regexResult.regex for matching
}
```

**Callback Pattern** (for UI integration):

```typescript
// Define callback interface
interface YourHandlerCallbacks {
  openDialog: (name: string) => void;
  closeDialog: () => void;
  runTransform: (...args: unknown[]) => Promise<boolean>;
}

let callbacks: YourHandlerCallbacks | null = null;

// Called by App.tsx during initialization
export function setYourHandlerCallbacks(cb: YourHandlerCallbacks) {
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

Type conversion failures produce error objects:

```typescript
// In type-converter.ts
if (cannotConvert) {
  return {
    type: 'error',
    message: `Cannot convert '${value}' to integer`,
    original: value,
  };
}
```

Error objects:

- Display as "Error" with warning icon in table
- Are tracked separately from nulls in EDA
- Implement `toString()` returning `"Error"`

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
User action (click Apply)
    ↓
Handler function (e.g., filter-handlers.applyTransform)
    ↓
StepService.runTransform(label, transform, callbacks)
    ↓
ModelService.addStep(modelId, transform)
    ↓
transforms.applyTransform(table, transform, schema)
    ↓
schema-engine.deriveNextSchema(schema, transform)
    ↓
AppStore signals updated (models, currentTable, schema)
    ↓
UI re-renders via signal subscriptions
```

### 6.2 Dialog Lifecycle

```
1. Open:    DialogStore.openDialog('filter')
2. Input:   User types → signal updates → validation runs
3. Preview: Debounced preview computation → previewData signal
4. Apply:   Handler builds transform → StepService executes
5. Close:   DialogStore.closeDialog('filter')
6. Reset:   DialogStore.resetAll() clears form state
```

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

The `applyActiveTransform()` function in `step-handlers.ts` automatically looks up the handler from the registry — no switch case, AppController method, syto-app wiring, or test-utils mock needed.

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

If the handler needs user confirmation, import `confirm` or `prompt` directly from `notification-handlers` instead of passing an `app` parameter.

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

---

## 9. Internationalization (i18n)

Syto uses **i18next** with **preact-i18next** for multi-language support. The system provides type-safe translations with automatic re-rendering on language changes.

### 9.1 Architecture Overview

**Core Components**:

- **i18n Configuration**: `src/i18n/index.ts` — initialization, type augmentation, language settings
- **Translation Files**: `src/i18n/locales/{lang}/{namespace}.json` — translation key-value pairs
- **Provider**: `<I18nextProvider>` in `src/main.tsx` — enables reactive language switching
- **Storage**: User preference persisted via `UXSettings` in localStorage

**Supported Languages**:

- English (`en`) — default
- Ukrainian (`uk`) — with automatic 3-form plural handling

**Namespaces**:

- `common` — buttons, labels, tooltips (shared across app)
- `settings` — settings dialog strings
- `dialogs` — dialog titles and descriptions

### 9.2 Adding Translations to a Component

**Step 1**: Import the hook and specify the namespace:

```typescript
import { useTranslation } from 'preact-i18next';

export function MyComponent() {
  const { t } = useTranslation('common'); // or 'settings', 'dialogs'

  return <button>{t('buttons.apply')}</button>;
}
```

**Step 2**: Add keys to translation files:

```json
// src/i18n/locales/en/common.json
{
  "buttons": {
    "apply": "Apply"
  }
}

// src/i18n/locales/uk/common.json
{
  "buttons": {
    "apply": "Застосувати"
  }
}
```

**TypeScript Support**: Translation keys are type-checked. Invalid keys will show TypeScript errors.

### 9.3 Translation File Structure

**Naming Convention**: Use nested objects to group related strings:

```json
{
  "buttons": { "save": "...", "cancel": "..." },
  "labels": { "name": "...", "type": "..." },
  "tooltips": { "help": "..." }
}
```

**Key Paths**: Reference with dot notation: `t('buttons.save')`, `t('labels.name')`

**Keep Files Parallel**: All translation files must have matching structure across languages.

### 9.4 Ukrainian Plural Forms

Ukrainian has **3 plural forms** (vs. English's 2):

- **Form 0**: Ends with 1 (not 11): `1 рядок`, `21 рядок`
- **Form 1**: Ends with 2-4 (not 12-14): `2 рядки`, `23 рядки`
- **Form 2**: All others: `0 рядків`, `5 рядків`, `11 рядків`

**Implementation**: i18next handles this automatically. Use `count` parameter:

```typescript
// Translation files:
// en: { "rows": "{{count}} row", "rows_other": "{{count}} rows" }
// uk: {
//   "rows_0": "{{count}} рядок",
//   "rows_1": "{{count}} рядки",
//   "rows_2": "{{count}} рядків"
// }

const { t } = useTranslation('common');
t('rows', { count: 1 }); // "1 row" / "1 рядок"
t('rows', { count: 5 }); // "5 rows" / "5 рядків"
t('rows', { count: 23 }); // "23 rows" / "23 рядки"
```

**Reference**: See `src/i18n/index.ts` lines 21-35 for full plural rules documentation.

### 9.5 Adding a New Language

**Step 1**: Create translation files:

```bash
mkdir -p src/i18n/locales/fr
cp src/i18n/locales/en/*.json src/i18n/locales/fr/
# Translate content
```

**Step 2**: Update `src/i18n/index.ts`:

```typescript
// Add imports
import frCommon from './locales/fr/common.json';
import frSettings from './locales/fr/settings.json';
import frDialogs from './locales/fr/dialogs.json';

// Add to SUPPORTED_LANGUAGES
export const SUPPORTED_LANGUAGES = ['en', 'uk', 'fr'] as const;

// Add to LANGUAGE_NAMES
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  uk: 'Українська',
  fr: 'Français',
};

// Add to resources
i18n.use(initReactI18next).init({
  resources: {
    en: {
      /* ... */
    },
    uk: {
      /* ... */
    },
    fr: {
      common: frCommon,
      settings: frSettings,
      dialogs: frDialogs,
    },
  },
  // ...
});
```

**Step 3**: Update `src/core/ux-settings.ts`:

```typescript
export interface UXSettings {
  // ...
  language: 'en' | 'uk' | 'fr';
}
```

**Step 4**: Add language selector UI in `SettingsDialog.tsx`.

### 9.6 Adding a New Namespace

**Step 1**: Create translation files:

```bash
# For each language:
echo '{}' > src/i18n/locales/en/errors.json
echo '{}' > src/i18n/locales/uk/errors.json
```

**Step 2**: Update `src/i18n/index.ts`:

```typescript
// Add imports
import enErrors from './locales/en/errors.json';
import ukErrors from './locales/uk/errors.json';

// Add to type augmentation
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      settings: typeof enSettings;
      dialogs: typeof enDialogs;
      errors: typeof enErrors; // Add this
    };
  }
}

// Add to resources and namespace list
i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, settings: enSettings, dialogs: enDialogs, errors: enErrors },
    uk: { common: ukCommon, settings: ukSettings, dialogs: ukDialogs, errors: ukErrors },
  },
  ns: ['common', 'settings', 'dialogs', 'errors'], // Add to list
  // ...
});
```

**Step 3**: Use in components:

```typescript
const { t } = useTranslation('errors');
```

### 9.7 Technical Implementation Details

**Initialization Flow**:

1. `src/i18n/index.ts` loads user's language from localStorage **before** `i18n.init()`
2. i18next initializes with correct language (no race condition)
3. `src/main.tsx` wraps `<App>` with `<I18nextProvider>`
4. Components using `useTranslation()` subscribe to language changes

**Language Switching**:

1. User clicks language in Settings dialog
2. `AppController.switchLanguage(lang)` called
3. Updates: i18n, AppStore, localStorage
4. `I18nextProvider` triggers re-render of all components using `useTranslation()`

**Type Safety**:

- Translation keys are validated at compile time
- Namespace names are type-checked
- Typos in `t('invalid.key')` produce TypeScript errors

**Testing**: When adding translated text, verify:

- Both EN and UK files have matching keys
- No missing translation keys (would show fallback)
- Plurals work correctly for Ukrainian

### 9.8 Common Patterns

**Dynamic Text with Variables**:

```typescript
// Translation: "Showing {{count}} of {{total}} rows"
t('table.showing', { count: 100, total: 1000 });
```

**Conditional Text**:

```typescript
// Use separate keys instead of logic in translation
const key = isSource ? 'labels.source' : 'labels.model';
t(key);
```

**HTML in Translations** (avoid if possible):

```typescript
// Prefer breaking into multiple elements
<div>
  <strong>{t('dialog.warning')}</strong>
  {t('dialog.description')}
</div>
```

---

**End of Development Patterns**
