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

### Top N per Group

**Status**: Planned
**Effort**: Small-Medium
**Origin**: [Weaverbird comparison](future/WEAVERBIRD-COMPARISON.md) -- WB's `top` step

A transform that returns the top (or bottom) N rows within each group, ordered by a value column. Example: "top 5 products by sales in each category."

**Why this matters**: One of the most common analytical questions. Currently requires two steps: a `window` transform to compute `rank()` partitioned by group, then a `filter` to keep only rank <= N. Combining these into one operation is a significant UX improvement for a very frequent task.

**Implementation**: Arquero `groupby()` → `derive(rank)` → filter → ungroup → drop rank column. All primitives already exist.

### Fill Date Gaps

**Status**: Planned
**Effort**: Medium
**Origin**: [Weaverbird comparison](future/WEAVERBIRD-COMPARISON.md) -- WB's `addmissingdates` step

An `addMissingDates` transform that fills gaps in time series data. Given a date column and a granularity (day/week/month), generates missing rows with null values for metric columns.

**Why this matters**: Time series with gaps produce misleading charts (lines jump over missing periods) and break calculations like moving averages. Every analyst working with dates encounters this. There is no reasonable workaround in Syto today -- it would require manually generating a date range externally and joining it in.

**Implementation**: Detect date range bounds from data, generate complete sequence at specified granularity, left-join original data onto the generated sequence. If grouping columns are specified (e.g., per-region time series), cross-join groups × dates first.

### Bulk File Import with Optional Union

**Status**: Planned
**Effort**: Small-Medium
**Origin**: Tidy data analysis — "one type in multiple tables" pattern (Wickham, 2014)

Import multiple files at once via multi-select file picker (`<input multiple>`) or multi-file drag-drop. Each file becomes a separate source (using existing import logic in a loop). After import, offer a one-click "Combine into one?" option that auto-generates a `union` or `concat` step across all imported sources.

**Optional enhancement**: Before combining, auto-derive a `source_file` column on each source so users can trace rows back to their origin file.

**Why this matters**: A common real-world pattern is data split across many files (one per year, per region, per export batch). Currently each file must be imported individually and manually concatenated. Bulk import removes the tedium for the 2–20 file case, which covers most analyst workflows.

**Technical notes**: No new dependencies. Browser APIs (`FileList`, `DataTransferItemList`) natively support multi-file selection. Schema mismatches across files are handled by existing `concat`/`union` column alignment logic.

---

## UI/UX Enhancements

### Empty State Components

**Status**: Planned
**Effort**: Medium

Add designed empty states for scenarios currently showing blank space. See [UX-SPECIFICATION.md](UX-SPECIFICATION.md) §3.8 for the inventory: zero rows after filter, no steps in pipeline, empty EDA panel, no columns selected in dialog.

---

---

## Non-Destructive Pillar Strengthening

**Status**: Analysis Complete — No Remaining Gaps
**Reference**: [NON-DESTRUCTIVE-ANALYSIS.md](NON-DESTRUCTIVE-ANALYSIS.md)

A comprehensive analysis of Syto's adherence to non-destructive principles was conducted in January 2026. The original analysis identified 4 gaps; all have been resolved:

- **Undo/Redo** — Implemented (March 2026)
- **JSON Danger Zone Validation** — Implemented (February 2026)
- **Shadow Sources** — Decided against. The current hard-block on deleting referenced models is simpler, more transparent, and sufficient.
- **Error Audit Trail** — Decided against. Error counts are already visible in EDA before aggregation. Adding a warnings sideband to the transform pipeline would require significant architectural changes for marginal benefit.

---

## SEO Landing Pages

**Status**: Infrastructure complete, content pending
**Effort**: Small per page (content only — infrastructure is in place)
**Reference**: [MONETIZATION-STRATEGY.md](future/MONETIZATION-STRATEGY.md) — Organic Growth section

Create focused landing pages for common data transformation queries (e.g., "pivot CSV online", "remove duplicates", "merge two CSVs"). Each page solves one problem using existing Syto transforms, then funnels users to the full app.

**Infrastructure** (February 2026): The site now uses MPA architecture with a static content page generator (`scripts/build-content-pages.ts`). Adding a new landing page requires only a markdown file in `src/content/` and a page entry in `scripts/content-pages-config.ts`. See [SPECIFICATION.md §3.5](SPECIFICATION.md) for site structure details.

