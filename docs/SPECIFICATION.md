# Syto - Specification

> **Related Documentation**:
>
> - **[CLAUDE.md](../CLAUDE.md)**: Development onboarding and quick reference
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures, transform format, and persistence
> - **[UX-SPECIFICATION.md](UX-SPECIFICATION.md)**: UI/UX design guidelines and component patterns
> - **[DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md)**: How to add transforms, testing, state management
> - **[FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md)**: Auto-generated function documentation system
> - **[FUTURE-PROOFING.md](FUTURE-PROOFING.md)**: Schema evolution and persistence compatibility
> - **[TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md)**: Transform design analysis, gaps, and improvement roadmap

## 1. Overview

### 1.1 Name & Tagline

**Syto** — Data Wrangling in the Browser

_Named after the Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh)._

### 1.2 Description

Syto is a browser-based data wrangling tool for cleaning and transforming tabular data. It provides a visual interface for building transformation pipelines, inspired by Microsoft Power Query, with transformations stored as a declarative JSON specification. The tool runs entirely in the browser with no server dependencies.

### 1.3 Design Principles

| Principle                     | Implication                                          |
| ----------------------------- | ---------------------------------------------------- |
| **Local-first**               | All data stays in browser. No uploads, no accounts.  |
| **Non-destructive**           | Raw data preserved; changes are steps in a pipeline. |
| **Progressive disclosure**    | Simple defaults, optional advanced configuration.    |
| **Declarative specification** | Transformations are data (JSON), not code.           |
| **Reproducibility**           | Workflows can be exported, shared, and replayed.     |
| **Incremental complexity**    | UI reveals features as users need them.              |

### 1.4 Project Status

**Core Features**: Fully functional data wrangling application with comprehensive transformation types, granular schema management, exploratory analysis, and interactive visualizations. Verified by automated test suites (Vitest).

---

## 2. Target Audience

### 2.1 Primary

- Students learning data wrangling concepts
- Users needing quick CSV cleaning without installing software
- Analysts on machines where they can't install Python/R/Excel

### 2.2 Assumptions

- No programming experience required
- Familiar with spreadsheet concepts (rows, columns, filtering)
- Comfortable with basic logical expressions (e.g., `sales > 1000`)

---

## 3. Technical Architecture

### 3.1 Runtime Environment

| Constraint      | Decision                                                      |
| --------------- | ------------------------------------------------------------- |
| Execution       | Browser only, no backend                                      |
| Build Tool      | **Vite**                                                      |
| Language        | **TypeScript (TS)**                                           |
| App Type        | MPA (landing page + SPA app + static content pages)           |
| Deployment      | Static hosting (Cloudflare Pages)                             |
| Theme Engine    | Custom themes (Syto, Blues) with Vega integration             |
| Browser support | Chrome and Safari (latest 2 versions)                         |
| Offline         | Core functionality works offline; URL imports require network |

### 3.2 Libraries

| Library            | Purpose                                            |
| :----------------- | :------------------------------------------------- |
| **Iconify**        | Unified vector icon framework                      |
| **PapaParse**      | High-performance CSV parsing and export            |
| **Arquero**        | Data transformation engine (inspired by dplyr)     |
| **jsep**           | Lightweight Javascript Expression Parser           |
| **Preact**         | Lightweight framework for all UI components        |
| **Signals**        | High-performance reactive state management         |
| **Vega-Lite**      | Grammar of Graphics for interactive visualizations |
| **i18next**        | Internationalization framework with plural support |
| **preact-i18next** | Preact bindings for i18next (Provider + hooks)     |

### 3.3 Core Components

#### Schema Engine

The Schema Engine is responsible for granular type inference and schema propagation. It maintains a list of `ColumnSchema` objects, ensuring that data types (integer, float, date, etc.) are correctly tracked and available for downstream transformations and UI components.

- **Implementation**: `src/core/schema-engine.ts`
- **Tests**: `src/core/schema-engine.test.ts`

#### Expression Engine

A three-stage pipeline for safe execution of user-defined formulas:

1. **Parsing**: Uses `jsep` to convert string expressions into an Abstract Syntax Tree (AST). Bracket notation (`[Column Name]`) is preprocessed to placeholders before parsing and restored after.
2. **Validation**: Checks the AST against the current schema for security and correctness. Validates node types, operators, function names (whitelist), function arities, and column references. Provides fuzzy-match suggestions for typos.
3. **Interpretation**: Executes the validated AST against row data in a sandboxed environment. Delegates function calls to `FUNCTION_IMPLS`.

