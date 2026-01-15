# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Status**: Production-ready data wrangling application with comprehensive transform capabilities, dynamic theming, and the target audience-focused UI.

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

### 1. Hybrid Expression Parser

**Approach**: Custom AST interpretation for user expressions, Arquero delegation for data operations.

- **Security**: Zero usage of `eval()` or `Function()` constructor for user input
- **Validation**: AST validation catches errors before execution with position-aware highlighting
- **Arity**: Support for arithmetic, logic, conditional (`? :`), null-coalescing (`??`), and whitelisted functions

### 2. Workflow-Based UI

**Organization**: Ribbon tabs are organized by workflow stage (Prepare | Calculate | Combine).

- **Consolidated Sidebar**: All data sources and import actions are handled in the left sidebar header
- **Action Toolbars**: Context-aware floating toolbars for columns and cells provide rapid access to frequent operations

### 3. Component-Scoped Styling (CSS Modules)

**Approach**: Use CSS Modules co-located with components to ensure encapsulation and maintainability.

- **Naming**: Use camelCase for class names to match JS/TS property access.
- **Debugging**: Configured Vite to include component names in generated class names during development.

---

## Codebase Map

### Core Logic (`src/core/`)

- **[expression-parser.ts](src/core/expression-parser.ts)**: jsep entry point
- **[ast-validator.ts](src/core/ast-validator.ts)**: Security & arity checks
- **[ast-interpreter.ts](src/core/ast-interpreter.ts)**: Safe execution logic
- **[transforms.ts](src/core/transforms.ts)**: Transform implementations & descriptions
- **[schema-engine.ts](src/core/schema-engine.ts)**: Type inference and propagation
- **[charts.ts](src/core/charts.ts)**: Vega-Lite specification generator
- **[vega-themes.ts](src/core/vega-themes.ts)**: Theme configurations for visualizations

### Application & UI (`src/`)

- **[chumak-app.ts](src/chumak-app.ts)**: Orchestration shell (coordinating Stores and Services)
- **[app/stores/](src/app/stores/)**: Centralized signal stores (`AppStore`, `DialogStore`)
- **[app/services/](src/app/services/)**: Standalone business logic (`ModelService`, `StepService`, `ImportService`, `ExportService`, `PersistenceService`)
- **[app/components/](src/app/components/)**: Standardized Preact/TSX UI components with CSS Modules
- **[app/handlers/](src/app/handlers/)**: Refactored functional logic calling services and stores
- **[app/transforms/](src/app/transforms/)**: Transform-specific UI logic and previews
- **[app/types.ts](src/app/types.ts)**: Application-wide TypeScript definitions

- **100% TSX**: All UI and modal templates use Preact components.
- **Navigation**: Ribbon tabs (Prepare, Calculate, Combine) drive the top-level UI.
- **Slide panel**: Transform modals (filter, derive, join, etc.) with unified preview panel.
- **Centered modal**: Import modals (import-csv, import-url) and settings.

### Styles (`styles/`)

- **[variables.css](styles/variables.css)**: Global design tokens (colors, spacing, typography)
- **[base.css](styles/base.css)**: Global base styles and resets
- **[index.css](styles/index.css)**: Main entry point (imports variables, base, typography, layout)
- **[MIGRATION-TO-ROBUST-TS.md](docs/MIGRATION-TO-ROBUST-TS.md)**: Historical roadmap for modernization efforts

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

---

**End of Context**
