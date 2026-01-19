# Syto Native (macOS) - Functional Specification

> **Purpose**: Complete functional specification for reimplementing Syto as a native macOS application with DuckDB + Parquet backend.

---

## 1. Core Architecture

### 1.1 Data Engine

| Component         | Browser Version  | Native Version             |
| ----------------- | ---------------- | -------------------------- |
| Query Engine      | Arquero (JS)     | DuckDB                     |
| Storage Format    | In-memory JSON   | Parquet files              |
| Expression Parser | jsep (JS)        | DuckDB SQL / Custom parser |
| Type System       | Custom inference | DuckDB native types        |

### 1.2 Fundamental Principles (Preserved)

1. **Declarative JSON Workflows** - All transformations represented as JSON
2. **Non-destructive Pipeline** - Original data unchanged; transforms are recorded steps
3. **Schema Propagation** - Types flow through pipeline, recomputed on each step
4. **No Raw Code Execution** - User expressions validated/whitelisted, never `eval()`

---

## 2. Data Types

### 2.1 Column Types

| Type       | Description       | DuckDB Mapping |
| ---------- | ----------------- | -------------- |
| `string`   | Text values       | `VARCHAR`      |
| `integer`  | Whole numbers     | `BIGINT`       |
| `float`    | Decimal numbers   | `DOUBLE`       |
| `boolean`  | True/false        | `BOOLEAN`      |
| `date`     | Date without time | `DATE`         |
| `datetime` | Date with time    | `TIMESTAMP`    |

### 2.2 Type Inference Rules

Priority order when auto-detecting column type:

1. **Boolean**: All non-null values are `true`/`false`
2. **Integer**: All values are whole numbers (no decimals)
3. **Float**: All values are numeric with decimals
4. **DateTime**: Strings match `YYYY-MM-DD[T ]HH:mm:ss`
5. **Date**: Strings match `YYYY-MM-DD`, `YYYY/MM/DD`, or `MM/DD/YYYY`
6. **String**: Default fallback

**Sampling**: First 1000 rows (configurable) for inference.

---

## 3. Transform Specifications

All transforms are JSON objects with a single key identifying the transform type.

### 3.1 Column Operations

#### SELECT - Keep Columns

```json
{
  "select": ["col1", "col2", "col3"]
}
```

- Keeps only specified columns in given order
- Non-existent columns are silently ignored

**DuckDB**: `SELECT col1, col2, col3 FROM table`

#### REMOVE - Drop Columns

```json
{
  "remove": ["col1", "col2"]
}
```

- Removes specified columns, keeps all others

**DuckDB**: `SELECT * EXCLUDE (col1, col2) FROM table`

#### RENAME - Rename Columns

```json
{
  "rename": {
    "old_name": "new_name",
    "sales": "total_sales"
  }
}
```

**DuckDB**: `SELECT old_name AS new_name, ... FROM table`

#### TYPES - Explicit Type Casting

```json
{
  "types": {
    "price": "float",
    "quantity": "integer",
    "date_col": "date"
  }
}
```

- Forces column to specified type
- Failed conversions result in `NULL`

**DuckDB**: `SELECT CAST(price AS DOUBLE) AS price, ... FROM table`

---

### 3.2 Row Operations

#### FILTER - Row Filtering

```json
{
  "filter": "sales > 1000 && region == \"North\""
}
```

- Expression evaluated per row
- Rows where expression is truthy are kept
- Empty result preserves schema (returns 0 rows)

**DuckDB**: `SELECT * FROM table WHERE <translated_expression>`

#### SORT - Row Ordering

```json
{
  "sort": {
    "field": "date",
    "order": "desc"
  }
}
```

- `order`: `"asc"` (default) or `"desc"`

**DuckDB**: `SELECT * FROM table ORDER BY date DESC`

#### DEDUPE - Duplicate Handling

```json
{
  "dedupe": {
    "columns": ["email", "name"],
    "mode": "remove"
  }
}
```

- `columns`: Columns to consider (empty = all columns)
- `mode`:
  - `"remove"` (default): Keep first occurrence, remove duplicates
  - `"keep"`: Keep only rows that have duplicates

**DuckDB**:

- Remove: `SELECT DISTINCT ON (email, name) * FROM table`
- Keep: Window function with `COUNT(*) OVER (PARTITION BY ...) > 1`

#### SLICEROWS - Row Limiting

```json
{
  "sliceRows": {
    "count": 100,
    "mode": "first"
  }
}
```

- `mode`:
  - `"first"`: Keep first N rows
  - `"last"`: Keep last N rows
  - `"removeFirst"`: Skip first N, keep rest
  - `"removeLast"`: Remove last N, keep rest

**DuckDB**: `LIMIT`, `OFFSET`, or window functions

#### ADDINDEX - Sequential Numbering

```json
{
  "addIndex": {
    "columnName": "row_num",
    "startFrom": 1
  }
}
```

**DuckDB**: `SELECT ROW_NUMBER() OVER () + (startFrom - 1) AS row_num, * FROM table`

---

### 3.3 Value Operations

#### REPLACE - Value Substitution

```json
{
  "replace": {
    "column": "status",
    "find": "pending",
    "replace": "in_progress"
  }
}
```

- Exact match replacement
- `find` can be `null` to match NULL values
- `replace` can be `null` to set NULL

**DuckDB**: `SELECT CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END AS status, ... FROM table`

#### DERIVE - Computed Columns

```json
{
  "derive": {
    "profit": "revenue - cost",
    "margin": "profit / revenue * 100",
    "full_name": "upper(first_name) || \" \" || last_name"
  }
}
```

- Creates new columns from expressions
- Overwrites existing column if same name
- Expressions can reference other derived columns (in order)
- Errors result in `NULL` for that cell

**DuckDB**: `SELECT *, (revenue - cost) AS profit, ... FROM table`

---

### 3.4 Reshaping Operations

#### SPLIT - Column Value Splitting

```json
{
  "split": {
    "column": "full_name",
    "delimiter": " ",
    "mode": "spread",
    "keepOriginal": false,
    "maxColumns": 3,
    "isRegex": false
  }
}
```

