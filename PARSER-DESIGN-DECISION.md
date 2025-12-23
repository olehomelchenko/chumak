# Chumak Expression Parser - Design Decision

**Date**: 2025-01-23
**Status**: Recommended Approach
**Research basis**: Analysis of 8 production systems (Arquero, Vega-Lite, jsep, filtrex, OpenRefine, ag-Grid, Tidyjs, danfo.js)

---

## Executive Summary

**Recommendation: Hybrid Strategy with Structured Predicates + jsep Parser**

Chumak will use a **dual-mode input system**:
1. **Structured predicate objects** (80% of use cases) - GUI-driven, type-safe, beginner-friendly
2. **Expression strings** (20% of use cases) - Advanced users, escape hatch for complex logic

For expression strings, use **jsep** as the parser with AST interpretation (not code generation) for security and validation.

**Key characteristics:**
- ✅ Security-first: No Function() constructor, full sandboxing
- ✅ User-friendly: Position-aware errors, schema validation, suggestions
- ✅ Incremental: Simple operators in Phase 1, functions in Phase 2+
- ✅ Lightweight: ~700 lines custom code + ~600 lines jsep (CDN-loaded)
- ✅ Extensible: Plugin system for future enhancement

---

## Research Findings Summary

### Approaches Analyzed

| Project | Input Type | Parser | Security | Error Quality | Complexity | Verdict |
|---------|------------|--------|----------|---------------|------------|---------|
| **Vega-Lite** | Objects + strings | None (pass-through) | Delegates to runtime | Generic | Low | ✅ Predicates pattern |
| **Arquero** | Functions only | Acorn + AST rewrite | Validated sandbox | Technical | High | ⚠️ Too complex |
| **jsep** | Strings | Handwritten (~600 LOC) | Parser-only (safe) | Basic position | Medium | ✅ Best fit |
| **OpenRefine** | Strings | Handwritten (~700 LOC) | Parser-only (safe) | Offset-based | Medium | ✅ Error patterns |
| **ag-Grid** | Strings or functions | None (direct eval) | ❌ None | Generic dump | Minimal | ❌ Insecure |

### Key Insights

#### 1. **Predicate Objects Win for Beginners** (Vega-Lite)
```json
// Instead of forcing users to write:
"sales > 1000 && region == 'North'"

// Provide GUI that generates:
{
  "and": [
    { "field": "sales", "gt": 1000 },
    { "field": "region", "equal": "North" }
  ]
}
```

**Benefits:**
- No syntax errors possible
- Type-safe validation
- Maps naturally to form inputs
- Easier to teach

#### 2. **Expression Strings as Escape Hatch** (All projects)
```javascript
// For 20% of cases predicates can't handle:
{ "filter": "(revenue - cost) / revenue > 0.2" }
```

**Benefits:**
- Power users get full expressiveness
- Handles edge cases predicates don't cover
- Gradual learning curve

#### 3. **Parser-Only Approach is Safer** (jsep, OpenRefine)
```javascript
// ❌ Never do this (ag-Grid's approach)
const fn = new Function('d', userExpression);
fn(rowData);  // Can execute arbitrary code

// ✅ Always do this (jsep approach)
const ast = jsep(userExpression);
const validated = validateAST(ast, schema);
const result = interpretAST(ast, rowData);
```

**Security analysis:**
- Acorn: Requires sandboxing, still uses Function()
- jsep: Parser-only, returns AST, no execution
- ag-Grid: No validation, full JavaScript access
- **Winner**: jsep (parse → validate → interpret)

#### 4. **Errors-as-Values Essential for Data Wrangling** (OpenRefine)
```javascript
// Don't throw exceptions (breaks entire column)
// Return error objects (isolates failures)
{
  type: "error",
  message: "Division by zero",
  row: 42
}
```

**Rationale:**
- One bad cell shouldn't fail 10,000 good cells
- User can see which rows failed
- Allows workflow to continue

#### 5. **Position-Aware Errors Non-Negotiable** (All projects need improvement)
```javascript
// Bad (ag-Grid)
"Processing of the expression failed"

// Better (OpenRefine)
"Parsing error at offset 42: Missing )"

// Best (Chumak target)
"Expected ')' after expression
 sales > 1000 + (revenue - cost
                                ↑
 Did you mean: sales > 1000 + (revenue - cost)?"
```

---

## Recommended Architecture

### 1. Input Layer: Dual-Mode Strategy

```typescript
// Mode 1: Structured Predicates (Primary API)
type FieldPredicate =
  | { field: string; equal: any }
  | { field: string; gt: number }
  | { field: string; lt: number }
  | { field: string; gte: number }
  | { field: string; lte: number }
  | { field: string; oneOf: any[] }
  | { field: string; range: [number, number] }

type LogicalPredicate =
  | { and: Predicate[] }
  | { or: Predicate[] }
  | { not: Predicate }

type Predicate = FieldPredicate | LogicalPredicate | string;

// Mode 2: Expression Strings (Advanced/Escape Hatch)
type Expression = string;

// Transform specifications
interface FilterTransform {
  filter: Predicate;
}

interface DeriveTransform {
  derive: {
    [columnName: string]: Expression;
  }
}
```

