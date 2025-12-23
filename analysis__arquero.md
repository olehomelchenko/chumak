# Arquero Analysis

## Orientation

- **Source location:** `/src/`, ES modules (type: module)
- **Expression-related paths:**
  - `src/expression/` - core expression handling
    - `parse.js` - main entry point
    - `parse-expression.js` - expression parsing with acorn
    - `codegen.js` - AST to code generation
    - `compile.js` - code to function compilation
    - `rewrite.js` - column reference optimization
    - `ast/` - AST utilities and constants
  - `src/op/` - operation functions (aggregate, window, standard)
  - `src/verbs/` - table transformation verbs
- **Terminology used:** "expressions", "table expressions", "operators" (for agg/window ops), "fields" (columns)
- **Language/module system:** JavaScript ES modules, TypeScript types available

## Entry Point

- **Public API:**
  - Table verb methods: `filter(criteria)`, `derive(values)`, `groupby()`, `rollup()`, etc.
  - `parse(input, options)` - can be used directly, exported in public API
- **Input types:**
  - **Primary: Arrow functions** - `d => d.sales > 1000`
  - **Tagged template alternative:** `rolling(expr, frame)` helper
  - **Field helper objects:** `field('colname')` creates wrapped reference
  - **Arrays** - converted to string via `toString()`
- **First processing step:**
  - Verbs call `parse(input, { table })`
  - `parse()` iterates over input object, calling `parseExpression()` for each value
  - `parseExpression()` uses acorn to parse JS, then walks/rewrites AST

## Parsing

- **Approach:** **Acorn parser + AST rewriting**
  1. Wrap expression in `expr=(...)` for parsing context
  2. Parse with acorn (ecmaVersion: 11) to get standard JavaScript AST
  3. Walk AST with custom visitors to rewrite nodes:
     - Column references → Column nodes
     - Op function calls → Op nodes
     - Constants → Constant nodes
  4. Generate code from rewritten AST
  5. Compile code to function using `Function()` constructor
- **Key files:**
  - `parse-expression.js` (350 lines) - AST parsing and rewriting
  - `codegen.js` (144 lines) - visitor pattern for code generation
  - `compile.js` (15 lines) - Function() constructor wrapper
  - `parse.js` (119 lines) - orchestration and optimization
  - `ast/walk.js` - AST traversal utility
- **AST structure:**
  - Uses acorn's standard JavaScript AST nodes
  - Custom node types for rewritten nodes: `Column`, `Op`, `Constant`, `Parameter`, `Dictionary`, `Function`
  - Nodes have `.type`, `.name`, `.table` (index), `.array` (optimization flag)

## Column References

- **Datum syntax:**
  - **Default:** `d` (configurable via function parameter)
  - **Join expressions:** `d1` and `d2` for two tables
  - **Parameter access:** `$` for params object
- **Bracket notation:**
  - **Fully supported:** `d['Column Name']` or `d["Column Name"]`
  - **Dynamic (computed):** `d[expr]` - evaluates expression at parse time if possible
  - **Parameter-based:** `d[$.col]` where `$.col` references a param
- **Validation:**
  - **Optional validation:** If `table` option provided, checks column exists
  - **Error on invalid:** Throws with message "Invalid column reference"
  - **No validation:** If no table provided, assumes column exists

## Operators