- `mode`:
  - `"spread"`: All segments to `{col}_1`, `{col}_2`, etc.
  - `"left"`: Only leftmost segment
  - `"right"`: Only rightmost segment
  - `"firstN"`: First N segments (limited by `maxColumns`)
  - `"lastN"`: Last N segments (limited by `maxColumns`)
- `isRegex`: Treat delimiter as regex pattern

**DuckDB**: `string_split()` or `regexp_split_to_array()`

#### FOLD (Unpivot) - Wide to Long

```json
{
  "fold": {
    "columns": ["jan_sales", "feb_sales", "mar_sales"],
    "as": ["month", "sales"]
  }
}
```

- Converts specified columns into key-value pairs
- Other columns repeated for each key-value row
- `as`: `[keyColumnName, valueColumnName]` (default: `["key", "value"]`)

**DuckDB**: `UNPIVOT` clause

#### PIVOT - Long to Wide

```json
{
  "pivot": {
    "rows": ["region", "year"],
    "keys": "product",
    "values": "sales",
    "aggregation": "sum",
    "options": {
      "sort": true,
      "limit": 10
    }
  }
}
```

- `rows`: Columns that identify each output row (group by these)
- `keys`: Column whose unique values become new columns
- `values`: Column containing values to aggregate
- `aggregation`: `"sum"`, `"count"`, `"mean"`, `"min"`, `"max"`, etc.
- `options.sort`: Sort pivot columns alphabetically
- `options.limit`: Max number of pivot columns

**DuckDB**: `PIVOT` clause

---

### 3.5 Aggregation Operations

#### AGGREGATE - Group By with Rollup

```json
{
  "aggregate": {
    "groupby": ["region", "category"],
    "rollup": {
      "total_sales": "op.sum(\"sales\")",
      "avg_price": "op.mean(\"price\")",
      "order_count": "op.count()",
      "unique_customers": "op.distinct(\"customer_id\")"
    }
  }
}
```

**Supported Aggregation Functions** (prefixed with `op.`):

| Function                     | Description        | Output Type |
| ---------------------------- | ------------------ | ----------- |
| `count()`                    | Row count          | integer     |
| `count("col")`               | Non-null count     | integer     |
| `sum("col")`                 | Sum of values      | float       |
| `mean("col")` / `avg("col")` | Average            | float       |
| `median("col")`              | Median value       | float       |
| `min("col")`                 | Minimum            | inherit     |
| `max("col")`                 | Maximum            | inherit     |
| `first("col")`               | First value        | inherit     |
| `last("col")`                | Last value         | inherit     |
| `stdev("col")`               | Standard deviation | float       |
| `variance("col")`            | Variance           | float       |
| `distinct("col")`            | Unique count       | integer     |
| `valid("col")`               | Non-null count     | integer     |
| `invalid("col")`             | Null count         | integer     |
| `any("col")`                 | Any non-null value | inherit     |

**DuckDB**: `SELECT region, category, SUM(sales) AS total_sales, ... FROM table GROUP BY region, category`

---

### 3.6 Multi-Table Operations

#### JOIN - Table Merging

```json
{
  "join": {
    "right": "other_model_id",
    "on": [
      ["left_key", "right_key"],
      ["left_key2", "right_key2"]
    ],
    "how": "left",
    "suffixes": ["_left", "_right"]
  }
}
```

**Join Types**:
| Type | Description |
|------|-------------|
| `"inner"` | Only matching rows (default) |
| `"left"` | All left rows + matches from right |
| `"right"` | All right rows + matches from left |
| `"full"` | All rows from both tables |
| `"cross"` | Cartesian product (no `on` needed) |

- `on`: Array of `[leftColumn, rightColumn]` pairs
- `suffixes`: Appended to ambiguous column names (default: `["_x", "_y"]`)

**DuckDB**: `SELECT * FROM left_table LEFT JOIN right_table ON left_key = right_key`

---

## 4. Expression Language

### 4.1 Syntax

Expressions use a safe, validated syntax similar to JavaScript:

```
revenue - cost                           // arithmetic
sales > 1000 && region == "North"        // comparison + logic
status ?? "unknown"                      // null coalescing
active ? "Yes" : "No"                    // ternary conditional
[Column With Spaces]                     // bracket notation for special names
upper(trim(name))                        // function calls
```

### 4.2 Operators

#### Arithmetic

| Operator | Description    |
| -------- | -------------- |
| `+`      | Addition       |
| `-`      | Subtraction    |
| `*`      | Multiplication |
| `/`      | Division       |
| `%`      | Modulo         |

#### Comparison

| Operator    | Description  |
| ----------- | ------------ |
| `==`, `===` | Equality     |
| `!=`, `!==` | Inequality   |
| `>`, `>=`   | Greater than |
| `<`, `<=`   | Less than    |

#### Logical

| Operator | Description                 |
| -------- | --------------------------- | --- | -------------------------- |
| `&&`     | Logical AND (short-circuit) |
| `        |                             | `   | Logical OR (short-circuit) |
| `!`      | Logical NOT                 |
| `??`     | Null coalescing             |

#### Conditional

| Operator | Description         |
| -------- | ------------------- |
| `? :`    | Ternary conditional |

### 4.3 Functions (40 Total)

#### String Functions

| Function                       | Arity | Description                        |
| ------------------------------ | ----- | ---------------------------------- |
| `upper(s)`                     | 1     | Uppercase                          |
| `lower(s)`                     | 1     | Lowercase                          |
| `trim(s)`                      | 1     | Remove leading/trailing whitespace |
| `len(s)`                       | 1     | String length                      |
| `substring(s, start, length?)` | 2-3   | Extract substring (0-indexed)      |

#### Math Functions

| Function              | Arity | Description                      |
| --------------------- | ----- | -------------------------------- |
| `abs(n)`              | 1     | Absolute value                   |
| `round(n, decimals?)` | 1-2   | Round to N decimals (default: 0) |
| `floor(n)`            | 1     | Round down                       |
| `ceil(n)`             | 1     | Round up                         |
| `min(a, b, ...)`      | 1+    | Minimum of values                |
| `max(a, b, ...)`      | 1+    | Maximum of values                |