**Priority candidates:** pivot/unpivot, deduplicate, split column, filter rows, join/merge CSVs, JSON-to-CSV, rename columns, aggregate/group-by.

**i18n considerations for landing pages:**

Landing pages are zero-JS static HTML — the app's runtime i18next system cannot serve them. Multilingual landing pages require a **separate build-time i18n pipeline**:

- **URL structure**: Decide early on `/{locale}/...` path prefix (e.g., `/uk/pivot-csv-online/`). This shapes routing, Vite MPA config, and all internal links — hard to retrofit later.
- **Content approach**: Separate markdown files per locale (`src/content/en/`, `src/content/uk/`). Long-form marketing copy doesn't fit i18next's key-value model.
- **Shared UI chrome**: Build script can read from existing `locales/*/common.json` for nav/footer/CTA button labels that appear on both landing pages and in the app, avoiding duplication.
- **`hreflang` tags**: Every page needs `<link rel="alternate" hreflang="..." href="...">` cross-references so Google serves the right locale.
- **`<html lang="...">`**: Set per-page at build time, not toggled by JS.
- **Sitemap**: Multilingual sitemaps need `xhtml:link` alternates per URL — generate from the build script.
- **No automatic locale redirects**: Google prefers serving a default language and letting `hreflang` handle discovery. Avoid `Accept-Language` redirects on landing pages.
- **Maintenance cost**: Each landing page must be written/maintained in all supported languages. Manageable for 2 locales; scales poorly beyond ~3 without a translation workflow.

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

### Remaining Priorities

1. Example workflows for onboarding & website video ([EXAMPLE-WORKFLOWS.md](future/EXAMPLE-WORKFLOWS.md))
2. SEO landing pages (infrastructure done, content needed)
3. Top N per Group transform (small-medium effort, very common analytical need)
4. Bulk File Import with optional union (small-medium effort, common real-world pattern)
5. Flatten JSON transform
6. Fill Date Gaps transform (medium effort, important for time series)
7. Empty State Components (medium effort, UX polish)

### Future Ideas (not on active backlog)