**UI Flow:**
1. User opens filter dialog → sees predicate builder (dropdowns, inputs)
2. For simple cases: never needs to see expression syntax
3. "Advanced" toggle → switches to expression text input
4. Both compile to same Arquero operations

### 2. Parser Layer: jsep with Validation

```typescript
// Core pipeline
function compileExpression(expr: string, schema: Schema): CompiledExpression {
  // Step 1: Parse with jsep
  const ast = jsep(expr);

  // Step 2: Validate AST
  const validation = validateAST(ast, schema);
  if (!validation.valid) {
    throw new UserFriendlyError(validation.error);
  }

  // Step 3: Transform AST (add column prefixes, etc.)
  const transformed = transformAST(ast, schema);

  // Step 4: Generate Arquero function
  const arqueroFn = generateArqueroFunction(transformed);

  return {
    ast,
    arqueroFn,
    dependencies: extractColumnDependencies(ast)
  };
}
```

**Why jsep:**
- **Zero dependencies** - self-contained, CDN-loadable
- **Small footprint** - ~600 lines, ~10KB minified
- **ESTree-compatible AST** - standard format, well-documented
- **Plugin system** - can add custom operators/syntax
- **Battle-tested** - used in production by many projects
- **Browser-native** - no Node.js dependencies

### 3. Validation Layer: Schema-Aware Checks

```typescript
interface ValidationRule {
  check: (node: ASTNode, context: ValidationContext) => boolean;
  error: (node: ASTNode) => ErrorMessage;
}

const Phase1Rules: ValidationRule[] = [
  // Whitelist safe operators
  {
    check: (node) =>
      node.type === 'BinaryExpression' &&
      ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '===', '!=', '!=='].includes(node.operator),
    error: (node) => ({
      message: `Operator '${node.operator}' not allowed in Phase 1`,
      position: node.start,
      suggestion: "Use basic arithmetic and comparison operators only"
    })
  },

  // Validate column names
  {
    check: (node, ctx) =>
      node.type === 'Identifier' &&
      (ctx.schema.hasColumn(node.name) || isReservedWord(node.name)),
    error: (node, ctx) => ({
      message: `Column '${node.name}' not found`,
      position: node.start,
      suggestion: `Did you mean '${ctx.schema.suggestColumn(node.name)}'?`
    })
  },

  // Reject function calls (Phase 1)
  {
    check: (node) => node.type !== 'CallExpression',
    error: (node) => ({
      message: "Function calls not supported yet",
      position: node.start,
      suggestion: "Functions will be available in a future update"
    })
  },

  // Reject assignments
  {
    check: (node) => node.type !== 'AssignmentExpression',
    error: (node) => ({
      message: "Assignments not allowed in expressions",
      position: node.start,
      suggestion: "Use comparison operator '==' instead of '='"
    })
  }
];
```

### 4. Execution Layer: AST Interpretation

```typescript
// Interpret AST nodes safely (no Function() constructor)
function interpretAST(node: ASTNode, rowData: any): any {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      // Column reference
      if (rowData.hasOwnProperty(node.name)) {
        return rowData[node.name];
      }
      throw new EvalError(`Column '${node.name}' not found in row data`);

    case 'BinaryExpression':
      const left = interpretAST(node.left, rowData);
      const right = interpretAST(node.right, rowData);

      // Null propagation (except for == and !=)
      if ((left === null || right === null) &&
          node.operator !== '==' && node.operator !== '!=') {
        return null;
      }

      // Arithmetic operators
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right;
        case '===': return left === right;
        case '!=': return left != right;
        case '!==': return left !== right;
        default:
          throw new EvalError(`Unknown operator: ${node.operator}`);
      }

    case 'LogicalExpression':
      // Short-circuit evaluation
      const leftVal = interpretAST(node.left, rowData);
      if (node.operator === '&&') {
        return leftVal ? interpretAST(node.right, rowData) : leftVal;
      }
      if (node.operator === '||') {
        return leftVal ? leftVal : interpretAST(node.right, rowData);
      }
      throw new EvalError(`Unknown logical operator: ${node.operator}`);

    case 'UnaryExpression':
      const arg = interpretAST(node.argument, rowData);
      switch (node.operator) {
        case '!': return !arg;
        case '-': return -arg;
        case '+': return +arg;
        default:
          throw new EvalError(`Unknown unary operator: ${node.operator}`);
      }

    default:
      throw new EvalError(`Unsupported node type: ${node.type}`);
  }
}
```

**Why interpret instead of compile:**
- **Security**: No code execution, just data transformation
- **Validation**: Can check every step
- **Debugging**: Can log intermediate values
- **Performance**: Acceptable for 100-row previews

**Performance trade-off:**
- Interpretation: ~2-5x slower than compiled functions
- Acceptable: Preview only evaluates 100 rows
- Optimization: Cache parsed/validated ASTs

### 5. Error Handling: User-Friendly Messages