#### Internationalization Engine

The i18n system provides multi-language support using i18next, split into two layers:

- **`src/i18n/core.ts`** — Portable i18n registry (i18next only, no browser APIs). Loads all translation resources and initializes with English defaults. Used by `src/core/` for transform descriptions and error messages.
- **`src/i18n/index.ts`** — App-layer i18n. Builds on `core.ts` by adding Preact bindings (`initReactI18next`) and browser-specific language detection from localStorage.

Key characteristics:

- **Languages**: English (en, default) and Ukrainian (uk) with automatic plural handling
- **Namespaces**: `common` (buttons, labels), `settings` (settings dialog), `dialogs` (dialog titles)
- **Storage**: User's language preference persisted in localStorage via UX settings
- **Type Safety**: TypeScript type augmentation provides autocomplete for translation keys
- **Initialization**: Language is loaded from localStorage before i18n initialization to prevent race conditions
- **Reactivity**: `I18nextProvider` ensures components re-render when language changes
- **Portability**: Core code imports from `i18n/core` (no Preact); app code imports from `i18n` (with Preact)

**Implementation**: `src/i18n/core.ts` (portable), `src/i18n/index.ts` (app bindings), `src/i18n/locales/*/` (translation files)

**Ukrainian Plural Rules**: Ukrainian has 3 plural forms handled automatically by i18next:

- Form 0: ends with 1 (not 11): 1, 21, 31...
- Form 1: ends with 2-4 (not 12-14): 2, 3, 4, 22...
- Form 2: all others: 0, 5-20, 25-30...

- **Implementation**: `src/core/expression-parser.ts`, `src/core/ast-validator.ts`, `src/core/ast-interpreter.ts`
- **Function implementations**: `src/core/functions/` (organized by category: date, math, string, regex, json, type)
- **Tests**: `src/core/expression-parser.test.ts`, `src/core/ast-validator.test.ts`, `src/core/ast-interpreter.test.ts`
- **Design**: See [docs/archive/PARSER-DESIGN-DECISION.md](archive/PARSER-DESIGN-DECISION.md) for architecture rationale
- **Function Documentation**: See [FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md) for auto-generated function reference and documentation system

**Note**: jsep does not track source positions (`start`/`end`) by default. Error positions come from jsep's parse error index or default to 0.

#### Expression Editor (UI)

The `ExpressionEditor` component (`src/app/components/ExpressionEditor.tsx`) provides a CodeMirror 6-based single-line input for formulas used by Derive, Filter, and Conditional dialogs.

- **Syntax highlighting**: `src/core/expression-language.ts` — StreamLanguage tokenizer that recognizes functions, column names, bracket notation, strings, numbers, operators, and keywords
- **Autocomplete**: Column names (highest priority), function names with signatures from `src/schemas/functions.json`, and keywords (`true`, `false`, `null`, `and`, `or`, `not`)
- **Validation**: Real-time via `useSignalEffect` — parses, validates, and updates error signals with debounced preview computation (150ms)
- **Error display**: `src/core/error-formatter.ts` produces multi-line messages with position pointers and suggestions

Expression dialogs also include static inline help (examples, operator lists, function summaries) and a "Full Reference" button linking to `FunctionReferenceDialog`.

#### Transformation Engine

Wraps **Arquero** to provide a consistent interface for applying declarative transformations. It handles both standard Arquero verbs and custom logic for complex operations like delimiter-based splitting and regex extraction.

- **Implementation**: `src/core/transforms.ts`
- **Tests**: `src/core/transforms.test.ts`
- **Reference**: See [docs/arquero/](arquero/) for Arquero usage patterns

#### Type Converter

Handles type conversion between column types with Power Query-style error cells. When a type conversion fails (e.g., converting "abc" to integer), the cell displays an error object with a descriptive message rather than silently failing or setting the value to null.

- **Implementation**: `src/core/type-converter.ts`
- **Tests**: `src/core/type-converter.test.ts`
- **Features**:
  - Converts between all supported types (string, integer, float, boolean, date, datetime)
  - Returns error objects for invalid conversions
  - Handles edge cases (null, empty strings, whitespace)

