# Transform Architecture Review

> **Purpose**: Analysis of Chumak's transform building blocks, gaps, and improvement opportunities
>
> **Related Documents**:
>
> - [SPECIFICATION.md](SPECIFICATION.md): Technical architecture and codebase map
> - [DATA-SPECIFICATION.md](DATA-SPECIFICATION.md): Transform schemas and expression syntax
> - [DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md): How to add new transforms
> - [Research: Power Query M Limitations](../research/power-query-m-language-limitation-analysis.md): Detailed analysis of M language design issues

---

## 1. Current State Assessment

### 1.1 Transform Inventory

Chumak currently provides **18 transforms**, each following the single-responsibility principle:

| Category                 | Transforms                             | Granularity    |
| ------------------------ | -------------------------------------- | -------------- |
| **Column Selection**     | `select`, `remove`, `rename`           | Single-purpose |
| **Row Filtering**        | `filter`, `dedupe`, `sliceRows`        | Single-purpose |
| **Value Transformation** | `derive`, `replace`, `types`, `impute` | Single-purpose |
| **Reshaping**            | `fold`, `pivot`, `split`, `aggregate`  | Single-purpose |
| **Multi-Model**          | `join`                                 | Single-purpose |
| **Metadata**             | `addIndex`, `sort`, `import`           | Single-purpose |

### 1.2 What Chumak Does Well

Compared to Power Query M's documented limitations, Chumak already avoids several pitfalls:

| M Limitation                                           | Chumak's Approach                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| Opaque lazy evaluation causing "time-traveling" errors | Eager sequential execution - transforms run in written order      |
| No native regex support                                | `regexp_match()` and `regexp_extract()` in expressions            |
| Schema drift crashes with "Column not found"           | Graceful handling with warnings, unknown types fallback to string |
| Deferred error propagation                             | AST validation before execution (`ast-validator.ts`)              |
| Turing-complete escape hatches (security risk)         | Sandboxed expressions - no `eval()`, whitelisted functions only   |
| Case-sensitive function names                          | Function names are case-sensitive but documented clearly          |
| Query folding opacity                                  | N/A - browser-only, no push-down optimization needed              |

### 1.3 Expression System Strengths

The expression engine provides a secure, validated subset of operations:

- **43 whitelisted functions** across string, math, date, and regex categories
- **Bracket notation** for column names with spaces: `[Column Name]`
- **Word-form operators** for beginners: `and`, `or`, `not`
- **Error objects** instead of crashes for failed conversions

---

## 2. Identified Gaps

### 2.1 Pattern-Based Column Operations (High Priority)

**Problem**: Users must explicitly name columns in `select`, `remove`, and `rename`. This is fragile when:

- Column names follow patterns (e.g., `sales_2023`, `sales_2024`)
- Schema changes add/remove columns matching a pattern
- Users want to select "all numeric columns" or "all columns except..."

**Current Workaround**: None - users must update transforms manually when schema changes.

**Hidden Capability**: `matchColumnPattern()` exists in `transforms.ts:27-49` but is not exposed to users.

**Recommendation**: Add pattern-based transforms:

```json
{ "selectPattern": { "pattern": "sales_", "matchType": "prefix" } }
{ "removePattern": { "pattern": "_backup$", "matchType": "suffix", "regex": true } }
{ "renamePattern": { "find": "_old$", "replace": "_new", "regex": true } }
```

### 2.2 Multi-Condition Logic (High Priority)

**Problem**: Complex conditional logic requires nested ternaries in `derive`:

```json
{
  "derive": {
    "tier": "sales > 10000 ? 'platinum' : sales > 5000 ? 'gold' : sales > 1000 ? 'silver' : 'bronze'"
  }
}
```

This is:

- Hard to read for non-programmers
- Error-prone (missing cases, wrong nesting)
- Difficult to validate for exhaustiveness

**Recommendation**: Add a dedicated `conditional` transform:

```json
{
  "conditional": {
    "column": "tier",
    "conditions": [
      { "when": "sales > 10000", "then": "'platinum'" },
      { "when": "sales > 5000", "then": "'gold'" },
      { "when": "sales > 1000", "then": "'silver'" }
    ],
    "else": "'bronze'"
  }
}
```

Benefits:

- Readable, declarative structure
- Each condition is independently validated
- Clear `else` clause prevents missing cases
- UI can present as a visual condition builder

### 2.3 Case-Insensitive Comparisons (Medium Priority)

**Problem**: String comparisons are case-sensitive by default. Users wanting case-insensitive matching must use:

```
lower(name) == lower("Alice")
```

This is verbose and easy to forget.

**Recommendation**: Add case-insensitive functions:

```
equals_ci(name, "Alice")        // true if name is "alice", "ALICE", etc.
contains_ci(description, "error")
starts_with_ci(code, "ERR")
ends_with_ci(filename, ".CSV")
```

### 2.4 Split Transform Overload (Medium Priority)

**Problem**: The `split` transform bundles 6 different modes:

- `spread` - create N columns from segments
- `firstN` / `lastN` - keep N segments as columns
- `left` / `right` - extract first/last segment only

The extraction modes (`left`, `right`) serve a different purpose than the structural modes (`spread`). They're really "get a value" operations, not "reshape the table" operations.

**Recommendation**:

1. Keep `split` for structural operations (creating multiple columns)
2. Add a `split()` expression function for value extraction:

```
split(column, delimiter, index)  // Returns segment at index (0-based)
```

Usage in `derive`:

```json
{ "derive": { "first_name": "split(full_name, ' ', 0)" } }
{ "derive": { "file_ext": "split(filename, '.', -1)" } }  // -1 = last segment
```

### 2.5 Column Reordering (Low Priority)

**Problem**: No explicit way to reorder columns without selecting all of them in the desired order.

**Recommendation**: Add a `reorder` or `moveColumn` transform:

```json
{ "reorder": ["id", "name", "email", "created_at"] }
// or
{ "moveColumn": { "column": "total", "position": "first" } }
{ "moveColumn": { "column": "notes", "after": "description" } }
```

### 2.6 Window Functions (Future)

**Problem**: No support for running calculations that depend on row position or groups:

- Running totals
- Lag/lead values
- Rank within groups

**Recommendation** (future): Add a `window` transform:

```json
{
  "window": {
    "column": "running_total",
    "function": "cumsum",
    "over": "sales",
    "partitionBy": ["region"],
    "orderBy": "date"
  }
}
```

Functions: `cumsum`, `cumcount`, `lag`, `lead`, `rank`, `dense_rank`, `row_number`

---

## 3. Transform Characteristics

### 3.1 Execution Modes

For user education and future optimization, transforms can be categorized by execution characteristics:

| Mode             | Transforms                                                 | Characteristics               |
| ---------------- | ---------------------------------------------------------- | ----------------------------- |
| **Streaming**    | `filter`, `derive`, `replace`, `types`, `rename`           | Row-by-row, constant memory   |
| **Blocking**     | `sort`, `aggregate`, `dedupe`, `pivot`, `fold`, `addIndex` | Requires full table scan      |
| **Hybrid**       | `split`, `impute`, `sliceRows`                             | Depends on options            |
| **Multi-Source** | `join`                                                     | Requires loading second table |

This distinction isn't critical for small browser datasets but useful for:

- User education ("why is this slow?")
- Future optimization hints
- Potential "large dataset" mode

### 3.2 Column Reference Independence

Current state of column name coupling:

| Transform           | Reference Type     | Independence              |
| ------------------- | ------------------ | ------------------------- |
| `select`, `remove`  | Array of names     | Hard-coded                |
| `rename`            | `{ old: new }` map | Hard-coded                |
| `derive`, `filter`  | Expression strings | Hard-coded in expressions |
| `aggregate.groupby` | Array of names     | Hard-coded                |
| `join.on`           | Key pairs          | Hard-coded                |
| `sort.field`        | Single name        | Hard-coded                |

