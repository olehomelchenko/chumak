# DuckDB Integration Reference

> **Status**: Reference document, not active roadmap.
>
> Originally a full Electron/DuckDB desktop app specification (1600 lines). Trimmed to preserve only the **DuckDB-reusable parts**: type mappings, transform-to-SQL translations, and expression-to-SQL rules. These apply regardless of execution context (WASM, CLI, or native).
>
> **Current direction**: CLI (Node.js/Arquero) and potentially DuckDB-WASM in the browser. See [CLI-CONSIDERATIONS.md](CLI-CONSIDERATIONS.md) for CLI strategy.

---

## 1. DuckDB Type Mappings

| Syto Type  | DuckDB Type |
| ---------- | ----------- |
| `string`   | `VARCHAR`   |
| `integer`  | `BIGINT`    |
| `float`    | `DOUBLE`    |
| `boolean`  | `BOOLEAN`   |
| `date`     | `DATE`      |
| `datetime` | `TIMESTAMP` |

---

## 2. Transform-to-SQL Translation

### Column Operations

| Transform                   | DuckDB SQL                                              |
| --------------------------- | ------------------------------------------------------- |
| `select: ["col1", "col2"]`  | `SELECT col1, col2 FROM table`                          |
| `remove: ["col1"]`          | `SELECT * EXCLUDE (col1) FROM table`                    |
| `rename: { old: "new" }`    | `SELECT old AS new, ... FROM table`                     |
| `types: { price: "float" }` | `SELECT CAST(price AS DOUBLE) AS price, ... FROM table` |

### Row Operations

| Transform                    | DuckDB SQL                                          |
| ---------------------------- | --------------------------------------------------- |
| `filter: "expr"`             | `SELECT * FROM table WHERE <translated_expression>` |
| `sort: { field, order }`     | `SELECT * FROM table ORDER BY field DESC`           |
| `dedupe: { columns }`        | `SELECT DISTINCT ON (cols) * FROM table`            |
| `sliceRows: { count, mode }` | `LIMIT` / `OFFSET` / window functions               |
| `addIndex: { columnName }`   | `SELECT ROW_NUMBER() OVER () AS col, * FROM table`  |

### Value Operations

| Transform                              | DuckDB SQL                                        |
| -------------------------------------- | ------------------------------------------------- |
| `derive: { profit: "revenue - cost" }` | `SELECT *, (revenue - cost) AS profit FROM table` |
| `replace: { column, find, replace }`   | `CASE WHEN col = find THEN replace ELSE col END`  |

### Reshaping

| Transform        | DuckDB SQL                                    |
| ---------------- | --------------------------------------------- |
| `fold` (unpivot) | `UNPIVOT` clause                              |
| `pivot`          | `PIVOT` clause                                |
| `split`          | `string_split()` or `regexp_split_to_array()` |

### Aggregation & Joins

| Transform                        | DuckDB SQL                                      |
| -------------------------------- | ----------------------------------------------- |
| `aggregate: { groupby, rollup }` | `SELECT cols, SUM(x) FROM table GROUP BY cols`  |
| `join: { right, on, how }`       | `LEFT JOIN right_table ON left_key = right_key` |

---

## 3. Expression-to-SQL Translation

| Syto Expression         | DuckDB SQL                         |
| ----------------------- | ---------------------------------- |
| `a == b`                | `a = b`                            |
| `a != b`                | `a <> b`                           |
| `a && b`                | `a AND b`                          |
| `a \|\| b`              | `a OR b`                           |
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

### Column Name Escaping

- Regular names: `column_name`
- Names with spaces/special chars: `"Column Name"`
- Reserved words: `"select"`, `"from"`, etc.

---

## 4. Parquet Benefits (for future storage)

| Benefit            | Description                   |
| ------------------ | ----------------------------- |
| Compression        | 5-10x smaller than CSV        |
| Column Pruning     | Read only needed columns      |
| Predicate Pushdown | Filter at storage level       |
| Type Preservation  | No re-inference needed        |
| Memory Mapping     | Efficient large file handling |

---

## 5. Decision: CLI/WASM First, Not Electron

**Why not Electron now**: The highest-value capabilities (headless execution, larger datasets) can be achieved via CLI (Node.js/Arquero) and DuckDB-WASM without the Electron migration overhead (IPC architecture, native dialogs, window management, installer distribution).

**When to revisit Electron**: If users consistently need offline project files, database connectors (PostgreSQL, MySQL), or 100M+ row support beyond what DuckDB-WASM can handle.
