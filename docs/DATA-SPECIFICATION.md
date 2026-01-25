# Syto — Data Specification

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md)**: How to add transforms, testing, state management
> - **[FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md)**: Auto-generated function documentation system
> - **[FUTURE-PROOFING.md](FUTURE-PROOFING.md)**: Schema evolution and compatibility constraints
> - **[TRANSFORM-ARCHITECTURE-REVIEW.md](TRANSFORM-ARCHITECTURE-REVIEW.md)**: Transform design analysis, gaps, and proposed additions

This document describes how data is structured, stored, and serialized in Syto.

---

## 1. Core Data Structures

### 1.1 Source

A **Source** represents imported raw data before any transformations.

```typescript
interface Source {
  id: string; // Unique identifier (e.g., "src_abc123")
  name: string; // Display name
  fileName?: string; // Original filename if imported from file
  columns: ColumnSchema[]; // Column definitions with types
  data: DataRow[]; // Array of row objects
  headerMode: 'first-row' | 'auto-generate' | 'manual';
  delimiter: string; // CSV delimiter used
  customHeaders: string[] | null;
  origin: string; // Import source (file, clipboard, url)
  schema?: ColumnSchema[]; // Duplicate of columns (legacy)
  rawSize?: number; // Original file size in bytes
  rowCount?: number; // Number of rows
  createdAt?: string; // ISO timestamp
  comment?: string; // User-provided comment/notes about the dataset
}
```

### 1.2 Model

A **Model** represents a transformation pipeline applied to a Source.

```typescript
interface Model {
  id: string; // Unique identifier (e.g., "mdl_xyz789")
  name: string; // Display name
  sourceId: string; // Reference to parent Source.id
  steps: TransformStep[]; // Ordered transformation pipeline
  schema: ColumnSchema[]; // Current column definitions (after transforms)
  data: DataRow[]; // Computed result data
  stats?: EDAStats | null; // Cached EDA statistics for selected column
  isStale?: boolean; // True if a dependency changed but model not yet recomputed
  comment?: string; // User-provided comment/notes about the model
}
```

### 1.3 Non-Destructive Data Model

Syto employs a non-destructive data model where the **Source** (raw data) is immutable. Any transformation applied by the user is stored as a `TransformStep` within a **Model**.

This architecture ensures:

- **Zero Data Loss**: The original dataset is never modified or overwritten.
- **Full Traceability**: Every change is a discrete, inspectable step in a pipeline.
- **State Reversal**: Users can "roll back" by removing steps or editing previous ones, causing the model to recompute from the original source.

### 1.4 DataRow

A **DataRow** is a generic object representing one row of tabular data.

```typescript
type DataRow = Record<string, any>;

// Example:
{ "name": "Alice", "age": 30, "active": true }
```

---

## 2. Column Schema

### 2.1 ColumnSchema Interface

```typescript
interface ColumnSchema {
  name: string; // Column name
  type: ColumnType; // Inferred or assigned type
  format?: Record<string, any>; // Reserved for future metadata
  originalPosition?: number; // Column order from import
}
```

### 2.2 Column Types

```typescript
type ColumnType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime';
```

| Type       | Description       | Example Values           |
| ---------- | ----------------- | ------------------------ |
| `string`   | Text data         | `"hello"`, `"Product A"` |
| `integer`  | Whole numbers     | `42`, `-7`, `0`          |
| `float`    | Decimal numbers   | `3.14`, `-0.5`           |
| `boolean`  | True/false        | `true`, `false`          |
| `date`     | Date without time | `"2024-01-15"`           |
| `datetime` | Date with time    | `"2024-01-15T10:30:00"`  |

### 2.3 Type System: Physical vs Logical Types

