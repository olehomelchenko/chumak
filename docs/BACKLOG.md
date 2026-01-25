# Syto — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

---

## Transform Gaps

> **See also**: [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) for comprehensive analysis of transform architecture, identified gaps, and prioritized improvements based on Power Query M limitations research.

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

**Current State**: Syto uses Iconify via CDN script (`iconify.min.js`) with icons from Carbon Design (`carbon:*`), Material Symbols Light (`material-symbols-light:*`), Codicon (`codicon:*`), and Iconify Extended (`ix:*`).

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

---

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

---

## Non-Destructive Pillar Strengthening

**Status**: Analysis Complete / Implementation Planned
**Reference**: [NON-DESTRUCTIVE-ANALYSIS.md](NON-DESTRUCTIVE-ANALYSIS.md)

A comprehensive analysis of Syto's adherence to non-destructive principles was conducted in January 2026. While the core foundation is solid, several infrastructure enhancements are planned to make the "unbreakable" workflow a reality.

| Enhancement               | Description                                               | Severity |
| ------------------------- | --------------------------------------------------------- | -------- |
| **Shadow Sources**        | Preserve deleted model states if dependencies exist.      | Medium   |
| **Error Audit Trail**     | Explicit warnings for records excluded from aggregations. | Low      |
| **Pre-flight Validation** | Schema integrity checks for manual JSON edits.            | Low      |
| **Command Undo/Redo**     | First-class UI for undoing/redoing pipeline changes.      | Low      |

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

### Medium Priority (Useful Additions)

1. Keyboard shortcuts

### Lower Priority (Nice to Have)

2. Step reordering
3. Column reordering (`reorder`, `moveColumn`)
4. Sample transform
5. Advanced joins (semi, anti, lookup)
6. Spread/unroll transforms
7. Window functions (`cumsum`, `lag`, `rank`) — Future

---

## Arquero Leverage Notes

Most planned transforms are thin wrappers around existing Arquero verbs:

| Transform | Arquero Verb       | Wrapper Complexity |
| --------- | ------------------ | ------------------ |
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
- **Expression functions** — January 2025. Implemented whitelisted functions for string, math, date, type, and regex operations. See [FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md) for the auto-generated documentation system.
- **Data Generation** — January 2025. Added synthetic data generation feature with support for integer/date sequences, random numbers/dates/booleans, and random categories. Accessible via Sidebar → Generate action.
- **Pattern-based column operations** (`selectPattern`, `removePattern`, `renamePattern`) — January 2025. Schema-drift resilient column operations with prefix/contains/regex matching.
- **Conditional transform** — January 2025. Multi-condition column creation with sequential `when`/`then` evaluation and `else` clause.
- **Case-insensitive comparison functions** (`equals_ci`, `contains_ci`, `starts_with_ci`, `ends_with_ci`) — January 2025.
- **Split expression function** (`split(value, delimiter, index)`) — January 2025. Extract segments from delimited strings without creating columns.
- **Impute transform** — January 2025. Fill missing values with constants via `impute` transform with UI integration.
- **Concat and Union transforms** — January 2025. Stack rows from multiple models/sources. Concat keeps duplicates, union removes them. Full dependency tracking and staleness support.
- **Multi-model dependency graph** (Phase 3) — January 2025. Complete dependency tracking for all multi-model operations (join, concat, union) with UI indicators for stale models and dependency relationships.
- **Dialog registry centralization** — January 2026. Created [`dialog-registry.ts`](../src/app/dialog-registry.ts) to eliminate duplicated `isSlidePanel` arrays and scattered metadata. Reduced files to update per dialog from ~12 to ~6-9.

---

**Last updated**: January 2026
