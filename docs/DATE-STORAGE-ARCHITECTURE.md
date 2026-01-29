# Date Storage Architecture Review

> **Purpose:** Analysis of date handling in Syto, identified issues, and implementation roadmap for native Date object support.

**Status:** Analysis Complete / Implementation Planned
**Created:** January 2026

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Problem Analysis](#problem-analysis)
3. [JavaScript & Arquero Limitations](#javascript--arquero-limitations)
4. [Alternative Approaches](#alternative-approaches)
5. [Recommended Solution](#recommended-solution)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Current Architecture

### String-Based Date Storage

The system employs a **string-based date storage strategy** with a two-tier type system:

| Layer            | What's Stored                       | Purpose                    |
| ---------------- | ----------------------------------- | -------------------------- |
| **Data layer**   | Strings (`"2024-01-15"`)            | Actual cell values         |
| **Schema layer** | Type hints (`"date"`, `"datetime"`) | UI display, type inference |

### Data Flow

```
CSV/JSON Import → Strings → Schema Inference (logical types) →
Transforms (strings) → Persistence (strings) → Export (strings)
```

### Key Files

| File                                                            | Responsibility                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| [`src/core/storage.ts`](../src/core/storage.ts)                 | `convertDatesForStorage()` - Date→string before persistence |
| [`src/core/schema-engine.ts`](../src/core/schema-engine.ts)     | Type inference via pattern matching on strings              |
| [`src/core/ast-interpreter.ts`](../src/core/ast-interpreter.ts) | `parseToDate()` - String→Date for expressions               |
| [`src/core/type-converter.ts`](../src/core/type-converter.ts)   | Type conversion between column types                        |

### Why Strings?

The design addresses a real JavaScript serialization problem:

```javascript
// The timezone bug that forced this design:
const date = new Date(2024, 0, 1); // Jan 1, 2024 local midnight
JSON.stringify({ date }); // "2023-12-31T23:00:00.000Z" (in UTC+1)
```

JavaScript's `Date.toJSON()` converts to UTC _before_ the JSON replacer runs, causing dates to shift by timezone offset. The `convertDatesForStorage()` function bypasses this by converting Date objects to `YYYY-MM-DD` strings _before_ `JSON.stringify()` sees them.

---

## Problem Analysis

### Data Integrity Issues

The primary concern is **date corruption or shifting** caused by:

1. **Timezone inconsistency** - Different code paths handle UTC vs local time differently
2. **Multiple serialization points** - Dates pass through `JSON.stringify()` at multiple locations
3. **No validation on load** - Strings are trusted to be valid dates
4. **Schema-data mismatch** - Schema says "date" but data could contain any string

### Performance Concerns

1. **No Date objects in runtime data** - After import or transform execution, `model.data` contains strings
2. **Repeated parsing** - Expression functions like `year(date_col)` must call `parseToDate()` on each evaluation
3. **Transform re-computation is expensive** - Every date operation re-parses strings during model recomputation

### Type Safety Gaps

```typescript
// Schema: { name: "created", type: "date" }
// Data: { created: "2024-01-15" }  // Just a string - valid
// Data: { created: "invalid" }     // Also passes - no enforcement!
```

---

## JavaScript & Arquero Limitations

### JavaScript Date Issues

- **No timezone-aware date type** - Date objects are always UTC internally
- **JSON serialization** - Always converts to UTC ISO string via `toJSON()`
- **Parsing inconsistency**:
  - `new Date("2024-01-15")` → UTC midnight
  - `new Date(2024, 0, 15)` → local midnight

### Arquero Behavior

Arquero is **type-agnostic** - it operates on whatever JavaScript values are present:

```typescript
const table = aq.from([{ date: '2024-01-15' }]); // Works
const table = aq.from([{ date: new Date() }]); // Also works
```

Arquero doesn't provide:

- Native date column type enforcement
- Automatic date parsing on import
- Date-aware serialization

### IndexedDB Capabilities

IndexedDB uses the **structured clone algorithm**, which _does_ support Date objects. The current string-based approach is a design choice for JSON export/import consistency, not a technical limitation.

---

## Alternative Approaches

### Approach A: Native Dates with Schema-Driven Serialization (Recommended)

**Concept:** Store actual Date objects in runtime memory, only stringify for persistence.

```typescript
// Runtime (AppStore.currentData):
{ created: Date(2024, 0, 15) }  // Native Date object

// Persistence:
serializeData() → { created: "2024-01-15" }

// Load:
hydrateData() → { created: Date(2024, 0, 15) }
```

**Benefits:**

- Type safety in runtime
- No repeated parsing in expressions
- Date comparisons work natively
- Better performance for date-heavy transforms

**Challenges:**

- Need bidirectional conversion (serialize + deserialize)
- Must track which columns are dates (already in schema)
- Schema must be authoritative

### Approach B: Timestamp Storage

**Concept:** Store dates as Unix timestamps (numbers).

```typescript
// Storage: { created: 1704067200000 }  // ms since epoch
```

**Benefits:**

- No parsing needed for comparisons
- JSON-safe (numbers serialize cleanly)
- Fast sorting

**Challenges:**

- Loses human readability in raw data
- Still needs formatting for display
- Doesn't solve the runtime type problem

### Approach C: ISO String with Metadata

**Concept:** Keep strings but add a date marker.

```typescript
{ created: { __type: "date", value: "2024-01-15" } }
```

**Benefits:**

- Self-describing data
- Backward compatible

**Challenges:**

- Bloats data size significantly
- Complicates all data access
- Arquero doesn't understand this structure

---

## Recommended Solution

### Native Dates with Schema-Driven Serialization

**Core principle:** Let the **schema be authoritative** for type conversion, not string pattern matching.

```
Import → Parse dates immediately (schema-guided) → Native Date objects in memory →
Transforms (fast comparisons) → Persistence (schema-guided serialization) → Export
```

### New Module: `data-hydration.ts`

```typescript
// src/core/data-hydration.ts

import { parseToDate } from './ast-interpreter';
import type { ColumnSchema } from './schema-engine';

/**
 * Convert string dates to Date objects based on schema.
 * Called after loading from persistence or importing data.
 */
export function hydrateData(data: any[], schema: ColumnSchema[]): any[] {
  const dateColumns = new Set(
    schema.filter((c) => c.type === 'date' || c.type === 'datetime').map((c) => c.name)
  );

  if (dateColumns.size === 0) return data;

  return data.map((row) => {
    const hydratedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (dateColumns.has(key) && value != null) {
        const parsed = parseToDate(value);
        hydratedRow[key] = parsed ?? value; // Keep original if unparseable
      } else {
        hydratedRow[key] = value;
      }
    }
    return hydratedRow;
  });
}

/**
 * Convert Date objects to strings for persistence.
 * Called before saving to IndexedDB or exporting.
 */
export function serializeData(data: any[], schema: ColumnSchema[]): any[] {
  const dateColumns = new Set(
    schema.filter((c) => c.type === 'date' || c.type === 'datetime').map((c) => c.name)
  );

  return data.map((row) => {
    const serializedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        serializedRow[key] = formatDateForStorage(value);
      } else {
        serializedRow[key] = value;
      }
    }
    return serializedRow;
  });
}

function formatDateForStorage(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeForStorage(date: Date): string {
  const d = formatDateForStorage(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
```

### Hydration Points

Data should be hydrated (string→Date) at these locations:

1. **After `loadInitialData()`** - When app starts and loads from IndexedDB
2. **After CSV/JSON import** - Immediately after parsing
3. **After workflow JSON import** - When loading saved workflows

### Serialization Points

Data should be serialized (Date→string) at these locations:

1. **Before `saveSources()` / `saveModels()`** - Persistence boundary
2. **Before JSON export** - `exportDataJSON()`, `exportWorkflowJSON()`
3. **Before clipboard copy** - `copyJSONToClipboard()`

---

## Implementation Roadmap

### Phase 1: Core Infrastructure

| Task                       | File(s)                                | Notes                                           |
| -------------------------- | -------------------------------------- | ----------------------------------------------- |
| Create `data-hydration.ts` | New: `src/core/data-hydration.ts`      | `hydrateData()` and `serializeData()` functions |
| Add comprehensive tests    | New: `src/core/data-hydration.test.ts` | Edge cases, timezone handling, null values      |

### Phase 2: Persistence Layer

| Task                   | File(s)               | Notes                 |
| ---------------------- | --------------------- | --------------------- |
| Update `loadSources()` | `src/core/storage.ts` | Hydrate after load    |
| Update `loadModels()`  | `src/core/storage.ts` | Hydrate after load    |
| Update `saveSources()` | `src/core/storage.ts` | Serialize before save |
| Update `saveModels()`  | `src/core/storage.ts` | Serialize before save |

### Phase 3: Import Handlers

| Task                      | File(s)                               | Notes                  |
| ------------------------- | ------------------------------------- | ---------------------- |
| CSV import hydration      | `src/app/handlers/import-handlers.ts` | After schema inference |
| JSON import hydration     | `src/app/handlers/import-handlers.ts` | After parsing          |
| Workflow import hydration | `src/app/handlers/import-handlers.ts` | After loading          |

### Phase 4: Service Layer

| Task                                   | File(s)                            | Notes                          |
| -------------------------------------- | ---------------------------------- | ------------------------------ |
| Update `StepService.applyStepResult()` | `src/app/services/StepService.ts`  | Remove redundant serialization |
| Update `ModelService.switchToModel()`  | `src/app/services/ModelService.ts` | Handle hydrated data           |
| Update `ModelService.createNewModel()` | `src/app/services/ModelService.ts` | Start with hydrated data       |

### Phase 5: Export Layer

| Task                           | File(s)                             | Notes                   |
| ------------------------------ | ----------------------------------- | ----------------------- |
| Update `exportDataJSON()`      | `src/app/services/ExportService.ts` | Serialize before export |
| Update `exportWorkflowJSON()`  | `src/app/services/ExportService.ts` | Serialize before export |
| Update `copyJSONToClipboard()` | `src/app/services/ExportService.ts` | Serialize before copy   |

### Phase 6: Expression Functions

| Task                   | File(s)                       | Notes                                           |
| ---------------------- | ----------------------------- | ----------------------------------------------- |
| Update `parseToDate()` | `src/core/ast-interpreter.ts` | Handle both Date objects and strings gracefully |
| Update date functions  | `src/core/ast-interpreter.ts` | Optimize for native Date input                  |

### Phase 7: Validation & Cleanup

| Task                                              | File(s)                      | Notes                                     |
| ------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Add date validation on hydration                  | `src/core/data-hydration.ts` | Warn on invalid date strings              |
| Remove redundant `convertDatesForStorage()` calls | Multiple                     | Audit all usages                          |
| Update schema engine                              | `src/core/schema-engine.ts`  | Infer from Date objects, not just strings |

---

## Migration Considerations

### Backward Compatibility

Existing persisted data (IndexedDB) contains string dates. The new system must:

1. **Detect format on load** - Check if values are strings or Date objects
2. **Hydrate strings automatically** - Convert to Date objects on load
3. **Always serialize for persistence** - Ensures consistent storage format

### Testing Strategy

1. **Unit tests** for `hydrateData()` and `serializeData()`
2. **Round-trip tests** - Hydrate → Serialize → Hydrate should be idempotent
3. **Timezone tests** - Verify no date shifting across timezones
4. **Edge cases** - null values, invalid dates, empty strings, mixed formats
5. **Integration tests** - Full import → transform → export cycle

---

## Related Documentation

- [DATA-SPECIFICATION.md](DATA-SPECIFICATION.md) - Data structures and type system
- [FUTURE-PROOFING.md](FUTURE-PROOFING.md) - Schema evolution guidelines
- [DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md) - Implementation patterns

---

**Last updated:** January 2026