See [future/FUTURE-IDEAS.md](future/FUTURE-IDEAS.md) for ideas worth revisiting when the app has traction: custom icon library, performance/Web Workers, workflow format stability, i18n landing page templating.

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
- **Command Undo/Redo** — March 2026. Session-based undo/redo for pipeline operations (add, remove, edit step). Per-model history stacks (up to 50 entries). Keyboard shortcuts `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`. Undo/redo buttons in Sidebar step list. Silently marks dependents stale on undo/redo.
- **Multi-select enhancements** — March 2026. Extract selected rows to new model (creates model with same pipeline + keepRows step). Shift+Arrow column range selection in DataTable headers.
- **i18n hardcoded string elimination** — March 2026. Replaced ~120+ remaining hardcoded English strings across ~30 handler/service files with `i18n.t()` calls. Added `npm run i18n:check` CI script (`scripts/check-i18n-keys.ts`) that validates translation key parity between `en/` and `uk/` locales with plural-aware comparison (handles English `_other` vs Ukrainian `_one`/`_few`/`_many` differences).
- **Consolidate syto-app.ts into AppOrchestrator** — March 2026. Eliminated the `SytoApp` class and `syto-app.ts`. `AppOrchestrator.initApp()` is now the single initialization entry point (called from `main.tsx`). Callback wiring, keyboard/paste/click event handling (via `EventRouter`), and URL sync (via `UrlStateSync`) all consolidated. Removed duplicated utility functions from AppOrchestrator (already in AppController). Refactored `KeyboardHandlers` to use AppController directly instead of SytoApp proxy methods.
- **ImportCsvDialog i18n** — March 2026. Extracted ~25 hardcoded English strings from `ImportCsvDialog.tsx` to the `dialogs` namespace (`importCsv.*` section) with Ukrainian translations. Covers replace mode banner, source name, JSON path/options, CSV delimiter/headers, manual column names, and duplicate warnings.
- **Validate workflows on load** — March 2026. Added `validateSteps()` to `transform-linter.ts` for validating step objects loaded from IndexedDB. Checks for unknown transform keys, invalid expressions (filter, derive, conditional). `loadInitialData()` now validates all model steps on startup and shows a persistent warning toast for any issues found.
- **ImportCsvDialog XSS fix & i18n completion** — March 2026. Replaced `dangerouslySetInnerHTML` with JSX interpolation for `replacingSource` translation (eliminated self-XSS via source names containing HTML). Extracted remaining hardcoded English strings from JSON examples block (`exampleIfJsonIs`, `exampleArrayFirst`) with Ukrainian translations.
- **Summary Statistics (Describe) transform** — March 2026. One-click `describe` transform that auto-generates summary statistics for selected columns: count, unique, mean, median, stdev, min, max for numeric; count, unique, top, freq for categorical. Output is a transposed summary table (rows = statistics, columns = source columns). Analogous to Pandas `df.describe()`.
- **Duplicate Column quick action** — March 2026. One-click "Duplicate" button in the column toolbar that creates a copy of the selected column via a `derive` step (`{ "column_copy": "[column]" }`). No dialog needed.
- **Transform linter deduplication** — March 2026. Extracted `validateStepExpressions()` generator from `transform-linter.ts` to share expression validation logic across `lintTransformJson`, `validateSteps`, and `getTransformJsonError`. Net reduction: 101 LoC (377 → 276).
- **Code reduction refactors** — March 2026. Three completed refactors (~543 LoC net reduction): declarative `SHORTCUT_REGISTRY` replacing 25 handler functions, `inferSchemaFromSample()` deduplicating 5 schema blocks, AppController pass-through elimination (712 → 430 LoC). See [archive/CODE-REDUCTION-ANALYSIS.md](archive/CODE-REDUCTION-ANALYSIS.md).
- **Keyboard accessibility** — February 2026. Global `:focus-visible` outlines, focus trapping in dialogs, Enter-to-submit in slide panels, arrow key navigation in TypeMenu with ARIA roles.
- **TransformDialog.module.css decomposition** — March 2026. Split the 846-line monolithic CSS file into 11 purpose-specific modules: `form-controls.module.css` (universal form elements), `expression-help.module.css` (expression docs UI), `column-editor.module.css` (drag/drop column lists), plus 8 dialog-specific modules (Settings, Download, Date, ImportCsv, preview-table, Window, Aggregate, Generate). Updated 47 consumer file imports. See [archive/CODE-REDUCTION-ANALYSIS.md](archive/CODE-REDUCTION-ANALYSIS.md) §4.
- **Content guidelines audit** — March 2026. Removed "Please" from ~40 validation messages across handlers/services (imperative form: "Enter a column name"). Updated `dialog-registry.ts` `buttonText` entries to task-specific verbs (Filter, Sort, Add column, etc.) instead of generic "Apply". Added action-specific confirm labels (Delete, Remove, Overwrite, Discard, Replace, Clear all) to all confirmation dialogs. Replaced remaining hardcoded English strings in `dialog-handlers.ts` and `date-handlers.ts` with i18n calls.
- **Reduced motion support** — March 2026. Added `prefers-reduced-motion: reduce` media query to `styles/base.css` covering all animations and transitions.
- **i18n hardcoded import messages** — March 2026. Extracted hardcoded English strings (`'Excel file is empty'`, `'CSV file is empty'`) in `confirmImport()` to i18n keys (`import.emptyExcelFile`, `import.emptyCsvFile`) with Ukrainian translations.
- **Test mock deduplication** — March 2026. Added `MockFactories` to `test-utils.ts` with shared factories for `StepService`, `notification-handlers`, `preview-engine`, and `validation-engine`. Updated 11 handler test files to use centralized factories via async `vi.mock` with dynamic import, so interface changes require updating one file instead of 11+.
- **Model chaining & name uniqueness** — March 2026. `sourceId` can reference another model (pipeline chaining). Source names globally unique, model names unique per-source, enforced via `NameService`. Auto-dedup on import. `DependencyService.getRootSourceId()` / `getUpstreamDependencies()`. `MULTI_MODEL_REFERENCE_PATHS` extracted to shared constant.
- **CLI & Workflow v2** — March 2026. Headless workflow execution via `syto run/validate/schema` commands. Portable v2 workflow format with named references, multi-source/model DAGs, parsing hints. Browser export via `ExportService.exportWorkflowV2()`. v1 backward compatibility via `upgradeV1toV2()`.

---

**Last updated**: March 2026
