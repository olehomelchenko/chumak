# Syto — Development Patterns

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures and transform format
> - **[UX-SPECIFICATION.md](UX-SPECIFICATION.md)**: UI/UX design guidelines

This document describes established patterns for developing Syto. Follow these conventions when adding features or modifying existing code.

---

## 1. Adding a New Transform

Adding a transform requires changes across multiple files. Use this checklist:

### 1.1 Checklist

| Step | File                             | What to Add                        |
| ---- | -------------------------------- | ---------------------------------- |
| 1    | `src/core/transforms.ts`         | Transform implementation           |
| 2    | `src/core/schema-engine.ts`      | Schema propagation logic           |
| 3    | `src/app/types.ts`               | Dialog state interface (if needed) |
| 4    | `src/app/stores/DialogStore.ts`  | Dialog state signals               |
| 5    | `src/app/components/*Dialog.tsx` | Dialog UI component                |
| 6    | `src/app/handlers/*-handlers.ts` | Event handlers                     |
| 7    | `src/app/components/Ribbon.tsx`  | Ribbon button (if new action)      |
| 8    | `src/core/transforms.test.ts`    | Core logic tests                   |
| 9    | `docs/DATA-SPECIFICATION.md`     | Transform documentation            |

---

## 2. Non-Destructive Transformation Pattern

Syto is built on the principle of **non-destructive data wrangling**. Developers MUST ensure that:

1. **Sources are Immutable to Transforms**: Never modify the `data` or `columns` of a `Source` object during transformation execution.
2. **Explicit Replacement with Backups**: If a user explicitly replaces a source's data, the application must maintain a `.backup` of the previous state to allow restoration (Undo/Redo).
3. **Transforms return new tables**: Always use Arquero verbs that return a new table instance or create a new set of objects.
4. **Traceability**: Every user action that changes data must be represented as a `TransformStep` in a `Model`. This allows the application to "replay" the pipeline from the raw source at any time.
5. **No Side Effects**: Transformation logic in `src/core/transforms.ts` must be pure and rely only on the input table, transform parameters, and schema.

This pattern enables technical rollback, experimental workflows, and reproducibility—core pillars of the Syto philosophy.

### 1.2 Core Implementation (`transforms.ts`)

Pattern for transform logic:

```typescript
// In applyTransform() switch or handler
if (transform.yourTransform) {
  const { param1, param2 } = transform.yourTransform;

  // 1. Validate inputs
  if (!param1) {
    throw new Error('param1 is required');
  }

  // 2. Apply transformation using Arquero
  result = table.derive({ newCol: (d) => d.existingCol * 2 });

  // 3. Return modified table
  return result;
}
```

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

### 1.4 Dialog State (`DialogStore.ts`)

Add signals for dialog form state:

```typescript
// Add to DialogStore class
static yourTransformState = {
  param1: signal(''),
  param2: signal<string[]>([]),
  error: signal<string | null>(null),
  previewData: signal<DataRow[] | null>(null),
};

// Add to resetAll()
static resetAll() {
  // ... existing resets
  this.yourTransformState.param1.value = '';
  this.yourTransformState.param2.value = [];
  this.yourTransformState.error.value = null;
  this.yourTransformState.previewData.value = null;
}
```

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

Standard handler pattern:

```typescript
// In src/app/handlers/your-transform-handlers.ts

let previewTimer: number | null = null;

export function validateInput(): boolean {
  const { param1, error } = DialogStore.yourTransformState;

  if (!param1.value.trim()) {
    error.value = 'Parameter is required';
    return false;
  }

  error.value = null;
  return true;
}

export function debouncedUpdatePreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    updatePreview();
  }, 150);
}

export function updatePreview() {
  if (!validateInput()) return;

  const transform = { yourTransform: { param1: DialogStore.yourTransformState.param1.value } };
  const result = applyTransform(AppStore.currentTable.value, transform, AppStore.schema.value);

  DialogStore.yourTransformState.previewData.value = result
    .objects()
    .slice(0, getPreviewRowLimit());
}

export function applyTransform() {
  if (!validateInput()) return;

  const transform = { yourTransform: { param1: DialogStore.yourTransformState.param1.value } };

  StepService.runTransform('Your Transform', transform, createStandardCallbacks(), () =>
    DialogStore.closeDialog('yourTransform')
  );
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
| Component   | `src/app/components/*.test.tsx` | UI interaction                           |

### 3.2 Core Logic Tests

Pattern for transform tests:

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

### 3.3 Component Tests

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

### 3.4 Mocking Guidelines

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

Use debouncing for expensive operations triggered by user input:

```typescript
let timer: number | null = null;

export function debouncedUpdatePreview() {
  if (timer) clearTimeout(timer);
  timer = window.setTimeout(() => {
    updatePreview();
  }, 150); // 150ms for typing, adjust based on operation cost
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

### 5.3 Performance Logging

Use the performance logger for timing critical operations:

```typescript
import { PerformanceLogger } from '../core/performance-logger';

const logger = new PerformanceLogger('Transform');
logger.start();

// ... operation ...

logger.end(result); // Logs timing with data shape
// Output: "⚡ Transform: 45ms (1000 rows × 5 cols)"
```

Icons indicate performance:

- ⚡ < 50ms (fast)
- ✓ 50-200ms (acceptable)
- ⏱️ 200-500ms (slow)
- ⚠️ > 500ms (needs attention)

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
7. **[`dialog-handlers.ts`](../src/app/handlers/dialog-handlers.ts)** - Add init logic (if needed)
8. **[`step-handlers.ts`](../src/app/handlers/step-handlers.ts)** - Add transform handler (if transform)

The registry eliminates the need to update `isSlidePanel()`, `getDialogTitle()`, etc. - these are auto-generated from metadata.

### 7.2 Adding a New Function

> **Documentation**: When adding functions, follow the JSDoc documentation pattern described in [FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md). The documentation system auto-generates markdown and JSON schema from JSDoc comments.

To add a whitelisted function:

1. Add to whitelist in `ast-validator.ts`:

```typescript
const WHITELISTED_FUNCTIONS = [
  // ... existing functions
  'your_function',
];
```

2. Add arity check in `ast-validator.ts`:

```typescript
const FUNCTION_ARITY: Record<string, [number, number]> = {
  // [min, max] arguments
  your_function: [1, 2],
};
```

3. Implement in `ast-interpreter.ts` with JSDoc comments:

```typescript
/**
 * @category [Date|Text|Math|Regex|Conversion]
 * @description Brief description of what the function does
 * @param paramName - Parameter description
 * @returns Return value description
 * @example your_function(arg1)
 * @example your_function("value") → result
 */
your_function: (arg1, arg2) => {
  // Implementation
};
```

4. Regenerate documentation:

   ```bash
   npm run docs:generate
   ```

5. Update `DATA-SPECIFICATION.md` §4.3 if adding a new category or significant function group.

---

**End of Development Patterns**
