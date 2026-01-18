# Chumak — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

---

## Transform Gaps

> **See also**: [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) for comprehensive analysis of transform architecture, identified gaps, and prioritized improvements based on Power Query M limitations research.

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

### Custom Icon Library

**Status**: Planned
**Effort**: Medium-Large
**Reference**: [custom-icons-setup.md](custom-icons-setup.md)

Migrate from Iconify CDN to custom hand-drawn SVG icons for better brand consistency and offline support.

**Current State**: Chumak uses Iconify via CDN script (`iconify.min.js`) with icons from Carbon Design (`carbon:*`), Material Symbols Light (`material-symbols-light:*`), Codicon (`codicon:*`), and Iconify Extended (`ix:*`).

**Proposed Solution**:

- Generate Preact components from hand-drawn SVGs using SVGR
- Create icon wrapper component for gradual migration
- Build icon registry for programmatic access (e.g., `getTypeIcon`)
- Phase-based migration: infrastructure → high-visibility icons → dialogs → complete

**Benefits**:

- Offline support (no CDN dependency)
- Consistent visual style with hand-drawn aesthetic
- Better tree-shaking (only used icons in bundle)
- Brand identity through custom iconography

**Challenges**:

- ~100+ icons currently in use across components
- Need to maintain backward compatibility during migration
- Icon functions (`getTypeIcon`, `getNotificationIcon`) need updates

See [custom-icons-setup.md](custom-icons-setup.md) for detailed setup guide and migration strategy.

---

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

1. Set operations (concat, union)

### Medium Priority (Useful Additions)

2. Keyboard shortcuts

### Lower Priority (Nice to Have)

3. Step reordering
4. Column reordering (`reorder`, `moveColumn`)
5. Sample transform
6. Advanced joins (semi, anti, lookup)
7. Spread/unroll transforms
8. Window functions (`cumsum`, `lag`, `rank`) — Future

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

## Completed Features (Historical Record)

Completed features are documented here for posterity:

- **Word-form boolean operators** (`and`/`or`/`not`) — January 2025. Added as beginner-friendly alternatives to `&&`/`||`/`!`.
- **Expression functions** — January 2025. Implemented whitelisted functions for string, math, date, type, and regex operations. See `src/content/expressions.md`.
- **Pattern-based column operations** (`selectPattern`, `removePattern`, `renamePattern`) — January 2025. Schema-drift resilient column operations with prefix/contains/regex matching.
- **Conditional transform** — January 2025. Multi-condition column creation with sequential `when`/`then` evaluation and `else` clause.
- **Case-insensitive comparison functions** (`equals_ci`, `contains_ci`, `starts_with_ci`, `ends_with_ci`) — January 2025.
- **Split expression function** (`split(value, delimiter, index)`) — January 2025. Extract segments from delimited strings without creating columns.
- **Impute transform** — January 2025. Fill missing values with constants via `impute` transform with UI integration.

---

**Last updated**: January 2025
