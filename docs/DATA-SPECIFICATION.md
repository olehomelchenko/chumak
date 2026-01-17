# Chumak — Data Specification

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[FUTURE-PROOFING.md](FUTURE-PROOFING.md)**: Schema evolution and compatibility constraints

This document describes how data is structured, stored, and serialized in Chumak.

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
}
```

### 1.3 DataRow

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

### 2.3 Type Inference

Types are inferred from sample data (first 20 rows) using pattern matching:

1. **Boolean**: All values are `true` or `false`
2. **Integer**: All values are whole numbers
3. **Float**: All values are numbers with decimals
4. **DateTime**: Matches `YYYY-MM-DDTHH:MM:SS` or `YYYY-MM-DD HH:MM:SS`
5. **Date**: Matches `YYYY-MM-DD`, `YYYY/MM/DD`, or `MM/DD/YYYY`
6. **String**: Default fallback

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
  replace?: { column: string; find: any; replace: any };
  types?: Record<string, ColumnType>;
  addIndex?: { columnName: string; startFrom?: number };

  // Reshape operations
  aggregate?: { groupby: string[]; rollup: Record<string, string> };
  fold?: { columns: string[]; as: [string, string] };
  pivot?: { rows?: string[]; keys: string; values: string; aggregation: string; options?: {...} };
  split?: { column: string; mode: string; delimiter: string; ... };

  // Multi-model operations
  join?: { right: string; on: [string, string][]; how: string; suffixes?: [string, string] };
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
| Logical         | `&&`, `\|\|`, `!`                              |
| Null coalescing | `??`                                           |
| Conditional     | `condition ? trueValue : falseValue`           |

### 4.3 Functions

**String functions:**

- `upper(s)`, `lower(s)`, `trim(s)`
- `substring(s, start, length?)`, `len(s)`

**Math functions:**

- `abs(n)`, `round(n, decimals?)`, `floor(n)`, `ceil(n)`
- `min(a, b, ...)`, `max(a, b, ...)`
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

**Database name:** `chumak-db`
**Version:** `1`

### 5.2 localStorage

| Key               | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `chumak-settings` | User preferences (theme, performance settings) |

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
  "version": "1.0",
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
