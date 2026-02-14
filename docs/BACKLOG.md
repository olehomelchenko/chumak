# Syto — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

---

## Transform Gaps

> **See also**: [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) for comprehensive analysis of transform architecture, identified gaps, and prioritized improvements based on Power Query M limitations research.

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

**Status**: Partial (see Completed Features)
**Effort**: Medium

Remaining shortcuts to implement:

- `Ctrl/Cmd + Z` — Undo last step

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

### Transform Handler Simplification

**Status**: Proposed
**Effort**: Medium
**Reference**: [TRANSFORM-HANDLER-SIMPLIFICATION.md](future/TRANSFORM-HANDLER-SIMPLIFICATION.md)

Reduce the number of files required to add a new transform dialog from 11-12 to 8-9 by eliminating callback indirection.

**Current Problem**: Adding a transform dialog requires updating `StepCallbacks` interface, `applyActiveTransform()` switch, `AppController`, `syto-app.ts` callbacks, and `test-utils.ts` mocks. This is error-prone (the window transform bug was caused by missing wiring).

**Proposed Solution**: Registry-driven dispatch - register the apply handler function directly in `dialog-registry.ts` and have `applyActiveTransform()` look it up dynamically instead of using a giant switch statement.

**Benefits**:

- Single registration point (dialog-registry.ts)
- Eliminates 4 files of boilerplate per transform
- Reduces risk of missing wiring
- Incremental migration possible

---

### Date Architecture Cleanup

**Status:** Done
**Effort:** Medium
**Reference:** [DATE-STORAGE-ARCHITECTURE.md](DATE-STORAGE-ARCHITECTURE.md)

Investigated and resolved date handling architecture. The native Date object approach was fully implemented and then reverted due to JavaScript's `Date` type causing silent timezone-related date shifting at serialization boundaries (`toISOString()`, `JSON.stringify()`, etc.).

**Decision:** Dates remain as formatted strings (`"YYYY-MM-DD"`) throughout the entire data layer. Date functions parse strings internally for computation and return formatted strings. See [DATE-STORAGE-ARCHITECTURE.md](DATE-STORAGE-ARCHITECTURE.md) for the full analysis, approaches considered, and developer guide.

**Changes made:**

- `type-converter.ts`: `convertToDate()`/`convertToDateTime()` return formatted strings, not Date objects
- `date-functions.ts`: All functions (`today`, `now`, `date_add`, etc.) return formatted strings
- Removed unnecessary `convertDatesForStorage()` calls from services (no Date objects to convert)
- Fixed `toISOString()` bugs in debug-helpers, GeneratorService
- Improved `formatCellValue()` Date display as a safety net

**Future:** When the TC39 Temporal API (`Temporal.PlainDate`) reaches broad browser support, it would allow switching to proper date-only objects without timezone issues. The `YYYY-MM-DD` string format is already Temporal-compatible.

---

### Performance Profiling & Limits

**Status**: Ongoing
**Effort**: Investigation

Current soft limit is ~100K rows based on browser memory. Need systematic testing to determine:

- Comfortable limit on various machines
- Where bottlenecks occur (parsing, transforms, rendering)

#### Web Workers for Heavy Transforms

**Status**: Deferred (investigation needed)
**Effort**: Medium

Investigate whether Arquero transforms can run in web workers to keep UI responsive during heavy operations. Questions to answer:

- Can Arquero tables be transferred to workers efficiently (structured clone vs transferable)?
- Which transforms would benefit most (join, aggregate, large filter operations)?
- What's the serialization overhead vs transform time tradeoff?

This would require a proof-of-concept with benchmarks before committing to implementation.

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

### Higher Priority (Useful Additions)

1. Command Undo/Redo (Ctrl/Cmd+Z)

### Lower Priority (Nice to Have)

2. Step reordering
3. Column reordering (`reorder`, `moveColumn`)
4. Transform handler simplification — developer experience improvement

---

## Arquero Leverage Notes

Most planned transforms are thin wrappers around existing Arquero verbs:

| Transform    | Arquero Verb       | Wrapper Complexity | Status  |
| ------------ | ------------------ | ------------------ | ------- |
| ~~Sample~~   | `table.sample()`   | ~25 lines          | ✅ Done |
| ~~Spread~~   | `table.spread()`   | ~40 lines          | ✅ Done |
| ~~Unroll~~   | `table.unroll()`   | ~40 lines          | ✅ Done |
| ~~Semijoin~~ | `table.semijoin()` | ~30 lines          | ✅ Done |
| ~~Antijoin~~ | `table.antijoin()` | ~30 lines          | ✅ Done |
| ~~Lookup~~   | `table.lookup()`   | ~30 lines          | ✅ Done |

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
- **Unified Append dialog (Concat/Union)** — January 2026. Replaced separate Concat/Union dialogs with a unified Append experience. Added support for selecting specific columns from both the base and target tables before stacking, using the high-fidelity `JoinTreeSelector` for visual table selection.
- **Multi-model dependency graph** (Phase 3) — January 2025. Complete dependency tracking for all multi-model operations (join, concat, union) with UI indicators for stale models and dependency relationships.
- **Dialog registry centralization** — January 2026. Created [`dialog-registry.ts`](../src/app/dialog-registry.ts) to eliminate duplicated `isSlidePanel` arrays and scattered metadata. Reduced files to update per dialog from ~12 to ~6-9.
- **Sample transform** — January 2026. Extract random sample of rows with optional seed for reproducible sampling. Useful for testing workflows on large datasets.
- **Advanced joins (semijoin, antijoin, lookup)** — January 2026. Three specialized join operations: semijoin filters to matching rows, antijoin filters to non-matching rows, lookup adds specific columns from a reference table.
- **Spread/Unroll transforms** — January 2026. Array column operations: spread converts array columns into multiple columns, unroll expands array values into separate rows. Both support JSON string arrays and `keepOriginal` option.
- **Replace Data & Restore Backup** — January 2026. Updated the non-destructive pillar by allowing sources to be refreshed with new data while maintaining a one-level snapshot backup for undo/redo functionality. Includes schema diff analysis in the import dialog with danger-state warnings for missing columns.
- **Keyboard shortcuts (partial)** — January 2026. `Ctrl/Cmd+S` to save workflow, `Delete` to remove last step, arrow keys to navigate steps. Escape handling for dialogs/modals.
- **Advanced JSON Editor with Linting** — January 2026. Replaced the basic sidebar JSON view with a full-featured CodeMirror-based editor modal. Added real-time linting for JSON syntax, transform keys, and expression validation to catch errors before application.
- **App Layer Refactoring** — January 2026. Major architectural refactoring of `src/app/` layer:
  - Created orchestration modules (`AppOrchestrator`, `EventRouter`, `UrlStateSync`, `DialogCoordinator`) for clear separation of concerns
  - Extracted shared `preview-engine.ts` and `validation-engine.ts` to eliminate ~2,000 LoC of duplication
  - Migrated handlers to store-based pattern (no `this` context), enabling testability
  - Split oversized components into focused sub-components (`join/`, `generate/`, `eda/`)
  - Reduced `syto-app.ts` from 1,579 to 1,200 LoC by removing proxy pattern
  - Added 166 handler tests, improving coverage from 16% to 38%

---

**Last updated**: February 2026
