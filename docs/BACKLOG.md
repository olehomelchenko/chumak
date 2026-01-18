# Chumak — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

---

## Expression System Enhancements

### Word-Form Boolean Operators

**Status**: Planned (breaking change)
**Effort**: Medium (~100 lines)
**Files**: `ast-validator.ts`, `ast-interpreter.ts`, jsep plugin configuration

Replace `&&`/`||`/`!` with `and`/`or`/`not` as the primary syntax. Since the app isn't released yet, this can be a clean replacement rather than an addition.

**What's needed**:

- Configure jsep to recognize `and`, `or`, `not` as binary/unary operators
- Update AST validator to accept these operators
- Update interpreter to handle them
- Update expression documentation and UI hints
- Update all existing tests that use `&&`/`||`

**Why it matters**: Non-programmers find `and`/`or` more readable than `&&`/`||`. This aligns with the beginner-friendly goal.

---

### Expression Functions (String, Date, Math)

**Status**: Planned
**Effort**: Large (~230 lines)
**Files**: `ast-validator.ts`, `ast-interpreter.ts`, documentation

Add whitelisted functions for common operations. Arquero provides these via `op.*`, so the work is mapping user syntax to Arquero operations.

**Phase 1 — Core Functions**:

| Category | Functions                               | Example           |
| -------- | --------------------------------------- | ----------------- |
| String   | `upper`, `lower`, `trim`, `length`      | `upper(name)`     |
| Math     | `abs`, `round`, `floor`, `ceil`, `sqrt` | `round(price, 2)` |
| Type     | `parse_int`, `parse_float`, `is_null`   | `is_null(value)`  |

**Phase 2 — Extended Functions**:

| Category | Functions                                 | Example                 |
| -------- | ----------------------------------------- | ----------------------- |
| String   | `substring`, `replace`, `split`, `concat` | `substring(code, 0, 3)` |
| Date     | `year`, `month`, `day`, `parse_date`      | `year(date_col)`        |
| Math     | `min`, `max`, `log`, `exp`, `power`       | `power(base, 2)`        |

**Implementation approach**:

1. Update AST validator to allow `CallExpression` nodes
2. Whitelist specific function names with arity checks
3. Map function calls to Arquero `op.*` equivalents during interpretation
4. Comprehensive tests for each function

---

## Transform Gaps

### Impute (Fill Missing Values)

**Status**: Planned
**Effort**: Small-Medium (~50-120 lines depending on scope)
**Arquero**: `table.impute(values, options)`

Fill null/missing values with constants or calculated values.

**Phase 1 — Constants only**:

```json
{ "impute": { "sales": 0, "region": "Unknown" } }
```

**Phase 2 — Expression-based** (requires function support):

```json
{ "impute": { "sales": "mean(sales)", "price": "median(price)" } }
```

**UI**: Column selection + value input, with dropdown for common patterns (zero, empty string, mean, median).

---

### Set Operations (Concat, Union)

**Status**: Planned
**Effort**: Small (~40 lines total)
**Arquero**: `table.concat()`, `table.union()`

Combine multiple models/sources.

| Operation  | Behavior                        | Arquero               |
| ---------- | ------------------------------- | --------------------- |
| **Concat** | Stack rows (keeps duplicates)   | `table.concat(other)` |
| **Union**  | Stack rows (removes duplicates) | `table.union(other)`  |

**Why useful**: Common need when data comes in multiple files (monthly reports, split exports).

**Lower priority**:

- `intersect` — keep rows in both tables
- `except` — keep rows only in first table

---

### Sample (Random Rows)

**Status**: Planned
**Effort**: Small (~25 lines)
**Arquero**: `table.sample(n, options)`

Extract random sample of rows. Useful for:

- Testing workflows on large datasets
- Creating training/test splits
- Quick exploration

```json
{ "sample": { "count": 1000, "seed": 42 } }
```

---

### Spread (Array to Columns)

**Status**: Low priority
**Effort**: Small-Medium (~40 lines)
**Arquero**: `table.spread(column, options)`

Convert array column into multiple columns.

```json
{ "spread": { "column": "tags", "limit": 5 } }
```

**Use case**: JSON data with array fields that need to become separate columns.

---

### Unroll (Array to Rows)

**Status**: Low priority
**Effort**: Small-Medium (~40 lines)
**Arquero**: `table.unroll(column, options)`

Expand array values into separate rows.

```json
{ "unroll": { "column": "items" } }
```

**Use case**: Flattening nested data structures.

---

### Advanced Joins

**Status**: Low priority
**Effort**: Small (~90 lines total)
**Arquero**: `table.semijoin()`, `table.antijoin()`, `table.lookup()`

| Join Type    | Behavior                                           | Use Case                  |
| ------------ | -------------------------------------------------- | ------------------------- |
| **Semijoin** | Keep left rows that match right (no right columns) | Filtering by existence    |
| **Antijoin** | Keep left rows that don't match right              | Finding missing records   |
| **Lookup**   | Fast left join for adding columns                  | Reference data enrichment |

