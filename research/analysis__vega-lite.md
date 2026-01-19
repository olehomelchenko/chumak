# Vega-Lite Expression Parser Analysis

## Project: Vega-Lite

Analysis conducted for Syto expression parser design research.

---

## Phase 1: Orientation

### Source Location

- **Repository:** `github.com/vega/vega-lite`
- **Language:** TypeScript (ES2022, Node16 modules)
- **Entry Point:** `src/index.ts`
- **Build Output:** `build/`

### Expression-Related Paths

**Core Files:**

- `src/predicate.ts` (276 lines) - Type definitions and conversion logic
- `src/expr.ts` (24 lines) - ExprRef interface
- `src/logical.ts` (59 lines) - Logical composition (and, or, not)
- `src/transform.ts` (715 lines) - Transform definitions including FilterTransform
- `src/compile/predicate.ts` (25 lines) - Main expression conversion function
- `src/compile/data/expressions.ts` (41 lines) - AST parsing via vega-expression
- `src/compile/data/filter.ts` (50 lines) - FilterNode compilation
- `src/compile/data/calculate.ts` (79 lines) - CalculateNode compilation

**Test Files:**

- `test/predicate.test.ts` (266 lines) - Comprehensive predicate tests
- `test/compile/data/filter.test.ts` (85 lines) - FilterNode tests
- `test/compile/data/expressions.test.ts` (18 lines) - Dependency extraction tests

### Terminology Used

Vega-Lite uses three distinct but related concepts:

1. **Predicate** (primary term) - High-level declarative filter conditions
   - Field predicates: `{field: "x", equal: 5}`
   - Parameter predicates: `{param: "selection"}`
   - Raw expression strings: `"datum.x > 5"`

2. **Expression** - Vega expression strings (output format)
   - User can provide directly as strings
   - Generated from field predicates during compilation

3. **Filter** - Transform operation that uses predicates
   - Part of declarative transform pipeline

### Language/Module System

- **TypeScript** with strict type checking
- **ES Modules** (type: "module")
- **Build System:** Rollup + TypeScript compiler
- **Target:** ES2022

### Key Architecture Insight

**Vega-Lite does NOT implement its own expression parser.** Instead:

1. Provides high-level **predicate objects** as declarative alternatives to expressions
2. **Converts** predicates to Vega expression strings during compilation
3. **Delegates** expression parsing/evaluation to vega-expression (dependency)
4. Only **parses** expression ASTs for dependency analysis (field extraction)

**Compilation Flow:**

```
User Input → Predicate Objects → Expression Strings → Vega Spec → vega-expression runtime
```

### Dependencies

From `package.json`:

- `vega-expression@^6.1.0` - Expression parser (only used for AST analysis)
- `vega-event-selector@^3.0.1` - Event selection
- `vega-util@^1.17.2` - Utility functions
- `yargs@~17.7.2` - CLI argument parsing

### Predicate Type System

```typescript
type Predicate =
  | FieldEqualPredicate // {field: "x", equal: value}
  | FieldRangePredicate // {field: "x", range: [min, max]}
  | FieldOneOfPredicate // {field: "x", oneOf: [values]}
  | FieldLTPredicate // {field: "x", lt: value}
  | FieldGTPredicate // {field: "x", gt: value}
  | FieldLTEPredicate // {field: "x", lte: value}
  | FieldGTEPredicate // {field: "x", gte: value}
  | FieldValidPredicate // {field: "x", valid: boolean}
  | ParameterPredicate // {param: "name"}
  | string; // Raw Vega expression

type LogicalComposition<T> = LogicalNot<T> | LogicalAnd<T> | LogicalOr<T> | T;
```

---

## Phase 2: Entry Point

### Public API

- **Main function:** `compile(inputSpec: TopLevelSpec, opt?: CompileOptions)`
- **Transform specification:** Specs contain `transform?: Transform[]` array
- **Entry point file:** `src/compile/compile.ts`

### Input Types

**FilterTransform accepts:**

```typescript
interface FilterTransform {
  filter: LogicalComposition<Predicate>;
}
// where Predicate can be field predicate objects OR raw expression strings
```

**CalculateTransform accepts:**

```typescript
interface CalculateTransform {
  calculate: string; // Raw expression string only
  as: FieldName;
}
```

### First Processing Step

**Processing Pipeline:**

1. `compile()` → `normalize()` → minimal transform on predicates
2. `buildModel()` → creates model tree structure
3. `model.parse()` → parses transforms into dataflow nodes
4. **FilterNode/CalculateNode construction** → stores predicates/expressions
5. **Expression generation** → converts predicates to strings

**Key Function Trace:**

