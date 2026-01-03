# Arquero Integration - Roadmap & Implementation Guide

**Purpose**: Leverage Arquero's verbs to minimize implementation effort for remaining transforms

---

## Executive Summary

Arquero provides **35+ verbs** that can significantly reduce Chumak's implementation burden. The current architecture (custom AST for user expressions, Arquero delegation for data operations) is proven and should continue.

**Key Finding**: Most planned transforms are 30-60 line wrappers around Arquero methods.

---

## Current Architecture ✅

### What Works Well

**Custom AST Interpretation** (Security-Critical):

- `filter` - User expressions with security validation
- `derive` - Calculated columns with AST validation
- No `Function()` constructor ever used with user input

**Direct Arquero Delegation** (Data Operations):

- `select`, `remove`, `rename`, `sort` - Direct verb wrappers
- `aggregate` - `groupby().rollup()` wrapper
- `join` - Multi-table operations

**This pattern should continue** for all future transforms.

---

## Implemented Transforms

| Chumak Transform | Arquero Verb               | Lines | Implementation                 |
| ---------------- | -------------------------- | ----- | ------------------------------ |
| **filter**       | Custom AST                 | ~50   | Security-validated interpreter |
| **select**       | `table.select()`           | ~10   | Direct wrapper                 |
| **remove**       | `table.not()`              | ~10   | Direct wrapper                 |
| **rename**       | `table.rename()`           | ~10   | Direct wrapper                 |
| **sort**         | `table.orderby()`          | ~15   | Direct wrapper                 |
| **derive**       | Custom AST                 | ~50   | Security-validated interpreter |
| **aggregate**    | `table.groupby().rollup()` | ~70   | Complex wrapper with rollup    |
| **join**         | `table.join()` family      | ~100  | Multi-table coordination       |
| **types**        | Schema override            | ~20   | Metadata transform             |

---

## Roadmap: Near-Term Transforms

### 1. Dedupe (Duplicate Removal)

**Priority**: High
**Effort**: ~30 lines
**Arquero Verb**: `table.dedupe(...keys)`

```javascript
// Arquero API
table.dedupe(); // all columns
table.dedupe('a', 'b'); // specific columns
```

**Chumak Transform Spec**:

```json
{ "dedupe": ["col1", "col2"] }  // Specific columns
{ "dedupe": null }               // All columns (default)
```

**Implementation**:

```javascript
if (transform.dedupe) {
  const keys = transform.dedupe || [];
  const result = keys.length === 0 ? table.dedupe() : table.dedupe(...keys);
  return result;
}
```

**Test Cases**: All columns, specific columns, empty table, single row, no duplicates

---

### 2. Impute (Fill Missing Values)

**Priority**: High
**Effort**: ~50 lines (simple constants), ~120 lines (with expressions)
**Arquero Verb**: `table.impute(values, options)`

```javascript
// Arquero API
table.impute({ v: () => 0 }); // Constant
table.impute({ v: (d) => op.mean(d.v) }); // Aggregate (needs functions)
table.impute({ v: () => 0 }, { expand: ['x'] }); // Row expansion
```

**Recommended Approach** (Simple First):

**Phase 1**: Constant values only

```json
{ "impute": { "sales": "0", "region": "'Unknown'" } }
```

**Future** (after function support): Expression-based

```json
{ "impute": { "sales": "mean(sales)", "price": "median(price)" } }
```

**Implementation** (Simple):

```javascript
if (transform.impute) {
  const values = {};

  for (const [col, value] of Object.entries(transform.impute)) {
    // Parse constant value (string, number, null)
    const constantValue = JSON.parse(value);
    values[col] = () => constantValue;
  }

  const result = table.impute(values);
  return result;
}
```

**Test Cases**: Null values, undefined, NaN, multiple columns, empty values, edge cases

---

### 3. Pivot (Wide Format)

**Priority**: High (essential for tidy data workflows)
**Effort**: ~60 lines
**Arquero Verb**: `table.pivot(keys, values, options)`

```javascript
// Arquero API
table.pivot('key', 'value'); // Basic pivot
table.pivot(['foo', 'bar'], ['x', 'y']); // Multiple keys/values
table.pivot('type', { sum: (d) => op.sum(d.val) }); // With aggregation
```

**Chumak Transform Spec**:

```json
{
  "pivot": {
    "keys": ["region"],
    "values": ["sales"],
    "options": { "limit": 100, "sort": true }
  }
}
```

**Implementation**:

```javascript
if (transform.pivot) {
  const { keys, values, options = {} } = transform.pivot;

  // For string values, Arquero wraps in op.any() automatically
  // For complex aggregations, use object form with expressions

  const result = table.pivot(keys, values, {
    limit: options.limit || Infinity,
    keySeparator: options.keySeparator || '_',
    valueSeparator: options.valueSeparator || '_',
    sort: options.sort !== false,
  });

  return result;
}
```

**Test Cases**: Single key, multiple keys, column name conflicts, limit behavior, empty data

