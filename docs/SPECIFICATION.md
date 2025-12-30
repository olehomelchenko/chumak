# Chumak - Specification

## 1. Overview

### 1.1 Name & Tagline

**Chumak** — Data Wrangling in the Browser

*Named after the Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh).*

### 1.2 Description

Chumak is a browser-based data wrangling tool for cleaning and transforming tabular data. It provides a visual interface for building transformation pipelines, inspired by Microsoft Power Query, with transformations stored as a declarative JSON specification. The tool runs entirely in the browser with no server dependencies.

### 1.3 Design Principles

| Principle | Implication |
|-----------|-------------|
| **Local-first** | All data stays in browser. No uploads, no accounts. |
| **Progressive disclosure** | Simple defaults, optional advanced configuration. |
| **Declarative specification** | Transformations are data (JSON), not code. |
| **Reproducibility** | Workflows can be exported, shared, and replayed. |
| **Incremental complexity** | UI reveals features as users need them. |

### 1.4 Current Status

**Phase 0 — Walking Skeleton: ✅ COMPLETE**

Core features implemented and validated:
- ✅ Expression parser with security validation
- ✅ Filter & Select transforms
- ✅ Step navigation (view intermediate results, remove steps)
- ✅ IndexedDB persistence with auto-save
- ✅ CSV import with configuration dialog
- ✅ CSV and workflow JSON export
- ✅ Automated testing infrastructure with comprehensive test suite

**Next:** Phase 1 — MVP (remaining transforms)

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

## 3. Technical Constraints

### 3.1 Runtime Environment

| Constraint | Decision |
|------------|----------|
| Execution | Browser only, no backend |
| Libraries | CDN-loaded, no build system required |
| Deployment | Static hosting (GitHub Pages compatible) |
| Browser support | Chrome and Safari (latest 2 versions) |
| Offline | Core functionality works offline; URL imports require network |

### 3.2 Core Dependencies

```html
<script src="https://unpkg.com/papaparse@5/papaparse.min.js"></script>
<script src="https://unpkg.com/arquero@5/dist/arquero.min.js"></script>
<script src="https://unpkg.com/jsep@1/dist/jsep.min.js"></script>
<script src="https://unpkg.com/alpinejs@3/dist/cdn.min.js" defer></script>
```

| Library | Purpose | Size |
|---------|---------|------|
| **PapaParse** | CSV parsing and export | ~35KB |
| **Arquero** | Data transformation engine | ~200KB |
| **jsep** | Expression parser | ~10KB |
| **Alpine.js** | Reactive UI framework | ~40KB |

### 3.3 Storage

| Storage Type | Purpose |
|--------------|---------|
| **localStorage** | User preferences, recent workflow list |
| **IndexedDB** | Datasets (raw + cached previews), workflows, step snapshots |

### 3.4 Performance Targets

| Metric | Target |
|--------|--------|
| Initial file size support | Up to 10 MB |
| Preview rendering | First 100 rows, paginated |
| Step navigation | On-demand recomputation (acceptable for Phase 1) |

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

### 4.2 Entities

#### Source

Raw data input. Immutable once loaded.

```typescript
interface Source {
  id: string;
  name: string;                    // e.g., "sales.csv"
  origin: "file" | "url";
  originPath?: string;             // URL if loaded from web

  // CSV Parsing Configuration (set at import time)
  delimiter: "," | "\t" | ";" | string;
  headerMode: "first-row" | "auto-generate" | "manual";
  customHeaders?: string[];        // Only if headerMode === "manual"

  // Data Metadata
  rawSize: number;                 // bytes
  rowCount: number;                // data rows (excluding header if first-row mode)
  columns: ColumnSchema[];
  createdAt: string;               // ISO timestamp
}

interface ColumnSchema {
  name: string;                    // From header, auto-generated, or custom
  inferredType: "string" | "number" | "boolean" | "date";
  originalPosition: number;        // 0-indexed column position in CSV
}
```

#### Model

A transformation pipeline applied to a Source.

```typescript
interface Model {
  id: string;
  name: string;                    // user-defined, e.g., "main", "cleaned"
  sourceId: string;                // Source ID
  steps: Transform[];              // ordered transform list
  data: Row[];                     // final result (computed)
}

// Note: Intermediate results computed on-demand when viewing steps
// Original design included stepSnapshots for caching, deferred to Phase 2
```

#### Workflow

Container for Sources and Models. Represents a complete project.

