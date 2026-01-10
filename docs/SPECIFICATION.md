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

**Core Features**: Fully functional data wrangling application with 13+ transformation types, granular schema management, exploratory analysis, and interactive visualizations. Verified by automated test suites (Vitest).

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
| Deployment      | Static hosting (GitHub Pages compatible)                      |
| Theme Engine    | Custom themes (Chumak, Blues) with Vega integration           |
| Browser support | Chrome and Safari (latest 2 versions)                         |
| Offline         | Core functionality works offline; URL imports require network |

### 3.2 Libraries

| Library       | Purpose                                            |
| :------------ | :------------------------------------------------- |
| **Iconify**   | Unified vector icon framework                      |
| **PapaParse** | High-performance CSV parsing and export            |
| **Arquero**   | Data transformation engine (inspired by dplyr)     |
| **jsep**      | Lightweight Javascript Expression Parser           |
| **Alpine.js** | Declarative, reactive UI framework                 |
| **Vega-Lite** | Grammar of Graphics for interactive visualizations |

### 3.3 Storage

| Storage Type     | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| **localStorage** | User preferences, active theme selection                                 |
| **IndexedDB**    | Datasets (raw + cached previews), workflows, step snapshots              |
| **URL Hash**     | Active Source and Model state (for shareability and refresh persistence) |

---

## 4. Data Model

### 4.1 Transformation Pipeline

Workflows are stored as a list of `Transform` steps applied to a static `Source`. Models are recomputed through the pipeline of steps, allowing for non-destructive editing and replaying of data wrangling operations.

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

| Feature               | Implementation                                              |
| --------------------- | ----------------------------------------------------------- |
| **Import CSV (file)** | Sidebar action + drag-drop → Config dialog → Creates Source |
| **Paste CSV**         | Sidebar action / CTRL+V → Config dialog → Creates Source    |
| **Import from URL**   | Fetch CSV from public URL → Config dialog → Creates Source  |
| **Unified Download**  | Modal with CSV, Data JSON, and Workflow JSON options        |

### 5.2 Core Transformations

| Transform     | Description                                                           |
| :------------ | :-------------------------------------------------------------------- |
| **Filter**    | Keep rows matching expression (`filter: "expr"`)                      |
| **Select**    | Keep listed columns (`select: ["col1"]`)                              |
| **Remove**    | Drop listed columns (`remove: ["col1"]`)                              |
| **Rename**    | Rename one or more columns (`rename: { "old": "new" }`)               |
| **Sort**      | Order by single field (`sort: { field: "col", order: "asc" }`)        |
| **Derive**    | Add/Update calculated columns (`derive: { new: "expr" }`)             |
| **Types**     | Explicitly set column types (`types: { col: "type" }`)                |
| **Aggregate** | Group and rollup (`aggregate: { groupby: [], rollup: {} }`)           |
| **Fold**      | Unpivot/Melt wide to long (`fold: { columns: [], as: [] }`)           |
| **Split**     | Delimiter-based splitting (`split: { column: "col", ... }`)           |
| **Replace**   | Value replacement (`replace: { column: "col", find: x, replace: y }`) |

### 5.3 Expression Engine

Support for complex formulas with security-validated interpretation:

- **Operators**: Arithmetic (`+`, `-`, `*`, `/`, `%`), Comparison (`>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`), Logical (`&&`, `||`, `!`), Conditional (`? :`), Null-coalescing (`??`)
- **Functions**: `regexp_match(val, pattern)`, `regexp_extract(val, pattern, group)`
- **Column References**: Bare identifiers (`sales`) or bracket notation (`[Column Name]`)

---

## 6. UI Structure

### 6.1 Layout

- **Ribbon Toolbar**: Workflow-based navigation (Prepare | Calculate | Combine)
- **Sources Sidebar**: Integrated source management and I/O actions
- **Model Toolbar**: Stats summary, navigation, and consolidated downloads/copying
- **Step Editor**: Pipeline management with edit/delete actions and JSON toggle

### 6.2 Data Visualization (Vega-Lite)

- **Themed Visuals**: Charts automatically adopt either the "Chumak" or "Blues" (KSE) color palette.
- **Chart Types**: Boxplots, Histograms, and Categorical Bar charts for Exploratory Data Analysis (EDA).

---

## 7. Testing Strategy

### 7.1 Framework

Tests are written in **TypeScript** using **Vitest** for native runner support and **Happy DOM** for browser simulation.

### 7.2 Core Coverage

- **Expression Parsing**: `expression-parser.test.ts`
- **Security & Arity**: `ast-validator.test.ts`
- **Execution**: `ast-interpreter.test.ts`
- **Transformation Engine**: `transforms.test.ts`
- **Propagation**: `schema-engine.test.ts`

---

## 8. Roadmap

### 8.1 Short-Term

- **Dedupe**: Dedicated transform for duplicate removal
- **Impute**: Filling missing values with constants or expressions
- **Pivot**: Column-based pivoting (long-to-wide)

### 8.2 Future

- **Set Operations**: Union, Intersection, and Concat across models
- **Sampling**: Random sampling for large dataset performance
- **Array Transformations**: Spread and Unroll for array-based data

---

**End of Specification**
