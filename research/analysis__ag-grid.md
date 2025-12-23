# ag-Grid Expression Analysis

## Orientation

### Source location
- Main expression handling: `packages/ag-grid-community/src/valueService/expressionService.ts`
- Value service integration: `packages/ag-grid-community/src/valueService/valueService.ts`
- Filter implementations: `packages/ag-grid-community/src/filter/provided/` (text, number, date)

### Expression-related paths
- Expression evaluation: `/valueService/expressionService.ts` (78 lines)
- Value getter execution: `/valueService/valueService.ts` (lines 681-704)
- Error messages: `/validation/errorMessages/errorText.ts` (error codes 15, 16)

### Terminology used
- **Expression**: JavaScript string or function used for computed values
- **ValueGetter**: Column definition property that computes cell values
- **Cell expressions**: Optional feature where cell values starting with `=` are evaluated as expressions
- **Filter**: Structured models (not expressions) for filtering rows

### Language/module system
- TypeScript
- ES modules with bean-based dependency injection
- No build system requirement mentioned for expressions

---

## Entry Point

### Public API
**ExpressionService.evaluate(expression: string | undefined, params: any): any**
- Main entry point for expression evaluation
- Called by ValueService when valueGetter is a string
- Also used for cell expressions when `enableCellExpressions` is enabled

**ValueService.executeValueGetter()**
- Dispatches to either function call or ExpressionService.evaluate()
- Two variants: with and without value cache

### Input types
1. **String expressions**: Plain JavaScript code
   - Example: `"data.a + data.b + data.c"`
   - Wrapped in Function() constructor
2. **Function callbacks**: Standard JavaScript functions
   - Example: `(params) => params.data.a + params.data.b`
   - Executed directly without parsing
3. **Cell expressions**: Data values starting with `=`
   - Example: In cell data: `"=A1 + B1"`
   - Requires `enableCellExpressions: true` option

**Note**: Filters do NOT use expressions. They use structured models with predefined types like `contains`, `equals`, `startsWith`, etc.

### First processing step
1. Type check: string vs function
2. If string: call `createExpressionFunction()`
3. Wrap in "return ...;" if not already present
4. Compile with `new Function(params, body)`
5. Cache compiled function
6. Execute with 13 named parameters

---

## Parsing

### Approach
**None - Direct eval approach**

ag-Grid does NOT parse expressions. Instead:
1. Takes user string expression as-is
2. Wraps in "return" statement if needed
3. Compiles directly with JavaScript's `new Function()` constructor
4. No validation, no transformation, no sandboxing

### Key files
- `expressionService.ts`: Only 78 lines total
  - `evaluate()`: Entry point (46 lines)
  - `createExpressionFunction()`: Compilation + caching (19 lines)
  - `createFunctionBody()`: Wrap with "return" (9 lines)

### AST structure
**None.** No AST representation. Expressions are opaque strings until compiled by JavaScript engine.

### Security considerations
- **No sandboxing**: Expressions have full JavaScript access
- **Security risk**: User expressions can access `globalThis`, `window`, `process`, etc.
- **Mitigation**: Assumes trusted users or server-side validation

---

## Column References

### Datum syntax
**13 named parameters** passed to compiled function:
```javascript
new Function(
  'x, ctx, oldValue, newValue, value, node, data, colDef, rowIndex, api, getValue, column, columnGroup',
  functionBody
);
```

**Primary access patterns**:
- `data.columnName` - Most common (direct property access)
- `data["Column Name"]` - For spaces/special chars
- `value` - Current cell value
- `node.data.columnName` - Via node object
- `getValue("columnName")` - Via callback function

### Bracket notation
**Yes, via JavaScript syntax**
- `data["Column Name"]` works naturally
- No special handling needed
- Any valid JavaScript member access is supported

### Validation
**None at compile time**
- Typos only discovered at runtime
- ReferenceError thrown by JavaScript engine
- No column name validation against schema

---

## Operators

