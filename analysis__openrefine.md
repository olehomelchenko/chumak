# OpenRefine - GREL Analysis

## Phase 1: Orientation

### Source Location
- **Root:** `modules/grel/`
- **Main source:** `modules/grel/src/main/java/com/google/refine/`
- **Core expression paths:**
  - `grel/Parser.java` - Main parser (~345 lines)
  - `grel/Scanner.java` - Lexical scanner/tokenizer (~353 lines)
  - `grel/ast/` - AST node types (9 files)
  - `grel/controls/` - Control flow functions (if, forEach, etc.)
  - `expr/functions/` - Built-in functions organized by category (strings, math, arrays, dates, etc.)

### Terminology Used
- **GREL** = General Refine Expression Language
- **Evaluable** - Interface for executable expressions
- **Control** - Control flow constructs (if, forEach, filter)
- **Function** - Pure functions (toUppercase, length, etc.)
- **VariableExpr** - Column reference in expressions
- **FieldAccessorExpr** - Object property access (e.g., `value.field`)

### Language/Module System
- **Language:** Java 11+
- **Build:** Maven (pom.xml)
- **Module:** Standalone jar module in multi-module project
- **Dependencies:**
  - commons-lang3, commons-text (string utilities)
  - jsoup (HTML parsing)
  - jackson (JSON)
  - No external parser libraries - custom hand-written parser

### Test Structure
- **Location:** `modules/grel/src/test/java/com/google/refine/`
- **Test files:**
  - `grel/ast/*Test.java` - AST node tests
  - `expr/functions/**/*Test.java` - Function tests by category
  - TestNG framework used
  - Tests focus on function behavior, not parser edge cases

### Key Observations
1. **Self-contained parser:** GREL has its own hand-written scanner + recursive descent parser (no external libs)
2. **Module independence:** GREL is a separate module that can be compiled as a standalone jar
3. **Rich function library:** 100+ built-in functions organized by domain (strings, math, arrays, dates, HTML, etc.)
4. **AST-based:** Expressions compile to typed AST nodes, not direct code generation
5. **Mature codebase:** Original Google copyright (2010), well-established patterns

---

## Phase 2: Entry Point Analysis

### Public API
- **Entry:** `Parser.grelParser` - static LanguageSpecificParser instance
- **Interface:** `LanguageSpecificParser.parse(String source, String languagePrefix)`
- **Returns:** `Evaluable` interface (the compiled AST root)

### Input Types
- **Accepted:** String only (no function/object/template variants)
- **No preprocessing:** String goes directly to Parser constructor
- **Single-pass:** Parser constructor immediately calls `parseExpression()`

### First Processing Step
1. String → `Parser` constructor
2. Creates `Scanner` with string
3. Gets first token: `_token = _scanner.next(true)`
4. Immediately calls `_root = parseExpression()`
5. Returns compiled `Evaluable` AST

### Evaluation Model
- **Two-phase:** Parse once → Evaluate many times
- **Evaluation signature:** `evaluate(Properties bindings)`
- **Bindings contain:**
  - `value` - current cell value
  - `cell` - current cell object with metadata
  - `cells` - all cells in current row
  - `row` - row object
  - `record` - record object (for record mode)
  - Custom variables from user context

### Key Design Choice
- **Parse-time validation:** Functions/controls checked during parsing (Parser.java:223-227)
- **Unknown identifiers fail immediately:** Not deferred to evaluation
- **Fail-fast:** Parser throws `ParsingException` for any syntax errors
- No "lazy" evaluation of structure - AST fully built before evaluation

---

## Phase 3: Parsing Mechanism

### Parsing Approach
**Handwritten recursive descent parser** with separate tokenizer (Scanner)

### Key Files
- **Scanner.java** (~353 lines): Lexical analysis, tokenization
- **Parser.java** (~345 lines): Syntax analysis, AST construction
- **No external libraries** for parsing

### Tokenization (Scanner)
- **Method:** Character-by-character state machine
- **Token types:** Error, Delimiter, Operator, Identifier, Number, String, Regex
- **Token object:** Contains `start`, `end`, `type`, `text` (position tracking built-in)
- **Special handling:**
  - Numbers: Integer (long) vs decimal (double) detection
  - Strings: Both `"` and `'` delimiters, escape sequences (`\t`, `\n`, `\r`, `\\`)
  - Regex: `/pattern/i` syntax (i flag for case-insensitive)
  - Operators: Single-char `+-*/%` and multi-char `==`, `!=`, `<=`, `>=`, `<>`