### 3.4 Storage

| Storage Type     | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| **localStorage** | User preferences, active theme selection                    |
| **IndexedDB**    | Datasets (raw + cached previews), workflows, step snapshots |
| **URL Hash**     | Active Source and Model state in the app (at `/app/`)       |

### 3.5 Site Structure

The site is a multi-page application (MPA) with three layers:

| Route     | Source             | Type                    | Purpose                            |
| --------- | ------------------ | ----------------------- | ---------------------------------- |
| `/`       | `index.html`       | Static landing page     | Hero page with CTA to app and docs |
| `/app/`   | `app/index.html`   | Preact SPA              | The data wrangling application     |
| `/about/` | `src/content/*.md` | Static HTML (generated) | About page                         |
| `/docs/*` | `src/content/*.md` | Static HTML (generated) | Function reference and user guides |

Content pages (`/about/`, `/docs/*`) are zero-JS static HTML generated from markdown at build time by `scripts/build-content-pages.ts`. During development, the Vite plugin `scripts/vite-plugin-content-pages.ts` serves them on-the-fly. Page definitions and sidebar structure are shared via `scripts/content-pages-config.ts`.

The SPA at `/app/` uses hash-based routing for navigation state (source, model, dialog). Content pages use file-based routing with clean URLs.

### 3.6 Codebase Map

#### Directory Structure

```
src/
├── core/                    # Portable data engine (no browser APIs, no Preact)
│   ├── transforms/          # Transform implementations
│   │   ├── handlers/        # Transform logic by category
│   │   └── describers/      # Human-readable descriptions
│   └── functions/           # Expression function implementations
├── i18n/                    # Internationalization
│   ├── core.ts              # Portable i18n registry (i18next only)
│   ├── index.ts             # App i18n (adds Preact bindings + language detection)
│   └── locales/             # Translation files (en, uk)
├── app/
│   ├── components/          # Preact UI components with co-located CSS Modules
│   │   ├── join/            # Join dialog sub-components
│   │   ├── generate/        # Generate dialog sub-components
│   │   ├── eda/             # EDA panel sub-components
│   │   └── column-selector/ # Shared column selection components
│   ├── stores/              # Signal-based state management
│   │   └── dialogs/         # Per-dialog state (7 category folders)
│   ├── services/            # Business logic (import, export, persistence)
│   ├── handlers/            # Event handlers (organized by category)
│   │   ├── transform/       # Transform operation handlers
│   │   ├── import/          # Data import handlers
│   │   ├── dialog/          # Dialog-specific handlers
│   │   └── core/            # Core interaction handlers
│   ├── orchestration/       # App lifecycle and coordination modules
│   ├── infrastructure/      # Browser-specific adapters
│   │   ├── storage.ts       # IndexedDB persistence
│   │   ├── url-state.ts     # URL hash state management
│   │   ├── ux-settings.ts   # localStorage user preferences
│   │   └── metrics/         # Performance metrics (IndexedDB)
│   └── types.ts             # Application-wide TypeScript definitions
├── content/                 # Markdown content (about, docs, functions)
│   ├── functions/           # Auto-generated function reference docs
│   └── templates/           # HTML shell template for content pages
app/                         # SPA entry point (app/index.html)
styles/                      # Global CSS (variables, base, layout, buttons)
scripts/                     # Build scripts (function docs, content pages)
docs/                        # Project documentation (internal)
```

#### Core Engine (`src/core/`)

The core engine is fully portable — no browser APIs, no Preact dependency. It can be used standalone in Node.js (e.g., for a CLI tool). It imports only from `src/i18n/core.ts` (portable i18n registry) and third-party libraries (Arquero, jsep).

| File/Directory         | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `expression-parser.ts` | jsep wrapper, converts expression strings to AST                 |
| `ast-validator.ts`     | Security whitelist, arity checks, schema validation              |
| `ast-interpreter.ts`   | Safe AST execution, delegates to `functions/`                    |
| `functions/`           | Function implementations (date, math, string, regex, json, type) |
| `transforms/`          | Modular transform system (see below)                             |
| `schema-engine.ts`     | Type inference and schema propagation                            |
| `type-converter.ts`    | Column type conversion with error cells                          |
| `eda-engine.ts`        | Statistical profiling and column analysis                        |
| `charts.ts`            | Vega-Lite specification generator                                |
| `vega-themes.ts`       | Theme configurations for visualizations                          |