#### Type Conversion

| Function         | Arity | Description      |
| ---------------- | ----- | ---------------- |
| `parse_int(s)`   | 1     | Parse as integer |
| `parse_float(s)` | 1     | Parse as float   |
| `is_nan(n)`      | 1     | Check if NaN     |

#### Regex Functions

| Function                             | Arity | Description                        |
| ------------------------------------ | ----- | ---------------------------------- |
| `regexp_match(s, pattern)`           | 2     | Returns boolean if pattern matches |
| `regexp_extract(s, pattern, group?)` | 2-3   | Extract matched group (default: 0) |

**Pattern Flags**: Perl-style `(?gimsuy)` at pattern start

- `(?i)pattern` for case-insensitive matching

#### Date Extraction

| Function     | Arity | Description                      |
| ------------ | ----- | -------------------------------- |
| `year(d)`    | 1     | Extract year                     |
| `month(d)`   | 1     | Extract month (1-12)             |
| `day(d)`     | 1     | Extract day of month             |
| `hour(d)`    | 1     | Extract hour (0-23)              |
| `minute(d)`  | 1     | Extract minute                   |
| `second(d)`  | 1     | Extract second                   |
| `weekday(d)` | 1     | ISO weekday (Monday=0, Sunday=6) |
| `week(d)`    | 1     | ISO week number (1-53)           |
| `quarter(d)` | 1     | Quarter (1-4)                    |

#### Date Utilities

| Function  | Arity | Description                 |
| --------- | ----- | --------------------------- |
| `today()` | 0     | Current date (YYYY-MM-DD)   |
| `now()`   | 0     | Current datetime (ISO 8601) |

#### Date Arithmetic

| Function                    | Arity | Description            |
| --------------------------- | ----- | ---------------------- |
| `days_between(d1, d2)`      | 2     | Days between two dates |
| `date_add(d, amount, unit)` | 3     | Add duration to date   |
| `date_trunc(d, unit)`       | 2     | Truncate to time unit  |
| `format_date(d, format)`    | 2     | Format date as string  |

**Units for `date_add`**: `'day'`, `'days'`, `'month'`, `'months'`, `'year'`, `'years'`, `'hour'`, `'hours'`, `'minute'`, `'minutes'`, `'second'`, `'seconds'`

**Units for `date_trunc`**: `'year'`, `'quarter'`, `'month'`, `'week'`, `'day'`, `'hour'`, `'minute'`, `'second'`

**Format tokens for `format_date`**:
| Token | Description | Example |
|-------|-------------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MM` | 2-digit month | 01-12 |
| `M` | Month | 1-12 |
| `DD` | 2-digit day | 01-31 |
| `D` | Day | 1-31 |
| `HH` | 2-digit hour (24h) | 00-23 |
| `H` | Hour | 0-23 |
| `mm` | 2-digit minute | 00-59 |
| `m` | Minute | 0-59 |
| `ss` | 2-digit second | 00-59 |
| `s` | Second | 0-59 |

### 4.4 Expression Validation

Expressions must be validated before execution:

1. **Parse**: Convert string to AST
2. **Validate**: Check against whitelist
   - Only allowed operators
   - Only allowed functions
   - Correct function arity
   - Valid column references (against current schema)
   - Valid regex patterns
3. **Execute**: Interpret AST safely

**Validation Errors**:
| Error Type | Description |
|------------|-------------|
| `disallowed-node-type` | Unknown AST node type |
| `unknown-column` | Column not in schema |
| `unknown-function` | Function not in whitelist |
| `wrong-arity` | Incorrect argument count |
| `invalid-regex` | Malformed regex pattern |

---

## 5. Data Import

### 5.1 Supported Formats

| Format  | Extensions      | Description                   |
| ------- | --------------- | ----------------------------- |
| CSV     | `.csv`          | Comma-separated values        |
| TSV     | `.tsv`, `.txt`  | Tab-separated values          |
| JSON    | `.json`         | Array of objects or nested    |
| Parquet | `.parquet`      | Columnar format (native only) |
| Excel   | `.xlsx`, `.xls` | Spreadsheets (native only)    |

### 5.2 CSV/TSV Import Options

```json
{
  "fileName": "data.csv",
  "sourceName": "Sales Data",
  "delimiter": ",",
  "headerMode": "first-row",
  "customHeaders": null,
  "encoding": "utf-8"
}
```

**Header Modes**:
| Mode | Description |
|------|-------------|
| `"first-row"` | First row contains column names |
| `"auto-generate"` | Generate "Column 1", "Column 2", etc. |
| `"manual"` | Use provided `customHeaders` array |

**Delimiter Detection**: Auto-detect from common delimiters (`,`, `\t`, `;`, `|`)

**Duplicate Header Handling**: Append `_2`, `_3`, etc. to duplicates

### 5.3 JSON Import Options

```json
{
  "jsonPath": "data.results",
  "flattenJson": true,
  "serializeNested": false
}
```

| Option            | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `jsonPath`        | Dot-separated path to data array (e.g., `"response.data.items"`) |
| `flattenJson`     | Flatten nested objects (`parent.child` → `parent_child`)         |
| `serializeNested` | Convert nested objects to JSON strings                           |

### 5.4 Native-Only: Database Connectors

Potential connectors for native app (DuckDB extensions):

| Connector     | Description                              |
| ------------- | ---------------------------------------- |
| PostgreSQL    | Direct connection via `postgres_scanner` |
| MySQL         | Direct connection                        |
| SQLite        | Local database files                     |
| S3/GCS        | Cloud object storage                     |
| HTTP/HTTPS    | Remote CSV/Parquet files                 |
| Google Sheets | Via API                                  |
| Airtable      | Via API                                  |

---

## 6. Data Export

### 6.1 Supported Formats

| Format        | Description                      |
| ------------- | -------------------------------- |
| CSV           | Standard CSV with headers        |
| JSON          | Array of objects, pretty-printed |
| Parquet       | Columnar format (native only)    |
| Excel         | `.xlsx` workbook (native only)   |
| Workflow JSON | Pipeline definition (see below)  |

### 6.2 Workflow JSON Structure

```json
{
  "version": "1.0",
  "name": "My Analysis",
  "exportedAt": "2024-01-15T10:30:00Z",
  "source": {
    "id": "src_1705312200000",
    "name": "Sales Data",
    "columns": [
      { "name": "date", "type": "date" },
      { "name": "revenue", "type": "float" },
      { "name": "region", "type": "string" }
    ]
  },
  "model": {
    "id": "mdl_1705312200001",
    "name": "main",
    "steps": [
      { "filter": "revenue > 1000" },
      { "derive": { "tax": "revenue * 0.1" } },
      { "sort": { "field": "date", "order": "desc" } }
    ]
  }
}
```

---

## 7. Workflow Model

### 7.1 Source (Raw Data)

```typescript
interface Source {
  id: string; // Unique identifier (e.g., "src_" + timestamp)
  name: string; // User-provided display name
  fileName?: string; // Original filename (if from file)
  origin: string; // 'file', 'database', 'url', 'clipboard'
  columns: ColumnSchema[]; // Inferred schema
  rowCount: number; // Number of rows
  createdAt: string; // ISO timestamp