```
compile()
  → normalize() [predicate.ts:normalizePredicate()]
    → buildModel()
      → model.parse() [parse.ts:parseTransformArray()]
        → new FilterNode() / new CalculateNode()
          → expression() [predicate.ts:expression()]
```

### Validation Strategy

**CRITICAL FINDING: No validation of expression strings.**

- String predicates: Pass through unchanged at every stage
- Calculate expressions: Stored and used directly
- Only "validation" occurs in `getDependentFields()` which parses AST via vega-expression for dependency extraction (not security/correctness validation)
- Expression strings flow from user input → Vega output untouched

**Security Model:** Vega-Lite treats user-provided expressions as trusted code. No sanitization, escaping, or validation occurs.

---

## Phase 3: Parsing Mechanism

### Parsing Approach

**None for string expressions** - Vega-Lite does NOT implement its own parser.

Two paths exist:

1. **Raw expression strings** → Passed through unchanged
2. **Field predicate objects** → Converted to expression strings via template literals

### External Library: vega-expression

**Import:** `import {parseExpression} from 'vega-expression';`
**Usage:** Only in `src/compile/data/expressions.ts:getDependentFields()`
**Purpose:** Extract field dependencies (not validation, not transformation)

### AST Structure (from vega-expression)

From examining `expressions.ts:3-40`:

```typescript
// AST node types observed:
-'Identifier' - // Variable names
  'Literal' - // Values
  'MemberExpression'; // Property access (e.g., datum.field)

// AST has visit() method for traversal
ast.visit((node: any) => {
  /* visitor function */
});
```

**AST Usage in Vega-Lite:**

- Parse expression → get AST
- Visit all `MemberExpression` nodes
- Filter for those starting with `datum`
- Extract field names

**Example:** `datum.sales > 1000` → extracts `"sales"` as dependent field

### Field Predicate → Expression String Conversion

**Function:** `fieldFilterExpression()` in `src/predicate.ts:205-257`

**Method:** String template concatenation with helper functions

**Examples from code:**

```typescript
// Equal predicate: {field: "x", equal: 5}
`${fieldExpr}===${predicateValueExpr(predicate.equal, unit)}`
// → "datum['x']===5"

// Less than: {field: "x", lt: 10}
`${fieldExpr}<${predicateValueExpr(upper, unit)}`
// → "datum['x']<10"

// Range: {field: "x", range: [0, 100]}
`inrange(${fieldExpr}, [${lower}, ${upper}])`
// → "inrange(datum['x'], [0, 100])"

// One of: {field: "status", oneOf: ["active", "pending"]}
`indexof([${values.join(',')}], ${fieldExpr}) !== -1`
// → "indexof(['active','pending'], datum['status']) !== -1"

// Valid: {field: "x", valid: true}
`isValid(${fieldExpr}) && isFinite(+${fieldExpr})`;
```

### Key Helper Functions

**vgField()** - Generates field access expression:

- Simple fields: `datum.fieldName`
- Fields with spaces/special chars: `datum['field name']`
- With timeUnit: wraps in time functions

**valueExpr()** - Converts values to expression literals:

- Numbers: `5` → `"5"`
- Strings: `"text"` → `"'text'"` (escapes quotes)
- DateTime objects: `{year: 2020}` → `datetime(2020, 0, 1, ...)`
- ExprRef: `{expr: "x + 1"}` → `"x + 1"` (pass through)

### No Tokenization

Vega-Lite does NOT tokenize expressions. It only:

1. Accepts complete expression strings from users
2. Builds complete expression strings from predicates
3. Uses vega-expression to parse ASTs for analysis (not for execution)

### Visitor Pattern

The vega-expression AST supports visitor traversal:

```typescript
ast.visit((node: any) => {
  if (node.type === 'MemberExpression' && startsWithDatum(node)) {
    // Extract field name
  }
});
```

Vega-Lite uses this only for dependency extraction, not for transformation.

---

## Phase 4: Column Reference Handling

### Datum Reference Syntax

**Primary:** `datum` is the standard row object reference in Vega expressions

**Generated by Vega-Lite:** When converting field predicates to expressions, Vega-Lite uses `datum["fieldname"]` format

**Function:** `flatAccessWithDatum()` in `src/util.ts:295-297`:

```typescript
export function flatAccessWithDatum(
  path: string,
  datum: 'datum' | 'parent' | 'datum.datum' = 'datum'
) {
  return `${datum}[${stringValue(splitAccessPath(path).join('.'))}]`;
}
```

### Bracket Notation Support

**Always uses bracket notation** for field access in generated expressions.

**Examples from tests** (`test/util.test.ts:143-159`):