```typescript
interface Workflow {
  id: string;
  name: string;
  sources: Source[];
  models: Model[];
  activeModelId: string;           // currently viewed
  createdAt: string;
  updatedAt: string;
  version: "1.0";                  // schema version for migrations
}
```

### 4.3 Transform Specification Format

Inspired by Vega-Lite. Each transform is one object in an array.

**Dual-mode expressions**: Filter transforms accept either structured predicates (primary) or expression strings (advanced). See Section 11 and PARSER-DESIGN-DECISION.md for details.

```json
{
  "transforms": [
    // Option 1: Structured predicate (GUI-friendly)
    { "filter": { "field": "sales", "gt": 1000 } },

    // Option 2: Expression string (advanced users)
    { "filter": "sales > 1000 && region == 'North'" },

    // Derive always uses expression strings
    { "derive": { "profit": "revenue - cost" } },

    // Other transforms
    { "select": ["region", "sales", "profit"] },
    { "sort": { "field": "profit", "order": "descending" } }
  ]
}
```

---

## 5. Transformation Operations

### 5.1 Phase 1 (MVP)

| Operation | JSON Syntax | Notes |
|-----------|-------------|-------|
| **Filter** | `{ "filter": "expression" }` | Keep rows matching condition |
| **Select** | `{ "select": ["col1", "col2"] }` | Keep only listed columns |
| **Remove** | `{ "remove": ["col1"] }` | Drop listed columns |
| **Rename** | `{ "rename": { "old": "new" } }` | Rename columns |
| **Sort** | `{ "sort": { "field": "col", "order": "ascending" } }` | Single or multi-field |
| **Derive** | `{ "derive": { "newCol": "expression" } }` | Add calculated column |
| **Fill missing** | `{ "fillna": { "col": value } }` | Replace nulls/empty |
| **Drop missing** | `{ "dropna": { "columns": ["col"] } }` | Remove rows with nulls |
| **Find/replace** | `{ "replace": { "column": "col", "find": "x", "replace": "y" } }` | Text replacement |
| **Group + Aggregate** | See below | Basic aggregation |

#### Group + Aggregate (Phase 1 — Single Output)

```json
{
  "aggregate": {
    "groupby": ["region"],
    "operations": [
      { "op": "sum", "field": "sales", "as": "total_sales" },
      { "op": "mean", "field": "profit", "as": "avg_profit" },
      { "op": "count", "as": "row_count" }
    ]
  }
}
```

Supported aggregation operations:
`count`, `sum`, `mean`, `median`, `min`, `max`, `stdev`, `variance`

### 5.2 Phase 2 (Derived Datasets & Joins)

| Operation | JSON Syntax | Notes |
|-----------|-------------|-------|
| **Create derived model** | UI action, not a transform | Reference existing model, add transforms |
| **Lookup/Join** | `{ "join": { ... } }` | Combine datasets |

#### Join Specification

```json
{
  "join": {
    "model": "model_abc123",
    "left_on": ["region_id"],
    "right_on": ["id"],
    "type": "left",
    "select": ["region_name", "population"]
  }
}
```

Join types: `left`, `inner`

### 5.3 Phase 3 (Advanced Transforms & Polish)

| Operation | JSON Syntax | Notes |
|-----------|-------------|-------|
| **Pivot** | `{ "pivot": { "rows": "col", "columns": "col", "values": "col" } }` | Long → wide |
| **Unpivot** | `{ "unpivot": { "columns": ["a", "b"], "as": ["key", "value"] } }` | Wide → long |
| **Split column** | `{ "split": { "column": "col", "delimiter": ",", "as": ["a", "b"] } }` | Split into multiple |
| **Merge columns** | `{ "concat": { "columns": ["a", "b"], "separator": " ", "as": "full" } }` | Combine columns |
| **Cast type** | `{ "cast": { "column": "col", "type": "number" } }` | Explicit type conversion |

---

## 6. User Interface

### 6.1 Main Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ☆ Chumak                 [Import CSV]  [Export ▼]  [Workflow ▼] │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│   Sources &    │              Data Preview                       │
│    Models      │         (table, 100 rows, paginated)            │
│   (tree view)  │                                                 │
│                │                                                 │
│ ───────────────│                                                 │
│                │                                                 │
│   Applied      ├─────────────────────────────────────────────────┤
│    Steps       │                                                 │
│   (list)       │         Add Transform Panel                     │
│                │      (contextual form/buttons)                  │
│  [+ Add Step]  │                                                 │
│                │                                                 │
├────────────────┴─────────────────────────────────────────────────┤
│   [View JSON]  (collapsible bottom panel, read-only)             │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Panel Behaviors (✅ Implemented)

