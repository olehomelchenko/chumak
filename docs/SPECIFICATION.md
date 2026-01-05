# Chumak - Specification

## 1. Overview

### 1.1 Name & Tagline

**Chumak** — Data Wrangling in the Browser

_Named after the Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh)._

### 1.2 Description

Chumak is a browser-based data wrangling tool for cleaning and transforming tabular data. It provides a visual interface for building transformation pipelines, inspired by Microsoft Power Query, with transformations stored as a declarative JSON specification. The tool runs entirely in the browser with no server dependencies.

### 1.3 Design Principles

| Principle                     | Implication                                         |
| ----------------------------- | --------------------------------------------------- |
| **Local-first**               | All data stays in browser. No uploads, no accounts. |
| **Progressive disclosure**    | Simple defaults, optional advanced configuration.   |
| **Declarative specification** | Transformations are data (JSON), not code.          |
| **Reproducibility**           | Workflows can be exported, shared, and replayed.    |
| **Incremental complexity**    | UI reveals features as users need them.             |

### 1.4 Project Status

**Core Features**: Fully functional data wrangling application with comprehensive transform capabilities, schema management, exploratory analysis, and visualization.

**Production Ready**: Automated testing, browser state persistence, CSV import/export, workflow JSON export/import.

**Next Development Focus**: Reshape operations (pivot/fold), data cleaning (dedupe/impute), expression functions (string/date/math).