```typescript
flatAccessWithDatum('foo')           → 'datum["foo"]'
flatAccessWithDatum('foo.bar')       → 'datum["foo.bar"]'  // nested/dotted fields
flatAccessWithDatum('y\\[foo\\]')    → 'datum["y[foo]"]'   // escaped brackets
flatAccessWithDatum('foo', 'parent') → 'parent["foo"]'     // custom datum
```

**Why bracket notation:**

- Handles field names with spaces: `datum["Total Sales"]`
- Handles field names with special characters: `datum["price-usd"]`
- Handles nested paths: `datum["address.city"]` (flattened)
- Consistent format regardless of field name complexity

### User-Provided Expression Syntax

**Users can write expressions freely** and reference columns however they want:

- `datum.sales > 1000` (dot notation)
- `datum["Total Sales"] > 1000` (bracket notation)
- `datum['region'] == "North"` (single quotes)

**No enforcement** of syntax style for user-provided strings.

### Column Name Validation

**FINDING: No validation against schema.**

- Field names in predicates are NOT checked against available columns
- No compile-time or runtime validation that fields exist
- Typos in field names will pass through silently
- Invalid field references only fail at Vega runtime (when expression executes)

**Tested:** No tests found for non-existent fields, unknown columns, or typos

**Implication:** Vega-Lite assumes users know their data structure and will catch errors at visualization time.

### Special Character Handling

**From `vgField()` function** (`src/channeldef.ts:806-868`):

Field names are processed through:

1. **splitAccessPath()** - Parses field paths, respecting escaped characters
2. **flatAccessWithDatum()** - Wraps in bracket notation with proper quoting
3. **stringValue()** - Escapes the field name for use in expression string

**Escaping mechanism:**

- Backslash escapes: `foo\.bar` → treated as single field name `"foo.bar"`
- Bracket escapes: `y\\[foo\\]` → `"y[foo]"`

### Path Flattening

Vega-Lite **flattens nested field paths** during compilation:

- Input schema: `{address: {city: "NYC"}}`
- Field reference: `address.city`
- Generated expression: `datum["address.city"]`
- Assumes data is flattened before reaching Vega runtime

---

## Phase 5: Operator Handling

### Boolean Operators

**Declarative Syntax** (field predicates):

```typescript
{and: [predicate1, predicate2]}  → "(pred1) && (pred2)"
{or: [predicate1, predicate2]}   → "(pred1) || (pred2)"
{not: predicate}                  → "!(pred)"
```

**Implementation:** `logicalExpr()` in `src/util.ts:244-254`

**String Output:**

- `and` → `&&` (JavaScript logical AND)
- `or` → `||` (JavaScript logical OR)
- `not` → `!` (JavaScript logical NOT)

**Parenthesization:** Automatic wrapping for grouping:

```typescript
{and: [a, b, c]} → "((a) && (b) && (c))"
{or: [a, b]}     → "((a) || (b))"
```

**User Expression Strings:** Can use any JavaScript boolean operators:

- `&&`, `||`, `!`
- Word forms like `and`, `or` NOT supported (unless Vega runtime supports them)

### Equality Operators

**Field Predicates:**

- `{field: "x", equal: value}` → `datum["x"]===value` (strict equality `===`)

**No inequality predicate** - users must write expression strings for `!=` or `!==`

**User Expression Strings:** Can use:

- `==` (loose equality)
- `===` (strict equality)
- `!=` (loose inequality)
- `!==` (strict inequality)

### Comparison Operators

**Field Predicates** (from `src/predicate.ts:217-230`):

```typescript
{field: "x", lt: 10}   → "datum['x']<10"
{field: "x", lte: 10}  → "datum['x']<=10"
{field: "x", gt: 10}   → "datum['x']>10"
{field: "x", gte: 10}  → "datum['x']>=10"
```

**User Expression Strings:** Can use any comparison operators: `<`, `>`, `<=`, `>=`

### Special Operators

**Range Check** (field predicate):

```typescript
{field: "x", range: [0, 100]} → "inrange(datum['x'], [0, 100])"
```

Falls back to: `datum['x'] >= 0 && datum['x'] <= 100` when `useInRange=false`

**Set Membership** (field predicate):

```typescript
{field: "x", oneOf: [1, 2, 3]} → "indexof([1,2,3], datum['x']) !== -1"
```

**Validity Check** (field predicate):

```typescript
{field: "x", valid: true}  → "isValid(datum['x']) && isFinite(+datum['x'])"
{field: "x", valid: false} → "!isValid(datum['x']) || !isFinite(+datum['x'])"
```

### Operator Precedence

**No precedence table** - precedence is implicit:

1. **For field predicates:** Structure is tree-based, no ambiguity
   - `{and: [{field: "x", gt: 0}, {or: [a, b]}]}` - nesting defines order

2. **For user expressions:** JavaScript's native precedence applies
   - `datum.x > 0 && datum.y < 10 || datum.z == 5` - JS rules apply