  // Import configuration (for re-import)
  importConfig?: {
    delimiter?: string;
    headerMode?: string;
    jsonPath?: string;
    // ... connector-specific options
  };
}

interface ColumnSchema {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime';
}
```

### 7.2 Model (Pipeline)

```typescript
interface Model {
  id: string; // Unique identifier
  name: string; // Display name
  sourceId: string; // Reference to source
  steps: TransformStep[]; // Array of transforms in order
}

type TransformStep =
  | { select: string[] }
  | { remove: string[] }
  | { rename: Record<string, string> }
  | { filter: string }
  | { sort: { field: string; order: 'asc' | 'desc' } }
  | { replace: { column: string; find: any; replace: any } }
  | { dedupe: { columns?: string[]; mode?: string } }
  | { derive: Record<string, string> }
  | { join: JoinConfig }
  | { aggregate: AggregateConfig }
  | { split: SplitConfig }
  | { fold: FoldConfig }
  | { pivot: PivotConfig }
  | { types: Record<string, string> }
  | { sliceRows: SliceRowsConfig }
  | { addIndex: AddIndexConfig };
```

### 7.3 Pipeline Execution

1. Load source data (from Parquet or database)
2. For each step in `model.steps`:
   a. Translate transform to DuckDB SQL
   b. Execute query
   c. Update schema metadata
3. Return result set with updated schema

**Error Handling**:

- Validation errors caught before execution
- Runtime errors (e.g., type mismatch) logged with step index
- Failed transforms can be skipped or halt pipeline (configurable)

---

## 8. Exploratory Data Analysis (EDA)

### 8.1 Column Statistics

**For All Types**:

```typescript
interface BaseStats {
  column: string;
  type: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: number; // 0-100
  uniqueCount: number;
  uniquePercentage: number; // 0-100
}
```

**For Numeric Columns**:

```typescript
interface NumericStats extends BaseStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number; // 25th percentile
  p75: number; // 75th percentile
  stdev: number;
}
```

**For Categorical Columns**:

```typescript
interface CategoricalStats extends BaseStats {
  topValues: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
  // Top 5-10 values + "Other" category
}
```

**For Date Columns**:

```typescript
interface DateStats extends BaseStats {
  min: string; // Earliest date
  max: string; // Latest date
  range: number; // Days between min and max
}
```

### 8.2 DuckDB Implementation

```sql
-- Numeric stats
SELECT
  COUNT(*) as total_count,
  COUNT(column) as non_null_count,
  COUNT(*) - COUNT(column) as null_count,
  MIN(column) as min,
  MAX(column) as max,
  AVG(column) as mean,
  MEDIAN(column) as median,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY column) as p25,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY column) as p75,
  STDDEV(column) as stdev
FROM table;

-- Categorical value counts
SELECT value, COUNT(*) as count
FROM table
GROUP BY value
ORDER BY count DESC
LIMIT 10;
```

---

## 9. Expression to SQL Translation

### 9.1 Translation Rules

| Expression              | DuckDB SQL                         |
| ----------------------- | ---------------------------------- | --- | -------- |
| `a + b`                 | `a + b`                            |
| `a == b`                | `a = b`                            |
| `a != b`                | `a <> b`                           |
| `a && b`                | `a AND b`                          |
| `a                      |                                    | b`  | `a OR b` |
| `!a`                    | `NOT a`                            |
| `a ?? b`                | `COALESCE(a, b)`                   |
| `a ? b : c`             | `CASE WHEN a THEN b ELSE c END`    |
| `upper(s)`              | `UPPER(s)`                         |
| `len(s)`                | `LENGTH(s)`                        |
| `substring(s, i, n)`    | `SUBSTRING(s, i+1, n)` (1-indexed) |
| `regexp_match(s, p)`    | `REGEXP_MATCHES(s, p)`             |
| `year(d)`               | `EXTRACT(YEAR FROM d)`             |
| `days_between(a, b)`    | `DATE_DIFF('day', a, b)`           |
| `date_add(d, n, 'day')` | `d + INTERVAL n DAY`               |

### 9.2 Column Name Escaping

- Regular names: `column_name`
- Names with spaces/special chars: `"Column Name"`
- Reserved words: `"select"`, `"from"`, etc.

---

## 10. Storage Architecture (Native)

### 10.1 Project File Structure

```
MyProject.syto/
├── manifest.json           # Project metadata
├── sources/
│   ├── src_001.parquet    # Source data
│   └── src_002.parquet
├── models/
│   ├── mdl_001.json       # Model definitions
│   └── mdl_002.json
└── cache/
    └── *.parquet          # Computed results (optional)