Current join implementation covers most needs; these are edge cases.

---

## UI/UX Enhancements

### Keyboard Shortcuts

**Status**: Planned
**Effort**: Medium

- `Ctrl/Cmd + Z` — Undo last step
- `Ctrl/Cmd + S` — Save/download workflow
- `Ctrl/Cmd + V` — Paste data (already works)
- `Delete` — Remove selected step
- Arrow keys — Navigate steps/columns

---

### Step Reordering

**Status**: Planned
**Effort**: Medium

Drag-and-drop reordering of pipeline steps. Currently steps can only be added/removed, not reordered.

**Challenges**:

- Some reorderings are invalid (can't sort by a column that doesn't exist yet)
- Need to validate and re-execute pipeline after reorder
- UI for drag handles in step list

---

### Column Reordering in Preview

**Status**: Nice to have
**Effort**: Small-Medium

Drag columns in the data table to reorder. Would generate a `select` step with the new order.

---

## Infrastructure

### Performance Profiling & Limits

**Status**: Ongoing
**Effort**: Investigation

Current soft limit is ~100K rows based on browser memory. Recent Preact migration improved rendering performance. Need systematic testing to determine:

- Comfortable limit on various machines
- Where bottlenecks occur (parsing, transforms, rendering)
- Whether web workers could help for heavy transforms

---

### Expression Error Messages

**Status**: Ongoing improvement
**Effort**: Medium

Current errors include position information. Could be better:

- Suggestions for typos ("Did you mean `sales` instead of `sale`?")
- Schema-aware hints ("Column `price` is string type, did you mean to convert it?")
- Visual highlighting in expression input

---

### Workflow Format Stability

**Status**: Important for future
**Effort**: Documentation + validation

The transformation JSON format needs to be stable enough that:

- Workflows saved today work in future versions
- Format could be executed by different backends (Arquero, DuckDB, etc.)
- Breaking changes are versioned and documented

---

### Dialog Registration Centralization

**Status**: Future refactor
**Effort**: Medium (~150 lines)

Currently, adding a new dialog requires updates across ~12 files (see [DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md) §7.1). This is error-prone and has caused bugs (missing entries in `isSlidePanel` arrays, etc.).

**Proposed Solution**: Create a centralized dialog registry that defines dialog metadata once:

```typescript
const DIALOG_REGISTRY = {
  impute: {
    name: 'impute',
    title: 'Impute Missing Values',
    type: 'slide-panel', // or 'centered-modal'
    component: ImputeDialog,
    initState: (app) => {
      /* ... */
    },
  },
  // ... other dialogs
};
```

**Benefits**:

- Single source of truth for dialog configuration
- Automatic generation of `isSlidePanel()`, `getDialogTitle()`, etc.
- Type-safe dialog names
- Reduced risk of missed updates

**Files to refactor**: `dialog-handlers.ts`, `App.tsx`, create new `dialog-registry.ts`

---

## Not Planned (Out of Scope)

These have been considered and explicitly excluded:

- **Custom user-defined functions**: Adds complexity, security concerns
- **Cell-by-cell editing**: This is a transformation tool, not a spreadsheet
- **SQL query mode**: Expressions cover this; SQL adds learning curve
- **Plugin/extension system**: Premature; focus on core features first
- **Real-time collaboration**: Requires server infrastructure, conflicts with local-only principle
- **Native app** (Electron/DuckDB): Documented in [NATIVE-APP-SPEC.md](NATIVE-APP-SPEC.md) as potential future direction, not current roadmap

---

## Priority Summary

### High Priority (Core Gaps)

1. Word-form boolean operators (`and`/`or`/`not`)
2. Expression functions — Phase 1 (string, math, type basics)
3. Impute — Phase 1 (constants)

### Medium Priority (Useful Additions)

4. Set operations (concat, union)
5. Expression functions — Phase 2 (date, extended string/math)
6. Keyboard shortcuts
7. Impute — Phase 2 (expression-based)

### Lower Priority (Nice to Have)

8. Step reordering
9. Sample transform
10. Advanced joins (semi, anti, lookup)
11. Spread/unroll transforms

---

## Arquero Leverage Notes

Most planned transforms are thin wrappers around existing Arquero verbs:

| Transform | Arquero Verb       | Wrapper Complexity |
| --------- | ------------------ | ------------------ |
| Impute    | `table.impute()`   | 30-60 lines        |
| Concat    | `table.concat()`   | ~20 lines          |
| Union     | `table.union()`    | ~20 lines          |
| Sample    | `table.sample()`   | ~25 lines          |
| Spread    | `table.spread()`   | ~40 lines          |
| Unroll    | `table.unroll()`   | ~40 lines          |
| Semijoin  | `table.semijoin()` | ~30 lines          |
| Antijoin  | `table.antijoin()` | ~30 lines          |

The heavy lifting is in expression functions, which require AST validator/interpreter updates rather than new Arquero integration.

---

**Last updated**: January 2025