**Reality**: Column names must be explicit somewhere - that's fundamental to declarative transforms. The improvement opportunity is **pattern-based operations** for bulk/dynamic selection.

---

## 4. Design Principles (Lessons from Power Query M)

### 4.1 What to Preserve

1. **Single-responsibility transforms** - Each JSON object does one thing
2. **Eager validation** - Check expressions before execution
3. **Explicit execution order** - No lazy reordering surprises
4. **Sandboxed expressions** - Whitelist-only, no code injection
5. **Graceful degradation** - Unknown transforms/types warn, don't crash

### 4.2 What NOT to Add

Based on M's documented problems:

1. **No Turing-completeness** - No loops, recursion, or arbitrary code in expressions
2. **No implicit optimization** - Execution order matches specification order
3. **No stringly-typed escape hatches** - Expressions are parsed and validated, not eval'd
4. **No source-level privacy firewall** - Browser-only tool doesn't need this complexity
5. **No lazy evaluation** - Predictable eager execution is easier to debug

### 4.3 Future Considerations

For large dataset support (if needed later):

1. **Checkpoint mechanism** - Allow explicit materialization points
2. **Streaming indicators** - Show which transforms buffer vs. stream
3. **Memory warnings** - Detect problematic patterns before execution

---

## 5. Implementation Priorities

### Phase 1: High-Impact Additions

| Item                              | Effort | Impact | Notes                                  |
| --------------------------------- | ------ | ------ | -------------------------------------- |
| `conditional` transform           | Medium | High   | Replaces nested ternaries              |
| `selectPattern` / `removePattern` | Low    | High   | Expose existing `matchColumnPattern()` |
| `split()` expression function     | Low    | Medium | Cleaner extraction without reshape     |

### Phase 2: Quality-of-Life

| Item                       | Effort | Impact | Notes                            |
| -------------------------- | ------ | ------ | -------------------------------- |
| Case-insensitive functions | Low    | Medium | `equals_ci`, `contains_ci`, etc. |
| `renamePattern` transform  | Low    | Medium | Bulk rename by pattern           |
| `reorder` / `moveColumn`   | Low    | Low    | Explicit column ordering         |

### Phase 3: Future Enhancements

| Item                      | Effort | Impact | Notes                          |
| ------------------------- | ------ | ------ | ------------------------------ |
| Window functions          | High   | Medium | `cumsum`, `lag`, `rank`, etc.  |
| Checkpoint mechanism      | Medium | Low    | For large dataset optimization |
| Transform execution hints | Low    | Low    | UI indicators for blocking ops |

---

## 6. Schema Specifications

### 6.1 Proposed: `conditional` Transform

```typescript
interface ConditionalTransform {
  conditional: {
    column: string; // Output column name
    conditions: Array<{
      when: string; // Expression (must return boolean)
      then: string; // Expression (value if condition true)
    }>;
    else: string; // Expression (value if no conditions match)
  };
}
```

Example:

```json
{
  "conditional": {
    "column": "price_category",
    "conditions": [
      { "when": "price > 100", "then": "'expensive'" },
      { "when": "price > 50", "then": "'moderate'" }
    ],
    "else": "'budget'"
  }
}
```

### 6.2 Proposed: `selectPattern` Transform

```typescript
interface SelectPatternTransform {
  selectPattern: {
    pattern: string; // Pattern to match
    matchType: 'prefix' | 'suffix' | 'contains' | 'regex';
    include?: string[]; // Additional columns to always include
  };
}
```

Example:

```json
{
  "selectPattern": {
    "pattern": "^(id|name|sales_)",
    "matchType": "regex",
    "include": ["created_at"]
  }
}
```

### 6.3 Proposed: `split()` Expression Function

```
split(value, delimiter, index)
```

- `value`: String to split
- `delimiter`: String or regex pattern
- `index`: 0-based index, negative counts from end (-1 = last)

Returns: The segment at the specified index, or `null` if index out of bounds.

---

**End of Transform Architecture Review**