```typescript
interface UserFriendlyError {
  message: string;           // Plain language explanation
  expression: string;        // Original expression
  position: number;          // Character offset
  snippet: string;           // Code snippet with highlight
  suggestion?: string;       // How to fix
  availableColumns?: string[]; // Schema context
}

function formatError(error: ValidationError, expr: string, schema: Schema): UserFriendlyError {
  // Extract context around error position
  const start = Math.max(0, error.position - 20);
  const end = Math.min(expr.length, error.position + 20);
  const snippet = expr.substring(start, end);
  const pointer = ' '.repeat(error.position - start) + '↑';

  return {
    message: error.message,
    expression: expr,
    position: error.position,
    snippet: `${snippet}\n${pointer}`,
    suggestion: error.suggestion,
    availableColumns: error.type === 'unknown-column' ? schema.columnNames : undefined
  };
}

// Example output:
/*
Column 'Slaes' not found
 region == "North" && Slaes > 1000
                       ↑
Did you mean 'Sales'?
Available columns: Region, Sales, Revenue, Cost
*/
```

---

## Column Reference Syntax

### Phase 1: Bare Identifiers with Bracket Escape

```javascript
// Simple column names (most common)
sales > 1000
revenue - cost
region == "North"

// Column names with spaces/special characters
[Total Sales] > 1000
[Q1 Revenue] - [Q1 Cost]
[price-usd] * 1.1

// Comparison to other systems:
// Arquero:     d.sales > 1000  (requires 'd.' prefix)
// Vega-Lite:   {field: "sales", gt: 1000}  (predicate object)
// OpenRefine:  cells.sales > 1000  (requires 'cells.' prefix)
// Chumak:      sales > 1000  (simplest - auto-detect from schema)
```

**Implementation:**
1. jsep parses `sales` as `Identifier` node
2. Validator checks if "sales" exists in schema
3. Transformer rewrites to Arquero syntax: `sales` → `d.sales`
4. Generator outputs: `d => d.sales > 1000`

**Bracket notation handling:**
```javascript
// User writes:
[Total Sales] > 1000

// jsep plugin parses as:
{ type: 'Identifier', name: 'Total Sales' }  // Space preserved

// Transformer rewrites to:
{ type: 'MemberExpression', object: 'd', property: 'Total Sales', computed: true }

// Generator outputs:
d => d["Total Sales"] > 1000
```

### Phase 2: Optional Explicit Prefix

```javascript
// For advanced users who want Arquero-compatible syntax
d.sales > 1000
d["Total Sales"] > 1000

// Still support bare identifiers
sales > 1000
```

---

## Operator Support

### Phase 1: Basic Operators Only

| Operator | Type | Example | Notes |
|----------|------|---------|-------|
| `+` | Arithmetic | `revenue + tax` | Addition |
| `-` | Arithmetic | `revenue - cost` | Subtraction |
| `*` | Arithmetic | `price * quantity` | Multiplication |
| `/` | Arithmetic | `total / count` | Division |
| `%` | Arithmetic | `value % 10` | Modulo |
| `>` | Comparison | `sales > 1000` | Greater than |
| `<` | Comparison | `age < 18` | Less than |
| `>=` | Comparison | `score >= 90` | Greater or equal |
| `<=` | Comparison | `price <= 100` | Less or equal |
| `==` | Comparison | `status == "active"` | Loose equality |
| `===` | Comparison | `id === 42` | Strict equality |
| `!=` | Comparison | `region != "Unknown"` | Loose inequality |
| `!==` | Comparison | `value !== null` | Strict inequality |
| `&&` | Logical | `a && b` | Logical AND |
| `\|\|` | Logical | `a \|\| b` | Logical OR |
| `!` | Logical | `!active` | Logical NOT |
| `()` | Grouping | `(a + b) * c` | Precedence |

**Deliberately excluded (Phase 1):**
- ❌ Bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`)
- ❌ Assignment operators (`=`, `+=`, `-=`)
- ❌ Increment/decrement (`++`, `--`)
- ❌ Ternary operator (`? :`) - add in Phase 2
- ❌ Optional chaining (`?.`) - add in Phase 2
- ❌ Nullish coalescing (`??`) - add in Phase 2

### Phase 2: Add Safe Operators

```javascript
// Ternary conditional
profit > 0 ? "Profitable" : "Loss"

// Optional chaining (for nested objects)
customer?.address?.city

// Nullish coalescing
discount ?? 0
```

### Phase 3: Custom Operators via jsep Plugins

```javascript
// Add word-form boolean operators
sales > 1000 and region == "North"
status == "pending" or status == "active"
not cancelled

// Configure jsep:
jsep.addBinaryOp('and', 6);  // Same precedence as &&
jsep.addBinaryOp('or', 5);   // Same precedence as ||
jsep.addUnaryOp('not');      // Same precedence as !
```

---

## Function Support

### Phase 1: No Functions

**Rationale:**
- Keep MVP simple
- Operators sufficient for basic filtering and calculations
- Reduce attack surface
- Easier to validate and test

**User workarounds:**
```javascript
// Instead of: upper(name)
// Use predicate builder or wait for Phase 2