**Sources & Models Panel**
- Tree view with clickable sources/models to switch active model

**Steps Panel** (with Steps/JSON tabs)
- Click step → view intermediate result (on-demand recomputation)
- Hover → delete button (×) appears (except import step)
- "View final result" button shown when viewing intermediate steps
- JSON tab shows transform array

**Data Preview**
- Shows first 100 rows with pagination controls
- Displays current data state (final or intermediate)

**Transform Buttons** (ribbon toolbar)
- Context-sensitive buttons grouped by tab (Data, Transform, Add Column, etc.)
- Disabled buttons shown for unimplemented transforms

### 6.3 File Handling (✅ Implemented)

| Action | Status |
|--------|--------|
| **Import CSV** | ✅ File picker + drag-drop → Config dialog → Creates Source |
| **Export CSV** | ✅ Downloads transformed data with timestamp |
| **Export workflow JSON** | ✅ Downloads workflow specification |
| Import from URL | Phase 2 |
| Import workflow JSON | Phase 2 |

**CSV Import Dialog** (✅ implemented):
- Preview of first 5 rows
- Header mode: first-row (default), auto-generate, manual
- Delimiter selection: comma, tab, semicolon
- Editable column names (for first-row and manual modes)

| Mode | First Row | Column Names | Use Case |
|------|-----------|--------------|----------|
| **First row contains headers** | Used as column names | From row 1 | Standard CSV with header row |
| **Auto-generate** | Treated as data | "Column 1", "Column 2", ... | CSV without headers |
| **Specify manually** | Treated as data | User-provided names | Custom naming before import |

**Configuration stored in Source metadata:**
```typescript
{
  headerMode: "first-row" | "auto-generate" | "manual",
  delimiter: "," | "\t" | ";" | string,
  customHeaders?: string[]  // Only if headerMode === "manual"
}
```

This is **source configuration**, not a transformation. Once imported, column names are fixed (can be renamed via transform).

---

## 7. Persistence & Storage

### 7.1 Auto-Save

- Workflow saved to IndexedDB on every change
- Debounced (500ms after last change)
- No explicit "Save" button needed

### 7.2 IndexedDB Schema

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

### 7.3 Storage Limits

- Warn user if IndexedDB usage exceeds 50MB
- Offer to clear old workflows

### 7.4 Export Formats

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

## 8. Phased Roadmap

### Phase 0 — Walking Skeleton (Architecture Validation) ✅ COMPLETE

**Goal:** Minimal end-to-end implementation that exercises all architectural layers with one complete path through the system. Proves the architecture works before building on it.

**Status:** ✅ Complete

| Component | Implemented |
|-----------|-------------|
| Expression parser | ✅ jsep integration, AST validation with operator/column whitelisting, safe AST interpretation, error formatting with position highlighting |
| Transforms | ✅ **filter** (with compound expressions), **select** |
| UI | ✅ Filter dialog with live validation, Select dialog, data preview |
| Export | ✅ CSV export, workflow JSON export/import |
| Persistence | ✅ IndexedDB with auto-save (added during implementation) |
| Testing | ✅ Manual testing complete |

**Success criteria (all met):**
- ✅ Can import CSV file
- ✅ Can filter with expressions: `sales > 1000`, `region == "North"`, `sales > 1000 && region == "North"`
- ✅ Can select subset of columns
- ✅ Can export filtered+selected data as CSV
- ✅ Can export workflow as JSON and reimport to replay transformations
- ✅ See error message for invalid expressions (e.g., `sales > missing_column`)
- ✅ Data persists across page reloads (IndexedDB)

**Implementation discoveries:**
- jsep parses `&&` and `||` as `BinaryExpression` (not `LogicalExpression` as ESTree spec suggests)
- Arquero's `.filter()` rejects try-catch blocks; workaround: convert to array, filter, convert back
- IndexedDB structured clone requires JSON serialization; embedded data in sources/models (tech debt for Phase 1)

**Implementation complete:**
- Expression parser layer (expression-parser.js, ast-validator.js, ast-interpreter.js, error-formatter.js)
- Transform engine with filter & select (transforms.js)
- Storage with IndexedDB auto-save (storage.js)
- Step navigation & removal
- UI integration in `index.html` and `chumak-app.js`