---

### 4. Fold (Long Format / Unpivot)

**Priority**: High (inverse of pivot for tidy data)
**Effort**: ~40 lines
**Arquero Verb**: `table.fold(values, options)`

```javascript
// Arquero API
table.fold('colA'); // Single column
table.fold(['colA', 'colB']); // Multiple columns
table.fold(['q1', 'q2', 'q3'], { as: ['quarter', 'sales'] }); // Custom names
```

**Chumak Transform Spec**:

```json
{
  "fold": {
    "columns": ["q1_sales", "q2_sales", "q3_sales", "q4_sales"],
    "as": ["quarter", "sales"]
  }
}
```

**Implementation**:

```javascript
if (transform.fold) {
  const { columns, as = ['key', 'value'] } = transform.fold;

  const result = table.fold(columns, { as });
  return result;
}
```

**Test Cases**: Single column, multiple columns, custom names, empty data, preserves other columns

---

## Roadmap: Mid-Term (Expression Functions)

**Unlock**: Advanced `derive` and `impute` expressions

### Function Categories

| Category   | Functions                                                 | Usage Example                                    |
| ---------- | --------------------------------------------------------- | ------------------------------------------------ |
| **String** | `upper`, `lower`, `trim`, `substring`, `split`, `replace` | `{ "derive": { "name_upper": "upper(name)" } }`  |
| **Date**   | `year`, `month`, `day`, `parse_date`, `format_date`       | `{ "derive": { "year": "year(date)" } }`         |
| **Math**   | `abs`, `round`, `floor`, `ceil`, `sqrt`, `min`, `max`     | `{ "derive": { "abs_val": "abs(difference)" } }` |
| **Type**   | `parse_int`, `parse_float`, `is_nan`, `is_finite`         | `{ "derive": { "num": "parse_float(text)" } }`   |

### Implementation Approach

1. **Update AST Validator** (~50 lines)
   - Allow `CallExpression` nodes
   - Whitelist safe function names
   - Validate argument counts

2. **Map to Arquero `op.*`** (~50 lines)
   - Generate Arquero expressions with `op.` prefix
   - `upper(name)` → `d => op.upper(d.name)`

3. **Update Error Messages** (~30 lines)
   - Helpful messages for unsupported functions
   - Suggest alternatives

4. **Comprehensive Tests** (~100 lines)
   - Each function category
   - Nested function calls
   - Error cases

**Total Effort**: ~230 lines

**Unlocks**:

- Expression-based impute: `{ "impute": { "sales": "mean(sales)" } }`
- Advanced derive: `{ "derive": { "formatted": "upper(trim(name))" } }`

---

## Roadmap: Future Transforms

### Set Operations

| Transform     | Arquero Verb        | Effort    | Priority |
| ------------- | ------------------- | --------- | -------- |
| **Concat**    | `table.concat()`    | ~20 lines | Medium   |
| **Union**     | `table.union()`     | ~20 lines | Medium   |
| **Intersect** | `table.intersect()` | ~20 lines | Low      |
| **Except**    | `table.except()`    | ~20 lines | Low      |

**Use Cases**:

- Concat: Combine multiple models (UNION ALL in SQL)
- Union: Deduplicated combination (UNION in SQL)
- Intersect/Except: Advanced set operations

### Data Manipulation

| Transform  | Arquero Verb     | Effort    | Priority |
| ---------- | ---------------- | --------- | -------- |
| **Slice**  | `table.slice()`  | ~25 lines | Medium   |
| **Sample** | `table.sample()` | ~25 lines | Low      |
| **Spread** | `table.spread()` | ~40 lines | Low      |
| **Unroll** | `table.unroll()` | ~40 lines | Low      |

**Use Cases**:

- Slice: Extract row ranges (top N, bottom N, range)
- Sample: Random sampling for large datasets
- Spread: Array column → multiple columns
- Unroll: Array values → multiple rows

### Advanced Joins

| Transform    | Arquero Verb       | Effort    | Priority |
| ------------ | ------------------ | --------- | -------- |
| **Lookup**   | `table.lookup()`   | ~30 lines | Low      |
| **Semijoin** | `table.semijoin()` | ~30 lines | Low      |
| **Antijoin** | `table.antijoin()` | ~30 lines | Low      |

**Use Cases**:

- Lookup: Fast left join without suffix handling
- Semijoin: Keep rows that match (no columns from right)
- Antijoin: Keep rows that don't match

---

## Implementation Patterns

### Pattern 1: Direct Wrapper (Simple)

**Example**: Dedupe, Slice, Sample

```javascript
if (transform.dedupe) {
  const keys = transform.dedupe || [];
  const result = keys.length === 0 ? table.dedupe() : table.dedupe(...keys);

  perfLogger.log(describeTransform(transform), table, result, elapsed);
  return result;
}
```

**Characteristics**:

- Parameter mapping only
- No expression parsing
- 10-30 lines

### Pattern 2: Options Wrapper (Medium)