### Parsing Strategy
**Recursive descent with operator precedence levels:**
1. `parseExpression()` - comparison operators (`<`, `<=`, `>`, `>=`, `==`, `!=`)
2. `parseSubExpression()` - additive operators (`+`, `-`)
3. `parseTerm()` - multiplicative operators (`*`, `/`, `%`)
4. `parseFactor()` - atoms and postfix operations (field access, function calls, array indexing)

### AST Structure
**Typed node classes** (all implement `Evaluable` interface):
- `LiteralExpr` - numbers, strings, regex patterns, null
- `VariableExpr` - identifiers (column references, variable names)
- `FieldAccessorExpr` - dot notation (`obj.field`)
- `FunctionCallExpr` - function calls with arguments
- `ControlCallExpr` - control flow (if, forEach, with)
- `OperatorCallExpr` - binary operators
- `ArrayExpr` - array literals `[a, b, c]`
- `BracketedExpr` - parenthesized expressions

### Source Position Tracking
- Every token stores `start` and `end` character indices
- Used for error messages: `"Parsing error at offset " + index`
- AST nodes don't preserve position (only tokens do)

### Clever Design: regexPossible Flag
- Problem: `/` is both divide operator and regex delimiter
- Solution: Parser hints to Scanner when regex is syntactically possible
- Called as `_scanner.next(true)` after operators, `next(false)` after values
- Avoids lookahead complexity

---

## Phase 4: Column Reference Handling

### Row Datum Reference
**Multiple datum objects** depending on context:
- `value` - current cell value (most common)
- `cell` - current cell with metadata (value, recon, etc.)
- `cells` - all cells in row (access as `cells.columnName`)
- `row` - row object (index, starred, flagged)
- `record` - record object (for records mode)

### Column Reference Syntax
1. **Direct value:** `value` (implicit column - the one being transformed)
2. **Named column:** `cells.columnName` or `cells["Column Name"]`
3. **Field access:** `cell.value`, `cell.recon`, `row.index`, etc.

### Bracket Notation Support
**Yes, via field accessor syntax:**
- `cells["Column With Spaces"]`
- `cells.SimpleColumn` (dot notation for simple names)
- Bracket notation implemented as array indexing (parseFactor() line 292-298)
- Parser treats `obj["field"]` as `get(obj, "field")` function call

### How It Works
1. **Parser:** Sees identifier → creates `VariableExpr`
2. **Parser:** Sees dot → creates `FieldAccessorExpr(object, fieldName)`
3. **Parser:** Sees bracket → creates `FunctionCallExpr(get, [object, key])`
4. **Evaluation:**
   - `VariableExpr.evaluate()` looks up name in bindings (Properties object)
   - `FieldAccessorExpr.evaluate()` checks if object implements `HasFields` interface or is `ObjectNode` (JSON)
   - Returns null for missing fields (no error)

### Column Dependency Tracking
**Smart analysis for optimization:**
- `VariableExpr` knows special names (`value`, `cell`, `recon` → depend on base column)
- `FieldAccessorExpr` knows `cells.colname` pattern → extracts column dependency
- Used for performance: only load columns that expression actually uses
- See VariableExpr.java:65-72, FieldAccessorExpr.java:83-95

### No Validation at Parse Time
- Column names not validated during parsing
- Parser doesn't know schema
- Missing columns return null at evaluation time (no error thrown)
- **Design tradeoff:** Flexibility vs early error detection

---

## Phase 5: Operator Handling

### Supported Operators
**Arithmetic:** `+`, `-`, `*`, `/`, `%`
**Comparison:** `>`, `>=`, `<`, `<=`, `==`, `!=`
**Special:** `<>` (scanned but filtered out - appears to be legacy/unimplemented)

### No Word Aliases
- No `and`/`or` keywords - must use functions: `and(a, b)`, `or(a, b)`, `not(a)`
- No `eq`/`ne` aliases - only symbolic operators