// Instead of: year(date)
// Preprocess data or wait for Phase 2
```

### Phase 2: Whitelist Safe Functions

```typescript
// Math functions (via Arquero op.*)
Math.round(value)
Math.floor(price)
Math.ceil(score)
Math.abs(difference)
Math.sqrt(area)
Math.max(a, b, c)
Math.min(a, b, c)

// String functions (via Arquero op.*)
value.toUpperCase()     // Method style
upper(value)            // Function style (both supported)
lower(name)
trim(text)
substring(text, 0, 10)
length(name)

// Date functions (via Arquero op.*)
year(date)
month(date)
day(date)
now()

// Type conversion
toNumber(value)
toString(id)
```

**Implementation:**
```typescript
const SAFE_FUNCTIONS = {
  // Math
  'abs': (x) => Math.abs(x),
  'round': (x) => Math.round(x),
  'floor': (x) => Math.floor(x),
  'ceil': (x) => Math.ceil(x),
  'sqrt': (x) => Math.sqrt(x),
  'max': (...args) => Math.max(...args),
  'min': (...args) => Math.min(...args),

  // String
  'upper': (s) => String(s).toUpperCase(),
  'lower': (s) => String(s).toLowerCase(),
  'trim': (s) => String(s).trim(),
  'length': (s) => String(s).length,

  // Date
  'year': (d) => new Date(d).getFullYear(),
  'month': (d) => new Date(d).getMonth() + 1,
  'day': (d) => new Date(d).getDate(),
  'now': () => Date.now(),

  // Type
  'toNumber': (v) => Number(v),
  'toString': (v) => String(v)
};

// Validation: Check function calls against whitelist
if (node.type === 'CallExpression') {
  const fnName = node.callee.name;
  if (!SAFE_FUNCTIONS.hasOwnProperty(fnName)) {
    throw new ValidationError(`Function '${fnName}' is not allowed`);
  }
}
```

### Phase 3: User-Defined Functions

```typescript
// Allow users to register custom functions (sandboxed)
registerFunction('fullName', (first, last) => `${first} ${last}`);
registerFunction('discount', (price, pct) => price * (1 - pct / 100));

// Usage in expressions
fullName(firstName, lastName)
discount(price, 15)
```

**Sandboxing approach:**
- Functions defined as pure data transformations
- No access to global scope
- Timeout limits
- Memory limits

---

## Implementation Phases

### Phase 1: MVP (3-4 weeks)

**Deliverables:**
```
✅ jsep integration (CDN-loaded)
✅ Predicate object → Arquero compiler
✅ Expression string → AST → validation → Arquero compiler
✅ Column reference handling (bare identifiers + bracket notation)
✅ Basic operators only (+, -, *, /, %, >, <, >=, <=, ==, ===, !=, !==, &&, ||, !)
✅ User-friendly error messages with position highlighting
✅ Schema-aware validation (unknown column detection)
✅ Error-as-value pattern for row-level failures
✅ Expression caching
✅ Test suite (90%+ coverage)
```

**Code estimate:**
- Predicate compiler: ~250 lines
- AST validator: ~150 lines
- AST transformer: ~100 lines
- AST interpreter: ~200 lines
- Error formatter: ~100 lines
- Test suite: ~500 lines
- **Total: ~1300 lines** (excluding jsep ~600 lines)

**Non-goals (explicitly deferred):**
- ❌ Function calls
- ❌ Ternary operator
- ❌ Complex type coercion
- ❌ User-defined functions
- ❌ Regex literals

### Phase 2: Functions + Advanced Operators (2-3 weeks)

**Additions:**
```
✅ Whitelist safe functions (Math.*, String.*, Date.*)
✅ Method-style syntax (value.toUpperCase())
✅ Ternary operator (? :)
✅ Optional chaining (?.)
✅ Nullish coalescing (??)
✅ Type coercion rules documentation
✅ Function argument validation
✅ Arquero op.* function integration
```

### Phase 3: Extensibility (2-3 weeks)

**Additions:**
```
✅ User-defined function registry
✅ Custom operator support (word forms: and, or, not)
✅ Regex literals (if needed)
✅ Array/object literals (if needed)
✅ Advanced type checking
✅ Performance optimization (compiled mode?)
```

---

## Security Analysis

### Threat Model

**Assumptions:**
- Untrusted user input (CSV data, expressions)
- Browser environment (localStorage, DOM access possible)
- No server-side validation

**Attack vectors:**
1. **Code injection** - Malicious expressions executing arbitrary JavaScript
2. **Data exfiltration** - Expressions accessing localStorage, making network requests
3. **Denial of service** - Infinite loops, memory exhaustion
4. **XSS** - Expressions injecting HTML/scripts into UI

### Mitigation Strategy

#### 1. **No Function() Constructor**
```javascript
// ❌ NEVER (ag-Grid's approach)
const fn = new Function('d', userExpression);