See [ROADMAP](#8-roadmap) for planned enhancements and [CLAUDE.md](../CLAUDE.md) for technical context.

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
| Libraries       | CDN-loaded, no build system required                          |
| Deployment      | Static hosting (GitHub Pages compatible)                      |
| Browser support | Chrome and Safari (latest 2 versions)                         |
| Offline         | Core functionality works offline; URL imports require network |

### 3.2 Core Dependencies

```html
<script src="https://unpkg.com/papaparse@5/papaparse.min.js"></script>
<script src="https://unpkg.com/arquero@5/dist/arquero.min.js"></script>
<script src="https://unpkg.com/jsep@1/dist/jsep.min.js"></script>
<script src="https://unpkg.com/alpinejs@3/dist/cdn.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
```

| Library       | Purpose                    | Size   |
| ------------- | -------------------------- | ------ |
| **PapaParse** | CSV parsing and export     | ~35KB  |
| **Arquero**   | Data transformation engine | ~200KB |
| **jsep**      | Expression parser          | ~10KB  |
| **Alpine.js** | Reactive UI framework      | ~40KB  |
| **Vega-Lite** | Chart visualization        | ~200KB |

### 3.3 Storage

| Storage Type     | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| **localStorage** | User preferences, recent workflow list                                   |
| **IndexedDB**    | Datasets (raw + cached previews), workflows, step snapshots              |
| **URL Hash**     | Active Source and Model state (for shareability and refresh persistence) |

### 3.4 Performance Targets

| Metric                    | Target                                           |
| ------------------------- | ------------------------------------------------ |
| Initial file size support | Up to 10 MB                                      |
| Preview rendering         | First 100 rows, paginated                        |
| Step navigation           | On-demand recomputation (acceptable for Phase 1) |

---

## 4. Data Model

### 4.1 Conceptual Model

```
┌─────────────────────────────────────────────────────────┐
│                      Workflow                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐         ┌─────────────────────────┐   │
│  │   Source    │────────▶│        Model            │   │
│  │  (raw CSV)  │         │  (transforms + output)  │   │
│  └─────────────┘         └───────────┬─────────────┘   │
│                                      │                  │
│                          ┌───────────▼─────────────┐   │
│                          │    Derived Model        │   │
│                          │ (references Model,      │   │
│                          │  adds more transforms)  │   │
│                          └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Core Entities

#### Source

Raw data input. Immutable once loaded.

```typescript
interface Source {
  id: string;
  name: string; // e.g., "sales.csv"
  origin: 'file' | 'url';
  originPath?: string; // URL if loaded from web

  // CSV Parsing Configuration (set at import time)
  delimiter: ',' | '\t' | ';' | string;
  headerMode: 'first-row' | 'auto-generate' | 'manual';
  customHeaders?: string[]; // Only if headerMode === "manual"

  // Data Metadata
  rawSize: number; // bytes
  rowCount: number; // data rows (excluding header if first-row mode)
  columns: ColumnSchema[];
  createdAt: string; // ISO timestamp
}

interface ColumnSchema {
  name: string; // From header, auto-generated, or custom
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime';
  format?: ColumnFormat; // Optional formatting metadata
  originalPosition: number; // 0-indexed column position in CSV
}

interface ColumnFormat {
  type?: 'number' | 'currency' | 'percentage' | 'date' | 'duration';
  precision?: number; // Decimal places
  symbol?: string; // Currency symbol, etc.
  pattern?: string; // Date format pattern
}
```

#### Model

A transformation pipeline applied to a Source.

```typescript
interface Model {
  id: string;
  name: string; // user-defined, e.g., "main", "cleaned"
  sourceId: string; // Source ID
  steps: Transform[]; // ordered transform list
  schema: ColumnSchema[]; // Current schema (names + types)
  data: Row[]; // final result (computed)
}

// Note: Intermediate results computed on-demand when viewing steps
```

#### Workflow

Container for Sources and Models. Represents a complete project.

```typescript
interface Workflow {
  id: string;
  name: string;
  sources: Source[];
  models: Model[];
  activeModelId: string; // currently viewed
  createdAt: string;
  updatedAt: string;
  version: '1.0'; // schema version for migrations
}
```

### 4.3 Transform Specification Format

Inspired by Vega-Lite. Each transform is one object in an array.

**Dual-mode expressions**: Filter transforms accept either structured predicates (planned) or expression strings (current). See Section 10 and [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md) for details.

```json
{
  "transforms": [
    // Filter (expression string - currently supported)
    { "filter": "sales > 1000 && region == 'North'" },

    // Derive (expression string)
    { "derive": { "profit": "revenue - cost" } },

    // Other transforms
    { "select": ["region", "sales", "profit"] },
    { "sort": { "field": "profit", "order": "descending" } },
    { "types": { "sales": "integer", "profit": "float" } }
  ]
}
```

---

## 5. Implemented Features

### 5.1 Data Import/Export

| Feature                  | Status | Implementation                                           |
| ------------------------ | ------ | -------------------------------------------------------- |
| **Import CSV (file)**    | ✅     | File picker + drag-drop → Config dialog → Creates Source |
| **Paste CSV**            | ✅     | Clipboard (Ctrl+V) → Config dialog → Creates Source      |
| **Export CSV**           | ✅     | Downloads transformed data with timestamp                |
| **Export workflow JSON** | ✅     | Downloads workflow specification                         |

**CSV Import Dialog**:

- Preview of first 5 rows
- Header mode: first-row (default), auto-generate, manual
- Delimiter selection: comma, tab, semicolon
- Editable column names (for first-row and manual modes)

### 5.2 Core Transformations

| Transform     | JSON Syntax                                              | Implementation | Arquero Verb               |
| ------------- | -------------------------------------------------------- | -------------- | -------------------------- |
| **Filter**    | `{ "filter": "expression" }`                             | ✅             | Custom AST                 |
| **Select**    | `{ "select": ["col1", "col2"] }`                         | ✅             | `table.select()`           |
| **Remove**    | `{ "remove": ["col1"] }`                                 | ✅             | `table.not()`              |
| **Rename**    | `{ "rename": { "old": "new" } }`                         | ✅             | `table.rename()`           |
| **Sort**      | `{ "sort": { "field": "col", "order": "asc" } }`         | ✅             | `table.orderby()`          |
| **Derive**    | `{ "derive": { "newCol": "expression" } }`               | ✅             | Custom AST                 |
| **Types**     | `{ "types": { "col": "integer" } }`                      | ✅             | Schema override            |
| **Aggregate** | `{ "aggregate": { "groupby": [...], "rollup": {...} } }` | ✅             | `table.groupby().rollup()` |
| **Fold**      | `{ "fold": { "columns": [...], "as": ["k", "v"] } }`     | ✅             | `table.fold()`             |

**Pattern Matching in Select**: UI supports prefix/suffix/exact matching for column selection.

### 5.3 Multi-Model & Joins

**Multi-Model Support**: Create multiple models per source via UI action (not a transform). Each model has independent transform pipeline.

**Join Transform**:

```json
{
  "join": {
    "right": "model_abc123", // Model ID to join with
    "on": [["region_id", "id"]], // Array of [left_key, right_key] pairs
    "how": "left", // Join type: inner, left, right, full, cross
    "suffixes": ["_x", "_y"] // Column conflict resolution (optional)
  }
}
```

**Join types**: `inner`, `left`, `right`, `full`, `cross`

Implementation: Direct wrapper around Arquero's `table.join()` family.

### 5.4 Schema Management

**SchemaEngine** ([schema-engine.js](../src/schema-engine.js)):

- Granular type inference: `integer` vs `float`, `date` vs `datetime`
- Schema propagation through transformation pipeline
- Type prediction for derived columns based on AST analysis
- Auto-detection from sample data

**Type System**:

- `string` - Text data
- `integer` - Whole numbers
- `float` - Decimal numbers
- `boolean` - true/false values
- `date` - Date-only (YYYY-MM-DD)
- `datetime` - Date with time (YYYY-MM-DD HH:MM:SS)

**UI Features**:

- Type indicators in table headers (visual badges)
- Floating type menu for manual type changes
- Global auto-detect schema button
- Types transform records manual overrides in workflow

### 5.5 Exploratory Data Analysis (EDA)

**EDAEngine** ([eda-engine.js](../src/eda-engine.js)):

**Statistics Calculated**:

- **All types**: Total count, null count, unique values, unique percentage
- **Numeric**: Min, max, mean, median, Q1, Q3, standard deviation
- **Categorical**: Top values with frequency counts

**UI**:

- Click column header to show EDA panel
- Statistics summary card
- Interactive visualizations (see below)

### 5.6 Visualization

**ChartsEngine** ([charts.js](../src/charts.js)) - Vega-Lite integration:

**Chart Types**:

1. **Boxplot** (numeric columns)
   - Shows distribution with quartiles
   - Jittered scatter overlay (sampled to 1000 points)
   - Outlier detection

2. **Histogram** (numeric columns)
   - 20-bin histogram with interactive brushing
   - Brush selection creates filter transform
   - Responsive width

3. **Categorical Bar Chart** (string columns)
   - Frequency counts for top values
   - "Other" category for infrequent values
   - Horizontal bars for readability

**Chart Switcher**: Toggle between chart types in EDA panel

### 5.7 Expression Parser

**Architecture**: Hybrid approach (structured predicates planned, expression strings current)

See [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md) for comprehensive design rationale.

**Current Support** (expressions):

- **Operators**: Arithmetic (`+`, `-`, `*`, `/`, `%`), Comparison (`>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`), Logical (`&&`, `||`, `!`)
- **Column References**: Bare identifiers (`sales > 1000`) or bracket notation (`[Total Sales] > 1000`)
- **Security**: AST validation, no `Function()` constructor, operator whitelist

**Implementation**:

- Parser: jsep library
- Validator: [ast-validator.js](../src/ast-validator.js)
- Interpreter: [ast-interpreter.js](../src/ast-interpreter.js)
- Error Formatter: [error-formatter.js](../src/error-formatter.js) with position highlighting

**Not Yet Supported** (planned):

- Function calls (Math, String, Date functions)
- Ternary operator (`? :`)
- Advanced operators (`?.`, `??`)

### 5.8 UI Features

**Layout**: Workflow-based ribbon toolbar with tabs:

| Tab           | Purpose                | Key Operations                                     |
| ------------- | ---------------------- | -------------------------------------------------- |
| **Data**      | Import/Export          | Import CSV, Paste, Export CSV, Export Workflow     |
| **Prepare**   | Clean & organize data  | Filter, Sort, Dedupe, Select/Remove/Rename columns |
| **Calculate** | Derive & summarize     | Derive, Group By (Aggregate), Pivot/Unpivot        |
| **Combine**   | Multi-table operations | Join, Append, Union                                |

**Visual Groups within tabs**: Clean Rows, Manage Columns, Types & Format, New Columns, Summarize, Reshape, Transform Values

**Workflow**: Prepare (clean) → Calculate (derive/aggregate) → Combine (multi-table)

**Interactive Features**:

- **Floating Column Toolbar**: Click column header → Sort, Filter, Rename, Remove actions
- **Floating Cell Toolbar**: Click cell → Keep/Exclude this value, Copy
- **Column Hover Highlighting**: Visual feedback on mouseover
- **Type Indicators**: Visual badges showing column data types
- **Text Truncation**: Long values with hover tooltips
- **Step Navigation**: Click step in sidebar → View intermediate result

**Data Preview**:

- First 100 rows (configurable pagination)
- Sticky headers
- Horizontal + vertical scroll
- Right-aligned numbers, tabular numerals

### 5.9 Persistence & State

**Auto-Save**:

- IndexedDB storage with 500ms debounced saves
- Workflow saved on every change
- No explicit "Save" button needed

**URL State** ([url-state.js](../src/url-state.js)):

- Hash-based routing: `#/sourceId/modelId`
- Preserves active view on page refresh
- Shareable links to specific models

**UX Settings** ([ux-settings.js](../src/ux-settings.js)):

- localStorage for user preferences
- Pagination settings
- Panel visibility states

**Performance Logging** ([performance-logger.js](../src/performance-logger.js)):

- Optional transform timing
- Toggle-able for debugging

### 5.10 Testing Infrastructure

**Comprehensive test suite** (1,281 lines across 5 files):

- Browser-based test runner (Mocha + Chai)
- Test files: `expression-parser.test.js`, `ast-validator.test.js`, `ast-interpreter.test.js`, `transforms.test.js`, `join.test.js`
- Run at [src/tests/runner.html](../src/tests/runner.html)
- High coverage on core transform logic and expression parsing

---

## 6. Transform Operations Reference

### 6.1 Implemented Transforms

#### Filter

```json
{ "filter": "sales > 1000 && region == 'North'" }
```

Keep rows matching expression. Security-validated AST interpretation.

#### Select

```json
{ "select": ["col1", "col2", "col3"] }
```

Keep only listed columns. UI supports pattern matching (prefix/suffix/exact).

#### Remove

```json
{ "remove": ["col1", "col2"] }
```

Drop listed columns.

#### Rename

```json
{ "rename": { "old_name": "new_name", "sales": "revenue" } }
```

Rename one or more columns.

#### Sort

```json
{ "sort": { "field": "sales", "order": "descending" } }
```

Sort by single field. Order: `"ascending"` or `"descending"`.

#### Derive

```json
{ "derive": { "profit": "revenue - cost", "margin": "(revenue - cost) / revenue" } }
```

Add calculated columns using expressions.

#### Types

```json
{ "types": { "sales": "integer", "price": "float", "date": "date" } }
```

Explicitly set column types (overrides auto-detection).

#### Aggregate

```json
{
  "aggregate": {
    "groupby": ["region", "category"],
    "rollup": {
      "total_sales": "d => op.sum(d.sales)",
      "avg_profit": "d => op.mean(d.profit)",
      "count": "d => op.count()"
    }
  }
}
```

Group by columns and compute aggregates. Arquero expression format.

**Supported operations**: `count`, `sum`, `mean`, `median`, `min`, `max`, `stdev`, `variance`

#### Join

```json
{
  "join": {
    "right": "mdl_xyz789",
    "on": [["customer_id", "id"]],
    "how": "left",
    "suffixes": ["_orders", "_customers"]
  }
}
```

Join with another model. Types: `inner`, `left`, `right`, `full`, `cross`.

#### Fold (Unpivot)

```json
{
  "fold": {
    "columns": ["2018", "2019", "2020"],
    "as": ["Year", "Sales"]
  }
}
```

Collapse multiple columns into key-value pairs (wide to long format).

### 6.2 Roadmap Transforms

See [Section 8 (Roadmap)](#8-roadmap) for planned transforms.

---

## 7. User Interface

### 7.1 Main Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER & RIBBON TABS (48px height)                               │
│  ☆ Chumak                 [Data] [Transform] [Add Column] ...    │
├──────────────────────────────────────────────────────────────────┤
│ RIBBON CONTENT (auto height, ~56px)                              │
│  [Import CSV] [Export CSV] [Paste] [Export JSON]                 │
├────────────────────┬─────────────────────────────────────────────┤
│                    │                                             │
│ LEFT PANEL         │ MAIN CONTENT AREA                           │
│ (300px fixed)      │ (flexible)                                  │
│                    │                                             │
│ ┌────────────────┐ │ ┌──────────────────────────────────────────┐│
│ │ Sources &      │ │ │                                          ││
│ │ Models         │ │ │  DATA PREVIEW TABLE                      ││
│ │                │ │ │  (scrollable horizontal + vertical)      ││
│ │ 📄 sales.csv   │ │ │                                          ││
│ │   └─ 📊 main   │ │ │                                          ││
│ │                │ │ │                                          ││
│ └────────────────┘ │ └──────────────────────────────────────────┘│
│ ┌────────────────┐ │                                             │
│ │ Steps | JSON   │ │ Showing 1-100 of 5,432        [<] [>]       │
│ ├────────────────┤ │                                             │
│ │ 1. Filter      │ │                                             │
│ │ 2. Derive      │ │                                             │
│ │ 3. Select      │ │                                             │
│ │                │ │                                             │
│ │ [+ Add Step]   │ │                                             │
│ └────────────────┘ │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

### 7.2 Design System

See [UX-SPECIFICATION.md](UX-SPECIFICATION.md) for comprehensive UI details.

**Key Characteristics**:

- KSE-inspired visual identity (clean, rigorous, information-dense)
- Custom CSS with normalize.css (no framework lock-in)
- CSS custom properties for design tokens
- BEM naming convention
- Graphik font family (fallback to Arial)

**Color Palette**:

- Dark Midnight Blue (#003964) - Primary
- Cyan (#00BBCE) - Accent, links, active states
- Green (#A7C539) - Success
- Yellow (#E4E541) - Warnings
- Red (#F15B43) - Errors

---

## 8. Roadmap

### 8.1 Near-Term (Next Features)

**Priority: High** - Core data wrangling gaps

| Feature    | Description                        | Arquero Verb     | Effort    |
| ---------- | ---------------------------------- | ---------------- | --------- |
| **Dedupe** | Remove duplicate rows              | `table.dedupe()` | ~30 lines |
| **Impute** | Fill missing values with constants | `table.impute()` | ~50 lines |
| **Pivot**  | Wide format (cross-tabulation)     | `table.pivot()`  | ~60 lines |

**Rationale**: These complete the core data cleaning and reshape capabilities. Pivot/fold are essential for tidy data workflows.

### 8.2 Mid-Term (Expression Functions)

**Priority: Medium** - Unlock advanced calculations

| Feature Category | Functions                                                             | Implementation   |
| ---------------- | --------------------------------------------------------------------- | ---------------- |
| **String**       | `upper()`, `lower()`, `trim()`, `substring()`, `split()`, `replace()` | Whitelist `op.*` |
| **Date**         | `year()`, `month()`, `day()`, `parse_date()`, `format_date()`         | Whitelist `op.*` |
| **Math**         | `abs()`, `round()`, `floor()`, `ceil()`, `sqrt()`, `min()`, `max()`   | Whitelist `op.*` |
| **Type**         | `parse_int()`, `parse_float()`, `is_nan()`                            | Whitelist `op.*` |

**Effort**: ~150 lines (validator updates + function mapping)

**Unlock**:

- Expression-based `impute`: `{ "impute": { "sales": "mean(sales)" } }`
- Advanced `derive`: `{ "derive": { "year": "year(date)", "upper_name": "upper(name)" } }`

### 8.3 Future Enhancements

**Priority: Low** - Advanced operations

| Feature               | Description                      | Arquero Verb                           | Notes                     |
| --------------------- | -------------------------------- | -------------------------------------- | ------------------------- |
| **Concat**            | Combine tables (with duplicates) | `table.concat()`                       | UNION ALL                 |
| **Union**             | Combine tables (deduplicated)    | `table.union()`                        | UNION                     |
| **Slice**             | Extract row range                | `table.slice()`                        | Row filtering             |
| **Sample**            | Random sampling                  | `table.sample()`                       | Useful for large datasets |
| **Spread**            | Array → columns                  | `table.spread()`                       | Array manipulation        |
| **Unroll**            | Array → rows                     | `table.unroll()`                       | Array manipulation        |
| **Semijoin/Antijoin** | Advanced joins                   | `table.semijoin()`, `table.antijoin()` | Set operations            |

### 8.4 Polish & UX

| Enhancement             | Description                         | Priority |
| ----------------------- | ----------------------------------- | -------- |
| **Drag-reorder steps**  | Reorder transformation pipeline     | Medium   |
| **Column resize**       | Draggable column width              | Low      |
| **Dark mode**           | Alternative theme                   | Low      |
| **Keyboard shortcuts**  | Power user efficiency               | Medium   |
| **Multi-column sort**   | Sort by multiple fields             | Medium   |
| **Advanced predicates** | GUI filter builder (no expressions) | Medium   |

### 8.5 Non-Goals

The following are explicitly **out of scope**:

- User accounts or authentication
- Server-side processing
- Real-time collaboration
- Python/R/SQL code export
- Mobile-optimized UI
- Excel file support (.xlsx)
- Browser support beyond Chrome/Safari

---

## 9. Architecture Decisions

### 9.1 Expression Parser: Hybrid Strategy

**Decision**: Custom AST interpretation for user expressions, Arquero delegation for data operations.

**Rationale**:

- **Security**: Never use `new Function()` with user input
- **Validation**: AST validation catches errors before execution
- **Error Quality**: Position-aware error messages with suggestions
- **Arquero Leverage**: Use built-in verbs for data manipulation (faster, tested)

See [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md) for full analysis.

### 9.2 Schema System: Granular Types

**Decision**: Distinguish `integer` vs `float`, `date` vs `datetime`.

**Rationale**:

- Better formatting (integers don't need decimal places)
- Correct aggregation defaults (sum integers = integer)
- Type hints for derived columns
- User can override via `types` transform

**Implementation**: SchemaEngine infers from sample data, propagates through transforms. The `TransformResult` contract ensures schema derivation always receives sample data, preventing type inference failures for new columns.

### 9.3 Visualization: Vega-Lite

**Decision**: Use Vega-Lite for charts (not custom D3 implementation).

**Rationale**:

- Declarative JSON specs (aligns with transform approach)
- Well-documented, actively maintained
- Interactive features (brushing, tooltips) built-in
- Reasonable bundle size (~200KB)

**Trade-off**: Adds dependency, but avoids reinventing charting library.

### 9.4 No Build System

**Decision**: CDN-loaded libraries, no npm/webpack/build step.

**Rationale**:

- **Simplicity**: Open `index.html` in browser, it works
- **Deployment**: Static hosting, no server required
- **Debugging**: Source code readable in dev tools
- **Target Audience**: Non-programmers shouldn't need Node.js tooling

**Trade-off**: Slightly larger initial load (can't tree-shake), but acceptable for target use case.

### 9.5 On-Demand Step Computation

**Decision**: Compute intermediate results when viewing steps, don't cache.

**Rationale**:

- **Simplicity**: No cache invalidation logic needed
- **Memory**: Don't store N copies of data for N steps
- **Performance**: Acceptable for preview use case (100 rows)

**Future**: Could add caching for large datasets if performance becomes issue.

### 9.6 Multi-Model Design

**Decision**: Multiple models per source, each with independent transforms.

**Rationale**:

- **Workflow**: Clean in one model, aggregate in another, join results
- **Experimentation**: Try different approaches without losing work
- **Joins**: Can join model outputs (not just sources)

**Implementation**: Models reference source by ID, have own transform pipeline.

### 9.7 TransformResult Contract

**Decision**: Use a lightweight contract object to bundle transform outputs (`data`, `schema`, `columns`).

**Problem Solved**: Schema derivation was inconsistent - some code paths provided sample data for type inference, others didn't. This caused "schema not updating" bugs for transforms that create new columns (split, derive, join).

**Rationale**:

- **Single source of truth**: `TransformResult.create()` always derives schema with sample data
- **Self-healing**: Detects and corrects schema/columns mismatches
- **Minimal footprint**: Not a wrapper around every transform - only used at two integration points

**Where it's used** (and only these places):

1. `computeModelUpToStep()` - When replaying the pipeline
2. `applyStepResult()` - When applying a new transform from UI

**What it's NOT**:

- Not a replacement for `applyTransform()` - that still returns Arquero tables
- Not called by transform implementations themselves
- Not a generic data structure used throughout the codebase

**Implementation**: ~100 lines in `transform-result.js`. See `integration.test.js` for usage examples.

---

## 10. Expression Syntax Reference

> **Note**: Full parser design details in [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md)

### 10.1 Column References

**Simple names** (bare identifiers):

```javascript
sales > 1000;
revenue - cost;
```

**Spaces/special characters** (bracket notation):

```javascript
[Total Sales] > 1000
[Q1 Revenue] - [Q1 Cost]
[price-usd] * 1.1
```

### 10.2 Current Operators

**Allowed**:

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`
- Logical: `&&`, `||`, `!`
- Grouping: `(`, `)`

**Not allowed** (current - planned for future):

- Function calls (Phase 2)
- Ternary operator `? :` (Phase 2)
- Bitwise operators (never)
- Assignment operators (never)

### 10.3 Error Messages

User-friendly errors with position highlighting:

```
Column 'Slaes' not found
 region == "North" && Slaes > 1000
                       ↑
Did you mean 'Sales'?
Available columns: Region, Sales, Revenue, Cost
```

### 10.4 Security Model

- **No Function() constructor** - expressions parsed and interpreted via AST
- **Operator whitelist** - only safe operators allowed
- **Column validation** - unknown columns rejected at parse time
- **No property access** - can't access window, document, localStorage, etc.

---

## 11. Persistence & Export

### 11.1 Auto-Save

- Workflow saved to IndexedDB on every change
- Debounced (500ms after last change)
- No explicit "Save" button needed

### 11.2 IndexedDB Schema

```
Database: chumak-db

Object Stores:
├── workflows
│   └── { id, name, sources, models, ... }
├── sourceData
│   └── { sourceId, rows: [...] }
├── snapshots
│   └── { modelId, stepIndex, preview, rowCount, columns }
└── preferences
    └── { key, value }
```

### 11.3 Export Formats

#### Workflow Export (`.chumak.json`)

```json
{
  "version": "1.0",
  "name": "My Analysis",
  "exportedAt": "2025-01-15T10:30:00Z",
  "sources": [
    {
      "id": "src_1",
      "name": "sales.csv",
      "columns": [...],
      "dataEmbedded": false
    }
  ],
  "models": [
    {
      "id": "mdl_1",
      "name": "sales_cleaned",
      "parentId": "src_1",
      "transforms": [...]
    }
  ]
}
```

Option: embed source data (for full reproducibility) vs. reference only (smaller file, requires re-upload).

---

## 12. Testing Strategy

### 12.1 Philosophy

- **Test-first always** — write tests before implementing new features
- **Every transform has tests** — core logic must be reliable
- **Browser-based runner** — consistent with no-build-system constraint
- **High coverage** — especially for transform compiler and expression parser

### 12.2 Testing Stack

CDN-loaded stack (no build required):

```html
<script src="https://unpkg.com/mocha@10/mocha.js"></script>
<script src="https://unpkg.com/chai@4/chai.js"></script>
```

**Test runner**: Open [src/tests/runner.html](../src/tests/runner.html) in browser

### 12.3 Test Coverage

| Area                   | Test File                 | Lines | Focus                                |
| ---------------------- | ------------------------- | ----- | ------------------------------------ |
| **Expression Parsing** | expression-parser.test.js | 136   | jsep integration, bracket notation   |
| **AST Validation**     | ast-validator.test.js     | 229   | Security checks, operator whitelist  |
| **AST Interpretation** | ast-interpreter.test.js   | 282   | Expression evaluation, null handling |
| **Transforms**         | transforms.test.js        | 502   | All transform types, edge cases      |
| **Joins**              | join.test.js              | 132   | Multi-model joins, key matching      |

**Total**: 1,281 lines of test code

**Edge cases tested**:

- Empty data, nulls, single row
- Column names with spaces/special characters
- Division by zero, type mismatches
- Deeply nested expressions
- Schema propagation through transforms

---

## 13. Branding Notes

**Name:** Chumak (Чумак)

**Story:** Ukrainian traders who navigated by the stars, transforming raw goods (salt, fish) into traded wealth along routes guided by the Milky Way — _Chumatskyi Shliakh_.

**Potential visual motifs:**

- Stylized Milky Way arc
- Salt crystal / wagon wheel
- Star as accent mark
- Cyrillic Ч (Che) as logo element

**Tone:** Practical, trustworthy, quietly cultural — a tool that gets the job done, with a story behind it.

---

## 14. References

### 14.1 Project Documentation

- [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md) - Expression parser architecture
- [UX-SPECIFICATION.md](UX-SPECIFICATION.md) - UI/UX design system
- [ARQUERO-LEVERAGE-ANALYSIS.md](ARQUERO-LEVERAGE-ANALYSIS.md) - Roadmap and Arquero integration
- [CLAUDE.md](../CLAUDE.md) - Technical context for AI sessions

### 14.2 Research

- [research/analysis\_\_arquero.md](../research/analysis__arquero.md) - Arquero deep-dive
- [research/analysis\_\_vega-lite.md](../research/analysis__vega-lite.md) - Vega-Lite patterns
- [research/analysis\_\_openrefine.md](../research/analysis__openrefine.md) - OpenRefine/GREL
- [research/analysis\_\_ag-grid.md](../research/analysis__ag-grid.md) - ag-Grid lessons

### 14.3 External Documentation

- Arquero: https://uwdata.github.io/arquero/
- Vega-Lite: https://vega.github.io/vega-lite/
- jsep: https://github.com/EricSmekens/jsep
- Alpine.js: https://alpinejs.dev/

---

**End of Specification**