**Key features working:**
- ✅ CSV import with configuration dialog
- ✅ Filter transform (with `&&`, `||`, comparisons)
- ✅ Select transform (column selection)
- ✅ View intermediate results (click any step)
- ✅ Remove steps with recomputation
- ✅ Export CSV and workflow JSON
- ✅ Data persistence across reloads

**Deferred to Phase 1:**
- Remaining transforms (derive, sort, rename, remove, aggregate, fillna, dropna, replace)
- Enhanced parser (bracket notation, error suggestions)
- Predicate object GUI builder (optional)

---

### Phase 1 — MVP (In Progress)

**Goal:** Complete core transform set, add automated testing.

| Component | Status |
|-----------|--------|
| **Data import** | ✅ CSV from file (with config dialog) |
| **Transforms** | ✅ filter, select / ⏳ derive, sort, rename, remove, aggregate, fillna, dropna, replace |
| **Expression parser** | ✅ Basic operators, security validation / ⏳ Bracket notation, error suggestions |
| **UI** | ✅ Full layout, step navigation, dialogs / ⏳ Remaining transform dialogs |
| **Persistence** | ✅ IndexedDB auto-save / ⏳ Workflow import |
| **Export** | ✅ CSV, workflow JSON |
| **Testing** | ✅ Comprehensive test infrastructure (Mocha + Chai) with high coverage |

**Priorities:** Remaining transforms → Enhanced parser → Predicate builder (optional)

### Phase 2 — Derived Datasets

**Goal:** Support relational modeling, joins, expression functions.

| Component | Scope |
|-----------|-------|
| Multiple sources | Load several CSVs in one workflow |
| Derived models | Create model referencing another model |
| Joins | Left join, inner join between models |
| Expression functions | Whitelist safe functions (Math.*, String.*, Date.*), ternary operator |
| UI updates | Tree view for sources/models, join builder |
| Testing | Join tests, multi-source workflow tests, function tests |

### Phase 3 — Polish & Advanced

**Goal:** Feature completeness, UX refinement.

| Component | Scope |
|-----------|-------|
| Transforms | pivot, unpivot, split, concat, cast |
| UI | Drag-reorder steps, column quick actions, keyboard shortcuts |
| Progressive disclosure | Collapsible advanced options in forms |
| Performance | Web Worker for large files, smarter caching |
| Testing | Larger file sizes (50MB+) |
| Testing | Performance benchmarks, CI integration |

---

## 9. Explicit Non-Goals

The following are **out of scope** for the foreseeable future:

- User accounts or authentication
- Server-side processing
- Real-time collaboration
- Charts or visualization (may reconsider later)
- Python/R/SQL code export
- Mobile-optimized UI
- Support for Excel files (.xlsx)
- Browser support beyond Chrome/Safari

---

## 10. Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| ~~Expression syntax~~ | ✅ **Resolved** | Use bare identifiers with bracket escape. See PARSER-DESIGN-DECISION.md |
| ~~Error handling~~ | ✅ **Resolved** | Position-aware errors with suggestions. See PARSER-DESIGN-DECISION.md |
| Large file UX | Open | Stream parsing with progress bar? Or reject files over limit? |
| Step descriptions | Open | Auto-generated, user-editable, or both? |
| Undo granularity | Open | Is step-level revert sufficient, or need finer undo? |
| Visual identity | Open | Logo, color scheme — star/navigation theme? |

---

## 11. Appendix: Expression Syntax

> **Note**: Full parser design details in [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md)

### Design Approach

Chumak uses a **dual-mode input system**:

1. **Structured predicates** (Primary) - GUI-driven, type-safe filter builder
2. **Expression strings** (Advanced) - Text-based expressions for power users

**Parser**: jsep library for expression strings, with AST validation and interpretation (no Function() constructor for security).

### Structured Predicates (Primary API)

```json
// Field predicates
{ "filter": { "field": "sales", "gt": 1000 } }
{ "filter": { "field": "region", "equal": "North" } }

// Logical composition
{
  "filter": {
    "and": [
      { "field": "sales", "gt": 1000 },
      { "field": "region", "equal": "North" }
    ]
  }
}
```

**Benefits**: No syntax errors, type-safe, beginner-friendly, maps to GUI forms.

### Expression Strings (Advanced Mode)