### Precedence Handling
**Hardcoded via parsing method hierarchy:**
1. Lowest: Comparison (`==`, `!=`, `>`, `>=`, `<`, `<=`) - parseExpression()
2. Middle: Additive (`+`, `-`) - parseSubExpression()
3. Highest: Multiplicative (`*`, `/`, `%`) - parseTerm()
4. Postfix: Field access (`.`), function calls, array indexing - parseFactor()

**Traditional operator precedence** - not table-driven, baked into recursive descent structure.

### Equality Operator Behavior
**== is complex equality:**
- Both null: `true`
- Numbers: Numeric equality (int vs double handled correctly)
- Strings: Uses `Collator.compare()` with canonical decomposition (Unicode normalization)
- Comparable objects: Uses `.compareTo()`
- Fallback: `.equals()` method
- **Not strict** - type coercion happens implicitly

### Type Coercion Rules (Implicit)
1. **Integer arithmetic:** If both operands are integral → use long arithmetic
2. **Decimal arithmetic:** If any operand is floating → use double arithmetic
3. **String concatenation:** If either operand is string → convert both, concatenate
4. **Comparisons:** Type-specific comparison paths, fallback to generic Comparable

### Null Handling
- **Null propagation:** Operators with null operands → return null (line 191-206)
- **Exceptions:** `==` and `!=` handle null explicitly
  - `null == null` → true
  - `null == anything` → false
  - `null != null` → false
  - `null != anything` → true

### Special Behaviors
- **Divide by zero:** Returns `Infinity`, `-Infinity`, or `NaN` (Java semantics)
- **String + anything:** Auto-converts to string and concatenates
- **Unicode string comparison:** Uses `Collator` with canonical decomposition (language-aware)

### Operator Precedence Table (Explicit)
| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 (lowest) | `==` `!=` `>` `>=` `<` `<=` | Left |
| 2 | `+` `-` | Left |
| 3 | `*` `/` `%` | Left |
| 4 | Unary `-` | Right |
| 5 (highest) | `.` `[]` `()` | Left |

---

## Phase 6: Function Support

### Two Types of Callables
1. **Functions** - Pure functions, arguments pre-evaluated
   - Interface: `Object call(Properties bindings, Object[] args)`
   - Arguments already evaluated to values
   - Cannot affect bindings or control flow
   - Examples: `toUppercase()`, `length()`, `split()`

2. **Controls** - Control flow constructs, receive unevaluated AST
   - Interface: `Object call(Properties bindings, Evaluable[] args)`
   - Arguments are AST nodes (not evaluated)
   - Can evaluate selectively (short-circuit, conditionals)
   - Can modify bindings
   - Examples: `if()`, `forEach()`, `with()`, `filter()`
   - Have `checkArguments()` for parse-time validation

### Built-in Functions (100+ functions, ~10k LOC)
**Organized by category:**
- **Strings** (40+): toUppercase, toLowercase, split, replace, trim, contains, match, fingerprint, etc.
- **Math** (30+): abs, round, floor, ceil, sin, cos, pow, sum, min, max, etc.
- **Arrays** (7): join, reverse, sort, uniques, inArray, zip
- **Dates** (3): now, toDate, inc, datePart
- **Booleans** (4): and, or, not, xor
- **Type conversion** (5): toString, toNumber, toDate, type, jsonize
- **HTML/XML** (7): parseHtml, parseXml, select, innerHtml, xmlText, etc.
- **Utility** (10+): coalesce, cross, get, hasField, length, slice, facetCount, etc.

### Function Call Syntax
**Two forms:**
1. **Prefix:** `function(arg1, arg2)`
2. **Method-style:** `arg1.function(arg2, arg3)` - first arg is implicit

Parser handles both (see Parser.java:277-288):
- Dot followed by identifier and `(` → method call
- First arg prepended to argument list

### Registration Mechanism
**Static registry pattern:**
- `ControlFunctionRegistry` - global HashMap
- Functions registered at class loading time (static initializers)
- No plugin system or runtime registration in GREL module
- Lookup by string name: `getFunction("toUppercase")`

### Function Validation
- **Parse-time:** Unknown function names fail immediately (Parser.java:225-227)
- **Runtime:** Argument count/type validated in each function's call()
- **Return:** Functions return `EvalError` object for invalid arguments
- Error handling convention: return EvalError, don't throw exceptions

### Extension Mechanism
**None within GREL module** - registry is hardcoded at compilation
- Extensions must be separate language modules (like Jython, Clojure support)
- Cannot add functions via API or config