**Transforms Module** (`transforms/`):

```
transforms/
├── index.ts              # Barrel exports
├── apply-transform.ts    # Transform dispatcher
├── describe-transform.ts # Description aggregator
├── types.ts              # Interfaces and constants
├── utils.ts              # Shared utilities
├── handlers/             # Transform logic by category
│   ├── basic.ts          # select, remove, rename, sort
│   ├── filter.ts         # filter, conditional, replace
│   ├── derive.ts         # derive
│   ├── reshape.ts        # fold, pivot, split, spread, unroll
│   ├── join.ts           # join, semijoin, antijoin, lookup
│   └── ...               # (11 handler files total)
└── describers/           # Human-readable transform descriptions
```

**Functions Module** (`functions/`):

```
functions/
├── index.ts              # FUNCTION_IMPLS aggregation
├── date-functions.ts     # Date extraction, arithmetic, formatting
├── math-functions.ts     # Math operations, trig, rounding
├── string-functions.ts   # Text manipulation, comparison
├── regex-functions.ts    # Pattern matching, extraction
├── json-functions.ts     # JSON parsing, extraction
└── type-functions.ts     # Type conversion, validation
```

#### Application Layer (`src/app/`)

**State Management** (`stores/`):

- `AppStore.ts` — Centralized application state (sources, models, UI state)
- `DialogStore.ts` — Core utilities and static re-exports
- `dialogs/` — Per-dialog state organized by category:
  - `transform/` — filter, derive, sort, slice, sample, etc.
  - `column/` — spread, unroll, merge, split, dedupe, etc.
  - `aggregate/` — aggregate, pivot, fold, describe, window
  - `combine/` — join, append
  - `text/` — text, date, regexp-match, regexp-extract
  - `pattern/` — select, remove, rename patterns
  - `import/` — csv, url, generate, preview, settings

**Services** (`services/`):

- `ModelService.ts` — Model CRUD, step management
- `StepService.ts` — Transform step execution, validation, and undo/redo history
- `ImportService.ts` — CSV/URL/clipboard import logic
- `ReplaceSourceService.ts` — Data replacement and backup restoration
- `ExportService.ts` — CSV/JSON/workflow export
- `PersistenceService.ts` — Persistence coordination (wraps infrastructure/storage)

**Infrastructure** (`infrastructure/`):

Browser-specific adapters, isolated from core logic:

- `storage.ts` — IndexedDB persistence layer (sources, models)
- `url-state.ts` — URL hash state management (`window.location`)
- `ux-settings.ts` — User preferences via localStorage (theme, pagination, language)
- `metrics/` — Performance metrics collection and storage (IndexedDB + localStorage)

**Orchestration** (`orchestration/`):

- `AppOrchestrator.ts` — Application initialization entry point: callback wiring, persisted state loading, subsystem init, URL restore
- `AppController.ts` — Central action dispatcher (all UI → logic routing)
- `EventRouter.ts` — Global event listeners (keyboard, paste, click). Owns Escape (priority: message box → dialog → type menu → selection) and Enter-to-submit for slide panels (skips textarea, select, CodeMirror, error state). Delegates other keyboard shortcuts to `KeyboardHandlers` (Ctrl+S save, Delete step, arrow navigation)
- `UrlStateSync.ts` — URL hash synchronization for navigation state
- `DialogCoordinator.ts` — Dialog lifecycle, snapshots, and state management

**Handlers** (`handlers/`):

Organized into subdirectories by category:

- `transform/` — aggregate, derive, filter, join, pivot handlers, etc.
- `import/` — csv, json, generate handlers
- `dialog/` — column-editor, interaction handlers
- `core/` — step, keyboard, notification handlers

Shared utilities at root level:

- `preview-engine.ts` — Debounced preview with `createDebouncedPreview()`
- `validation-engine.ts` — Expression/regex validation
- `test-utils.ts` — Test fixtures (`createMockStepCallbacks()`, `TestData.*`)

**Types** (`types.ts`):

- Core interfaces: `Source`, `Model`, `DataRow`
- Dialog states: `AggregateDialogState`, `PivotDialogState`, etc.

---

