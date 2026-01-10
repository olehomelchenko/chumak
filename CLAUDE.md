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

- **Alpine.js**: Reactive UI state management
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

### 3. Granular Schema Management

**Engine**: `SchemaEngine` distinguishes between `integer`/`float` and `date`/`datetime` for better formatting and aggregation defaults.

- **Propagation**: Schema updates are computed through the entire pipeline on every change

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

- **[chumak-app.ts](src/chumak-app.ts)**: Main application class & store
- **[main.ts](src/main.ts)**: Application initialization
- **[app/](src/app/)**: Specific UI handlers and type definitions

### Styles (`styles/`)

- **[variables.css](styles/variables.css)**: Design tokens (colors, spacing)
- **[index.css](styles/index.css)**: Entry point for modular PostCSS

---

## Common Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Type-check and build for production
- `npm test`: Run Vitest suite (headless)
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