// ✅ ALWAYS (Chumak's approach)
const ast = jsep(userExpression);
validateAST(ast);
interpretAST(ast, data);
```

**Why:**
- Function() can execute arbitrary code
- No sandboxing possible
- Cannot validate before execution

#### 2. **AST Validation**
```typescript
// Whitelist allowed node types
const ALLOWED_NODE_TYPES = [
  'Literal',
  'Identifier',
  'BinaryExpression',
  'LogicalExpression',
  'UnaryExpression',
  'MemberExpression',  // Phase 2: for bracket notation
  'CallExpression'     // Phase 2: only whitelisted functions
];

function validateNodeType(node: ASTNode) {
  if (!ALLOWED_NODE_TYPES.includes(node.type)) {
    throw new SecurityError(`Node type '${node.type}' not allowed`);
  }
}
```

#### 3. **Operator Whitelist**
```typescript
const ALLOWED_BINARY_OPS = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '===', '!=', '!=='];
const ALLOWED_LOGICAL_OPS = ['&&', '||'];
const ALLOWED_UNARY_OPS = ['!', '-', '+'];

function validateOperator(node: ASTNode) {
  if (node.type === 'BinaryExpression' && !ALLOWED_BINARY_OPS.includes(node.operator)) {
    throw new SecurityError(`Operator '${node.operator}' not allowed`);
  }
  // Similar for logical and unary
}
```

#### 4. **No Property Access** (Phase 1)
```typescript
// ❌ Reject in Phase 1
window.location
document.cookie
localStorage.getItem

// ✅ Only allow column references
sales
revenue
[Total Sales]
```

#### 5. **Function Whitelist** (Phase 2+)
```typescript
const SAFE_FUNCTIONS = {
  'abs': true,
  'round': true,
  // ... whitelist
};

function validateFunctionCall(node: CallExpression) {
  const fnName = node.callee.name;
  if (!SAFE_FUNCTIONS[fnName]) {
    throw new SecurityError(`Function '${fnName}' not allowed`);
  }
}
```

#### 6. **Timeout Protection** (Phase 2+)
```typescript
// For complex expressions, limit execution time
function interpretWithTimeout(ast: ASTNode, data: any, timeout: number = 100): any {
  const startTime = Date.now();

  function checkTimeout() {
    if (Date.now() - startTime > timeout) {
      throw new TimeoutError('Expression took too long to evaluate');
    }
  }

  return interpretAST(ast, data, checkTimeout);
}
```

### Security Checklist

**Phase 1:**
- ✅ No Function() constructor
- ✅ AST-only interpretation
- ✅ Whitelist operators
- ✅ Reject property access
- ✅ Reject function calls
- ✅ Reject assignment operators

**Phase 2:**
- ✅ Whitelist functions
- ✅ Validate function arguments
- ✅ Timeout protection
- ✅ Memory limits

**Phase 3:**
- ✅ User function sandboxing
- ✅ Resource quotas
- ✅ Security audit

---

## Performance Considerations

### Execution Model

**Trade-off: Interpretation vs Compilation**

| Approach | Speed | Security | Validation | Debugging |
|----------|-------|----------|------------|-----------|
| **Function() compilation** | Fast (1x) | ❌ Unsafe | ❌ After execution | ❌ Opaque |
| **AST interpretation** | Slower (2-5x) | ✅ Safe | ✅ Before execution | ✅ Transparent |

**Decision: AST interpretation for Phase 1**

**Rationale:**
- Preview mode only evaluates 100 rows → acceptable slowdown
- Security more important than micro-optimization
- Validation before execution catches errors early
- Can upgrade to compilation in Phase 3 if needed

### Optimization Strategies

#### 1. **Expression Caching**
```typescript
const expressionCache = new Map<string, CompiledExpression>();

function getCompiledExpression(expr: string, schema: Schema): CompiledExpression {
  const cacheKey = `${expr}::${schema.hash()}`;

  if (!expressionCache.has(cacheKey)) {
    expressionCache.set(cacheKey, compileExpression(expr, schema));
  }

  return expressionCache.get(cacheKey);
}
```

**Impact**: Parse once, reuse for all rows (100x+ speedup)

#### 2. **Schema Hashing**
```typescript
class Schema {
  private _hash: string | null = null;

  hash(): string {
    if (!this._hash) {
      this._hash = this.columnNames.sort().join(',');
    }
    return this._hash;
  }
}
```

**Impact**: O(1) schema comparisons for cache lookups

#### 3. **AST Optimization** (Phase 3)
```typescript
// Constant folding
// Before: 2 + 3 * 4
// After:  14

// Dead code elimination
// Before: true && x
// After:  x

function optimizeAST(ast: ASTNode): ASTNode {
  if (ast.type === 'BinaryExpression' &&
      ast.left.type === 'Literal' &&
      ast.right.type === 'Literal') {
    // Evaluate at compile time
    return { type: 'Literal', value: evaluate(ast) };
  }
  // ... more optimizations
}
```

**Impact**: 10-20% speedup for complex expressions

#### 4. **Lazy Evaluation** (Phase 3)
```typescript
// Short-circuit logical operators
if (node.operator === '&&') {
  const left = interpret(node.left, data);
  if (!left) return false;  // Don't evaluate right if left is false
  return interpret(node.right, data);
}
```

**Impact**: Already implemented in interpretation logic

#### 5. **Web Worker Offloading** (Phase 3)
```typescript
// For large datasets, evaluate in background thread
const worker = new Worker('expression-worker.js');