### Metadata (Documentation)
Functions provide structured metadata via interfaces:
- `getDescription()` - human-readable description
- `getParams()` - parameter signature string
- `getReturns()` - return type description
- JSON-serializable (@JsonProperty annotations)

### Code Size (Expression Handling Functions)
- **Registry + infrastructure:** ~500 lines
- **Individual functions:** 9,841 lines total
- **Average function:** ~100 lines (with error handling, docs)

---

## Phase 7: Error Handling

### Two Error Types

1. **ParsingException** (extends Exception)
   - Thrown during parsing for syntax errors
   - Simple exception with message string
   - Contains offset position (character index)
   - Thrown, not returned

2. **EvalError** (implements Serializable, NOT exception)
   - Returned as value during evaluation
   - Has `message` field and `type` property ("error")
   - **Errors are values** - can be stored in cells
   - Design rationale: One bad cell shouldn't fail entire column
   - Functions return EvalError, don't throw

### Error Message Quality

**Format:** `"Parsing error at offset <N>: <description>"`

**Examples from Parser.java:**
- "Expecting something more at end of expression" (line 174)
- "Bad regular expression (<details>)" (line 191)
- "Bad negative number" (line 210)
- "Unknown function or control named <name>" (line 226)
- "Missing function name" (line 271)
- "Unknown function <name>" (line 282)
- "Missing )" (line 252)
- "Missing <delimiter>" (line 333)
- "Missing number, string, identifier, regex, or parenthesized expression" (line 261)

**Characteristics:**
- **Position info:** Character offset included
- **Technical language:** "identifier", "regex", "delimiter"
- **No suggestions:** Doesn't suggest fixes
- **Generic:** Doesn't show context or offending text

### Error Recovery

**Fail fast strategy:**
- First parsing error stops compilation immediately
- No attempt to collect multiple errors
- No error recovery or synchronization
- Parser maintains no error list

**Scanner errors:**
- Scanner can return ErrorToken for unrecognized chars
- Error detail stored in token: "String not properly closed", "Regex not properly closed", "Unrecognized symbol"

### Type Coercion Behavior

**Implicit, JavaScript-like:**
- Numbers coerce between int/double automatically
- Strings coerce to anything with toString()
- No explicit "strict mode"
- Type mismatches handled at evaluation, not parsing

### Runtime Error Handling

**Silent null propagation:**
- Missing fields → return null (no error)
- Null in operators → return null (except ==, !=)
- Unknown columns → null at evaluation

**Function errors:**
- Invalid arguments → return EvalError object
- EvalError bubbles up through expression tree
- Operators check for EvalError and propagate (OperatorCallExpr.java:66-68)

### Error Checking Pattern

```java
Object v = expr.evaluate(bindings);
if (ExpressionUtils.isError(v)) {
    return v; // bubble up
}
// use v normally
```

### Message Localization

Functions reference message catalog:
- `EvalErrorMessage.expects_one_string(functionName)`
- `FunctionDescription.str_to_uppercase()`
- Supports internationalization (i18n)

---

## Phase 8: Edge Cases via Tests

### Test Coverage Observations

**Test focus:** Heavy on function behavior, light on parser edge cases
- 100+ function test files
- Few dedicated parser/scanner tests
- Most tests are happy path with some error cases

### Edge Cases Found in Tests

#### Numeric Edge Cases
- **Divide by zero:** 0/0 → NaN, n/0 → ±Infinity (tested explicitly)
- **Leading zeros:** "001.234" → 1.234 (handled correctly)
- **Scientific notation:** "1e2" → 100.0 (supported)
- **Integer vs decimal:** Automatic promotion based on presence of decimal point
- **Negative numbers:** Unary minus tested

#### String Edge Cases
- **Empty strings:** split("", ",") → empty array (tested)
- **Consecutive delimiters:** "a,,b" → ["a", "b"] by default, ["a", "", "b"] with preserveTokens flag
- **Leading/trailing delimiters:** " a b " split by space → edge handling varies by function
- **Unicode:** Tests exist for normalize() function, Unicode handling
- **Case sensitivity:** Regex with /i flag supported

#### Null/Empty Handling
- **null arguments:** Functions return EvalError for null in most cases
- **Empty string vs null:** Distinct behaviors tested (e.g., toNumber("") vs toNumber(null))
- **Missing optional args:** Tests show functions with variable arity

