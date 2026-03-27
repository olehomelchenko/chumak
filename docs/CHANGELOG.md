# Syto — Changelog

Historical record of completed features and improvements, organized chronologically.

---

## March 2026

### v0.3.0

- **Interactive error cells** — Error cells now behave like regular cells: clicking selects them, hovering shows the error message in a tooltip. Cell toolbar offers filter (keep/exclude errors) and replace actions. Comparison operators are hidden since errors are not comparable.
- **Replace errors & nulls** — Replace dialog gains "Errors" and "Null" find modes, allowing bulk replacement of conversion errors or missing values in a column without writing expressions.

### v0.2.1

- **README rewrite** — Replaced the old sprawling README with a concise version covering what the tool does, how to run it, and how to contribute. Added screenshot.
- **MIT license** — Added LICENSE file.

### v0.2.0

- **ConversionError filter fix** — ConversionError objects (truthy in JS) no longer pass filter expressions or inflate match/success counts in filter and parse-date previews.
- **Multi-line ExpressionEditor** — Expression inputs in dialogs now support multi-line editing.
- **DeriveDialog empty-field validation** — Added validation for empty expression fields in the Derive dialog.
- **Dialog column pre-population** — Dialogs auto-populate the selected column when opened from column context.
- **Modal input styling fix** — Fixed inputs appearing white in modal dialogs.
- **Sample datasets** — Added bundled sample datasets (airports, Anscombe's quartet, barley, cars, iris, S&P 500, stocks, superstore, unemployment, weather) for local analysis.
- **Focus utility refactor** — Extracted `isInInteractiveContext` to shared `focus-utils.ts`.
- **Removed GitHub deploy workflow** — Cleaned up unused `.github/workflows/deploy.yml`.

### v0.1.0

- **V2 Workflow Cutover** — v1 format deleted, v2 is sole format. Browser import via drag-and-drop detection + `WorkflowImportDialog` + `WorkflowImportService`. Topological sort (`getReachableModels` / `topologicalSortV2`) extracted to shared `workflow-v2.ts`. CLI rejects non-v2 with clear error.
- **CLI & Workflow v2** — Headless workflow execution via `syto run/validate/schema` commands. Portable v2 workflow format with named references, multi-source/model DAGs, parsing hints. Browser export via `ExportService.exportWorkflowV2()`. v1 removed entirely (no users).
- **Model chaining & name uniqueness** — `sourceId` can reference another model (pipeline chaining). Source names globally unique, model names unique per-source, enforced via `NameService`. Auto-dedup on import. `DependencyService.getRootSourceId()` / `getUpstreamDependencies()`. `MULTI_MODEL_REFERENCE_PATHS` extracted to shared constant.
- **Test mock deduplication** — Added `MockFactories` to `test-utils.ts` with shared factories for `StepService`, `notification-handlers`, `preview-engine`, and `validation-engine`. Updated 11 handler test files to use centralized factories via async `vi.mock` with dynamic import, so interface changes require updating one file instead of 11+.
- **i18n hardcoded import messages** — Extracted hardcoded English strings (`'Excel file is empty'`, `'CSV file is empty'`) in `confirmImport()` to i18n keys with Ukrainian translations.
- **Reduced motion support** — Added `prefers-reduced-motion: reduce` media query to `styles/base.css` covering all animations and transitions.
- **TransformDialog.module.css decomposition** — Split the 846-line monolithic CSS file into 11 purpose-specific modules. Updated 47 consumer file imports.
- **Content guidelines audit** — Removed "Please" from ~40 validation messages. Updated `dialog-registry.ts` `buttonText` entries to task-specific verbs. Added action-specific confirm labels to all confirmation dialogs. Replaced remaining hardcoded English strings with i18n calls.
- **Code reduction refactors** — Three completed refactors (~543 LoC net reduction): declarative `SHORTCUT_REGISTRY` replacing 25 handler functions, `inferSchemaFromSample()` deduplicating 5 schema blocks, AppController pass-through elimination (712 → 430 LoC).
- **Transform linter deduplication** — Extracted `validateStepExpressions()` generator from `transform-linter.ts` to share expression validation logic. Net reduction: 101 LoC (377 → 276).
- **Duplicate Column quick action** — One-click "Duplicate" button in the column toolbar that creates a copy of the selected column via a `derive` step. No dialog needed.
- **Summary Statistics (Describe) transform** — One-click `describe` transform that auto-generates summary statistics for selected columns. Analogous to Pandas `df.describe()`.
- **ImportCsvDialog XSS fix & i18n completion** — Replaced `dangerouslySetInnerHTML` with JSX interpolation for `replacingSource` translation (eliminated self-XSS via source names containing HTML).
- **Validate workflows on load** — Added `validateSteps()` to `transform-linter.ts` for validating step objects loaded from IndexedDB. `loadInitialData()` now validates all model steps on startup and shows a persistent warning toast for any issues found.
- **ImportCsvDialog i18n** — Extracted ~25 hardcoded English strings from `ImportCsvDialog.tsx` to the `dialogs` namespace with Ukrainian translations.
- **Consolidate syto-app.ts into AppOrchestrator** — Eliminated the `SytoApp` class and `syto-app.ts`. `AppOrchestrator.initApp()` is now the single initialization entry point.
- **i18n hardcoded string elimination** — Replaced ~120+ remaining hardcoded English strings across ~30 handler/service files with `i18n.t()` calls. Added `npm run i18n:check` CI script.
- **Multi-select enhancements** — Extract selected rows to new model. Shift+Arrow column range selection in DataTable headers.
- **Command Undo/Redo** — Session-based undo/redo for pipeline operations (add, remove, edit step). Per-model history stacks (up to 50 entries). Keyboard shortcuts `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.

## February 2026

- **MPA architecture & content pages** — Migrated from SPA to multi-page architecture: landing page at `/`, SPA at `/app/`, static content pages at `/about/` and `/docs/*`. Content pages are zero-JS HTML generated from markdown.
- **Dynamic expression docs** — Context-aware inline documentation in Filter and Derive dialogs. As users type expressions, the `ExpressionDocs` component shows function signatures/descriptions for detected functions.
- **Transform handler simplification** — Registry-driven dispatch replaces the 32-case switch statement and 4-layer callback indirection chain.
- **Pre-flight JSON validation** — Advanced JSON Editor with real-time linting validates syntax, transform keys, and expression correctness before application.
- **Expression typo suggestions** — "Did you mean 'X'?" suggestions for misspelled column names and function names using Levenshtein distance matching.
- **Expression input syntax highlighting & autocomplete** — Replaced plain `<input>` elements in Filter, Derive, and Conditional dialogs with CodeMirror 6 ExpressionEditor component.
- **Keyboard accessibility** — Global `:focus-visible` outlines, focus trapping in dialogs, Enter-to-submit in slide panels, arrow key navigation in TypeMenu with ARIA roles.

## January 2026

- **App Layer Refactoring** — Major architectural refactoring of `src/app/` layer. Created orchestration modules, extracted shared engines, migrated handlers to store-based pattern, split oversized components.
- **Advanced JSON Editor with Linting** — Replaced the basic sidebar JSON view with a full-featured CodeMirror-based editor modal.
- **Keyboard shortcuts (partial)** — `Ctrl/Cmd+S` to save workflow, `Delete` to remove last step, arrow keys to navigate steps. Escape handling for dialogs/modals.
- **Replace Data & Restore Backup** — Updated the non-destructive pillar by allowing sources to be refreshed with new data while maintaining a one-level snapshot backup.
- **Spread/Unroll transforms** — Array column operations: spread converts array columns into multiple columns, unroll expands array values into separate rows.
- **Advanced joins (semijoin, antijoin, lookup)** — Three specialized join operations.
- **Sample transform** — Extract random sample of rows with optional seed for reproducible sampling.
- **Dialog registry centralization** — Created `dialog-registry.ts` to eliminate duplicated metadata. Reduced files to update per dialog from ~12 to ~6-9.
- **Unified Append dialog (Concat/Union)** — Replaced separate Concat/Union dialogs with a unified Append experience.

## January 2025

- **Multi-model dependency graph** (Phase 3) — Complete dependency tracking for all multi-model operations with UI indicators for stale models.
- **Impute transform** — Fill missing values with constants via `impute` transform with UI integration.
- **Split expression function** — `split(value, delimiter, index)` for extracting segments from delimited strings.
- **Case-insensitive comparison functions** — `equals_ci`, `contains_ci`, `starts_with_ci`, `ends_with_ci`.
- **Conditional transform** — Multi-condition column creation with sequential `when`/`then` evaluation and `else` clause.
- **Pattern-based column operations** — `selectPattern`, `removePattern`, `renamePattern` with prefix/contains/regex matching.
- **Data Generation** — Synthetic data generation with support for integer/date sequences, random numbers/dates/booleans, and random categories.
- **Expression functions** — Implemented whitelisted functions for string, math, date, type, and regex operations.
- **Word-form boolean operators** — `and`/`or`/`not` as beginner-friendly alternatives to `&&`/`||`/`!`.