worker.postMessage({
  expression: compiledExpr,
  data: largeDataset
});

worker.onmessage = (e) => {
  displayResults(e.data);
};
```

**Impact**: Keeps UI responsive during long operations

### Performance Targets

**Phase 1 (MVP):**
- Parse + validate: <10ms per expression
- Evaluate 100 rows: <50ms per expression
- UI remains responsive during preview

**Phase 2 (Optimized):**
- Parse + validate: <5ms per expression
- Evaluate 100 rows: <20ms per expression
- Support 1000+ row previews

**Phase 3 (Production):**
- Evaluate 10,000 rows: <200ms per expression
- Web Worker for 100,000+ rows
- Streaming evaluation for 1M+ rows

---

## Testing Strategy

### Test Coverage Targets

**Phase 1:** 90%+ coverage on core expression handling

### Test Categories

#### 1. **Parser Tests**
```javascript
describe('jsep integration', () => {
  it('parses simple arithmetic', () => {
    const ast = jsep('a + b');
    expect(ast.type).toBe('BinaryExpression');
    expect(ast.operator).toBe('+');
  });

  it('handles bracket notation', () => {
    const ast = jsep('[Total Sales] > 1000');
    expect(ast.left.name).toBe('Total Sales');
  });

  it('preserves operator precedence', () => {
    const ast = jsep('a + b * c');
    expect(ast.right.type).toBe('BinaryExpression');
    expect(ast.right.operator).toBe('*');
  });
});
```

#### 2. **Validation Tests**
```javascript
describe('AST validation', () => {
  it('rejects unknown columns', () => {
    const schema = new Schema(['a', 'b']);
    expect(() => validate('c > 1', schema)).toThrow('Column \'c\' not found');
  });

  it('suggests similar column names', () => {
    const schema = new Schema(['Sales', 'Revenue']);
    const error = validate('Slaes > 1000', schema);
    expect(error.suggestion).toBe('Did you mean \'Sales\'?');
  });

  it('rejects function calls in Phase 1', () => {
    expect(() => validate('upper(name)')).toThrow('Function calls not supported yet');
  });

  it('rejects assignments', () => {
    expect(() => validate('a = 5')).toThrow('Assignments not allowed');
  });
});
```

#### 3. **Interpretation Tests**
```javascript
describe('AST interpretation', () => {
  const data = { sales: 1500, cost: 1000, region: 'North' };

  it('evaluates arithmetic', () => {
    expect(interpret('sales - cost', data)).toBe(500);
    expect(interpret('sales * 2', data)).toBe(3000);
  });

  it('evaluates comparisons', () => {
    expect(interpret('sales > 1000', data)).toBe(true);
    expect(interpret('region == "South"', data)).toBe(false);
  });

  it('evaluates logical operators', () => {
    expect(interpret('sales > 1000 && region == "North"', data)).toBe(true);
  });

  it('handles null propagation', () => {
    const dataWithNull = { a: null, b: 5 };
    expect(interpret('a + b', dataWithNull)).toBe(null);
    expect(interpret('a == null', dataWithNull)).toBe(true);
  });
});
```

#### 4. **Error Message Tests**
```javascript
describe('error formatting', () => {
  it('highlights error position', () => {
    const error = formatError({
      message: 'Expected )',
      position: 15
    }, 'sales > 1000 + (revenue - cost', schema);

    expect(error.snippet).toContain('↑');
  });

  it('suggests column names', () => {
    const error = validateWithSchema('Slaes > 1000', schema);
    expect(error.suggestion).toMatch(/Did you mean 'Sales'/);
  });
});
```

#### 5. **Predicate Compilation Tests**
```javascript
describe('predicate to Arquero', () => {
  it('compiles field predicates', () => {
    const pred = { field: 'sales', gt: 1000 };
    const arqueroFn = compilePredicate(pred);
    expect(arqueroFn({ sales: 1500 })).toBe(true);
    expect(arqueroFn({ sales: 500 })).toBe(false);
  });

  it('compiles logical compositions', () => {
    const pred = {
      and: [
        { field: 'sales', gt: 1000 },
        { field: 'region', equal: 'North' }
      ]
    };
    const arqueroFn = compilePredicate(pred);
    expect(arqueroFn({ sales: 1500, region: 'North' })).toBe(true);
    expect(arqueroFn({ sales: 1500, region: 'South' })).toBe(false);
  });
});
```

#### 6. **Integration Tests**
```javascript
describe('full pipeline', () => {
  it('compiles and executes filter transform', () => {
    const transform = {
      filter: 'sales > 1000 && region == "North"'
    };

    const table = aq.table({
      sales: [500, 1500, 2000, 1200],
      region: ['North', 'North', 'South', 'North']
    });

    const result = applyTransform(table, transform);
    expect(result.numRows()).toBe(2);
    expect(result.array('sales')).toEqual([1500, 1200]);
  });

  it('handles errors gracefully', () => {
    const transform = {
      filter: 'invalid_column > 1000'
    };

    expect(() => compileTransform(transform, schema))
      .toThrow('Column \'invalid_column\' not found');
  });
});
```

### Edge Cases to Test

**Numeric:**
- Division by zero: `1 / 0` → Infinity
- Negative numbers: `-5 + 3` → -2
- Decimal precision: `0.1 + 0.2` → 0.30000000000000004 (JavaScript behavior)
- Very large numbers: `9999999999999999` → potential precision loss
- Scientific notation: `1e10`

**String:**
- Empty strings: `"" == ""` → true
- String concatenation: `"Hello" + " " + "World"` → "Hello World"
- String comparison: `"abc" < "xyz"` → true
- Quotes in strings: `"He said \"Hi\""` → properly escaped

**Null/Undefined:**
- Null equality: `null == null` → true
- Null comparison: `null > 0` → false
- Null arithmetic: `null + 5` → null (propagation)
- Missing columns: `nonexistent_column > 0` → error

**Boolean:**
- Truthy/falsy: `0 && true` → 0 (JavaScript semantics)
- Short-circuit: `false && expensive_operation` → false (doesn't evaluate right side)

**Column Names:**
- Spaces: `[Total Sales]`
- Hyphens: `[price-usd]`
- Underscores: `customer_id`
- Numbers: `Q1`, `2024_sales`
- Keywords: `class`, `return`, `function` (should work as column names)

**Complex Expressions:**
- Deep nesting: `((a + b) * (c - d)) / ((e + f) * (g - h))`
- Mixed operators: `a + b * c - d / e`
- Precedence: `a || b && c` → `a || (b && c)`

---

## Migration Path

### From SPECIFICATION.md (Section 11)

**Current specification (draft):**
```markdown
### Simple expressions (Phase 1)