```

### 10.2 Manifest Structure

```json
{
  "version": "2.0",
  "name": "My Analysis Project",
  "createdAt": "2024-01-15T10:30:00Z",
  "modifiedAt": "2024-01-15T14:22:00Z",
  "sources": [
    {
      "id": "src_001",
      "name": "Sales Data",
      "file": "sources/src_001.parquet",
      "rowCount": 50000,
      "columns": [...]
    }
  ],
  "models": [
    {
      "id": "mdl_001",
      "name": "main",
      "sourceId": "src_001",
      "definitionFile": "models/mdl_001.json"
    }
  ],
  "activeModelId": "mdl_001"
}
```

### 10.3 Advantages of Parquet

| Benefit            | Description                   |
| ------------------ | ----------------------------- |
| Compression        | 5-10x smaller than CSV        |
| Column Pruning     | Read only needed columns      |
| Predicate Pushdown | Filter at storage level       |
| Type Preservation  | No re-inference needed        |
| Memory Mapping     | Efficient large file handling |

---

## 11. Security Model

### 11.1 Expression Safety

1. **No Raw SQL** - User expressions translated through validated AST
2. **Whitelist Only** - Only documented functions/operators allowed
3. **Schema Validation** - Column references checked against actual schema
4. **No System Access** - Expressions cannot access filesystem, network, or OS

### 11.2 Sandboxing (Native)

- DuckDB runs in-process (no network exposure)
- File access limited to project directory
- Database connectors require explicit user authorization
- Credentials stored in system keychain (not in project files)

---

## 12. Performance Considerations

### 12.1 Large Dataset Handling

| Strategy            | Description                        |
| ------------------- | ---------------------------------- |
| Lazy Loading        | Only load visible rows             |
| Pagination          | Server-side pagination with DuckDB |
| Result Caching      | Cache computed pipeline results    |
| Incremental Compute | Only recompute from changed step   |
| Column Pruning      | Only query needed columns          |

### 12.2 Recommended Limits

| Metric                | Soft Limit      | Hard Limit |
| --------------------- | --------------- | ---------- |
| Rows per source       | 10M             | 100M       |
| Columns               | 500             | 1000       |
| Pipeline steps        | 50              | 100        |
| Expression complexity | 10 nested calls | 20         |

### 12.3 DuckDB Configuration

```sql
SET memory_limit = '4GB';
SET threads = 4;
SET enable_progress_bar = true;
```

---

## 13. Feature Comparison: Browser vs Native

| Feature      | Browser            | Native                   |
| ------------ | ------------------ | ------------------------ |
| Max rows     | ~100K              | 100M+                    |
| Storage      | In-memory          | Parquet files            |
| Persistence  | Export/Import JSON | Native project files     |
| Connectors   | CSV, JSON, URL     | + Database, Cloud, Excel |
| Performance  | JS single-thread   | Native multi-thread      |
| Offline      | Yes                | Yes                      |
| Installation | None               | App install              |
| Charts       | Vega-Lite          | Native + Vega            |

---

## 14. Electron Development Path

> **Purpose**: Implementation guide for transforming Syto browser app into an Electron desktop application with DuckDB + Parquet backend.

### 14.1 Overview

The Electron path allows reusing the existing TypeScript/Preact codebase while adding native desktop capabilities. All data transformation logic remains in JavaScript/TypeScript, making it the most straightforward migration path from the browser version.

**Key Advantage**: Single language (TypeScript), minimal code rewrites, faster development iteration.

**Architecture Changes**:

- Add Electron main/renderer process structure
- Replace Arquero with DuckDB (SQL generation instead of JS operations)
- Replace IndexedDB with Parquet file-based storage
- Add native file dialogs and OS integration

---

### 14.2 Development Phases

#### Phase 1: Electron Infrastructure Setup

**Objective**: Create Electron shell that loads existing Preact app.

**Tasks**:

1. **Install Electron Dependencies**
   - Add `electron` and `electron-builder` to `package.json`
   - Configure Vite to build for Electron (separate config for main/renderer)

2. **Create Main Process** (`electron/main.js`)
   - Window management (create, close, minimize)
   - Menu bar with File/Edit/Help menus
   - Native file dialogs (open project, save project)
   - IPC handlers for file system operations
   - Application lifecycle (quit on all windows closed)

3. **Create Preload Script** (`electron/preload.js`)
   - Expose safe IPC APIs to renderer
   - Bridge between main process (Node.js) and renderer (Preact app)

4. **Update Build Configuration**
   - Configure `electron-builder` for cross-platform builds (macOS, Windows, Linux)
   - Set up code signing and notarization for macOS
   - Configure app icons and metadata

5. **Development Workflow**
   - `npm run dev` starts Electron with hot reload
   - Main process restart on changes
   - Renderer hot module replacement (existing Vite HMR)

**Files to Create**:

- `electron/main.js` - Main process entry point
- `electron/preload.js` - Preload script for IPC bridge
- `electron-builder.yml` - Build configuration
- Update `vite.config.ts` - Add Electron build targets

---

#### Phase 2: DuckDB Integration

**Objective**: Replace Arquero transformation engine with DuckDB SQL execution.

**Tasks**:

1. **Install DuckDB Bindings**
   - Add `duckdb` npm package (Node.js bindings)
   - Initialize DuckDB connection in main process
   - Manage database connections per project/model

2. **Create SQL Generation Layer** (`src/core/sql-generator.ts`)
   - Translate each transform type to DuckDB SQL
   - Handle all 13+ transform types (select, filter, derive, join, etc.)
   - Generate optimized SQL with proper escaping and type casting

3. **Implement Expression-to-SQL Translator** (`src/core/expression-to-sql.ts`)
   - Convert validated AST (from `jsep`) to SQL expressions
   - Map Syto functions to DuckDB functions (see §9)
   - Handle operators, null coalescing, ternary conditionals
   - Escape column names and handle special characters

4. **Rewrite Transform Execution** (`src/core/transforms.ts`)
   - Replace `applyTransform()` to generate SQL instead of Arquero calls
   - Send SQL to main process via IPC
   - Receive results and convert to application data format
   - Maintain transform result structure for UI compatibility

5. **Update Step Service** (`src/app/services/StepService.ts`)
   - Execute SQL queries instead of Arquero operations
   - Handle async query execution with progress callbacks
   - Error handling and validation before SQL execution

**Key Changes**:

**Before (Arquero)**:

```typescript
const table = aq.from(currentData);
const resultTable = table.filter((row) => row.sales > 1000);
const data = resultTable.objects();
```

**After (DuckDB)**:

```typescript
const sql = generateFilterSQL('sales > 1000', columns, schema);
const data = await invoke('execute_query', { sql, tableId });
```

**Expression System**:

- ✅ Keep `jsep` parser (frontend)
- ✅ Keep `ast-validator.ts` (frontend validation)
- ⚠️ Replace `ast-interpreter.ts` → `expression-to-sql.ts` (generate SQL, don't execute JS)

**Files to Modify**:

- `src/core/transforms.ts` - Complete rewrite (SQL generation)
- `src/app/services/StepService.ts` - IPC calls instead of direct execution
- `src/core/schema-engine.ts` - Infer types from SQL result metadata

**Files to Create**:

- `src/core/sql-generator.ts` - Transform → SQL translation
- `src/core/expression-to-sql.ts` - AST → SQL conversion
- `electron/duckdb-handler.js` - DuckDB connection management in main process

---

#### Phase 3: Parquet Storage Layer

**Objective**: Replace IndexedDB with file-based Parquet storage for projects.

**Tasks**:

1. **Project File Structure**
   - Implement `.syto` directory format (see §10.1)
   - Create `manifest.json` for project metadata
   - Store sources as `sources/*.parquet` files
   - Store model definitions as `models/*.json` files
   - Optional: Cache intermediate pipeline results as Parquet

2. **Create Project Manager** (`src/core/project-manager.ts`)
   - `createProject(name, path)` - Initialize new project directory
   - `openProject(path)` - Load manifest and metadata
   - `saveProject()` - Write all changes to disk
   - `exportProject(path)` - Copy project to new location

3. **Rewrite Storage Layer** (`src/core/storage.ts`)
   - Replace IndexedDB operations with file system operations
   - Use Electron's `fs` API (Node.js) or IPC to main process
   - Read/write Parquet via DuckDB (`CREATE TABLE FROM 'file.parquet'`)
   - Handle file locking and concurrent access

4. **Implement Parquet I/O** (`src/core/parquet-io.ts`)
   - `writeSourceToParquet(source, path)` - Convert source data to Parquet
   - `readParquetToSource(path)` - Load Parquet file as source
   - `exportResultToParquet(data, schema, path)` - Export pipeline results
   - Handle type preservation and schema metadata

5. **Update Import/Export Services**
   - `ImportService` - Save imported CSV/JSON as Parquet in project
   - `ExportService` - Export to CSV/JSON/Parquet formats
   - Native file dialogs via Electron APIs

6. **Project Lifecycle Management**
   - New Project (creates `.syto` directory)
   - Open Project (file picker → load manifest)
   - Save Project (write all changes)
   - Save As (copy project to new location)
   - Recent Projects (track in user preferences)

**Files to Modify**:

- `src/core/storage.ts` - File system instead of IndexedDB
- `src/app/services/PersistenceService.ts` - Project-based operations
- `src/app/services/ImportService.ts` - Write to Parquet
- `src/app/services/ExportService.ts` - Export from Parquet

**Files to Create**:

- `src/core/project-manager.ts` - Project file system management
- `src/core/parquet-io.ts` - Parquet read/write utilities

---

#### Phase 4: Expression System Migration

**Objective**: Translate user expressions to SQL while maintaining security and validation.

**Tasks**:

1. **AST-to-SQL Translation** (`src/core/expression-to-sql.ts`)
   - Traverse validated AST and generate SQL fragments
   - Map operators: `==` → `=`, `&&` → `AND`, `??` → `COALESCE`, etc.
   - Map functions: `upper()` → `UPPER()`, `len()` → `LENGTH()`, etc.
   - Handle ternary: `a ? b : c` → `CASE WHEN a THEN b ELSE c END`
   - Column name escaping and special characters

2. **Function Mapping Implementation**
   - Create lookup table for all 31 functions (see §4.3)
   - Handle type-specific translations (date functions, regex, etc.)
   - DuckDB-specific syntax differences (1-indexed `SUBSTRING`, etc.)

3. **Expression Validation Updates**
   - Keep `ast-validator.ts` as-is (still validates in frontend)
   - Add SQL validation (syntax check before execution)
   - Test expressions against DuckDB before applying transform

4. **Error Handling**
   - Translate DuckDB SQL errors back to user-friendly messages
   - Preserve error position for UI highlighting
   - Handle type mismatches and invalid expressions gracefully

**Translation Examples** (from §9.1):

| Syto Expression                     | DuckDB SQL                                  |
| ----------------------------------- | ------------------------------------------- |
| `sales > 1000 && region == "North"` | `sales > 1000 AND region = 'North'`         |
| `revenue - cost`                    | `revenue - cost`                            |
| `status ?? "unknown"`               | `COALESCE(status, 'unknown')`               |
| `active ? "Yes" : "No"`             | `CASE WHEN active THEN 'Yes' ELSE 'No' END` |
| `upper(trim(name))`                 | `UPPER(TRIM(name))`                         |
| `substring(s, 0, 5)`                | `SUBSTRING(s, 1, 5)` (1-indexed)            |

**Files to Modify**:

- `src/core/ast-validator.ts` - Add SQL compatibility checks (optional)

**Files to Create**:

- `src/core/expression-to-sql.ts` - Complete AST-to-SQL translator
- `src/core/sql-error-formatter.ts` - User-friendly SQL error messages

---

#### Phase 5: Large Dataset Handling

**Objective**: Optimize for datasets larger than browser memory limits (100M+ rows).

**Tasks**:

1. **Lazy Loading Implementation**
   - Don't load full dataset into memory initially
   - Query only visible rows (pagination with `LIMIT`/`OFFSET`)
   - Virtual scrolling in data table component

2. **Pagination Strategy**
   - Server-side pagination via DuckDB queries
   - Cache current page in application state
   - Update pagination when filters/transforms change

3. **Result Streaming** (for large exports)
   - Stream query results in chunks via IPC
   - Process chunks incrementally in renderer
   - Progress indicators for long-running queries

4. **Performance Optimizations**
   - Column pruning (only query visible columns)
   - Incremental computation (recompute from changed step only)
   - Result caching (cache computed steps as Parquet files)
   - DuckDB configuration tuning (memory limit, threads)

5. **Update Data Table Component** (`src/app/components/DataTable.tsx`)
   - Virtual scrolling for large row counts
   - Lazy column rendering
   - Progressive data loading

**DuckDB Configuration**:

```typescript
await connection.query(`
  SET memory_limit = '4GB';
  SET threads = 4;
  SET enable_progress_bar = true;
`);
```

**Files to Modify**:

- `src/app/components/DataTable.tsx` - Virtual scrolling
- `src/app/services/StepService.ts` - Pagination-aware queries
- `src/app/stores/AppStore.ts` - Lazy data loading state

**Files to Create**:

- `src/core/query-optimizer.ts` - Column pruning and query optimization
- `src/core/result-cache.ts` - Pipeline result caching strategy

---

#### Phase 6: Native UI Integration

**Objective**: Add native desktop features and polish.

**Tasks**:

1. **Application Menu**
   - File menu: New Project, Open, Save, Save As, Recent Projects, Exit
   - Edit menu: Undo/Redo (if implemented), Preferences
   - View menu: Zoom, Fullscreen
   - Help menu: Documentation, About

2. **Native Dialogs**
   - File picker for opening projects (`dialog.showOpenDialog`)
   - Save dialog for exporting (`dialog.showSaveDialog`)
   - Replace browser file input with native dialogs

3. **Keyboard Shortcuts**
   - `Cmd/Ctrl+S` - Save project
   - `Cmd/Ctrl+O` - Open project
   - `Cmd/Ctrl+N` - New project
   - `Cmd/Ctrl+W` - Close window
   - Standard cut/copy/paste

4. **Window Management**
   - Window controls (native on macOS/Linux, custom on Windows if desired)
   - Window state persistence (size, position, maximized)
   - Multiple windows support (if needed for multi-project)

5. **System Integration**
   - Dock/menu bar icons
   - Notification system (optional)
   - Recent files in system menu
   - File associations (`.syto` file extension)

6. **Settings Storage**
   - Use Electron's `app.getPath('userData')` for settings
   - Store user preferences (theme, performance settings)
   - Persistent window state

**Files to Modify**:

- `src/app/handlers/import-handlers.ts` - Use Electron dialog APIs
- `src/app/handlers/export-handlers.ts` - Use Electron save dialog
- `src/syto-app.ts` - Add menu handlers and keyboard shortcuts

**Files to Create**:

- `electron/menu.js` - Application menu definition
- `electron/shortcuts.js` - Global keyboard shortcuts
- `src/core/electron-bridge.ts` - Type-safe IPC wrapper

---

#### Phase 7: Type System & Schema Inference

**Objective**: Leverage DuckDB's native type system while maintaining Syto's schema abstraction.

**Tasks**:

1. **Type Inference via DuckDB**
   - Use DuckDB `DESCRIBE` or result metadata for type detection
   - Map DuckDB types to Syto types (see §2.1)
   - Handle type inference on import (CSV → Parquet)

2. **Schema Propagation**
   - Extract schema from SQL query results
   - Update schema metadata through pipeline
   - Maintain backward compatibility with existing schema format

3. **Type Casting**
   - Use DuckDB `CAST` functions for type conversion
   - Handle conversion errors (set to `NULL`)
   - Preserve type information in model definitions

4. **Update Schema Engine** (`src/core/schema-engine.ts`)
   - Query DuckDB for column types instead of inferring from JS arrays
   - Maintain existing `ColumnSchema` interface for UI compatibility

**Files to Modify**:

- `src/core/schema-engine.ts` - DuckDB-based type inference

---

#### Phase 8: Testing & Quality Assurance

**Objective**: Ensure Electron app maintains feature parity and reliability.

**Tasks**:

1. **Testing Infrastructure**
   - Adapt Vitest tests for Electron environment
   - Test SQL generation (unit tests for `sql-generator.ts`)
   - Integration tests with real DuckDB queries
   - Mock Electron APIs for unit tests

2. **Cross-Platform Testing**
   - Test on macOS, Windows, Linux
   - Verify file path handling across platforms
   - Test native dialogs on each OS
   - Verify Parquet file compatibility

3. **Performance Testing**
   - Large dataset benchmarks (1M, 10M, 100M rows)
   - Memory usage profiling
   - Query execution time measurements
   - UI responsiveness with large datasets

4. **User Experience Testing**
   - Project file workflow (create, open, save, save as)
   - Import/export functionality
   - Transform execution and error handling
   - UI responsiveness and virtual scrolling

**Test Files**:

- `src/core/sql-generator.test.ts` - SQL generation tests
- `src/core/expression-to-sql.test.ts` - Expression translation tests
- `src/core/project-manager.test.ts` - Project file operations
- `src/app/e2e.test.ts` - End-to-end Electron app tests

---

### 14.3 What Stays the Same

**Reusable Components** (minimal or no changes):

- ✅ All Preact UI components (`src/app/components/`)
- ✅ CSS modules and styling (`src/app/components/*.module.css`)
- ✅ State management (Preact Signals, AppStore)
- ✅ Dialog components and layouts
- ✅ Vega-Lite charts and EDA panels
- ✅ Theme system (Syto, Blues themes)
- ✅ Expression parser (`jsep` - `src/core/expression-parser.ts`)
- ✅ AST validator (`src/core/ast-validator.ts` - security checks)
- ✅ Transform JSON specifications (no changes)
- ✅ Error formatting and user feedback systems

**Requires Adaptation**:

- ⚠️ Transform execution (Arquero → DuckDB SQL)
- ⚠️ Storage layer (IndexedDB → Parquet files)
- ⚠️ Expression interpreter (JS execution → SQL generation)
- ⚠️ Import/export dialogs (browser file API → Electron dialogs)

---

### 14.4 Technical Dependencies

**New Dependencies to Add**:

```json
{
  "dependencies": {
    "electron": "^latest",
    "duckdb": "^latest"
  },
  "devDependencies": {
    "electron-builder": "^latest"
  }
}
```

**Optional Dependencies**:

- `parquet-wasm` or native Parquet libraries (alternative to DuckDB Parquet support)
- `@electron/remote` (if remote module needed, though discouraged)

---

### 14.5 Project Structure

**Directory Layout**:

```
syto/
├── electron/
│   ├── main.js              # Main process
│   ├── preload.js           # Preload script
│   ├── menu.js              # Menu definitions
│   └── duckdb-handler.js    # DuckDB connection management
├── src/
│   ├── core/
│   │   ├── transforms.ts        # SQL generation (rewrite)
│   │   ├── sql-generator.ts     # NEW: Transform → SQL
│   │   ├── expression-to-sql.ts # NEW: AST → SQL
│   │   ├── project-manager.ts   # NEW: Project file system
│   │   ├── parquet-io.ts        # NEW: Parquet I/O
│   │   └── storage.ts           # Rewrite: File system
│   └── app/                    # Existing Preact app (mostly unchanged)
├── electron-builder.yml     # Build configuration
└── package.json
```

---

### 14.6 Key Implementation Challenges

1. **SQL Generation Complexity**
   - Some transforms require complex SQL (pivot, window functions)
   - Expression-to-SQL translation for all function types
   - Handling edge cases and DuckDB-specific syntax

2. **Large Dataset Performance**
   - IPC overhead for large result sets (mitigate with streaming)
   - Virtual scrolling implementation in data table
   - Memory management for long-running queries

3. **Type System Mapping**
   - Ensuring Syto types map correctly to DuckDB types
   - Type inference from SQL results vs. JavaScript arrays
   - Handling type conversion errors gracefully

4. **Project File Format**
   - Defining `.syto` project structure and manifest schema
   - Handling project migration/versioning
   - Concurrent access and file locking (if multiple windows)

5. **Error Handling**
   - Translating DuckDB SQL errors to user-friendly messages
   - Maintaining error position information for UI highlighting
   - Graceful degradation when queries fail

---

### 14.7 Development Workflow

**Development Mode**:

```bash
npm run dev          # Start Vite dev server + Electron
```

**Main Process Changes**:

- Restart required (manual or via nodemon/watch)

**Renderer Changes**:

- Hot module replacement (Vite HMR works as-is)

**Build for Production**:

```bash
npm run build        # Build renderer (Vite)
npm run build:electron  # Build Electron app (electron-builder)
```

**Platform-Specific Builds**:

```bash
npm run build:mac    # macOS .app bundle
npm run build:win    # Windows .exe installer
npm run build:linux  # Linux AppImage/deb/rpm
```

---

## 15. Future Considerations

### 14.1 Potential Extensions

- **Custom Functions**: User-defined functions in SQL or Swift
- **Scripting**: Python/R integration for advanced analytics
- **Scheduling**: Automated pipeline refresh
- **Version Control**: Git integration for workflows
- **Collaboration**: Shared projects with conflict resolution
- **Templates**: Pre-built transform recipes

### 14.2 Additional Transforms (Candidates)

| Transform      | Description                                               |
| -------------- | --------------------------------------------------------- |
| `fillna`       | Fill null values with strategy (forward, backward, value) |
| `window`       | Window functions (rolling avg, lag, lead)                 |
| `sample`       | Random row sampling                                       |
| `bin`          | Numeric binning/bucketing                                 |
| `normalize`    | Min-max or z-score normalization                          |
| `oneHotEncode` | Categorical to binary columns                             |
| `explode`      | Expand array column to rows                               |
| `melt`         | More flexible unpivot                                     |

---

## 16. Appendix A: Complete Transform Reference

| Transform   | Category    | Key Params              |
| ----------- | ----------- | ----------------------- |
| `select`    | Column      | `string[]`              |
| `remove`    | Column      | `string[]`              |
| `rename`    | Column      | `{old: new}`            |
| `types`     | Column      | `{col: type}`           |
| `filter`    | Row         | expression              |
| `sort`      | Row         | field, order            |
| `dedupe`    | Row         | columns, mode           |
| `sliceRows` | Row         | count, mode             |
| `addIndex`  | Row         | columnName, startFrom   |
| `replace`   | Value       | column, find, replace   |
| `derive`    | Value       | `{col: expression}`     |
| `split`     | Reshape     | column, delimiter, mode |
| `fold`      | Reshape     | columns, as             |
| `pivot`     | Reshape     | rows, keys, values, agg |
| `aggregate` | Aggregate   | groupby, rollup         |
| `join`      | Multi-table | right, on, how          |

---

## 17. Appendix B: Complete Function Reference

| Category        | Functions                                                                        |
| --------------- | -------------------------------------------------------------------------------- |
| String          | `upper`, `lower`, `trim`, `len`, `substring`                                     |
| Math            | `abs`, `round`, `floor`, `ceil`, `min`, `max`                                    |
| Type            | `parse_int`, `parse_float`, `is_nan`                                             |
| Regex           | `regexp_match`, `regexp_extract`                                                 |
| Date Extract    | `year`, `month`, `day`, `hour`, `minute`, `second`, `weekday`, `week`, `quarter` |
| Date Util       | `today`, `now`                                                                   |
| Date Arithmetic | `days_between`, `date_add`, `date_trunc`, `format_date`                          |

**Total: 31 functions**

---

_Document generated: 2026-01-14_
_Based on Syto browser version analysis_
_Updated: Added Electron development path (Section 14)_
