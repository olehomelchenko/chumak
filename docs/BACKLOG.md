# Chumak — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

---

## Expression System Enhancements

### Word-Form Boolean Operators

**Status**: Completed (January 2025)
**Effort**: Medium (~100 lines)
**Files**: `ast-validator.ts`, `ast-interpreter.ts`, `expression-parser.ts`

Added `and`/`or`/`not` as beginner-friendly alternatives to `&&`/`||`/`!`. Both syntaxes are supported for compatibility.

**What was implemented**:

- Configured jsep to recognize `and`, `or` as binary operators with same precedence as `&&`/`||`
- Added `not` as unary operator equivalent to `!`
- Updated AST validator to accept word-form operators
- Updated interpreter with short-circuit evaluation for `and`/`or`
- Updated expression documentation with examples
- Added comprehensive tests

**Why it matters**: Non-programmers find `and`/`or` more readable than `&&`/`||`. This aligns with the beginner-friendly goal.

---

### Expression Functions (String, Date, Math)

**Status**: Completed (January 2025)
**Effort**: Large (~230 lines)
**Files**: `ast-validator.ts`, `ast-interpreter.ts`, documentation

Implemented whitelisted functions for common operations. Functions are evaluated in the custom interpreter (not via Arquero `op.*`).

**Implemented Functions**:

| Category | Functions                                                                        |
| -------- | -------------------------------------------------------------------------------- |
| String   | `upper`, `lower`, `trim`, `substring`, `len`                                     |
| Math     | `abs`, `round`, `floor`, `ceil`, `min`, `max`                                    |
| Type     | `parse_int`, `parse_float`, `is_nan`                                             |
| Date     | `year`, `month`, `day`, `hour`, `minute`, `second`, `weekday`, `week`, `quarter` |
| Date     | `today`, `now`, `days_between`, `date_add`, `date_trunc`, `format_date`          |
| Regex    | `regexp_match`, `regexp_extract`                                                 |

See `src/content/expressions.md` for full documentation with examples.

---

## Transform Gaps

> **See also**: [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) for comprehensive analysis of transform architecture, identified gaps, and prioritized improvements based on Power Query M limitations research.

### Pattern-Based Column Operations

**Status**: Completed (January 2025)
**Effort**: Low-Medium
**Reference**: [TRANSFORM-ARCHITECTURE-REVIEW.md §2.1](TRANSFORM-ARCHITECTURE-REVIEW.md#21-pattern-based-column-operations-high-priority)

Expose existing `matchColumnPattern()` as user-facing transforms for schema-drift resilience:

```json
{ "selectPattern": { "pattern": "sales_", "matchType": "prefix" } }
{ "removePattern": { "pattern": "_backup$", "matchType": "regex" } }
{ "renamePattern": { "find": "_old$", "replace": "_new", "regex": true } }
```

**What was implemented**:

- Extended `matchColumnPattern()` to support `contains` and `regex` match types
- Added `selectPattern` transform for pattern-based column selection
- Added `removePattern` transform for pattern-based column removal
- Added `renamePattern` transform for bulk rename by pattern (text or regex)
- Full UI integration with dialog components and toolbar buttons
- Comprehensive test coverage

---

### Conditional Transform

**Status**: Completed (January 2025)
**Effort**: Medium
**Reference**: [TRANSFORM-ARCHITECTURE-REVIEW.md §2.2](TRANSFORM-ARCHITECTURE-REVIEW.md#22-multi-condition-logic-high-priority)

Declarative multi-condition logic as alternative to nested ternaries:

```json
{
  "conditional": {
    "column": "tier",
    "conditions": [
      { "when": "sales > 10000", "then": "'platinum'" },
      { "when": "sales > 5000", "then": "'gold'" }
    ],
    "else": "'bronze'"
  }
}
```

**What was implemented**:

- Added `conditional` transform with sequential condition evaluation
- Supports multiple `when`/`then` pairs and an `else` clause
- All expressions validated before execution
- UI with dynamic condition list (add/remove conditions)
- Comprehensive test coverage

---

### Case-Insensitive Comparison Functions

**Status**: Completed (January 2025)
**Effort**: Low
**Reference**: [TRANSFORM-ARCHITECTURE-REVIEW.md §2.3](TRANSFORM-ARCHITECTURE-REVIEW.md#23-case-insensitive-comparisons-medium-priority)

Add `equals_ci()`, `contains_ci()`, `starts_with_ci()`, `ends_with_ci()` expression functions.

**What was implemented**:

- Added `equals_ci()` for case-insensitive string equality
- Added `contains_ci()` for case-insensitive substring matching
- Added `starts_with_ci()` for case-insensitive prefix checking
- Added `ends_with_ci()` for case-insensitive suffix checking
- All functions registered in AST validator and interpreter
- Comprehensive test coverage

---

### Split Expression Function

**Status**: Completed (January 2025)
**Effort**: Low
**Reference**: [TRANSFORM-ARCHITECTURE-REVIEW.md §2.4](TRANSFORM-ARCHITECTURE-REVIEW.md#24-split-transform-overload-medium-priority)

Add `split(value, delimiter, index)` for extracting segments without creating multiple columns:

```json
{ "derive": { "first_name": "split(full_name, ' ', 0)" } }
```

**What was implemented**:

- Added `split(value, delimiter, index)` expression function
- Supports positive indices (0-based) and negative indices (from end: -1 = last)
- Returns `null` for out-of-bounds indices
- Default index is 0 if not specified
- Registered in AST validator and interpreter
- Comprehensive test coverage

---

### Impute (Fill Missing Values)

**Status**: Completed (January 2025)
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

1. ~~Word-form boolean operators (`and`/`or`/`not`)~~ — Completed ✓
2. ~~Expression functions — Phase 1 (string, math, type basics)~~ — Already implemented ✓
3. ~~Impute — Phase 1 (constants)~~ — Completed ✓
4. ~~Pattern-based column operations~~ (`selectPattern`, `removePattern`, `renamePattern`) — Completed ✓
5. ~~Conditional transform~~ (multi-condition column creation) — Completed ✓

### Medium Priority (Useful Additions)

6. ~~Case-insensitive comparison functions~~ (`equals_ci`, etc.) — Completed ✓
7. ~~`split()` expression function~~ for segment extraction — Completed ✓
8. Set operations (concat, union)
9. Keyboard shortcuts

### Lower Priority (Nice to Have)

10. Step reordering
11. Column reordering (`reorder`, `moveColumn`)
12. Sample transform
13. Advanced joins (semi, anti, lookup)
14. Spread/unroll transforms
15. Window functions (`cumsum`, `lag`, `rank`) — Future

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