```
# Comparisons
sales > 1000
region == "North"
profit != 0

# Boolean
sales > 1000 and region == "North"
status == "active" or status == "pending"

# Arithmetic (in derive)
revenue - cost
price * quantity
(revenue - cost) / revenue * 100
```

### Column references

Unquoted names for simple columns:
```
sales > 1000
```

Bracket notation for spaces/special chars:
```
[Total Sales] > 1000
```
```

**Updates needed:**
1. Change `and`/`or` to `&&`/`||` (JavaScript standard)
2. Add predicate object syntax as primary API
3. Document Phase 1 limitations (no functions)
4. Add security notes
5. Add error handling examples

---

## Decision Log

### Decision 1: Use jsep over alternatives

**Date:** 2025-01-23
**Alternatives considered:**
1. Acorn (Arquero's choice)
2. Handwritten parser (GREL's choice)
3. Direct eval (ag-Grid's choice)

**Decision:** jsep

**Rationale:**
- Acorn: Too complex, still needs Function() constructor
- Handwritten: Reinventing wheel, ~700 lines of untested code
- Direct eval: Fundamentally insecure
- jsep: Sweet spot - lightweight, secure, extensible

**Trade-offs accepted:**
- jsep has quirks and limitations
- Need to learn jsep's plugin system
- Adds external dependency (but CDN-loadable)

---

### Decision 2: Interpret AST instead of compiling to functions

**Date:** 2025-01-23
**Alternatives considered:**
1. Compile to Function() (ag-Grid, Arquero)
2. Compile to safe eval() wrapper
3. Interpret AST (OpenRefine's approach)

**Decision:** Interpret AST

**Rationale:**
- Security: No code execution
- Validation: Can check every step
- Debugging: Transparent execution
- Performance: Acceptable for 100-row previews

**Trade-offs accepted:**
- 2-5x slower than compiled functions
- More complex interpreter logic
- Can upgrade to compilation in Phase 3 if needed

---

### Decision 3: Bare identifiers for column references

**Date:** 2025-01-23
**Alternatives considered:**
1. `d.column` (Arquero)
2. `datum.column` (Vega-Lite)
3. `cells.column` (OpenRefine)
4. `column` (bare identifier)

**Decision:** Bare identifiers with bracket escape

**Rationale:**
- Simplest for non-programmers
- Schema available at parse time
- Bracket notation for edge cases: `[Total Sales]`

**Trade-offs accepted:**
- Must validate against schema
- Cannot use arbitrary JavaScript identifiers
- Requires transformer to add `d.` prefix for Arquero

---

### Decision 4: Structured predicates as primary API

**Date:** 2025-01-23
**Alternatives considered:**
1. Expression strings only (all other systems)
2. Predicates only (Vega-Lite partially)
3. Hybrid (both)

**Decision:** Hybrid - predicates primary, expressions as escape hatch

**Rationale:**
- Vega-Lite shows predicate objects work well
- 80% of use cases covered by simple predicates
- Expression strings for 20% edge cases
- Best UX for target audience (non-programmers)

**Trade-offs accepted:**
- Need to implement both systems
- Dual syntax to document
- More complex UI (predicate builder + expression input)

---

## Open Questions

### Q1: Should Phase 1 support ternary operator `? :`?

**Pro:**
- Very useful for derive expressions: `profit > 0 ? "Gain" : "Loss"`
- Common pattern users expect
- Easy to implement (jsep supports it)

**Con:**
- Adds complexity to validator
- Phase 1 goal is simplicity
- Can add in Phase 2

**Recommendation:** Defer to Phase 2

---

### Q2: Should we support method-style function calls in Phase 2?

```javascript
// Option A: Function style only
upper(name)
length(name)