### Supported
**All JavaScript operators**:
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `<`, `>`, `<=`, `>=`, `==`, `===`, `!=`, `!==`
- Logical: `&&`, `||`, `!`
- Bitwise: `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
- Ternary: `? :`
- Others: `typeof`, `instanceof`, `in`, `?.`, `??`

### Aliases
**None.** Only JavaScript operators supported. No word forms (`and`/`or`/`not`).

### Precedence handling
**Inherited from JavaScript**
- JavaScript engine handles all precedence
- No custom precedence rules
- Standard JavaScript semantics apply

---

## Functions

### Built-ins
**All JavaScript functions available**:
- `Math.*` - Math.round(), Math.floor(), Math.max()
- `String.prototype.*` - .toUpperCase(), .toLowerCase(), .substring()
- `Array.prototype.*` - .map(), .filter(), .reduce()
- `Date` constructor and methods
- Any global functions

**No custom DSL functions.** Users must use JavaScript's built-in functions.

### Registration
**Via JavaScript globals**
- Add functions to global scope
- Pass via `ctx` (context) parameter
- No formal registration API
- Functions available to all expressions

### Syntax
Standard JavaScript function call syntax:
```javascript
"Math.round(data.price * 1.1)"
"data.name.toUpperCase()"
"Math.max(data.a, data.b, data.c)"
```

---

## Error Handling

### Error types
1. **Type error (code 15)**: Non-string, non-function passed as expression
   - Message: "value should be either a string or a function"
2. **Execution error (code 16)**: Runtime error during expression evaluation
   - Message: "Processing of the expression failed"

### Message quality
**Generic dump format**:
```
Processing of the expression failed
Expression = [user expression string]
Params = [params object dump]
Exception = [JavaScript error object]
```

**Limitations**:
- No position/line information (expressions are typically one-liners)
- No user-friendly suggestions
- Technical format unsuitable for non-developers
- Raw JavaScript error messages passed through

### Recovery
**Fail fast with graceful degradation**:
1. Exception caught in `evaluateExpression()`
2. Error logged to console via `_error(16, ...)`
3. Returns `null` (not throwing)
4. Allows grid to continue functioning

**No validation before execution** - errors only occur at runtime when expression is evaluated.

---

## Edge Cases Tested

### Test file: `valueService.test.ts`
**Focus**: Integration testing of ValueService, NOT expression parsing

**Tests found**:
- Formatter precedence (supplied > colDef > refData)
- RefData fallback behavior
- Array value formatting
- Pinned row handling
- Expression type checking (mocked)

**Expression-specific tests**: None found
- No tests for malformed expressions
- No tests for security issues
- No tests for JavaScript edge cases
- ExpressionService is mocked in tests

### Edge cases NOT covered
- Column name typos
- Null/undefined data
- Type mismatches
- Malicious code injection
- Performance with complex expressions
- Circular references

---

## Ideas to Adopt

### 1. Simplicity for trusted environments
**When applicable**: If Chumak operated in fully trusted environments (local-only, no user uploads)

**Benefit**:
- Minimal code (78 lines)
- Zero dependencies
- Instant compatibility with JavaScript syntax
- No learning curve for developers

**Trade-off**: Security risk unacceptable for Chumak's browser-based, untrusted environment.

### 2. Caching strategy
**Pattern**: Simple object-based cache
```javascript
private readonly cache = {} as any;
// ...
if (expressionToFunctionCache[expression]) {
    return expressionToFunctionCache[expression];
}
```

**Adoptable for Chumak**: Cache compiled expressions after parsing to avoid re-parsing identical transforms.

### 3. Dual input types
**Pattern**: Accept both strings and functions
```typescript
valueGetter: "data.a + data.b"  // String
valueGetter: (params) => params.data.a + params.data.b  // Function
```

**Adoptable for Chumak**: Consider accepting both declarative transforms AND function escape hatches for power users.

---

## Warnings

### 1. Security: Unsuitable for untrusted input
**Issue**: No sandboxing whatsoever

**Risks**:
- XSS via expression injection
- Data exfiltration via fetch/XHR
- Local storage access
- Infinite loops blocking UI

**Why it works for ag-Grid**:
- Enterprise software with trusted developers
- Expressions typically hard-coded in applications
- Not user-facing (usually)

**Why it won't work for Chumak**:
- Browser-based tool for arbitrary users
- Users load CSV from unknown sources
- Must handle malicious expressions safely

### 2. Error messages: Unusable for non-developers
**Issue**: Raw JavaScript errors dumped to console

**Problems**:
- No position information for syntax errors
- JavaScript terminology unfamiliar to analysts
- No suggestions for common mistakes
- Requires opening browser console to see errors

**Contrast with Chumak goals**:
- Target audience: students and analysts (not programmers)
- Need user-friendly error messages
- Should guide users to correct syntax

### 3. No validation: Late failure
**Issue**: Errors only at runtime, not parse time

**Problems**:
- User builds entire workflow before discovering error
- Column typos not caught until execution
- No way to validate expressions in UI before applying

**Better approach**:
- Parse and validate expressions when user types them
- Show errors in form before applying transform
- Catch syntax errors early

### 4. Testing: Expression logic untested
**Issue**: ExpressionService has no dedicated tests

**Problems**:
- No tests for edge cases
- No security tests
- Changes could break expression evaluation silently

**Why it's risky**:
- For ag-Grid: Relying on JavaScript's stability (reasonable)
- For Chumak: Parser bugs would break user workflows (unacceptable)

---

## Code Snippets of Interest

### ExpressionService complete implementation
```typescript
export class ExpressionService extends BeanStub implements NamedBean {
    beanName = 'expressionSvc' as const;
    private readonly cache = {} as any;