## 4. Data Model

### 4.1 Non-Destructive Transformation Pipeline

Syto follows a non-destructive architecture. Workflows are stored as an ordered list of `Transform` steps applied to an immutable `Source`.

- **Immutable Sources**: Raw imported data is never modified by transformations.
- **Replaceable Data**: Sources can be updated/replaced with newer data files. A single-level `.backup` is maintained to allow restoration if the replacement breaks downstream models.
- **On-the-fly Computation**: Models are recomputed through the entire pipeline of steps whenever a change occurs.
- **Technical Rollback**: By editing or removing steps, users can revert to any prior state without loss of information.
- **Audit Trail**: The step list serves as a naturally traceable log of all data manipulations.

### 4.2 Transform Specification Format

Each transform is one object in an array.

```json
{
  "transforms": [
    { "filter": "sales > 1000 && region == 'North'" },
    { "derive": { "profit": "revenue - cost" } },
    { "select": ["region", "sales", "profit"] },
    { "sort": { "field": "profit", "order": "descending" } },
    { "types": { "sales": "integer", "profit": "float" } }
  ]
}
```

---

## 5. Implemented Features

### 5.1 Data Import/Export

| Feature               | Implementation                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Import CSV (file)** | Sidebar action + drag-drop → Config dialog → Creates Source                         |
| **Paste CSV**         | Sidebar action / CTRL+V → Config dialog → Creates Source                            |
| **Import from URL**   | Fetch CSV from public URL → Config dialog → Creates Source                          |
| **Replace Data**      | Update existing Source with new file → Diff analysis → Marks dependents stale       |
| **Restore Backup**    | Roll back Source to previous data state (Swap current/backup)                       |
| **Generate Data**     | Sidebar action → Dialog with column generators → Creates Source with synthetic data |
| **Unified Download**  | Modal with CSV, Data JSON, and Workflow JSON options                                |

### 5.2 Core Transformations

| Transform      | Description                                                                                                                             |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Filter**     | Keep rows matching expression (`filter: "expr"`)                                                                                        |
| **Select**     | Keep listed columns (`select: ["col1"]`)                                                                                                |
| **Remove**     | Drop listed columns (`remove: ["col1"]`)                                                                                                |
| **Rename**     | Rename one or more columns (`rename: { "old": "new" }`)                                                                                 |
| **Sort**       | Order by single field (`sort: { field: "col", order: "asc" }`)                                                                          |
| **Derive**     | Add/Update calculated columns (`derive: { new: "expr" }`)                                                                               |
| **Types**      | Convert column types with value transformation (`types: { col: "type" }`). Invalid conversions produce error cells (Power Query-style). |
| **Aggregate**  | Group and rollup (`aggregate: { groupby: [], rollup: {} }`)                                                                             |
| **Fold**       | Unpivot/Melt wide to long (`fold: { columns: [], as: [] }`)                                                                             |
| **Pivot**      | Long to wide transformation (`pivot: { ... }`)                                                                                          |
| **Split**      | Delimiter-based splitting (`split: { column: "col", ... }`)                                                                             |
| **Replace**    | Value replacement (`replace: { column: "col", find: x, replace: y }`)                                                                   |
| **Dedupe**     | Remove or keep duplicate rows based on column subset                                                                                    |
| **Slice Rows** | Keep or remove top/bottom N rows                                                                                                        |
| **Add Index**  | Generate a row index column                                                                                                             |
| **Date Ops**   | Extract or truncate date parts                                                                                                          |
| **Regexp**     | Pattern matching and extraction (`regexp_match`, `regexp_extract`)                                                                      |
| **Impute**     | Fill missing values (constant, mean, median, min, max, forward/backward fill, linear interpolation)                                     |
| **Merge**      | Concatenate multiple columns with separator (uses `derive` internally, optionally followed by `remove`)                                 |
| **Sample**     | Extract random rows (`sample: { count: 100, seed: 123 }`)                                                                               |
| **Append**     | Unified Concat/Union with column selection from both tables (`concat`: ..., `union`: ...).                                              |
| **Semijoin**   | Filter rows that exist in another table                                                                                                 |
| **Antijoin**   | Filter rows that do NOT exist in another table                                                                                          |
| **Lookup**     | Optimized left join for adding specific columns from another table                                                                      |

---

## 6. UI Architecture