// Option B: Method style only
name.upper()
name.length()

// Option C: Both
upper(name)
name.upper()
```

**Recommendation:** Both (Phase 2)
- OpenRefine shows method style is intuitive
- jsep supports MemberExpression
- Can transform both to same Arquero ops

---

### Q3: How to handle type coercion?

```javascript
// JavaScript allows:
"5" + 3  →  "53" (string concatenation)
"5" - 3  →  2 (numeric subtraction)

// Should Chumak:
// A) Follow JavaScript semantics
// B) Require explicit type conversion
// C) Warn but allow
```

**Recommendation:** A for Phase 1, C for Phase 2
- Phase 1: Follow JavaScript (least surprising)
- Phase 2: Add warnings for mixed-type operations
- Phase 3: Optional strict mode

---

## Next Steps

1. **Update SPECIFICATION.md** with parser design decisions
   - Add predicate object syntax
   - Change `and`/`or` to `&&`/`||`
   - Document Phase 1 limitations
   - Add security notes

2. **Create parser POC** to validate approach
   - jsep integration
   - Basic AST validation
   - Simple interpretation
   - Verify performance

3. **Design predicate builder UI mockups**
   - Form-based filter builder
   - "Advanced" toggle to expression mode
   - Error display

4. **Write detailed API documentation**
   - Predicate object schema
   - Expression syntax reference
   - Function reference (Phase 2+)
   - Error message catalog

5. **Set up test infrastructure**
   - Mocha + Chai (CDN-loaded)
   - Test runner HTML
   - Fixture data

---

## Appendix: Code Size Estimate

### Phase 1 Breakdown

```
Core Expression Handling
├── predicate-compiler.js      (~250 lines)
│   ├── Predicate → Arquero
│   ├── Logical composition
│   └── Field reference handling
│
├── expression-parser.js        (~100 lines)
│   ├── jsep integration
│   ├── Bracket notation plugin
│   └── Parse error handling
│
├── ast-validator.js            (~150 lines)
│   ├── Node type validation
│   ├── Operator whitelist
│   ├── Column name checking
│   └── Schema suggestions
│
├── ast-transformer.js          (~100 lines)
│   ├── Column prefix injection
│   ├── Bracket notation handling
│   └── AST optimization
│
├── ast-interpreter.js          (~200 lines)
│   ├── Expression evaluation
│   ├── Null propagation
│   ├── Error-as-value handling
│   └── Type coercion
│
├── error-formatter.js          (~100 lines)
│   ├── Position highlighting
│   ├── Suggestion generation
│   └── Schema context
│
├── expression-cache.js         (~50 lines)
│   ├── Cache management
│   └── Invalidation
│
└── utils.js                    (~50 lines)
    ├── Schema hashing
    ├── Levenshtein distance (suggestions)
    └── Helper functions

TOTAL CUSTOM CODE: ~1000 lines
```

### External Dependencies

```
jsep.min.js                     ~600 lines (~10KB minified)
arquero.min.js                  (already dependency)
papaparse.min.js                (already dependency)
alpine.js                       (already dependency)
```

### Comparison to Other Systems

| System | Parser | Functions | Total LOC |
|--------|--------|-----------|-----------|
| **ag-Grid** | 0 | 0 | ~80 |
| **Chumak Phase 1** | jsep ~600 | 0 | ~1600 |
| **OpenRefine** | ~700 | ~9800 | ~10500 |
| **Arquero** | Acorn | ~5000 | ~6000+ |

**Analysis:**
- Chumak Phase 1: Reasonable size, focused scope
- Lighter than GREL/Arquero (no 100+ functions)
- Heavier than ag-Grid (security/validation required)
- ~40KB total for expression handling (acceptable)

---

## References

### Research Documents
- `RESEARCH-GUIDE.md` - Analysis protocol
- `analysis__arquero.md` - Arquero deep-dive
- `analysis__vega-lite.md` - Vega-Lite deep-dive
- `analysis__openrefine.md` - OpenRefine/GREL deep-dive
- `analysis__ag-grid.md` - ag-Grid deep-dive

### External Documentation
- jsep: https://github.com/EricSmekens/jsep
- Arquero: https://uwdata.github.io/arquero/
- Vega-Lite: https://vega.github.io/vega-lite/
- ESTree AST spec: https://github.com/estree/estree

### Key Takeaways by Project

**Vega-Lite:** Predicates as primary API, expressions as escape hatch
**Arquero:** Runtime dependency, don't replicate its parser
**jsep:** Lightweight parser, plugin system, ESTree-compatible
**OpenRefine:** Errors-as-values pattern, two-phase parse/eval
**ag-Grid:** Don't use direct eval, security matters

---

**End of Document**