#### Type Coercion
- **String to number:** "123" → 123, "123.456" → 123.456
- **Invalid conversions:** "abc" → EvalError
- **Boolean type strictness:** Third arg must be boolean, not "true" string (SplitTests.java:52)

#### Regex Patterns
- **Pattern objects:** Can pass compiled Pattern or string to split()
- **Pattern.split() quirk:** Returns empty token on leading match (documented in test)
- **Regex literals:** /pattern/i syntax for case-insensitive

### Missing Edge Cases (Not Tested)
- **Deeply nested parentheses** - no parser stress tests visible
- **Long identifiers** - no length limit tests
- **Column names with quotes** - not explicitly tested
- **Very large numbers** - no overflow tests
- **Complex Unicode** (emojis, combining chars, RTL) - minimal coverage
- **Malformed expressions** - limited negative parser tests

### Test Philosophy
**Pragmatic, function-focused:**
- Tests validate function correctness
- Minimal parser/scanner unit tests
- Relies on integration testing through function tests
- Assumes parser is stable (mature codebase)

### Test Patterns
```java
// Typical pattern
assertTrue(invoke("toNumber", "abc") instanceof EvalError);
assertEquals(invoke("split", "a,b", ","), new String[] {"a", "b"});
```

**Helper method:**
- `invoke(functionName, args...)` - convenient test invocation
- Returns result or EvalError
- Simpler than constructing full AST

---

## Phase 9: Ideas and Warnings

### Ideas to Adopt for Chumak

#### 1. **Two-phase Parse/Evaluate Model** ✅ HIGHLY RECOMMENDED
- Compile once, evaluate many times
- Clear separation of concerns
- AST is cacheable and serializable
- **Why:** Browser performance - parse once, evaluate per row

#### 2. **regexPossible Hint Pattern** ✅ CLEVER
- Parser hints scanner about context
- Avoids lookahead for `/` ambiguity (divide vs regex)
- Minimal complexity, elegant solution
- **Adopt:** Simple flag parameter to scanner, called at right places

#### 3. **Errors as Values (EvalError)** ✅ EXCELLENT FOR DATA WRANGLING
- One bad cell doesn't fail entire column
- Errors propagate through expression tree
- User can see which rows failed
- **Critical for Chumak:** Tabular data needs this pattern

#### 4. **Column Dependency Tracking** ⚠️ OPTIONAL BUT VALUABLE
- Performance optimization: only load needed columns
- Enables smart caching
- **For Chumak:** Useful for large CSVs in browser, but Phase 2+

#### 5. **Method-style Syntax** ✅ USER-FRIENDLY
- `value.toUppercase()` more intuitive than `toUppercase(value)`
- Parser handles by prepending implicit arg
- **Adopt:** Makes expressions more readable for non-programmers

#### 6. **Field vs Bracket Access Pattern** ✅ GOOD
- `cells.columnName` for simple names
- `cells["Column Name"]` for spaces/special chars
- Bracket treated as get() function call
- **Adopt:** Familiar to JS/Python users

#### 7. **Position Tracking in Tokens** ✅ ESSENTIAL
- Every token stores start/end offset
- Error messages show position
- **Adopt:** Critical for good error messages

### Warnings / Anti-patterns to Avoid