3. **Generated expressions:** Heavily parenthesized to avoid ambiguity
   - Logical operations wrapped: `((a) && (b))`
   - Ensures predictable evaluation regardless of JS precedence

### Precedence Handling Mechanism

**Hardcoded via function structure** in `logicalExpr()`:

- NOT: Wraps in `!(...)`
- AND: Joins with `) && (`
- OR: Joins with `) || (`

**Not configurable** - no user-facing precedence settings.

### User-Friendly Aliases

**NONE in Vega-Lite** for expression strings.

**Field predicates provide aliases:**

- `{field: "x", equal: 5}` instead of writing `datum.x === 5`
- `{field: "x", lt: 10}` instead of writing `datum.x < 10`
- `{and: [...]}` instead of writing `... && ...`

**Benefits:**

- Declarative, no need to learn expression syntax
- Type-safe (TypeScript checks predicate structure)
- Less error-prone

---

## Phase 6: Function Support

### Built-in Functions

**Vega-Lite does NOT define functions** - it relies entirely on Vega runtime.

**Functions used in generated expressions** (from `src/predicate.ts`):

| Function     | Purpose              | Example Usage                         |
| ------------ | -------------------- | ------------------------------------- |
| `time()`     | Convert to timestamp | `time(timeUnitFieldExpr(...))`        |
| `inrange()`  | Range check          | `inrange(datum['x'], [0, 100])`       |
| `indexof()`  | Array search         | `indexof([1,2,3], datum['x']) !== -1` |
| `isValid()`  | Null/undefined check | `isValid(datum['x'])`                 |
| `isFinite()` | Numeric finiteness   | `isFinite(+datum['x'])`               |

**Note:** These functions are Vega runtime functions, not JavaScript built-ins (except `isFinite`).

### Function Call Syntax

**Standard syntax:** `functionName(arg1, arg2, ...)`

**Examples from generated expressions:**

```javascript
time(year(datum['date']));
inrange(datum['value'], [0, 100]);
indexof(['a', 'b'], datum['category']);
isValid(datum['field']);
```

**No method-style calls** - Vega-Lite doesn't use `datum.field.method()` syntax.

### Custom Function Registration

**NOT SUPPORTED** in Vega-Lite.

**Reasoning:**

- Vega-Lite is a compiler, not a runtime
- Expression evaluation happens in Vega runtime
- Custom functions would need to be registered with Vega, not Vega-Lite

**Workaround for users:**

1. Write raw expression strings calling any Vega-registered function
2. Register custom functions with Vega runtime directly (outside Vega-Lite)
3. Use calculate transforms to compose complex expressions

### Extension Mechanism for Functions

**None in Vega-Lite itself.**

**Vega provides:** `vega.expressionFunction(name, fn)` for registering custom functions

**Vega-Lite relationship:**

- Passes through expression strings to Vega
- Users can call any function available in Vega runtime
- No validation that function exists (fails at Vega runtime if missing)

### TimeUnit Functions

**Special case:** Vega-Lite generates time-related function calls when `timeUnit` is specified in predicates.

**Example from `predicate.ts:214`:**

```typescript
// Field predicate with timeUnit
{field: "date", timeUnit: "year", equal: 2020}

// Generates
`time(year(datum['date']))===2020`
```

**Time functions generated:**

- `year()`, `month()`, `date()`, `hours()`, `minutes()`, `seconds()`
- `quarter()`, `week()`, `day()`
- Wrapped in `time()` for consistent comparison

### Calculate Transform and Functions

**Calculate transforms** can use any Vega expression functions:

```json
{
  "calculate": "upper(datum.name)",
  "as": "name_upper"
}
```

**Vega-Lite passes this through unchanged** to Vega runtime.

**Common functions users might call:**

- String: `upper()`, `lower()`, `length()`, `substring()`, `trim()`
- Math: `abs()`, `ceil()`, `floor()`, `round()`, `sqrt()`, `pow()`
- Date: `year()`, `month()`, `date()`, `hours()`, `now()`
- Logic: `if()` (ternary alternative)

---

## Phase 7: Error Handling

### Error Types

**Minimal error handling** for expressions in Vega-Lite.

**Only explicit error** in expression/predicate code:

- `src/predicate.ts:256`: `throw new Error(`Invalid field predicate: ${stringify(predicate)}`)`
- Thrown when `fieldFilterExpression()` receives an unknown predicate type
- **Commented:** `/* istanbul ignore next: it should never reach here */`
- Indicates this is a defensive fallback, not expected in normal operation

### Error Message Quality

**Generic JavaScript Error** - no custom error classes for expressions.

**Message format:**

```typescript
throw new Error(`Invalid field predicate: ${stringify(predicate)}`);
```