- **Supported:**
  - **All JavaScript operators:** `+`, `-`, `*`, `/`, `%`, `**`
  - **Comparison:** `>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`
  - **Logical:** `&&`, `||`, `!`
  - **Bitwise:** `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
  - **Conditional:** `? :`
  - **Optional chaining:** `?.`
- **Aliases:** None - uses JavaScript operators directly
- **Precedence handling:** **Inherited from JavaScript**
  - Uses acorn's parser which respects JS precedence
  - Codegen adds parentheses liberally to preserve semantics

## Functions

- **Built-ins:**
  - **Aggregate:** `count`, `sum`, `mean`, `median`, `mode`, `min`, `max`, `variance`, `stdev`, `distinct`, `valid`, `invalid`, etc. (~40 aggregate ops)
  - **Window:** `row_number`, `rank`, `dense_rank`, `lead`, `lag`, `first_value`, `last_value`, `nth_value`, `ntile`, etc. (~15 window ops)
  - **Standard:**
    - Math: `abs`, `sqrt`, `pow`, `exp`, `log`, `sin`, `cos`, etc. (~30 functions)
    - String: `lower`, `upper`, `substring`, `trim`, `replace`, `match`, `split`, etc. (~20 functions)
    - Date: `year`, `month`, `day`, `dayofyear`, `date`, `timestamp`, etc. (~15 functions)
    - Array: `length`, `includes`, `join`, `reverse`, etc.
    - Object: `entries`, `keys`, `values`
    - JSON: `parse_json`, `to_json`
    - Type: `is_array`, `is_date`, `is_finite`, `is_nan`, `is_object`, etc.
- **Registration:**
  - `addFunction(name, fn, options)` - register standard function
  - `addAggregateFunction(name, def, options)` - register aggregate op
  - `addWindowFunction(name, def, options)` - register window op
  - Checks for name conflicts unless `override: true`
  - Cannot override reserved names like `row_object`
- **Syntax:**
  - **Global names:** `mean(d.sales)` (works via AST rewriting)
  - **Op object:** `op.mean(d.sales)` (recommended, explicit)
  - **Nested:** `aq.op.mean(d.sales)` (also supported)
  - **Math object:** `Math.sqrt(d.x)` (rewritten to `fn.sqrt`)

## Error Handling

- **Error types:**
  - Parse errors from acorn (wrapped)
  - Custom validation errors for unsupported constructs
  - Column reference errors
  - Function call errors
  - Operator parameter errors
- **Message quality:** **Technical, brief, with code snippet**
  - Format: `"ErrorType: \"code snippet\"[optional note]"`
  - Example: `"Invalid column reference: \"d.foo\""`
  - Position info: Uses AST node `.start` and `.end` offsets (offset by 6 due to `expr=()` wrapper)
  - Notes: Some errors append helpful notes about using escape() or params()
  - **No user-friendly suggestions** - assumes developer audience
- **Recovery:** **Fail fast**
  - First error throws immediately
  - No error recovery
  - No collection of multiple errors

## Edge Cases Tested

From `test/expression/parse-test.js` (650+ lines):

- **Numeric literals:** integers, decimals, scientific notation (1e-5)
- **String literals:** double quotes, single quotes (via JS)
- **Boolean literals:** true, false
- **Constants:** undefined, Infinity, NaN, Math.E, Math.PI, etc.
- **Arrays:** `[1,2,3]`
- **Objects:** `{a:1}`, `{"b":2}`, computed properties `{[d.x]: d.y}`
- **Nested member access:** `d.x.y`, `d['x'].y`, `d['x']['y']`
- **Indirect column names:** `d['x' + 'y']` (evaluated at parse time)
- **Parameter references:** `d[$.col]` where $.col comes from params
- **Template literals:** `` `${d.x} + ${d.y}` ``
- **Block statements:** `{ const s = op.sum(d.a); return s * s; }`
- **If statements:** conditional logic in expressions
- **Switch statements:** multi-case logic
- **Operator parameters:** expressions in op params, e.g., `op.quantile(d.a, op.sqrt(0.25))`
- **Rolling window frames:** `rolling(expr, [-3, 3])`
- **Dictionary column optimization:** rewrites equality checks to dict lookups
- **Security violations:** blocks globalThis, Object, Array, etc.
- **Invalid constructs:** loops, async, await, generators, assignments, closures

## Ideas to Adopt

1. **Acorn for parsing** - Mature, well-maintained JavaScript parser. Handles all JS syntax correctly.

2. **AST rewriting pattern** - Clean separation of concerns:
   - Parse to standard AST
   - Walk and rewrite for domain-specific optimizations
   - Generate code
   - Compile

3. **Default tuple identifier** - Using `d` by default makes simple expressions clean: `d.sales > 1000`

4. **Field helper** - Explicit `field('col')` for programmatic column references is elegant

5. **Extensible function registry** - Clear API for adding custom functions without modifying core

6. **Security-first approach** - Comprehensive blocking of dangerous operations:
   - No access to global objects (Object, Array, Function, etc.)
   - No property method calls on literals/variables
   - No loops (for, while, do-while)
   - No assignments or updates
   - No closures (variables not in scope)

7. **Dictionary column optimization** - Clever rewriting of `col === value` to dictionary lookups for categorical data

8. **Math object support** - Allowing `Math.sqrt()` feels natural, gets rewritten to registered function

9. **Template literals** - Support for `` `${d.x} text ${d.y}` `` is useful for string building

10. **AST output option** - `parse(..., { ast: true })` returns AST instead of compiled function - useful for analysis

## Warnings

1. **High complexity** - AST manipulation requires deep understanding. Not suitable for simple use cases.

2. **Function() constructor security** - While input is validated, using `Function()` inherently risky. Must trust validation.

3. **Assumes JavaScript knowledge** - Users must understand arrow functions, JS operators, precedence. Not beginner-friendly.

4. **Poor error messages** - Technical jargon, no suggestions, no context. Example:
   ```
   "Invalid column reference: \"d.foo\""
   ```
   vs. friendly:
   ```
   "Column 'foo' not found. Did you mean 'Foo'? Available columns: bar, baz, qux"
   ```

5. **No string expressions** - ONLY accepts functions, not string expressions like `"sales > 1000"`. This is intentional for security but limits flexibility.

6. **No runtime column name validation** - If table not passed to parse(), column names aren't validated until execution

7. **Offset-based positions** - Error positions offset by 6 chars (due to `expr=()` wrapper), confusing for users

8. **No type checking** - Expressions aren't type-checked at parse time. Type errors surface at runtime.

9. **No operator overloading** - Can't customize behavior of `+`, `==`, etc. for custom column types

10. **Heavy parenthesization** - Generated code has excessive parens: `((data.a.at(row) + 1) * (data.b.at(row) - 2))`. Readable but verbose.

## Applicability to Chumak

### What can be directly reused?

**Not much directly** - Arquero's approach is tailored for:
- JavaScript developers
- Programmatic data manipulation (APIs, not UI)
- High-performance requirements
- Complex expressions with aggregates, windows, etc.

Chumak targets:
- Non-programmers
- Visual UI-driven transformation
- Simple filter/calculate expressions
- Browser-only deployment

### What needs adaptation?

1. **Expression input** - If adopting Arquero-like syntax, would need to:
   - Support string expressions like `"sales > 1000"`, not just functions
   - Wrap strings in `d => ...` automatically
   - Provide better error messages with position

2. **Simpler parser** - Could use acorn but skip AST rewriting complexity:
   - Parse string to AST
   - Validate (no loops, assignments, etc.)
   - Generate code or interpret directly
   - Skip optimization passes

3. **Column reference syntax** - Arquero's `d.col` could work but:
   - For spaces: `d["Total Sales"]` is awkward in a text input
   - Consider alternative like `[Total Sales]` as first-class syntax
   - Or auto-prefix: user types `sales > 1000`, becomes `d.sales > 1000`

4. **Function calls** - Arquero's `op.sum()` requires knowing it's available:
   - In Chumak UI, functions could be autocompleted
   - Or use plain names: `sum(sales)` - simpler
   - Limit function set to essentials for Phase 1

5. **Error handling** - Must be completely rewritten:
   - User-friendly messages
   - Highlight exact position in input
   - Suggest corrections ("Did you mean...")
   - Show available columns/functions

### What should be explicitly avoided?

1. **AST rewriting complexity** - Unnecessary for Chumak's simpler needs

2. **Function() constructor** - While Arquero validates, consider safer alternatives:
   - Interpret AST directly (slower but safer)
   - Or use Function() but in a Web Worker sandbox

3. **Requiring arrow functions** - Don't force users to write `d => ...`

4. **Aggregate/window operation complexity** - Chumak delegates these to Arquero. Expression parser should just handle simple row-level expressions.

5. **No default column prefix** - Arquero requires `d.col`. For Chumak, could:
   - Auto-detect column names from schema
   - Auto-prefix: `sales > 1000` → `d.sales > 1000`
   - This makes expressions more natural for non-programmers

### Recommended approach for Chumak

**Option A: Lightweight parser (jsep or similar)**
- Parse simple expressions to AST
- Interpret AST or generate Arquero-compatible function
- Simpler, easier to understand
- Good for Phase 1

**Option B: Acorn + minimal rewriting**
- Use acorn for robust parsing
- Walk AST to validate (no loops, etc.)
- Auto-inject column prefix where needed
- Generate function or Arquero expression
- More powerful, but more complex

**Option C: Hybrid**
- Phase 1: Use jsep for simple expressions
- Phase 2+: Upgrade to acorn if more complexity needed
- Allows starting simple, scaling later

**Recommendation: Start with Option A (jsep or filtrex-style parser)**

Arquero is the **execution engine** for Chumak, not the expression parser model to copy.

## Code Snippets of Interest

### Parse entry point
```javascript
// src/expression/parse.js
export function parse(input, opt = {}) {
  const generate = opt.generate || codegen;
  const compiler = opt.compiler || compile;
  const params = getParams(opt);
  // ... iterate over input, parse each expression
  for (const [name, value] of entries(input)) {
    ctx.value(
      name + '',
      value.escape
        ? parseEscape(ctx, value, params)
        : parseExpression(ctx, value)
    );
  }
  return { names, exprs, ops };
}
```

### Column reference rewriting
```javascript
// src/expression/parse-expression.js
MemberExpression(node, ctx, parent) {
  const { object, property } = node;
  if (!is(Identifier, object)) return;
  const { name } = object;

  const index = name === ctx.tuple ? 0
    : name === ctx.tuple1 ? 1
    : name === ctx.tuple2 ? 2
    : -1;

  if (index >= 0) {
    // replace member expression with column ref
    return spliceMember(node, index, ctx, checkColumn, parent);
  }
}
```

### Code generation for column access
```javascript
// src/expression/codegen.js
const visitors = {
  Column: (node, opt) => node.array
    ? get(node, opt)  // data.col[row]
    : ref(node, opt, 'at'),  // data.col.at(row)
  // ...
};