**Example**: Pivot, Fold, Impute (simple)

```javascript
if (transform.pivot) {
  const { keys, values, options = {} } = transform.pivot;

  const result = table.pivot(keys, values, {
    limit: options.limit || Infinity,
    keySeparator: options.keySeparator || '_',
    sort: options.sort !== false,
  });

  perfLogger.log(describeTransform(transform), table, result, elapsed);
  return result;
}
```

**Characteristics**:

- Parameter mapping + options
- Optional configuration
- 30-60 lines

### Pattern 3: Expression Wrapper (Complex)

**Example**: Filter, Derive (current), Impute (future)

```javascript
if (transform.impute) {
  const values = {};

  for (const [col, expr] of Object.entries(transform.impute)) {
    // Parse and validate expression
    const ast = parseExpression(expr);
    const validation = validateAST(ast, schema);
    if (!validation.valid) {
      throw new Error(`Impute validation failed: ${validation.error}`);
    }

    // Generate Arquero function
    values[col] = generateArqueroFunction(ast);
  }

  const result = table.impute(values);
  perfLogger.log(describeTransform(transform), table, result, elapsed);
  return result;
}
```

**Characteristics**:

- Expression parsing + validation
- AST to Arquero generation
- 60-120 lines

---

## Testing Strategy

### Unit Tests (Per Transform)

**Minimum Test Coverage**:

1. **Basic operation** - Transform works with typical data
2. **Edge cases** - Empty data, single row, no matches
3. **Column handling** - Spaces, special characters in names
4. **Null handling** - Missing values, undefined, NaN
5. **Error cases** - Invalid parameters, type mismatches
6. **Schema propagation** - Correct output schema

**Example** (Dedupe tests):

```javascript
describe('dedupe transform', () => {
  it('removes duplicate rows (all columns)', () => {
    /* ... */
  });
  it('removes duplicates based on specific columns', () => {
    /* ... */
  });
  it('handles empty table', () => {
    /* ... */
  });
  it('preserves single row', () => {
    /* ... */
  });
  it('handles no duplicates', () => {
    /* ... */
  });
  it('works with column names containing spaces', () => {
    /* ... */
  });
});
```

**Test File Size**: 50-100 lines per transform

### Integration Tests

Test transform combinations:

- Filter → Dedupe → Sort
- Pivot → Derive → Aggregate
- Join → Impute → Select

---

## Priority Queue

### Immediate (Next Sprint)

1. **Dedupe** (~30 lines, 1-2 hours)
2. **Impute** (simple constants) (~50 lines, 2-3 hours)
3. **Pivot** (~60 lines, 3-4 hours)
4. **Fold** (~40 lines, 2-3 hours)

**Total**: ~180 lines, 8-12 hours work

**Outcome**: Complete core data cleaning and reshape capabilities

### Short-Term (1-2 months)

5. **Expression Functions** (~230 lines, 1-2 weeks)
   - Whitelist `op.*` functions
   - Update validator
   - Comprehensive tests

**Outcome**: Unlock advanced calculations and expression-based impute

### Medium-Term (2-6 months)

6. **Set Operations** (concat, union) (~40 lines, 1 week)
7. **Slice & Sample** (~50 lines, 1 week)

**Outcome**: Support multi-table workflows and large dataset handling

### Long-Term (6+ months)

8. **Advanced Features** (spread, unroll, semijoin, etc.)
9. **UX Polish** (drag-reorder, keyboard shortcuts, etc.)

---

## Architecture Principles

### Keep These Patterns

✅ **Custom AST for user expressions**

- Security-critical
- Better error messages
- Full control over validation

✅ **Arquero delegation for data operations**

- Well-tested library
- Comprehensive verb coverage
- Performance optimized

✅ **Test-first development**

- Write tests before implementation
- High coverage on core transforms
- Browser-based test runner

✅ **Thin wrappers**

- Minimize custom logic
- Parameter mapping only
- Leverage Arquero's capabilities

### Avoid These Mistakes

❌ **Don't reinvent Arquero**

- Use their verbs when available
- Don't implement custom pivot/fold logic

❌ **Don't use `Function()` constructor**

- Ever
- With user input
- Security non-negotiable

❌ **Don't add complexity early**

- Start with simple constants for impute
- Add expressions only after function support
- YAGNI principle

❌ **Don't skip tests**

- Every transform needs tests
- Edge cases matter
- Test-first always

---

## Summary

**Arquero provides massive leverage** - most planned transforms are thin wrappers around existing verbs.

**Current architecture is sound** - continue custom AST for expressions, Arquero delegation for data operations.

**Clear roadmap**:

1. **Near-term**: Dedupe, Impute, Pivot, Fold (~180 lines, completes core transforms)
2. **Mid-term**: Expression functions (~230 lines, unlocks advanced use cases)
3. **Future**: Set operations, advanced features (low priority, ~200 lines total)

**Total remaining effort for comprehensive data wrangling**: ~600 lines over 3-6 months.

---

**End of Analysis**