**Characteristics:**

- **No position information** - doesn't indicate where in expression the error occurred
- **Technical format** - shows stringified predicate object (developer-facing)
- **No suggestions** - doesn't tell user how to fix

**Example:**

```
Error: Invalid field predicate: {"field":"x","unknown":5}
```

### Error Recovery

**Fail-fast strategy** - no recovery mechanism.

**Behavior:**

1. Invalid predicate → throws error → compilation stops
2. No collection of multiple errors
3. No partial compilation
4. User must fix error and retry

### Expression String Errors

**No validation at compile time** for user-provided expression strings.

**Error discovery happens at Vega runtime:**

- Syntax errors: `datum.x >` (incomplete) → Vega parser fails
- Reference errors: `datum.nonexistent > 5` → Vega runtime returns undefined
- Type errors: `datum.string + 5` → JavaScript coercion applies

**Vega-Lite position:** Trust expression strings, let Vega handle validation

### Logging System

**Vega-Lite uses vega-util logger** (`src/log/index.ts`):

**Log levels:**

- `Error` - Throws exception (fatal)
- `Warn` - Logs warning (continues)
- `Info` - Informational message
- `Debug` - Verbose debugging

**Default level:** `Warn`

**Usage:** Minimal logging related to expressions

- No warnings for potentially invalid expressions
- No warnings for missing fields
- No warnings for type mismatches

### Expression Parsing Errors

**getDependentFields()** (`src/compile/data/expressions.ts:29-40`) calls `parseExpression()`:

```typescript
export function getDependentFields(expression: string) {
  const ast = parseExpression(expression); // Can throw!
  // ... visitor code
}
```

**No try/catch** - errors propagate up:

- Invalid syntax → vega-expression throws → Vega-Lite compilation fails
- Error is not caught, transformed, or enhanced
- User sees raw vega-expression error

### Error Position Tracking

**NONE** in Vega-Lite.

**For field predicates:** Errors show entire predicate object, no line/column info

**For expression strings:**

- No tracking of where expression came from in spec
- Vega-expression may include position in its errors (not tested)
- Vega-Lite doesn't preserve or enhance position information

### Test Coverage of Errors

**Minimal testing** of error cases:

**From code comment:** `/* istanbul ignore next: it should never reach here */`

- The only explicit error throw is not expected to trigger in normal use
- Defensive programming, not user-facing error handling

**No tests found for:**

- Malformed expressions
- Non-existent fields
- Type mismatches
- Syntax errors

**Test focus:** Successful compilation paths, not error paths

### User Experience Implications

**For invalid predicates:** Clear immediate failure with technical message

**For invalid expressions:**

- Silent acceptance at compile time
- Failure at Vega runtime
- User must debug in browser console
- No helpful error messages from Vega-Lite layer

**Design philosophy:** Minimal validation = faster compilation, but debugging burden on users

---

## Phase 8: Edge Cases via Tests

### Test File Analysis

**Primary test file:** `test/predicate.test.ts` (265 lines)

**Comprehensive coverage** of field predicate → expression conversion.

### Edge Cases Tested

#### 1. Empty/Missing Values

- **Range with no lower bound:** `{field: "x", range: [null, 5]}` → `datum["x"] <= 5`
- **Range with no upper bound:** `{field: "x", range: [0, null]}` → `datum["x"] >= 0`
- **Range with no bounds:** `{field: "x", range: [null, null]}` → `"true"` (always matches)
- **Validity check:** `{field: "x", valid: true}` → `isValid(datum["x"]) && isFinite(+datum["x"])`

**Note:** No tests for null/undefined values in equality comparisons.

#### 2. Data Types

**String comparisons:**

```typescript
{field: "x", equal: "red"}        // String equality
{field: "x", oneOf: ["red", "yellow"]}  // String array
{field: "x", lt: "zyzzyva"}       // String comparison (alphabetical)
{field: "x", gt: "aardvark"}      // String comparison
```

**Numeric comparisons:**

```typescript
{field: "x", equal: 5}
{field: "x", range: [0, 5]}
{field: "x", lt: 1}
{field: "x", gte: 1}
```

**DateTime objects:**

```typescript
{field: "date", equal: {month: "January"}}
{field: "date", lt: {month: "February"}}
// Generates: datetime(2012, 0, 1, 0, 0, 0, 0)
```

**No tests for:**

- Boolean values
- Mixed-type comparisons (number vs string)
- Scientific notation numbers
- Very large/small numbers
- Unicode strings

#### 3. Field Names

**Standard names:** `"x"`, `"color"`, `"date"` - all use bracket notation: `datum["x"]`

**No tests for:**