const ref = (node, opt, method) => {
  const table = node.table || '';
  return `data${table}${name(node)}.${method}(${opt.index}${table})`;
};
```

### Function compilation
```javascript
// src/expression/compile.js
function _compile(code, fn, params) {
  code = `"use strict"; return ${code};`;
  return (Function('fn', '$', code))(fn, params);
}

export const compile = {
  expr: (code, params) => _compile(`(row,data,op)=>${code}`, fn, params),
  join: (code, params) => _compile(`(row1,data1,row2,data2)=>${code}`, fn, params),
};
```

### Security validation
```javascript
// src/expression/parse-expression.js
const NO = msg => (node, ctx) => ctx.error(node, msg + ' not allowed');

const visitors = {
  FunctionDeclaration: NO('Function definitions'),
  ForStatement: NO('For loops'),
  WhileStatement: NO('While loops'),
  AssignmentExpression: NO('Assignments'),
  // ... many more
};
```

### Function registration
```javascript
// src/op/register.js
export function addFunction(name, fn, options = {}) {
  if (arguments.length === 1) {
    fn = name;
    name = fn.name;
    if (name === '' || name === 'anonymous') {
      error('Anonymous function provided, please include a name argument.');
    }
  }
  if (verifyFunction(name, fn, functions, options)) return;
  functions[name] = fn;
  opApi[name] = fn;
}
```

### Dictionary column optimization
```javascript
// src/expression/rewrite.js
export function rewrite(ref, name, index = 0, col = undefined, op = undefined) {
  ref.type = Column;
  ref.name = name;
  ref.table = index;

  // proceed only if has parent op and is a dictionary column
  if (op && col && isFunction(col.keyFor)) {
    const lit = dictOps[op.operator]
      ? op.left === ref ? op.right : op.left
      : null;

    // rewrite as dictionary lookup if other arg is a literal
    if (lit && lit.type === Literal) {
      rewriteDictionary(op, ref, lit, col.keyFor(lit.value));
    }
  }
}
```