> **Detailed Design**: See [UX-SPECIFICATION.md](UX-SPECIFICATION.md) for comprehensive UI guidelines, layout structure, and component patterns.

### 6.1 Layout & Components

- **Ribbon Toolbar**: Workflow-based navigation (Prepare | Calculate | Combine).
- **Sources Sidebar**: Integrated source management and I/O actions.
- **Preact/TSX Components**: 100% of the UI is built using Preact components, leveraging TSX for type-safe templating.
- **CSS Modules**: Component-level styling for encapsulation, with global variables for design tokens.
- **Model Toolbar**: Stats summary, navigation, and consolidated downloads/copying.
- **Step Editor**: Pipeline management with edit/delete actions and JSON toggle.
- **Signal-Based State**: UI logic and state are centralized in standalone **Stores** (`AppStore`, `DialogStore`) and **Services**.

#### Prop Threading

`App.tsx` is the wiring hub. It constructs prop objects (`mainContentProps`, `sidebarProps`, `typeMenuProps`) that map `AppController` methods to callback props, then passes them through container components to leaves:

```
App.tsx  →  mainContentProps  →  MainContent  →  EmptyState, DataTable, PaginationBar, ...
         →  sidebarProps      →  Sidebar      →  source/model/step lists
```

Container components (`MainContent`, `Sidebar`) spread these props to child components. Leaf components (e.g., `EmptyState`) receive typed callback props (`onUploadClick`, `onUrlClick`) with no knowledge of `AppController`. This keeps leaves testable in isolation.

Dialog components are rendered directly in `App.tsx`'s slide panel/modal shells (not passed through containers), with props wired inline.

### 6.2 Key Patterns

- **Chips-based column selection**: Standardized multi-selection UI.
- **Contextual Toolbars**: Column and cell-level actions triggered by interaction.
- **Debounced auto-preview**: Real-time feedback for most transformations.
- **Details**: See [UX-SPECIFICATION.md](UX-SPECIFICATION.md) §3.4 for interaction patterns

### 6.3 Data Visualization (Vega-Lite)

- **Themed Visuals**: Charts automatically adopt the active application theme.
- **Chart Types**: Boxplots, Histograms, and Categorical Bar charts for Exploratory Data Analysis (EDA).
- **Implementation**: `src/core/charts.ts`, `src/core/vega-themes.ts`
- **Theming**: See [UX-SPECIFICATION.md](UX-SPECIFICATION.md) §1.2 for theme system details

### 6.4 Dialog System Architecture

Dialogs are the primary UI for user configuration — importing data, configuring transforms, and adjusting settings. The system has three layers: the **registry** (metadata), the **coordinator** (lifecycle), and the **shell** (rendering).

#### Registry (`dialog-registry.ts`)

Every dialog is registered in `DIALOG_REGISTRY` with metadata:

| Field          | Purpose                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `name`         | Unique identifier (matches `DialogName` union in types.ts)                                          |
| `type`         | `'slide-panel'` or `'centered-modal'`                                                               |
| `title`        | Default title (can be overridden dynamically)                                                       |
| `buttonText`   | i18n key for the Apply button (defaults to "Apply")                                                 |
| `hasError`     | Function returning `true` when Apply should be disabled                                             |
| `getState`     | Serializable snapshot for unsaved-change detection (omit for immediate-apply dialogs like settings) |
| `applyHandler` | Transform execution function (for transform dialogs)                                                |
| `initState`    | Optional state initialization on dialog open                                                        |

Utility functions (`isSlidePanel()`, `isCenteredModal()`, `getDialogTitle()`, `getDialogButtonText()`) read from this registry — no scattered arrays or switch statements.

#### Coordinator (`orchestration/DialogCoordinator.ts`)

Manages dialog lifecycle:

1. **Open**: `openDialog(name, section?)` → sets `AppStore.activeDialog`, calls `initDialogState()`, takes a state snapshot for change detection, syncs URL
2. **Close**: `closeDialog(force?)` → checks for unsaved changes (comparing current state to snapshot), clears preview, resets `DialogStore`, clears URL. Dialogs that apply changes immediately (e.g., settings) omit `getState` so the unsaved-changes check is skipped.
3. **Preview**: `hasPreviewData()` checks whether preview data exists. For `import-csv` it reads `importCsvState.previewHeaders/previewDataRows`; for transforms it reads `previewState.rows`. Helper functions (`getPreviewTitle`, `getPreviewStats`, `getPreviewColumns`, `getPreviewRows`) abstract over both sources. Cell formatting uses the shared `formatCellValue()` from `helper-handlers.ts`.
4. **Error**: `activeDialogHasError()` delegates to the registry's `hasError` function