- Field names with spaces: `"Total Sales"`
- Field names with special characters: `"price-usd"`, `"value%"`
- Field names with quotes: `"name\"quoted\"`
- Field names that are JS keywords: `"class"`, `"return"`
- Unicode field names: `"价格"`, `"Цена"`
- Very long field names

**Note:** Testing at util level (flatAccessWithDatum) covers these, but not in predicate tests.

#### 4. Nested Compositions

**Logical NOT:**

```typescript
{not: {field: "color", equal: "red"}}
→ "!(datum["color"]===\"red\")"
```

**Logical AND:**

```typescript
{and: [
  {field: "color", equal: "red"},
  {field: "x", range: [0, 5]}
]}
→ "(datum["color"]===\"red\") && (inrange(datum["x"], [0, 5]))"
```

**Complex nesting:**

```typescript
{and: [
  {field: "color", oneOf: ["red", "yellow"]},
  {or: [
    {field: "x", range: [0, null]},
    "datum.price > 10",
    {not: 'datum["x"]===5'}
  ]}
]}
→ "(indexof([\"red\",\"yellow\"], datum[\"color\"]) !== -1) && " +
  "((datum[\"x\"] >= 0) || (datum.price > 10) || (!(datum[\"x\"]===5)))"
```

**Observation:** Heavily parenthesized to ensure correct precedence.

#### 5. Expression String Pass-Through

**Raw expression tests:**

```typescript
'datum["x"]===5'  → 'datum["x"]===5'  (unchanged)
'datum.price > 10' → 'datum.price > 10' (unchanged)
```

**Mixed in compositions:**

- Expression strings can be leaves in and/or/not trees
- No validation or transformation applied
- Different quote styles preserved: `datum["x"]` vs `datum.price`

#### 6. DateTime and TimeUnit

**DateTime without timeUnit:**

```typescript
{field: "date", equal: {month: "January"}}
→ 'datum["date"]===time(datetime(2012, 0, 1, 0, 0, 0, 0))'
```

**DateTime with timeUnit:**

```typescript
{timeUnit: "month", field: "date", equal: {month: "January"}}
→ 'time(datetime(2012, month(datum["date"]), 1, 0, 0, 0, 0))===time(datetime(2012, 0, 1, 0, 0, 0, 0))'
```

**Flat month name:**

```typescript
{timeUnit: "month", field: "date", equal: "January"}
→ 'time(datetime(2012, month(datum["date"]), 1, 0, 0, 0, 0))===time(datetime(2012, 0, 1, 0, 0, 0, 0))'
```

**Complex time handling** - wraps both sides in `time()` for consistent comparison.

#### 7. Signal References

**Dynamic range:**

```typescript
{field: "x", range: {signal: "r"}}
→ 'inrange(datum["x"], [r[0], r[1]])'
```

**Signal unpacking** for dynamic values from Vega signals.

#### 8. useInRange Parameter

**Default (useInRange=true):**

```typescript
{field: "x", range: [0, 5]}
→ 'inrange(datum["x"], [0, 5])'
```

**Alternative (useInRange=false):**

```typescript
{field: "x", range: [0, 5]}
→ 'datum["x"] >= 0 && datum["x"] <= 5'
```

**Purpose:** Compatibility with contexts where `inrange()` function may not be available.

### Edge Cases NOT Tested

**Missing from test suite:**

- Empty expression strings: `""`
- Expression strings with unmatched quotes: `'datum["x]'`
- Expression strings with unbalanced parentheses: `(datum.x > 5`
- Very deeply nested logical compositions (10+ levels)
- Predicates with both field and param (invalid combination)
- Circular or self-referential predicates
- Arrays with mixed types in `oneOf`: `[1, "two", true]`
- Negative numbers in scientific notation: `-1.5e-10`
- Infinity or NaN in numeric comparisons

**Implication:** Test focus is on correct compilation of valid inputs, not robustness against malformed inputs.

### Test Quality Observations

**Strengths:**

- Comprehensive coverage of all predicate types
- Tests of logical composition combinations
- DateTime handling well-tested
- Signal integration tested

**Gaps:**

- No negative tests (intentionally invalid inputs)
- No tests of field name edge cases in predicate context
- No tests of error messages or error handling
- No performance tests (large predicates, deep nesting)

---

## Phase 9: Ideas and Warnings

### Ideas to Adopt for Syto

#### 1. **Declarative Predicate Objects as Primary API**

**Vega-Lite's approach:** Structured predicate objects instead of forcing users to write expressions.

```typescript
{field: "sales", gt: 1000}  // vs "sales > 1000"
{field: "region", oneOf: ["North", "South"]}  // vs complex expression
{and: [pred1, pred2]}  // vs "pred1 && pred2"
```

**Benefits for Syto:**

