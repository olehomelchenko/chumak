# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Status**: Production-ready data wrangling application with comprehensive transform capabilities, dynamic theming, and the target audience-focused UI.

---

## Documentation Index

### Core Specifications

- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: Complete product specification, technical architecture, data model, and feature list
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: UI/UX design guidelines, layout structure, component patterns, and theming system

### Development Guides

- **[DEBUGGING.md](docs/DEBUGGING.md)**: CSS Module debugging, component identification, and DevTools tips
- **[MIGRATION-TO-ROBUST-TS.md](docs/MIGRATION-TO-ROBUST-TS.md)**: Historical migration roadmap from Alpine.js to Preact/TSX (completed)

### Planning & Research

- **[BACKLOG.md](docs/BACKLOG.md)**: Feature backlog and future enhancements
- **[NATIVE-APP-SPEC.md](docs/NATIVE-APP-SPEC.md)**: Specification for potential native macOS app with DuckDB backend
- **[deduplication-plan.md](docs/deduplication-plan.md)**: Implementation plan for deduplication feature
- **[research/](research/)**: Background research on expression parsers, Arquero, Vega-Lite, and related technologies

### Archived Documentation

- **[docs/archive/](docs/archive/)**: Historical design decisions and migration plans
  - `PARSER-DESIGN-DECISION.md`: Expression parser architecture analysis
  - `MIGRATION-PLAN.md`: Early migration roadmap (completed)
  - `REFACTORING-PROGRESS.md`: Component refactoring history

### Arquero Reference

- **[docs/arquero/](docs/arquero/)**: Arquero library documentation and usage patterns
  - `verbs.md`: Transform operations reference
  - `expressions.md`: Expression syntax and functions
  - `op-functions.md`: Operator function reference

---

## Project Overview

**Chumak** is a browser-based data wrangling tool for cleaning and transforming tabular data. Think "Power Query in the browser" or "OpenRefine but simpler."

**Key characteristics:**

- Runs entirely in browser (no backend)
- **Vite / TypeScript / Vitest** stack
- Visual pipeline builder (like Power Query)
- Declarative JSON specification for transforms
- Target users: students, analysts, non-programmers
- No installation required, works on static hosting

**Name origin**: Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh).

---

## Core Features

### Data Import/Export

- ✅ **CSV Entry**: Sidebar actions for file upload, drag-drop, and URL import
- ✅ **Clipboard Integration**: Paste data (CTRL+V) and consolidated copy actions (CSV/JSON)
- ✅ **Unified Downloads**: Single download button with modal for CSV, Data JSON, and Workflow JSON

### Transformations (13 implemented)

- ✅ **Prepare**: Select, Filter, Remove, Rename, Sort, Types
- ✅ **Calculate**: Derive, Aggregate (Group By), Split, Replace, Fold (Unpivot)
- ✅ **Regex**: Dedicated `regexp_match` and `regexp_extract` functions in expressions
- ✅ **Multi-Model**: Joins (inner, left, right, full, cross) between models

### Advanced Capabilities

- ✅ **Theming**: Integrated theme engine with "Chumak" and "Blues" (KSE) themes, propagating to UI and Vega charts
- ✅ **Settings**: Persistent configuration for themes and performance
- ✅ **Schema/EDA**: Granular type inference and statistical profiling
- ✅ **Charts**: Interactive Vega-Lite visualizations (boxplot, histogram, bar)
- ✅ **Pipeline Editor**: Edit any step with automatic recomputation and rollback
- ✅ **JSON Editor**: Raw workflow editing with "Danger Zone" validation

---

## Technical Stack

**Infrastructure**:

- **Vite**: Build tool and dev server
- **TypeScript**: Type-safe development
- **Vitest**: Integrated unit and integration testing
- **PostCSS**: Modular CSS with nesting support

**Core Libraries**:

- **Preact / Signals**: Main reactive framework for all components and state
- **Arquero**: High-performance data transformation engine
- **jsep**: Expression parsing for user formulas
- **Vega-Lite**: Declarative visualization grammar
- **Iconify**: Unified icon framework (Iconify.design)
- **PapaParse**: CSV parsing and generation

---

## Key Design Decisions

> See [SPECIFICATION.md](docs/SPECIFICATION.md) §3 for detailed technical architecture and [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) for UI design rationale.

### 1. Hybrid Expression Parser