```javascript
// Comparisons
sales > 1000
region == "North"
profit != 0

// Boolean (JavaScript operators)
sales > 1000 && region == "North"
status == "active" || status == "pending"
!cancelled

// Arithmetic (in derive)
revenue - cost
price * quantity
(revenue - cost) / revenue * 100
```

**Note**: Boolean operators are `&&`, `||`, `!` (JavaScript standard), not `and`, `or`, `not`.

### Column References

**Simple names** (bare identifiers):
```javascript
sales > 1000
revenue - cost
```

**Spaces/special characters** (bracket notation):
```javascript
[Total Sales] > 1000
[Q1 Revenue] - [Q1 Cost]
[price-usd] * 1.1
```

### Phase 1 Operators

**Allowed**:
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`
- Logical: `&&`, `||`, `!`
- Grouping: `(`, `)`

**Not allowed** (Phase 1):
- Function calls (added in Phase 2)
- Ternary operator `? :` (added in Phase 2)
- Bitwise operators
- Assignment operators

### Error Handling

**User-friendly error messages with position highlighting**:

```
Column 'Slaes' not found
 region == "North" && Slaes > 1000
                       ↑
Did you mean 'Sales'?
Available columns: Region, Sales, Revenue, Cost
```

**Errors as values**: Individual row failures don't break entire column transformation.

### Security Model

- **No Function() constructor** - expressions parsed and interpreted via AST
- **Operator whitelist** - only safe operators allowed
- **Column validation** - unknown columns rejected at parse time
- **No property access** - can't access window, document, localStorage, etc.

---

## 12. Appendix: Branding Notes

**Name:** Chumak (Чумак)

**Story:** Ukrainian traders who navigated by the stars, transforming raw goods (salt, fish) into traded wealth along routes guided by the Milky Way — *Chumatskyi Shliakh*.

**Potential visual motifs:**
- Stylized Milky Way arc
- Salt crystal / wagon wheel
- Star as accent mark
- Cyrillic Ч (Che) as logo element

**Tone:** Practical, trustworthy, quietly cultural — a tool that gets the job done, with a story behind it.

## 13. Testing Strategy

### 13.1 Philosophy

- **Test-first always** — MANDATORY: write tests before implementing new features
- **Every transform operation has tests** — the core logic must be reliable
- **Tests run in browser** — consistent with no-build-system constraint
- **Tests are part of the repo** — anyone can run them by opening a file
- **90%+ coverage maintained** — especially for transform compiler and expression parser

### 13.2 Testing Stack ✅ IMPLEMENTED

**Current status: Comprehensive test suite with high coverage**

CDN-loaded stack (no build required):

```html
<!-- Test runner (Mocha + Chai) -->
<script src="https://unpkg.com/mocha@10.2.0/mocha.js"></script>
<script src="https://unpkg.com/chai@4.3.10/chai.js"></script>
```

**Implemented test structure:**
```
/chumak
├── index.html                        # Main app
└── src/
    ├── tests/                        # ✅ Test suite
    │   ├── runner.html               # ✅ Test runner (open in browser)
    │   ├── expression-parser.test.js # ✅ Expression parsing tests
    │   ├── ast-validator.test.js     # ✅ Security validation tests
    │   ├── ast-interpreter.test.js   # ✅ AST interpretation tests
    │   └── transforms.test.js        # ✅ Transform engine tests
    ├── expression-parser.js          # Parser implementation
    ├── ast-validator.js              # Validator implementation
    ├── ast-interpreter.js            # Interpreter implementation
    └── transforms.js                 # Transform implementation