- **Lower barrier to entry** - users don't need to learn expression syntax
- **Type-safe in TypeScript** - catch errors at design time
- **Easier to validate** - structured data is easier to check than parsing strings
- **GUI-friendly** - predicate objects map naturally to form inputs
- **Less error-prone** - no syntax errors, quote matching, etc.

**Adoption strategy:**

- Make predicate objects the primary API in Syto UI
- Generate Arquero expressions from predicates (like Vega-Lite generates Vega expressions)
- Allow advanced users to write raw expressions as escape hatch

#### 2. **Bracket Notation for All Field References**

**Vega-Lite approach:** Always use `datum["fieldname"]` instead of `datum.fieldname`

**Why it works:**

- Handles spaces: `datum["Total Sales"]`
- Handles special chars: `datum["price-usd"]`
- Handles keywords: `datum["class"]`
- Consistent regardless of field name complexity

**Adoption for Syto:**

- Always generate bracket notation from Syto's filter/derive UI
- Accept both styles in advanced expression mode
- Convert user's dot notation to bracket notation when processing

#### 3. **Logical Composition as Tree Structure**

**Vega-Lite approach:** Nested objects for boolean logic

```typescript
{
  and: [{ or: [a, b] }, { not: c }];
}
```

**Benefits:**

- **No operator precedence issues** - structure defines order
- **Easy to manipulate** - add/remove/reorder conditions programmatically
- **Visual representation** - can render as tree in UI
- **Serialization-friendly** - JSON-native structure

**Adoption for Syto:**

- Use similar structure for complex filters
- UI can show collapsible groups: "Match ALL of:" / "Match ANY of:"
- Each group can be nested

#### 4. **Compile-Time Expression Generation**

**Vega-Lite approach:** Generate expressions during compilation, not at runtime

**Benefits:**

- **Catch errors early** - structural issues found before execution
- **Optimize once** - don't regenerate expressions on every row
- **Debugging** - can inspect generated expressions
- **Performance** - no runtime parsing overhead

**Adoption for Syto:**