Syto distinguishes between **physical types** (what the parser returns) and **logical types** (what's used for data wrangling).

#### 2.3.1 Physical Types (Import Types)

When a dataset is imported, **physical types** are extracted based on what the parser returns:

- **Source**: PapaParse with `dynamicTyping: true` (CSV) or `JSON.parse` (JSON)
- **Sample size**: First **20 rows** of each column
- **Implementation**: `SchemaEngine.createPhysicalSchema()`
- **Result**: Stored in `Source.columns` as `ColumnSchema[]`
- **UI Label**: "Import Types" in Dataset Info View

**Physical Type Detection:**

For CSV with `dynamicTyping: true`:

- JavaScript `number` → `integer` or `float` (based on `Number.isInteger()`)
- JavaScript `boolean` → `boolean`
- Everything else (including date strings like `"2024-01-15"`) → `string`

For JSON:

- JavaScript `number` → `integer` or `float`
- JavaScript `boolean` → `boolean`
- JavaScript `string` → `string`
- `null`/`undefined` → `string` (fallback)

**Key Point**: Physical types reflect what PapaParse/JSON.parse gives us after `dynamicTyping`. **No pattern-based inference** is applied at the dataset level. Dates remain as strings because CSV/JSON formats don't have native date types.

#### 2.3.2 Logical Types (Data Types)

When a model is created from a dataset, **logical types** are inferred from the data:

- **Timing**: First `types` transform step in the model pipeline
- **Sample size**: First **20 rows** of each column
- **Implementation**: `SchemaEngine.inferType()` (see algorithm below)
- **Result**: Stored in model's first `types` step, then propagated to `Model.schema`
- **UI Label**: "Data Types" in Model Info View

**This is where type inference happens** - pattern matching converts:

- String `"2024-01-15"` → logical type `date`
- String `"123"` → logical type `integer`
- String `"true"` → remains `string` (unless it's already a boolean from `dynamicTyping`)

#### 2.3.3 Transform Propagation

When transforms are applied, schema is recalculated:

- **Sample size**: Up to **100 rows** of result data
- **Implementation**: `SchemaEngine.deriveNextSchema()`
- **Triggers**:
  - New columns created (e.g., `derive`, `split`)
  - Aggregation operations change types
  - User applies `types` transform with explicit type assignments
- **Result**: Updated `Model.schema`

#### 2.3.4 Auto-Detect Feature

The "Auto-Detect Types" button re-infers logical types for all columns in current model view:

- **Sample size**: First **50 rows**
- **Implementation**: `autoDetectSchema()` handler
- **Effect**: Creates a new `types` transform step with re-inferred logical types

#### 2.3.5 Logical Type Inference Algorithm

Types are inferred using pattern matching with the following priority order:

1. **Boolean**: All non-null values are JavaScript `boolean` type (`true` or `false`)
2. **Integer**: All non-null values are JavaScript `number` type and are whole numbers
3. **Float**: All non-null values are JavaScript `number` type (includes decimals)
4. **Numeric Strings**: All non-null values are strings that parse cleanly as numbers (e.g., `"123"`, `"45.67"`)
   - Trimmed and validated with `Number()`, excluding `NaN` and `Infinity`
   - Returns `integer` if all parse as whole numbers, `float` otherwise
5. **DateTime**: All non-null string values match regex:
   - ISO format: `YYYY-MM-DDTHH:MM:SS...`
   - SQL format: `YYYY-MM-DD HH:MM:SS...`
6. **Date**: All non-null string values match one of:
   - ISO format: `YYYY-MM-DD` or `YYYY/MM/DD`
   - American format: `MM/DD/YYYY` or `M/D/YYYY`
7. **String**: Default fallback for all other cases

**Null handling**: `null`, `undefined`, and empty strings (`""`) are excluded from pattern matching during inference.

#### 2.3.6 Type Conversion

When a `types` transform is applied, values are converted to the target logical type:

- **Implementation**: `convertType()` in `type-converter.ts`
- **Error handling**: Failed conversions create error objects (Power Query-style) rather than throwing exceptions
- **Null/empty strings**: Handled intelligently per target type
  - Dates: convert to `null`
  - Numbers: create error object for empty strings
  - Strings: preserve as-is
- **Examples**:
  - String `"123"` → Integer `123`
  - String `"true"` → Boolean `true`
  - String `"2024-01-15"` → Date object
  - String `"abc"` → Integer conversion error object

#### 2.3.7 Type System Summary

**Clear separation between physical and logical types:**

| Aspect           | Physical Types (Datasets)           | Logical Types (Models)                  |
| ---------------- | ----------------------------------- | --------------------------------------- |
| **What**         | Parser output after `dynamicTyping` | Inferred types for data wrangling       |
| **When**         | During CSV/JSON import              | In model's first `types` step           |
| **How**          | JavaScript type detection           | Pattern matching (dates, numbers, etc.) |
| **Where Stored** | `Source.columns`                    | `Model.schema` (via `types` step)       |
| **UI Label**     | "Import Types"                      | "Data Types"                            |
| **Example**      | `"2024-01-15"` → `string`           | `"2024-01-15"` → `date`                 |

**Why this separation matters:**

1. **Clarity**: Datasets show what was actually imported (physical reality)
2. **Provenance**: You can see the raw data types before inference
3. **Flexibility**: Type inference decisions are visible and modifiable in the model's first step
4. **Correctness**: CSV/JSON truly don't have date types - now this is represented accurately

**Data Flow:**

```
CSV File → PapaParse (dynamicTyping) → Physical Types (dataset) →
Inference → Logical Types (model's first types step) → Data Wrangling
```

---

## 3. Transform Steps

### 3.1 TransformStep Interface

Each step in a pipeline is a single-key object. Only one transform type per step.

```typescript
interface TransformStep {
  // Column operations
  select?: string[];
  remove?: string[];
  rename?: Record<string, string>;

  // Row operations
  filter?: string;                    // Expression string
  sort?: { field: string; order: 'asc' | 'desc' };
  dedupe?: { columns?: string[]; mode?: 'remove' | 'keep' };
  sliceRows?: { count: number; mode: 'first' | 'last' | 'removeFirst' | 'removeLast' };

  // Value operations
  derive?: Record<string, string>;    // column -> expression
  replace?: { column: string; find: any; replace: any; isRegex?: boolean };
  types?: Record<string, ColumnType>;
  addIndex?: { columnName: string; startFrom?: number };

  // Reshape operations
  aggregate?: { groupby: string[]; rollup: Record<string, string> };
  fold?: { columns: string[]; as: [string, string] };
  pivot?: { rows?: string[]; keys: string; values: string; aggregation: string; options?: {...} };
  split?: { column: string; mode: string; delimiter: string; ... };

  // Multi-model operations
  join?: { right: string; on: [string, string][]; how: string; suffixes?: [string, string] };
  concat?: { with: string };
  union?: { with: string };

  // Advanced operations
  impute?: { column: string; strategy: string; value?: any };
}
```

### 3.2 Transform Examples

**Filter** — Keep rows matching expression:

```json
{ "filter": "sales > 1000 && region == 'North'" }
```

**Derive** — Add calculated columns:

```json
{ "derive": { "profit": "revenue - cost", "margin": "profit / revenue * 100" } }
```

**Replace** — Replace values in a column:

```json
{ "replace": { "column": "status", "find": "active", "replace": "ACTIVE" } }
```

With regex pattern (e.g., format phone numbers):

```json
{
  "replace": {
    "column": "phone",
    "find": "(\\d{3})-(\\d{4})",
    "replace": "($1) $2",
    "isRegex": true
  }
}
```

**Aggregate** — Group and summarize:

```json
{
  "aggregate": {
    "groupby": ["region", "category"],
    "rollup": {
      "total_sales": "op.sum('sales')",
      "avg_price": "op.mean('price')",
      "count": "op.count()"
    }
  }
}
```

**Join** — Combine with another model:

```json
{
  "join": {
    "right": "mdl_customers",
    "on": [["customer_id", "id"]],
    "how": "left",
    "suffixes": ["", "_customer"]
  }
}
```

**Concat** — Stack rows from another model/source (keeps duplicates):

```json
{
  "concat": {
    "with": "mdl_monthly_data"
  }
}
```

**Union** — Stack rows from another model/source (removes duplicates):

```json
{
  "union": {
    "with": "mdl_other_table"
  }
}
```

**Pivot** — Long to wide:

```json
{
  "pivot": {
    "rows": ["product"],
    "keys": "month",
    "values": "sales",
    "aggregation": "sum"
  }
}
```

**Fold** — Wide to long (unpivot):

```json
{
  "fold": {
    "columns": ["jan", "feb", "mar"],
    "as": ["month", "sales"]
  }
}
```

**Impute** — Fill missing values:

```json
{
  "impute": {
    "column": "sales",
    "strategy": "mean"
  }
}
```

**Merge** — Concatenate multiple columns with a separator:

The merge operation is implemented using the `derive` transform (and optionally `remove`). It's not a separate transform type, but a UI convenience that generates the appropriate derive expression.

Example: Merging `first_name` and `last_name` with a space separator creates:

```json
{
  "derive": {
    "full_name": "(first_name ?? \"\") + \" \" + (last_name ?? \"\")"
  }
}
```

If "Remove original columns" is selected, a second step is added:

```json
{
  "remove": ["first_name", "last_name"]
}
```

**Null handling:** The merge operation uses the nullish coalescing operator (`??`) to convert null values to empty strings before concatenation. This ensures that `null` values don't break the concatenation.

**Column name escaping:** Columns with special characters or spaces use bracket notation: `[Column Name]`

**Examples:**

- No separator: `"(col1 ?? \"\") + (col2 ?? \"\")"`
- Space separator: `"(col1 ?? \"\") + \" \" + (col2 ?? \"\")"`
- Comma separator: `"(col1 ?? \"\") + \", \" + (col2 ?? \"\")"`
- Single column: `"(col1 ?? \"\")"`

---

## 4. Expression Syntax

Expressions are used in `filter` and `derive` transforms.

### 4.1 Column References

- Simple names: `sales`, `revenue`
- Names with spaces: `[Product Name]`, `[Total Sales]`

### 4.2 Operators

| Category        | Operators                                      |
| --------------- | ---------------------------------------------- |
| Arithmetic      | `+`, `-`, `*`, `/`, `%`                        |
| Comparison      | `>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==` |
| Logical         | `and` / `&&`, `or` / `\|\|`, `not` / `!`       |
| Null coalescing | `??`                                           |
| Conditional     | `condition ? trueValue : falseValue`           |

> **Note:** Word-form operators (`and`, `or`, `not`) are beginner-friendly alternatives to the symbolic operators (`&&`, `||`, `!`). Both syntaxes are fully supported.

### 4.3 Functions

> **Complete Function Reference**: See [FUNCTION-DOCS-SYSTEM.md](FUNCTION-DOCS-SYSTEM.md) for auto-generated documentation with examples, parameters, and return values. The function reference dialog is accessible via Help → "Expression Reference" in the UI.

**String functions:**

- `upper(s)`, `lower(s)`, `trim(s)`
- `substring(s, start, length?)`, `len(s)`

**Math functions:**

- `abs(n)`, `round(n, decimals?)`, `floor(n)`, `ceil(n)`
- `min(a, b, ...)`, `max(a, b, ...)`
- `pow(base, exponent)`, `sqrt(n)`, `cbrt(n)`, `exp(n)`, `ln(n)`, `log10(n)`, `log2(n)`
- `sin(n)`, `cos(n)`, `tan(n)`, `asin(n)`, `acos(n)`, `atan(n)`, `atan2(y, x)`
- `radians(n)`, `degrees(n)`, `sign(n)`, `trunc(n)`, `pi()`, `e()`
- `parse_int(s)`, `parse_float(s)`, `is_nan(n)`

**Date functions:**

- `year(d)`, `month(d)`, `day(d)`, `hour(d)`, `minute(d)`, `second(d)`
- `weekday(d)`, `week(d)`, `quarter(d)`
- `today()`, `now()`
- `days_between(d1, d2)`, `date_add(d, amount, unit)`, `date_trunc(d, unit)`
- `format_date(d, format)`

**Regex functions:**

- `regexp_match(s, pattern)` — Returns boolean
- `regexp_extract(s, pattern, group?)` — Returns matched string
- `regexp_replace(s, pattern, replacement)` — Returns text with replacements (supports capture groups)

**JSON functions:**

- `is_json(s)` — Tests if string contains valid JSON
- `json_extract(s, path)` — Extracts value from JSON at dot-notation path

### 4.4 Aggregate Functions (in rollup)

Used in `aggregate.rollup` with Arquero syntax:

```
op.count()           — Count rows
op.sum('column')     — Sum values
op.mean('column')    — Average
op.median('column')  — Median
op.min('column')     — Minimum
op.max('column')     — Maximum
op.distinct('column') — Count unique values
op.first('column')   — First value in group
op.last('column')    — Last value in group
op.stdev('column')   — Standard deviation
op.variance('column') — Variance
```

---

## 5. Persistence

### 5.1 IndexedDB Structure

| Object Store | Key  | Contents                                   |
| ------------ | ---- | ------------------------------------------ |
| `sources`    | `id` | Full Source objects including data         |
| `models`     | `id` | Full Model objects including computed data |

**Database name:** `syto-db`
**Version:** `1`

### 5.2 localStorage

| Key             | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `syto-settings` | User preferences (theme, performance settings) |

### 5.3 URL Hash State

Format: `/#/sourceId/modelId` or `/#/page/section`

Examples:

- `/#/src_abc123/mdl_xyz789` — View specific model
- `/#/reference/filter` — View reference page

---

## 6. Workflow Export Format

Exported workflow JSON for sharing and replay:

```json
{
  "formatVersion": 1,
  "sytoVersion": "0.1.0",
  "name": "Sales Analysis",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "source": {
    "id": "src_abc123",
    "name": "sales_data.csv",
    "columns": [
      { "name": "region", "type": "string" },
      { "name": "sales", "type": "integer" },
      { "name": "date", "type": "date" }
    ]
  },
  "model": {
    "id": "mdl_xyz789",
    "name": "Filtered Sales",
    "steps": [
      { "filter": "sales > 1000" },
      { "derive": { "year": "year([date])" } },
      { "select": ["region", "year", "sales"] }
    ]
  }
}
```

**Note:** Workflow JSON contains only the pipeline definition, not the data. Data must be re-imported and pipeline replayed.

---

## 7. Error Objects

Type conversion failures produce error objects instead of null:

```typescript
interface ErrorValue {
  type: 'error';
  message: string; // e.g., "Cannot convert 'abc' to integer"
  original: any; // Original value that failed conversion
}
```

Error objects:

- Display as "Error" in the table (with warning icon)
- Are tracked separately from nulls in EDA statistics
- Are excluded from numeric calculations (mean, median, etc.)
- Implement `toString()` returning `"Error"`

---

## 8. EDA Statistics

Statistics calculated for column analysis:

```typescript
interface BaseStats {
  column: string;
  type: string;           // 'number', 'string', 'date', 'boolean'
  totalCount: number;
  nullCount: number;
  nullPercentage: string;
  errorCount: number;
  errorPercentage: string;
  uniqueCount: number;
  uniquePercentage: string;
}

// For numeric columns:
interface NumericStats extends BaseStats {
  min: string;
  max: string;
  mean: string;
  median: string;
  p25: string;           // 25th percentile
  p75: string;           // 75th percentile
  std: string;           // Standard deviation
  raw: { ... };          // Same values as numbers
}

// For categorical columns:
interface CategoricalStats extends BaseStats {
  topValues: Array<{
    value: string;
    count: number;
    percentage: string;
    isNull?: boolean;
    isError?: boolean;
    isOther?: boolean;   // Aggregated "other" category
  }>;
}
```

---

## 9. ID Generation

IDs are generated as random strings with prefixes:

| Entity | Prefix | Example        |
| ------ | ------ | -------------- |
| Source | `src_` | `src_a1b2c3d4` |
| Model  | `mdl_` | `mdl_x9y8z7w6` |

IDs are:

- Generated client-side using random alphanumeric strings
- Stable across sessions (stored in IndexedDB)
- Used for foreign key references (Model.sourceId, Join.right)

---

## 10. Data Flow

```
┌─────────────┐
│   Import    │  CSV, clipboard, URL
└──────┬──────┘
       ▼
┌─────────────┐
│   Source    │  Raw data + schema
└──────┬──────┘
       │ sourceId reference
       ▼
┌─────────────┐
│    Model    │  Pipeline + computed result
└──────┬──────┘
       │ steps[] array
       ▼
┌─────────────┐
│ Transform 1 │──▶ Intermediate result
├─────────────┤
│ Transform 2 │──▶ Intermediate result
├─────────────┤
│ Transform N │──▶ Final data + schema
└─────────────┘
       │
       ▼
┌─────────────┐
│   Export    │  CSV, JSON, Workflow JSON
└─────────────┘
```

Models are recomputed from Source through all steps whenever:

- A step is added, edited, or deleted
- The step order changes
- The user views an intermediate step

---

**End of Data Specification**