**Approach**: Custom AST interpretation for user expressions, Arquero delegation for data operations.

- **Security**: Zero usage of `eval()` or `Function()` constructor for user input
- **Validation**: AST validation catches errors before execution with position-aware highlighting
- **Arity**: Support for arithmetic, logic, conditional (`? :`), null-coalescing (`??`), and whitelisted functions
- **Implementation**: See `src/core/expression-parser.ts`, `src/core/ast-validator.ts`, `src/core/ast-interpreter.ts`
- **Reference**: Historical analysis in [docs/archive/PARSER-DESIGN-DECISION.md](docs/archive/PARSER-DESIGN-DECISION.md)

### 2. Workflow-Based UI

**Organization**: Ribbon tabs are organized by workflow stage (Prepare | Calculate | Combine).

- **Consolidated Sidebar**: All data sources and import actions are handled in the left sidebar header
- **Action Toolbars**: Context-aware floating toolbars for columns and cells provide rapid access to frequent operations
- **Details**: See [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) §3 for component patterns

### 3. Component-Scoped Styling (CSS Modules)

**Approach**: Use CSS Modules co-located with components to ensure encapsulation and maintainability.

- **Naming**: Use camelCase for class names to match JS/TS property access.
- **Debugging**: Configured Vite to include component names in generated class names during development.
- **Guide**: See [DEBUGGING.md](docs/DEBUGGING.md) for CSS Module debugging techniques

---

## Codebase Map

> **Quick Navigation**: Use your IDE's "Go to File" (Cmd/Ctrl+P) with these paths to jump directly to files.

### Entry Points

- **[main.tsx](src/main.tsx)**: Application entry point, mounts Preact root
- **[chumak-app.ts](src/chumak-app.ts)**: Main orchestration shell (~1400 lines, coordinates Stores and Services)
- **[index.html](index.html)**: HTML template with root element

### Core Logic (`src/core/`)

**Expression System** (see [SPECIFICATION.md](docs/SPECIFICATION.md) §3.3):

- **[expression-parser.ts](src/core/expression-parser.ts)**: jsep entry point, converts strings to AST
- **[ast-validator.ts](src/core/ast-validator.ts)**: Security & arity checks, whitelist enforcement
- **[ast-interpreter.ts](src/core/ast-interpreter.ts)**: Safe AST execution against row data

**Data Transformation**:

- **[transforms.ts](src/core/transforms.ts)**: Transform implementations & descriptions (wraps Arquero)
- **[schema-engine.ts](src/core/schema-engine.ts)**: Type inference and propagation through pipeline
- **[transform-result.ts](src/core/transform-result.ts)**: Result wrapper with metadata

**Visualization & Theming**:

- **[charts.ts](src/core/charts.ts)**: Vega-Lite specification generator for EDA charts
- **[vega-themes.ts](src/core/vega-themes.ts)**: Theme configurations for visualizations
- **[eda-engine.ts](src/core/eda-engine.ts)**: Statistical profiling and column analysis

**Infrastructure**:

- **[storage.ts](src/core/storage.ts)**: IndexedDB persistence layer
- **[url-state.ts](src/core/url-state.ts)**: URL hash state management for shareability
- **[ux-settings.ts](src/core/ux-settings.ts)**: User preferences (theme, performance settings)
- **[error-formatter.ts](src/core/error-formatter.ts)**: Expression error formatting with position info

### Application Architecture (`src/app/`)

**State Management**:

- **[app/stores/AppStore.ts](src/app/stores/AppStore.ts)**: Centralized application state (sources, models, active model)
- **[app/stores/DialogStore.ts](src/app/stores/DialogStore.ts)**: Dialog/modal state management

**Business Logic** (Services):

- **[app/services/ModelService.ts](src/app/services/ModelService.ts)**: Model CRUD, step management
- **[app/services/StepService.ts](src/app/services/StepService.ts)**: Transform step execution and validation
- **[app/services/ImportService.ts](src/app/services/ImportService.ts)**: CSV/URL/clipboard import logic
- **[app/services/ExportService.ts](src/app/services/ExportService.ts)**: CSV/JSON/workflow export
- **[app/services/PersistenceService.ts](src/app/services/PersistenceService.ts)**: IndexedDB persistence coordination

**UI Components** (`src/app/components/`):