#### 1. **Poor Error Messages** ⚠️ DO BETTER
- "Parsing error at offset 42: Missing )" is not user-friendly
- No context, no suggestions, technical jargon
- **For Chumak:** Show snippet of expression, highlight position, suggest fixes
- Example: `Expected ')' after expression | value.split(',`) ← here`

#### 2. **Fail-fast, No Error Recovery** ⚠️ ACCEPTABLE BUT LIMITING
- First error stops parsing
- No multiple error collection
- **For Chumak:** Consider showing multiple errors in Phase 3, but Phase 1 can match GREL

#### 3. **No Column Name Validation** ⚠️ TRADEOFF
- Unknown columns → null at runtime (no parse error)
- User doesn't know if typo until evaluation
- **For Chumak Decision:**
  - Phase 1: Follow GREL (flexibility wins)
  - Phase 3: Optional schema validation mode?

#### 4. **Hardcoded Function Registry** ❌ AVOID
- No plugin system, functions compiled in
- Extensions require separate language modules
- **For Chumak:** Design for extensibility from start
  - Consider: `registerFunction(name, impl)` API
  - Or: Functions imported from separate modules

#### 5. **Complex Equality (==)** ⚠️ BE EXPLICIT
- Unicode collation for strings
- Type coercion for numbers
- Special null handling
- **For Chumak:** Document clearly, consider strict mode option

#### 6. **No Logical Operators (&&, ||)** ⚠️ SURPRISING
- Must use functions: `and(a, b)`, `or(a, b)`
- Users expect &&/|| from JS
- **For Chumak:** Support both? `&&` maps to `and()` internally?

#### 7. **Technical Language in UI** ❌ IMPROVE
- "identifier", "delimiter", "evaluable" in errors
- Target audience may not know compiler terms
- **For Chumak:** Use user-friendly terms: "column name", ")", "expression"

### Patterns Worth Copying

#### Parser Structure
```javascript
// Clean recursive descent with precedence
parseExpression()   // comparisons
  → parseSubExpr()    // +, -
    → parseTerm()       // *, /, %
      → parseFactor()     // atoms, postfix
```

#### Error Bubbling
```javascript
// In every evaluation
let result = expr.evaluate(bindings);
if (isError(result)) return result; // propagate up
```

#### Token with Position
```javascript
class Token {
  start: number;   // character offset
  end: number;
  type: TokenType;
  text: string;
}
```

### Architecture Decisions for Chumak

| Aspect | GREL Approach | Chumak Recommendation |
|--------|---------------|----------------------|
| **Parse/eval split** | Yes | ✅ Adopt |
| **AST vs code gen** | AST | ✅ Adopt (easier to inspect/debug) |
| **Datum syntax** | `cells.col`, `value` | ✅ Adapt: `row.col`, `value` for simplicity |
| **Bracket notation** | Via get() function | ✅ Adopt |
| **Error strategy** | Errors as values | ✅ Adopt (perfect for data wrangling) |
| **Operator precedence** | Hardcoded levels | ✅ Adopt (simple, correct) |
| **Boolean operators** | Functions only | ⚠️ Consider: Support `&&`, `||` directly |
| **Function registry** | Static, hardcoded | ❌ Improve: Make extensible |
| **Error messages** | Technical, offset only | ❌ Improve: User-friendly, contextual |
| **Control structures** | AST args (unevaluated) | ⚠️ Consider: Chumak likely doesn't need (no loops in Phase 1) |
| **Type system** | Implicit coercion | ✅ Adopt for Phase 1 (explicit typing in Phase 3?) |

### Applicability to Chumak

#### Directly Reusable (Concepts)
- Parser structure (recursive descent with precedence)
- Token with position tracking
- Error-as-value pattern
- Two-phase parse/evaluate
- regexPossible hint pattern
- Method-style function syntax

#### Needs Adaptation
- Function registry → make extensible
- Error messages → user-friendly rewrite
- Column reference syntax → simplify to `row.column` or keep `cells.column`?
- Boolean operators → add `&&`, `||` support

#### Explicitly Avoid
- Static function registration
- Technical error messages
- No schema validation (consider optional)
- Lack of plugin system

### Code Size Implications

**GREL totals:**
- Scanner: ~350 lines
- Parser: ~345 lines
- **Core total: ~700 lines** (without functions)

**For Chumak (JS):**
- Similar size expected for parser/scanner
- **Estimate: 500-800 lines** for core expression handling (JS is more concise)
- CDN-loadable, no build system → ~50KB minified?

### Final Recommendations

1. **Use GREL's parser structure as template** - proven, simple, correct
2. **Adopt error-as-value pattern** - essential for data wrangling
3. **Improve error messages significantly** - Chumak's UX advantage
4. **Design for extensibility** - functions should be pluggable
5. **Support both function and operator syntax for booleans** - `and(a,b)` OR `a && b`
6. **Keep it simple for Phase 1** - GREL's core is ~700 lines, achievable
7. **Test-driven** - GREL's test coverage is function-heavy; Chumak should test parser more

### Not Needed for Chumak Phase 1
- Control structures (if, forEach) - no loops in MVP
- 100+ functions - start with ~15 essential ones
- Regex literals - can add in Phase 3
- HTML/XML parsing - out of scope
