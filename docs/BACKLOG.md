# Syto — Feature Backlog

This document tracks planned features and enhancements, organized by scope and effort.

The main block contains details about not implemented yet features or fixes; the block "Completed features" below keeps history once they are implemented and removed from the main block.

---

## Transform Gaps

> **See also**: [TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md) for comprehensive analysis of transform architecture, identified gaps, and prioritized improvements based on Power Query M limitations research.

### Flatten JSON Transform

**Status**: Planned
**Effort**: Medium

A new `flatten` transform that expands JSON object keys into separate columns (analogous to `spread` for arrays). Discovers keys from sample data, creates derived columns with configurable prefix. Initially available via JSON editor only.

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

### Multi-Select Enhancements

**Status**: Partial (placeholders in code)
**Effort**: Small–Medium

Deferred items from multi-column/multi-row selection feature:

- **Extract to new model**: Create a new model from selected rows. Button present in RowToolbar (shows alert placeholder). Needs ModelService integration to create model, copy selected rows, and switch view.
- **Shift+Arrow column range selection**: Extend column selection via keyboard. TODO in `DataTable.tsx` `handleHeaderKeyDown`. Should select from anchor to target column, matching Shift+Click behavior.

---

### Keyboard Shortcuts

**Status**: Partial
**Effort**: Medium

Remaining shortcuts to implement:

- `Ctrl/Cmd + Z` — Undo last step

### Keyboard Accessibility

**Status**: Implemented (February 2026)
**Effort**: Small

Completed improvements:

- Global `:focus-visible` outline using `--color-cyan` tokens
- Focus trapping in slide panel and centered modal dialogs (Tab wrapping + focus restoration)
- Enter-to-submit in slide panel dialogs (with guards for textarea, CodeMirror, etc.)
- Arrow key navigation in TypeMenu with ARIA `menu`/`menuitem` roles

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

| Enhancement           | Description                                               | Severity |
| --------------------- | --------------------------------------------------------- | -------- |
| **Shadow Sources**    | Preserve deleted model states if dependencies exist.      | Medium   |
| **Error Audit Trail** | Explicit warnings for records excluded from aggregations. | Low      |
| **Command Undo/Redo** | First-class UI for undoing/redoing pipeline changes.      | Low      |

---

## SEO Landing Pages

**Status**: Infrastructure complete, content pending
**Effort**: Small per page (content only — infrastructure is in place)
**Reference**: [MONETIZATION-STRATEGY.md](future/MONETIZATION-STRATEGY.md) — Organic Growth section

Create focused landing pages for common data transformation queries (e.g., "pivot CSV online", "remove duplicates", "merge two CSVs"). Each page solves one problem using existing Syto transforms, then funnels users to the full app.

**Infrastructure** (February 2026): The site now uses MPA architecture with a static content page generator (`scripts/build-content-pages.ts`). Adding a new landing page requires only a markdown file in `src/content/` and a page entry in `scripts/content-pages-config.ts`. See [SPECIFICATION.md §3.5](SPECIFICATION.md) for site structure details.

**Priority candidates:** pivot/unpivot, deduplicate, split column, filter rows, join/merge CSVs, JSON-to-CSV, rename columns, aggregate/group-by.

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
- **Expression input syntax highlighting & autocomplete** — February 2026. Replaced plain `<input>` elements in Filter, Derive, and Conditional dialogs with CodeMirror 6 ExpressionEditor component. Provides syntax highlighting for strings, numbers, functions, columns, operators, and keywords. Autocomplete suggests column names, whitelisted functions (with signatures from generated docs), and keywords.
- **Expression typo suggestions** — February 2026. "Did you mean 'X'?" suggestions for misspelled column names and function names using Levenshtein distance matching.
- **Pre-flight JSON validation** — February 2026. Advanced JSON Editor with real-time linting validates syntax, transform keys, and expression correctness before application.
- **Transform handler simplification** — February 2026. Registry-driven dispatch replaces the 32-case switch statement and 4-layer callback indirection chain. Adding a new transform now requires registering `applyHandler` in `dialog-registry.ts` instead of updating StepCallbacks, AppController, syto-app.ts, and test-utils.ts. Handlers call `confirm()`/`prompt()` directly from notification-handlers instead of receiving an `app` parameter.
- **Dynamic expression docs** — February 2026. Context-aware inline documentation in Filter and Derive dialogs. As users type expressions, the `ExpressionDocs` component shows function signatures/descriptions for detected functions, column types with suggested functions based on type, and a full schema reference. Uses AST-based token extraction with text-based fallback for incomplete expressions. Static help sections replaced with compact syntax reference and category links to the Full Reference dialog.
- **MPA architecture & content pages** — February 2026. Migrated from SPA to multi-page architecture: landing page at `/`, SPA at `/app/`, static content pages at `/about/` and `/docs/*`. Content pages are zero-JS HTML generated from markdown by `scripts/build-content-pages.ts`. About page moved from in-app dialog to standalone page. Function reference and user guides available both in-app and as standalone docs.

---

**Last updated**: February 2026