- Generate Arquero functions from predicates before applying to data
- Cache generated functions
- Show generated expression in UI (read-only panel like Vega-Lite's JSON viewer)

#### 5. **Heavy Parenthesization in Generated Code**

**Vega-Lite approach:** Wrap everything in parentheses

```typescript
(a && b) || (c && d);
```

**Why:**

- Eliminates precedence ambiguity
- Safe even if precedence rules change
- Explicit evaluation order

**Adoption for Syto:**

- When generating expressions from predicates, add extra parentheses
- Doesn't hurt readability much
- Guarantees correctness

#### 6. **Expression Strings as Escape Hatch**

**Vega-Lite approach:** Allow raw strings alongside structured predicates

**Benefits:**

- **Power users** can write complex logic
- **Gradual learning** - start with predicates, advance to expressions
- **Flexibility** - handle edge cases predicates don't cover

**Adoption for Syto:**

- Predicate builder for 80% of use cases
- "Advanced Expression" mode for the 20%
- Clearly label which mode user is in

#### 7. **Pass-Through Philosophy**

**Vega-Lite approach:** Don't validate user expression strings, trust the runtime

**Pros:**

- Simple implementation
- No need to replicate Vega's expression validator
- Always compatible with latest Vega features

**Cons:**

- Errors discovered late (at Vega runtime)
- Poor user experience for debugging

**Recommendation for Syto:**

- **OPPOSITE approach for Syto** - validate early since Syto runs in browser
- Syto can afford validation since it controls the runtime (Arquero)
- Catch errors before applying to data

### Warnings to Heed

#### 1. **No Validation = Poor UX**

**Vega-Lite problem:** Expression errors only surface at Vega runtime

**For Syto:**

- **DO validate** expressions before applying
- Show syntax errors immediately in UI
- Highlight non-existent field names
- Preview first few results before committing

#### 2. **No Field Name Validation**

**Vega-Lite problem:** Typos in field names pass through silently

**For Syto:**

- **DO validate** field names against current dataset schema
- Show autocomplete for field names
- Warn when field doesn't exist
- Suggest similar field names for typos

#### 3. **Generic Error Messages**

**Vega-Lite problem:** Technical errors, no actionable guidance

**For Syto:**

- User-friendly error messages: "The field 'Slaes' doesn't exist. Did you mean 'Sales'?"
- Show where error occurred (highlight in UI)
- Provide suggestions for fixing

#### 4. **Minimal Test Coverage of Error Cases**

**Vega-Lite observation:** Tests focus on happy path

**For Syto:**

- **DO test** error cases thoroughly
- Test malformed inputs
- Test edge cases (empty data, null values, etc.)
- Ensure graceful degradation

#### 5. **DateTime Complexity**

**Vega-Lite observation:** TimeUnit handling adds significant complexity

**For Syto:**

- **Postpone** advanced date handling to later phases
- Start with simple date comparisons
- Add timeUnit features only if users demand them
- Consider using Arquero's date functions instead of reimplementing

#### 6. **No Type Coercion Handling**

**Vega-Lite approach:** Relies on JavaScript's implicit coercion

**For Syto:**

- **BE EXPLICIT** about type coercion rules
- Warn when comparing different types: `sales > "100"` (number vs string)
- Provide type conversion functions: `toNumber()`, `toString()`
- Document coercion behavior clearly

### Applicability to Syto

#### Can Be Directly Reused

1. **Predicate type definitions** - Copy the TypeScript interfaces
2. **Logical composition structure** - Use same and/or/not pattern
3. **Bracket notation approach** - Same field reference strategy
4. **Parenthesization strategy** - Same expression building approach

#### Needs Adaptation

1. **Expression generation target:**
   - Vega-Lite → Vega expression strings
   - Syto → Arquero table methods or functions

2. **DateTime handling:**
   - Vega-Lite → Vega's datetime() and time() functions
   - Syto → Arquero's op.year(), op.month(), or JavaScript Date

3. **Function library:**
   - Vega-Lite → Vega expression functions
   - Syto → Arquero operations (op.\*)

4. **Validation strategy:**
   - Vega-Lite → Minimal (trust runtime)
   - Syto → Comprehensive (validate before executing)

#### Should Be Avoided

1. **No validation of expressions** - Syto should validate
2. **No field name checking** - Syto should check against schema
3. **Generic error messages** - Syto should provide helpful guidance
4. **Pass-through philosophy** - Syto should catch errors early

### Key Architectural Lessons

#### 1. Compilation Model Works Well

**Vega-Lite lesson:** Compilation (spec → executable) is a clean separation

**For Syto:**

- UI → Workflow JSON → Arquero operations → Results
- Each stage has clear responsibilities
- Easier to test, debug, and extend

#### 2. Dual API Strategy

**Vega-Lite lesson:** Structured predicates + expression strings = flexibility + power

**For Syto:**

- Beginners use predicate builder (GUI forms)
- Advanced users write expressions
- Both compile to same Arquero operations

#### 3. JSON as Intermediate Format

**Vega-Lite lesson:** JSON specs are portable, inspectable, version-controllable

**For Syto:**

- Workflow JSON can be exported, shared, version-controlled
- Readable by humans and machines
- Schema can evolve with versioning

#### 4. Trust Your Runtime

**Vega-Lite lesson:** Don't reimplement what runtime provides

**For Syto:**

- Use Arquero's full feature set
- Don't reimplement filtering, aggregation, etc.
- Generate code that calls Arquero, don't replicate its logic

### Specific Code Patterns to Adopt

#### Pattern 1: Field Expression Generator

```typescript
// From Vega-Lite's vgField + flatAccessWithDatum
function fieldExpr(fieldName: string): string {
  // Always use bracket notation for safety
  return `d["${fieldName.replace(/"/g, '\\"')}"]`;
}
```

#### Pattern 2: Predicate to Expression

```typescript
// Inspired by Vega-Lite's fieldFilterExpression
function predicateToArqueroExpr(pred: Predicate): string {
  if (pred.equal !== undefined) {
    return `${fieldExpr(pred.field)} === ${valueExpr(pred.equal)}`;
  }
  if (pred.gt !== undefined) {
    return `${fieldExpr(pred.field)} > ${valueExpr(pred.gt)}`;
  }
  // ... other predicates
}
```

#### Pattern 3: Logical Composition

```typescript
// From Vega-Lite's logicalExpr
function composeLogic(op: LogicalComposition<Predicate>): string {
  if ('not' in op) {
    return `!(${composeLogic(op.not)})`;
  }
  if ('and' in op) {
    return op.and.map(composeLogic).join(' && ');
  }
  if ('or' in op) {
    return op.or.map(composeLogic).join(' || ');
  }
  return predicateToArqueroExpr(op);
}
```

### Implementation Priorities for Syto Phase 1

**High Priority (copy Vega-Lite's approach):**

1. Predicate type definitions for common operations (equal, lt, gt, range, oneOf)
2. Logical composition (and, or, not)
3. Bracket notation for all field references
4. Expression generation from predicates

**Medium Priority (adapt Vega-Lite's approach):**

1. Expression string pass-through (but add validation)
2. Field name validation against schema (Vega-Lite doesn't do this)
3. Helpful error messages (Vega-Lite doesn't do this)

**Low Priority (consider in later phases):**

1. DateTime/TimeUnit support (complex, defer to Phase 3)
2. Signal-like dynamic values (if needed for Syto use cases)
3. Custom comparison functions beyond standard operators

---