```

**To run tests:** Open `src/tests/runner.html` in browser

### 13.3 Test Categories

#### Unit Tests (Priority: Critical)

| Area | What to Test | Example |
|------|--------------|---------|
| **Transform compiler** | Each transform type produces correct Arquero output | `filter` with `sales > 1000` keeps only matching rows |
| **Expression parser** | Expressions compile to valid Arquero syntax | `revenue - cost` → `d => d.revenue - d.cost` |
| **Column reference handling** | Bracket notation, special characters | `[Total Sales]` → `d["Total Sales"]` |
| **Type inference** | Correct types detected from CSV data | `"123"` → number, `"2025-01-01"` → date |
| **Aggregation operations** | All ops (sum, mean, etc.) work correctly | `sum` of `[1,2,3]` → `6` |
| **Edge cases** | Empty data, missing values, single row | Filter that removes all rows → empty table |

#### Integration Tests (Priority: High)

| Area | What to Test | Example |
|------|--------------|---------|
| **CSV parsing → Transform → Export** | Full pipeline roundtrip | Load CSV, apply 3 transforms, export, verify output |
| **Step snapshots** | Snapshots cached correctly at each step | Add 3 steps, click step 2, see correct preview |
| **Workflow save/load** | IndexedDB persistence works | Create workflow, refresh page, workflow restored |
| **Workflow export/import** | `.chumak.json` roundtrip | Export workflow, clear storage, import, identical state |

#### UI Tests (Priority: Medium)

| Area | What to Test | Example |
|------|--------------|---------|
| **File import** | Drag-drop and file picker work | Drop CSV, table appears |
| **Transform forms** | Forms generate correct JSON | Fill filter form, correct transform added |
| **Step interaction** | Click, revert, delete work | Click step shows snapshot; revert removes subsequent |
| **JSON viewer** | Displays current transforms | Add steps, JSON panel shows them |

### 13.4 Test Coverage Targets

| Phase | Coverage Target | Focus |
|-------|-----------------|-------|
| Phase 1 | High coverage for transform compiler | Every transform type, expression edge cases |
| Phase 1 | High coverage for persistence | Save, load, export, import |
| Phase 2 | High coverage for joins | Join types, key matching, edge cases |
| Phase 3 | Maintain coverage | New transforms tested before merge |

### 13.5 Test Data

Maintain a set of fixture files:

```
/tests/fixtures/
├── simple.csv              # 10 rows, clean data
├── types.csv               # Mixed types for inference testing
├── missing.csv             # Nulls, empty strings
├── special-chars.csv       # Column names with spaces, quotes
├── large.csv               # 10k rows for performance tests
└── unicode.csv             # Non-ASCII content, UTF-8
```

### 13.6 Test Patterns

#### Transform Test Pattern

```javascript
describe('filter transform', () => {
  it('keeps rows matching simple comparison', () => {
    const input = aq.table({
      sales: [100, 500, 1500, 2000],
      region: ['North', 'South', 'North', 'East']
    });
    
    const transform = { filter: 'sales > 1000' };
    const result = applyTransform(input, transform);
    
    expect(result.numRows()).to.equal(2);
    expect(result.array('sales')).to.deep.equal([1500, 2000]);
  });

  it('handles string equality', () => {
    const input = aq.table({
      region: ['North', 'South', 'North']
    });
    
    const transform = { filter: 'region == "North"' };
    const result = applyTransform(input, transform);
    
    expect(result.numRows()).to.equal(2);
  });

  it('returns empty table when no rows match', () => {
    const input = aq.table({ sales: [1, 2, 3] });
    
    const transform = { filter: 'sales > 1000' };
    const result = applyTransform(input, transform);
    
    expect(result.numRows()).to.equal(0);
  });

  it('handles column names with spaces', () => {
    const input = aq.table({ 'Total Sales': [100, 2000] });
    
    const transform = { filter: '[Total Sales] > 500' };
    const result = applyTransform(input, transform);
    
    expect(result.numRows()).to.equal(1);
  });
});
```

#### Workflow Roundtrip Test Pattern

```javascript
describe('workflow persistence', () => {
  it('survives export/import roundtrip', async () => {
    // Create workflow
    const workflow = createWorkflow('Test');
    await addSource(workflow, 'test.csv', testData);
    await addTransform(workflow.models[0], { filter: 'x > 1' });
    
    // Export
    const exported = exportWorkflow(workflow);
    const json = JSON.stringify(exported);
    
    // Import
    const imported = JSON.parse(json);
    const restored = await importWorkflow(imported, { testData });
    
    // Verify
    expect(restored.models[0].transforms).to.deep.equal(
      workflow.models[0].transforms
    );
  });
});
```

### 13.7 Running Tests

#### Development

Open `/tests/runner.html` in browser. Tests run automatically, results displayed on page.

#### CI (Optional, Future)

If GitHub Actions added later:

```yaml
# .github/workflows/test.yml
- uses: browser-actions/setup-chrome@latest
- run: npx serve . &
- run: npx mocha-headless-chrome -f http://localhost:3000/tests/runner.html
```

### 13.8 Test-Driven Development Workflow

For each new transform:

1. **Write test first** — define expected input/output
2. **Run test** — confirm it fails
3. **Implement transform** — minimal code to pass
4. **Add edge case tests** — empty data, missing values, special characters
5. **Refactor if needed** — tests ensure no regression
6. **Update JSON schema** — document the transform format