#### Rendering in App.tsx

`App.tsx` renders two dialog shells conditionally based on `activeDialog`:

**Slide Panel** (for transforms and import dialogs):

```
┌──────────────────────────────────────────────────┐
│ Main Layout                                      │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────┐ │
│  │ Sidebar │  │  Main  │  │ Slide  │  │Preview│ │
│  │         │  │Content │  │ Panel  │  │ Panel │ │
│  │         │  │        │  │(dialog)│  │(table)│ │
│  └─────────┘  └────────┘  └────────┘  └───────┘ │
└──────────────────────────────────────────────────┘
```

- The slide panel contains: header (title + close button), content (dialog component), footer (Cancel + Apply buttons)
- The preview panel renders alongside when `hasPreviewData()` is true
- A backdrop overlay covers the main content area

**Centered Modal** (for settings, download, reference):

- Rendered as a centered overlay with backdrop
- No preview panel
- Some modals (settings, download, reference) omit the footer buttons

#### Apply Dispatch (`handlers/core/step-handlers.ts`)

`applyActiveTransform()` handles the Apply button click:

1. **Non-transform dialogs** (switch statement): `import-csv` → `confirmImport()`, `import-url` → `fetchAndImportFromUrl()`, `generate` → `generateData()`
2. **Transform dialogs** (registry lookup): reads `applyHandler` from `DIALOG_REGISTRY[activeDialog]` and calls it with execution callbacks

### 6.5 Error Handling & Display

- **Error Cells**: Type conversion failures produce error objects (Power Query-style) displayed as "Error" with a warning icon in table cells.
- **Error Visibility**: Clicking an error cell shows the full error message in an alert dialog.
- **EDA Integration**: Errors are tracked separately from nulls in EDA statistics:
  - EDA panel displays error count and percentage in a 2x2 grid (Total Rows | Missing | Unique Values | Errors)
  - Categorical bar charts display errors as a separate category with dark red color (#8B0000) at the end of the stack
  - Errors are excluded from numeric calculations (mean, median, etc.)
- **String Representation**: Error objects implement custom `toString()` and `valueOf()` methods, displaying as "Error" instead of "[object Object]" throughout the application.

---

## 7. Testing Strategy

### 7.1 Framework

Tests are written in **TypeScript** using **Vitest** for native runner support and **Happy DOM** for browser simulation.

### 7.2 Core Coverage

- **Expression Parsing**: `src/core/expression-parser.test.ts`
- **Security & Arity**: `src/core/ast-validator.test.ts`
- **Execution**: `src/core/ast-interpreter.test.ts`
- **Transformation Engine**: `src/core/transforms.test.ts`
- **Propagation**: `src/core/schema-engine.test.ts`
- **Integration**: `src/core/integration.test.ts` (end-to-end pipelines)

### 7.3 Handler Coverage

Handler tests use shared utilities from `src/app/handlers/test-utils.ts`:

- **Test Data Factory**: `TestData.simple`, `TestData.withNulls`, `TestData.numeric`, `TestData.joinPair`
- **Store Management**: `resetStores()`, `setTestData()`, `createMockApp()`
- **Preview Assertions**: `expectPreviewState()`, `expectPreviewCleared()`

Key handler test files:

- `aggregate-handlers.test.ts` — Groupby, rollup, aggregation operations
- `import-handlers.test.ts` — File import, path resolution, header detection
- `join-handlers.test.ts` — Key pair management, join type selection
- `step-handlers.test.ts` — Pipeline orchestration, step editing
- `column-editor-handlers.test.ts` — Column operations, drag/drop, patterns

### 7.4 UI Testing

- **Interaction Tests**: `src/app/components/App.ux.test.tsx`
- **Component Tests**: Co-located `*.test.tsx` files for individual components

---

## 8. Roadmap

- **Window Functions**: Support for `cumsum`, `lag`, `rank`, and other window-based transformations.

---

**End of Specification**