- **Layout**: `App.tsx`, `Ribbon.tsx`, `Sidebar.tsx`, `DataTable.tsx`
- **Dialogs**: `DialogShell.tsx`, `SlidePanel.tsx`, `CenteredModal.tsx`
- **Transform Modals**: `FilterDialog.tsx`, `DeriveDialog.tsx`, `JoinDialog.tsx`, etc.
- **Import/Export**: `ImportCsvDialog.tsx`, `ImportUrlDialog.tsx`, `ExportDialog.tsx`
- **Settings**: `SettingsDialog.tsx`
- **EDA**: `EdaPanel.tsx`, `ChartPreview.tsx`
- **Step Editor**: `StepList.tsx`, `StepEditor.tsx`, `JsonEditor.tsx`
- **All components**: 54 TSX files with co-located CSS Modules

**Handlers** (`src/app/handlers/`):

- Transform-specific handlers: `filter-handlers.ts`, `derive-handlers.ts`, `join-handlers.ts`, etc.
- UI interaction handlers: `interaction-handlers.ts`, `column-editor-handlers.ts`
- Import/export handlers: `import-handlers.ts`, `json-handlers.ts`
- Utility handlers: `helper-handlers.ts`, `notification-handlers.ts`

**Transform UI Logic** (`src/app/transforms/`):

- Transform-specific preview and validation: `filter-transform.ts`, `derive-transform.ts`, `split-transform.ts`, etc.

**Types**:

- **[app/types.ts](src/app/types.ts)**: Application-wide TypeScript definitions (`Source`, `Model`, `TransformStep`, dialog states)

**Utilities**:

- **[app/utils/dev-helpers.ts](src/app/utils/dev-helpers.ts)**: Development helpers (`devProps`, `devClass`)

### Styles (`styles/`)

> See [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) §6 for CSS architecture details.

- **[variables.css](styles/variables.css)**: Global design tokens (colors, spacing, typography, z-index)
- **[base.css](styles/base.css)**: Global base styles and resets
- **[typography.css](styles/typography.css)**: Font definitions and text styles
- **[layout.css](styles/layout.css)**: Grid system and structural layout
- **[buttons.css](styles/buttons.css)**: Button component styles
- **[util.css](styles/util.css)**: Utility classes
- **[json-editor.css](styles/json-editor.css)**: JSON editor styling
- **[index.css](styles/index.css)**: Main entry point (imports all above)

### Content & Documentation

- **[src/content/](src/content/)**: Markdown content files (`about.md`, `expressions.md`)
- **[docs/](docs/)**: All project documentation (see [Documentation Index](#documentation-index) above)

---

## Common Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Type-check and build for production
- `npm test`: Run Vitest suite (headless, interactive)
- `npm run format`: Format code with Prettier

---

## Security Requirements (Critical)

1. **No `Function()` / `eval()`**: Never execute user input as raw JavaScript.
2. **AST Whitelist**: All expression nodes and functions must be explicitly allowed in `ast-validator.ts`.
3. **Sandbox**: Expressions cannot access global objects (`window`, `document`) or sensitive APIs.

---

## Testing Philosophy

- **Priority**: High coverage on core logic (parsing, transforms, schema).
- **Environment**: Vitest with Happy DOM for browser simulation.
- **Files**: Tests are co-located or in `src/core/*.test.ts`.
- **Test Files**:
  - `src/core/expression-parser.test.ts`: Parser edge cases
  - `src/core/ast-validator.test.ts`: Security and arity validation
  - `src/core/ast-interpreter.test.ts`: Expression execution
  - `src/core/transforms.test.ts`: Transform operations
  - `src/core/schema-engine.test.ts`: Type inference and propagation
  - `src/core/integration.test.ts`: End-to-end transform pipelines
  - `src/app/components/App.ux.test.tsx`: UI interaction testing
  - `src/app/handlers/interaction-handlers.ux.test.ts`: Handler logic

---

## Related Documentation

- **Getting Started**: Read [SPECIFICATION.md](docs/SPECIFICATION.md) for product vision and architecture
- **UI Development**: See [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) for design patterns and component guidelines
- **Debugging**: Check [DEBUGGING.md](docs/DEBUGGING.md) for CSS Module and component debugging tips
- **Migration History**: [MIGRATION-TO-ROBUST-TS.md](docs/MIGRATION-TO-ROBUST-TS.md) documents the Preact/TSX migration

---

**End of Context**