    public evaluate(expression: string | undefined, params: any): any {
        if (typeof expression === 'string') {
            return this.evaluateExpression(expression, params);
        } else {
            _error(15, { expression });
        }
    }

    private evaluateExpression(expression: string, params: any): any {
        try {
            const javaScriptFunction = this.createExpressionFunction(expression);
            const result = javaScriptFunction(
                params.value, params.context, params.oldValue, params.newValue,
                params.value, params.node, params.data, params.colDef,
                params.rowIndex, params.api, params.getValue, params.column,
                params.columnGroup
            );
            return result;
        } catch (e) {
            _error(16, { expression, params, e });
            return null;
        }
    }

    private createExpressionFunction(expression: any) {
        if (this.cache[expression]) {
            return this.cache[expression];
        }
        const functionBody = this.createFunctionBody(expression);
        const theFunction = new Function(
            'x, ctx, oldValue, newValue, value, node, data, colDef, rowIndex, api, getValue, column, columnGroup',
            functionBody
        );
        this.cache[expression] = theFunction;
        return theFunction;
    }

    private createFunctionBody(expression: any) {
        if (expression.includes('return')) {
            return expression;
        } else {
            return 'return ' + expression + ';';
        }
    }
}
```

**Total: 78 lines** (including whitespace and comments)

### Cell expression handling
```typescript
// In ValueService.getValue()
if (this.cellExpressions && _isExpressionString(result)) {
    const cellValueGetter = result.substring(1);  // Remove leading '='
    result = this.executeValueGetter(cellValueGetter, rowNode.data, column, rowNode);
}

// Expression detection
export function _isExpressionString(value: unknown): value is `=${string}` {
    return typeof value === 'string' && value.startsWith('=') && value.length > 1;
}
```

### Error message definitions
```typescript
// Error code 15
15: ({ expression }: { expression: any }) =>
    ['value should be either a string or a function', expression] as const,

// Error code 16
16: ({ expression, params, e }: { expression: string; params: any; e: any }) =>
    [
        'Processing of the expression failed',
        'Expression = ', expression,
        'Params = ', params,
        'Exception = ', e,
    ] as const,
```

---

## Applicability to Chumak

### What can be directly reused?
**Nothing.** ag-Grid's approach is fundamentally incompatible with Chumak's requirements.

**Reasons**:
1. **Security**: Chumak must sandbox untrusted user input
2. **Target audience**: Chumak targets non-programmers; JavaScript syntax too complex
3. **Error handling**: Chumak needs user-friendly messages with suggestions
4. **Validation**: Chumak needs parse-time validation, not runtime failures

### What needs adaptation?
**Caching strategy**: The simple object-based cache pattern is useful
```javascript
// Adapted for Chumak
const expressionCache = {};
function getCompiledExpression(exprString) {
    if (!expressionCache[exprString]) {
        expressionCache[exprString] = parseAndCompile(exprString);
    }
    return expressionCache[exprString];
}
```

### What should be explicitly avoided?
1. **No parsing**: Always parse and validate expressions
2. **Function() constructor**: Never use for untrusted input
3. **Minimal error handling**: Invest in good error messages
4. **No validation**: Validate early and often
5. **JavaScript syntax**: Too complex for target users - design simpler DSL

---

## Summary

ag-Grid's expression handling is **deliberately minimal** for a specific use case:
- Enterprise developers writing JavaScript
- Trusted environment (corporate networks)
- Expression code written once, reused many times
- Users comfortable with browser console

This approach **does not transfer** to Chumak:
- Students and analysts (non-programmers)
- Untrusted browser environment
- Expressions written ad-hoc by end users
- Must work without developer tools

**Key lesson**: The simplest possible implementation (direct eval) has fatal flaws for Chumak's context. A proper parser with validation and sandboxing is essential.

**Code quality**: The implementation is clean and well-structured for what it does, but what it does is insufficient for Chumak's needs.

**Documentation quality**: Minimal inline comments, but code is self-explanatory due to simplicity.
