# Syto: Expression Parser Research Guide

## Purpose

This document guides the analysis of existing codebases to inform expression parser design decisions for Syto. The goal is to fill in the comparison table by examining each project's approach to expression handling.

---

## Projects to Examine

| Project        | Repository                          | Relevance                                                      |
| -------------- | ----------------------------------- | -------------------------------------------------------------- |
| **Arquero**    | `github.com/uwdata/arquero`         | Runtime dependency—must understand how it consumes expressions |
| **Vega-Lite**  | `github.com/vega/vega-lite`         | Declarative transforms, spec inspiration, filter expressions   |
| **jsep**       | `github.com/EricSmekens/jsep`       | Lightweight parser candidate for adoption                      |
| **filtrex**    | `github.com/m93a/filtrex`           | Small expression-to-function compiler, good learning example   |
| **Tidyjs**     | `github.com/pbeshai/tidy`           | Tidy data transforms in JS, similar problem domain             |
| **danfo.js**   | `github.com/javascriptdata/danfojs` | Pandas-like for JS, query expressions                          |
| **OpenRefine** | `github.com/OpenRefine/OpenRefine`  | GREL expression language, mature error handling                |
| **ag-Grid**    | `github.com/ag-grid/ag-grid`        | Filter expressions in commercial-grade product                 |

---

## Comparison Table

Fill in each cell with a brief finding (1-2 sentences max). Use "N/A" if not applicable, "?" if unclear after investigation.

| Aspect                                                                              | Arquero                                                                                                                                                                     | Vega-Lite                                                                                                                                    | jsep                                                                                                                                                                                                                                                  | filtrex | Tidyjs                                                                                                                | danfo.js | OpenRefine                                                                                                                                           | ag-Grid                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --- | --------------------------------------- | --------------------------------- | --- | --------------------------------------------------------------------------------------------------------- |
| **Expression input type** (string / function / object / tagged template)            | **Function only (arrow functions).** Accepts `d => d.sales > 1000`. Tagged template `rolling()` for window frames. Field helper for programmatic refs.                      | **Object + string hybrid.** Predicate objects (structured) OR raw Vega expression strings.                                                   | **String only.** Accepts JavaScript expression strings: `sales > 1000`, `a.b[c]`. Returns AST, does not evaluate.                                                                                                                                     |         |                                                                                                                       |          | **String only.** GREL accepts only string expressions, no function/object variants.                                                                  | **String or function.** Accepts `valueGetter: "data.a + data.b"` (string) or `valueGetter: (params) => params.data.a` (function). Filters use structured models, not expressions. |
| **Parsing approach** (regex / handwritten / parser generator / external lib / none) | **Acorn parser + AST rewriting.** Wraps expr in `expr=(...)`, parses with acorn (ecmaVersion 11), walks/rewrites AST, generates code, compiles with Function().             | **External lib for AST analysis only.** Uses vega-expression's parseExpression() only for field dependency extraction, not validation.       | **Handwritten recursive descent.** Single-pass parser, no separate tokenizer. "Gobble" methods (gobbleExpression, gobbleToken, gobbleBinaryOp). ~600 LOC.                                                                                             |         |                                                                                                                       |          | **Handwritten recursive descent.** Separate Scanner (tokenizer) + Parser, no external parser libs. ~700 LOC total.                                   | **None - direct eval.** Wraps string in "return ...;" and compiles with `new Function(params, body)`. No parsing, validation, or transformation.                                  |
| **AST structure** (typed nodes / plain objects / none)                              | **Acorn's standard JS AST + custom types.** Uses standard nodes (BinaryExpression, etc.) plus custom: Column, Op, Constant, Parameter, Dictionary, Function.                | **Typed nodes from vega-expression.** Node types: Identifier, Literal, MemberExpression; has visit() method for traversal.                   | **Plain objects, ESTree-compatible.** 10 node types: Identifier, Literal, BinaryExpression, UnaryExpression, MemberExpression, CallExpression, ArrayExpression, ConditionalExpression, Compound, SequenceExpression. Based on SpiderMonkey AST.       |         |                                                                                                                       |          | **Typed Java classes.** 9 node types (LiteralExpr, VariableExpr, FieldAccessorExpr, etc.), all implement Evaluable interface.                        | **None.** No AST. Expressions are JavaScript strings compiled directly to functions.                                                                                              |
| **Column reference syntax** (how user refers to a column in expression)             | **Member expression: `d.col` or `d["col"]`.** Computed access supported: `d[expr]`. Dynamic via params: `d[$.colname]`.                                                     | **Predicate: `{field: "colname"}`. Expression: `datum.col` or `datum["col"]`.** Flexible in user strings, always generates bracket notation. | **Parser-agnostic - no semantics.** Parses `col`, `obj.col`, `obj["col"]` as standard JS. MemberExpression node with `computed` flag. No built-in notion of row/datum.                                                                                |         |                                                                                                                       |          | **Multiple forms:** `value` (current cell), `cells.columnName`, `cells["Column Name"]`, `cell.value`, `row.index`. Rich object model.                | **Via parameter access: `data.col` or `data["col"]`.** Can also use `value`, `node.data.col`, or `getValue("col")`. Full JavaScript member access.                                |
| **Row datum reference** (d.col / datum.col / $col / other)                          | **`d` prefix (default).** Configurable via function param name. Join expressions use `d1` and `d2`. Parameters accessed via `$`.                                            | **`datum` prefix.** Generated code always uses `datum["fieldname"]` format for safety.                                                       | **N/A - parser only.** No runtime semantics or datum concept. Consumes bare identifiers (`col`) or any valid JS member expression.                                                                                                                    |         |                                                                                                                       |          | **Multiple objects:** `value`, `cell`, `cells`, `row`, `record`. Accessed via Properties bindings, not prefix syntax.                                | **13 named parameters.** `x, ctx, oldValue, newValue, value, node, data, colDef, rowIndex, api, getValue, column, columnGroup`. Typically use `data` for row.                     |
| **Bracket notation support** (for column names with spaces)                         | **Yes, full support.** Both `d["Column Name"]` and computed `d[expr]`. Generates `data.col.at(row)` or `data["col"].at(row)` based on syntax.                               | **Yes, always generated.** All field references use `datum["name"]` to handle spaces/special chars.                                          | **Yes, JavaScript standard.** Parses `obj["any string"]` as MemberExpression with computed=true. Handles spaces, special chars, dynamic access.                                                                                                       |         |                                                                                                                       |          | **Yes, as syntax.** `cells["Column Name"]` parsed as array indexing, treated as get() function call internally.                                      | **Yes, JavaScript syntax.** User writes `data["Column Name"]` as standard JS bracket notation. No special handling needed.                                                        |
| **String literal handling** (single quotes / double quotes / both)                  | **Both (JavaScript standard).** Parsed by acorn, supports all JS string syntax including template literals `` `${d.x}` ``.                                                  | **User expressions: both allowed.** Generated expressions: double quotes. No enforcement on user strings.                                    | **Both supported.** Standard escape sequences: `\n`, `\r`, `\t`, `\b`, `\f`, `\v`, `\\`. Template literals via plugin.                                                                                                                                |         |                                                                                                                       |          | **Both supported.** Scanner accepts both `"` and `'` as delimiters. Escape sequences: `\t`, `\n`, `\r`, `\\`.                                        | **Both (JavaScript standard).** Uses JavaScript's native parsing. Supports all JS string syntax including template literals, escapes, unicode.                                    |
| **Boolean operators** (and/or / &&/\|\| / both)                                     | **JavaScript operators: `&&`, `\|\|`, `!`.** No word forms (and/or/not). Uses standard JS precedence and short-circuit evaluation.                                          | **Predicate objects: `{and:[], or:[], not:}`.** Compiled to `&&`, `\|\|`, `!`. No word forms in expressions.                                 | \*\*JavaScript operators by default: `&&`, `                                                                                                                                                                                                          |         | `, `!`, `??`.** Word forms like `and`, `or`, `not` can be added as custom binary/unary operators. Fully configurable. |          |                                                                                                                                                      |                                                                                                                                                                                   | **Functions only.** `and(a,b)`, `or(a,b)`, `not(a)`. No `&&`/` |     | ` operators. Surprising for JS/C users. | \*\*JavaScript operators: `&&`, ` |     | `, `!`.\*\* Uses standard JS operators with native semantics. No custom operators or word forms (and/or). |
| **Equality operator** (== / === / = / eq)                                           | **Both `==` and `===` supported.** Follows JavaScript semantics. Dictionary column optimization rewrites `col === value` to key lookup.                                     | **Strict equality `===`.** Predicate `{equal: value}` generates `===`. No `!==` predicate (use expression).                                  | **Both `==` and `===` (JavaScript standard).** Also `!=` and `!==`. Parser recognizes as BinaryExpression operators. No semantic interpretation.                                                                                                      |         |                                                                                                                       |          | **Complex `==`.** Unicode collation for strings, numeric coercion, null-aware. Implicit type coercion, not strict.                                   | **Both `==` and `===` (JavaScript standard).** Follows native JS semantics: `==` coerces types, `===` strict equality. No custom behavior.                                        |
| **Operator precedence handling** (how / hardcoded / configurable)                   | **Inherited from JavaScript.** Acorn parser handles precedence correctly. Codegen adds liberal parentheses in output.                                                       | **Implicit via tree structure.** Predicates are nested objects (no ambiguity). Heavy parenthesization in generated code.                     | **Configurable precedence table.** binary_ops maps operator → precedence (1-11). Implements shunting-yard-like algorithm with right-associativity support. Matches JS precedence by default.                                                          |         |                                                                                                                       |          | **Hardcoded recursive descent.** 4 precedence levels in parser methods. Standard: compare < +/- < \*/% < postfix.                                    | **Inherited from JavaScript.** Native JS engine handles all precedence. No custom precedence rules or ambiguities.                                                                |
| **Custom functions support** (can user call functions like `len()`, `upper()`)      | **70+ built-in functions, extensible.** Aggregate/window ops (~55), standard functions (~40+). `addFunction(name, fn)` API for custom. `op.func()` or bare `func()`.        | **Vega runtime functions only.** Generates calls to `time()`, `inrange()`, `indexof()`, `isValid()`. No custom registration.                 | **Parses function calls, no execution.** CallExpression node with callee + arguments. Parser-only - doesn't resolve or validate function names. Consumer's responsibility to interpret.                                                               |         |                                                                                                                       |          | **100+ built-in functions.** Organized by domain (strings, math, arrays, dates, booleans, etc.). Static registry, parse-time validation.             | **All JavaScript functions.** Full access to native JS functions (Math.round, String.toUpperCase, etc.) plus any globals. No custom DSL functions.                                |
| **Null/missing value handling** (how nulls behave in comparisons)                   | **JavaScript null semantics.** No special null handling. Comparisons use JS rules. Functions can be null-aware (many are).                                                  | **`{valid: true}` predicate.** Generates `isValid(field) && isFinite(+field)`. Null ranges become partial comparisons.                       | **N/A - parser only.** Parses `null` literal as Literal node with value=null. No runtime behavior or special null handling in parsing.                                                                                                                |         |                                                                                                                       |          | **Silent null propagation.** Missing fields/columns → null (no error). Operators return null for null operands (except `==`, `!=`).                  | **JavaScript null semantics.** Native JS null/undefined behavior. User responsible for null checks. Errors return null and log to console.                                        |
| **Error message quality** (position info / user-friendly / generic)                 | **Technical, brief, with snippet.** Format: `"ErrorType: \"snippet\"[note]"`. Offset info (adjusted -6). No suggestions. Example: `"Invalid column reference: \"d.foo\""`.  | **Generic.** Single error: "Invalid field predicate: {...}". No position info, technical format, no suggestions.                             | **Basic with character position.** Format: "message at character N". Examples: "Unclosed quote after...", "Expected expression after +", "Unexpected period". Error object includes index and description fields.                                     |         |                                                                                                                       |          | **Technical, offset-based.** Format: "Parsing error at offset N: description". Uses compiler jargon (identifier, delimiter). No context/suggestions. | **Generic dump.** "Processing of the expression failed" + dumps expression, params, exception. No position info, just raw error from JS engine.                                   |
| **Error recovery** (fail fast / collect multiple / silent)                          | **Fail fast.** First error throws immediately. No recovery, no multiple error collection. Wraps acorn errors.                                                               | **Fail fast.** Single error throws, compilation stops, no recovery or multiple error collection.                                             | **Fail fast.** First error throws Error with index property. No error recovery, no collection of multiple errors, parsing stops immediately.                                                                                                          |         |                                                                                                                       |          | **Fail fast.** First parsing error throws ParsingException, stops immediately. No error recovery or multiple error collection.                       | **Fail fast.** Catches exception, logs error, returns null. No validation before execution - errors only at runtime.                                                              |
| **Type coercion behavior** (strict / JS-like / custom rules)                        | **Standard JavaScript coercion.** No custom rules. Operators follow JS semantics (loose == vs strict ===, etc.).                                                            | **Relies on JS.** No explicit coercion handling, defers to JavaScript's implicit rules at Vega runtime.                                      | **N/A - parser only.** No type system or coercion. Parses numeric literals to numbers, doesn't interpret operator behavior or types.                                                                                                                  |         |                                                                                                                       |          | **Implicit, Java-style.** int↔double coercion, string concatenation. Type-specific paths in operators (numbers, strings, Comparable).                | **Standard JavaScript coercion.** Native JS rules apply. No custom coercion - all operators use JS semantics (type coercion for `==`, etc.).                                      |
| **Escape hatch** (can user provide raw JS/function)                                 | **Yes, via `escape()`.** Wrap function: `aq.escape(fn)` passes it through without parsing. Can close over external vars.                                                    | **Yes, raw expression strings.** Strings pass through unchanged to Vega. Can be mixed with predicates in logical compositions.               | **N/A - is the parser itself.** jsep IS the tool for parsing JS expressions. Consumer uses AST however they want. No restrictions imposed by parser.                                                                                                  |         |                                                                                                                       |          | **No.** GREL is sandboxed. Cannot inject Java code. For escape hatch, must use Jython or Clojure language modules.                                   | **Yes, by design.** String expressions ARE raw JS. Function form is also accepted. Expressions have full access to JavaScript.                                                    |
| **Extension mechanism** (plugins / registration / none)                             | **Comprehensive registration API.** `addFunction(name, fn)`, `addAggregateFunction(name, def)`, `addWindowFunction(name, def)`. Override option available.                  | **None in Vega-Lite.** Functions must be registered with Vega runtime separately. Vega-Lite just compiles specs.                             | **Comprehensive hooks + plugins.** 7 hook points (before-all, gobble-expression, after-expression, etc.). Plugins register via `jsep.plugins.register()`. Can add operators, identifiers, literals.                                                   |         |                                                                                                                       |          | **None in GREL module.** Static registry at compile time. Extensions require separate language module (Jython/Clojure).                              | **Via JavaScript globals.** Can add functions to global scope or pass via context parameter. No formal registration API needed.                                                   |
| **Code size** (lines of code for expression handling)                               | **~650 lines core.** parse.js (119), parse-expression.js (350), codegen.js (144), compile.js (15), rewrite.js (66). Plus ~150 for AST utils.                                | **~350 lines.** predicate.ts (276), expressions.ts (41), logical.ts (59). Minimal due to delegation.                                         | **~600 lines core parser.** jsep.js (980 lines with comments/blanks, ~600 code). hooks.js (58), plugins.js (27). Plugins add 50-100 lines each.                                                                                                       |         |                                                                                                                       |          | **~700 lines core, ~10k with functions.** Scanner (353), Parser (345), 9 AST classes (~1k), 100+ functions (~9.8k).                                  | **~80 lines.** ExpressionService (78 lines). Minimal - just wraps Function() constructor. No parser, no functions, no AST infrastructure.                                         |
| **Dependencies** (what the expression system depends on)                            | **acorn (^8.14.1) for JS parsing.** Only parser dep. Uses built-in Function() for compilation. Op/function implementations separate.                                        | **vega-expression (^6.1.0) for AST parsing.** Also vega-util for logging and helpers. Only used for analysis, not evaluation.                | **Zero dependencies.** Completely self-contained. No external parser libs, no runtime deps. Pure JavaScript, works in browser and Node.                                                                                                               |         |                                                                                                                       |          | **No parser deps.** Self-contained. Uses commons-lang3, jackson, jsoup for function impl, not parsing.                                               | **None.** Only uses built-in Function() constructor. No external dependencies for expression handling. Caching uses plain object.                                                 |
| **Test coverage focus** (what edge cases do their tests reveal)                     | **Security + edge cases.** 650+ line test file. Tests: nested members, indirect names, templates, blocks, security violations (globalThis, Object, loops), operator params. | **Happy path focused.** Tests all predicate types, logical compositions, datetime, signals. No negative tests or error cases.                | **Operators + extensibility.** Tests: precedence (esp. right-associative), custom operators (incl. alphanumeric like `and`/`or`), literals, Unicode identifiers, escape sequences, array holes, missing args, unclosed delimiters, optional chaining. |         |                                                                                                                       |          | **Function-heavy.** 100+ function tests, few parser tests. Edge cases: divide-by-zero, empty strings, null handling, type coercion.                  | **Integration tests only.** Tests focus on valueGetter/formatter behavior with mock ExpressionService. No expression-specific edge case tests found.                              |

---

## Analysis Protocol

For each project, follow this protocol sequentially. Record findings in the comparison table and in a per-project notes section.

### Phase 1: Orientation

**Objective:** Understand project structure and locate expression-related code.

1. Read `README.md` for high-level architecture and terminology used
2. Check `package.json` or equivalent for dependencies that might handle parsing
3. Identify source directory structure:
   - Search for directories/files named: `expr`, `expression`, `parse`, `filter`, `query`, `formula`
   - Note the primary language (JS/TS) and module system
4. Locate test directory and find expression-related test files
5. Check for TypeScript types or JSDoc that define expression interfaces

**Record:** Entry point file paths, terminology used (e.g., "predicate" vs "filter" vs "expression")

---

### Phase 2: Entry Point Analysis

**Objective:** Find where user-provided expressions enter the system.

1. Search for public API that accepts filter/expression:
   - Look at exported functions in index/main file
   - Search for "filter" in API documentation or type definitions
2. Identify the function signature:
   - What type does it accept? (string, object, function, tagged template)
   - Is parsing inline or delegated?
3. Trace one level deep:
   - What does the entry function call?
   - Is there validation before parsing?

**Record:** API signature, input types accepted, first processing step

---

### Phase 3: Parsing Mechanism

**Objective:** Understand how string expressions become executable.

1. If string parsing exists, locate the parser:
   - Handwritten: Look for functions like `tokenize`, `parse`, `gobble`, `consume`
   - External: Check imports for jsep, acorn, esprima, PEG.js output
   - Regex-based: Look for extensive `.replace()` chains or regex patterns
2. If function/tagged template based:
   - How do they extract column references?
   - Do they use `Function()` constructor or keep as closure?
3. Examine tokenization (if present):
   - How are strings delimited? (quotes type)
   - How are identifiers distinguished from keywords?
   - How is whitespace handled?
4. Examine AST (if present):
   - What node types exist?
   - How is source position tracked (if at all)?
   - Is there a visitor/walker utility?

**Record:** Parsing approach, AST structure, key functions/classes involved

---

### Phase 4: Column Reference Handling

**Objective:** Understand how column names are referenced and resolved.

1. Search for how row data is accessed at runtime:
   - Look for `datum`, `d`, `row`, `$`, or similar prefixes
2. Find how special column names (spaces, special chars) are handled:
   - Search for bracket notation `[`, `]`
   - Search for escaping mechanisms
3. Check if column names are validated against schema:
   - Is there a step that verifies column exists?
   - What happens with typos?

**Record:** Datum reference syntax, bracket notation support, validation behavior

---

### Phase 5: Operator Handling

**Objective:** Document supported operators and precedence.

1. Locate operator definitions:
   - Search for precedence tables or operator maps
   - Look for `and`, `or`, `&&`, `||`, `==`, `===`
2. Check for user-friendly aliases:
   - Does `and` work or only `&&`?
   - Does `==` mean strict or loose equality?
3. If custom parser, find precedence implementation:
   - Is it a table-driven approach?
   - How is associativity handled?

**Record:** Supported operators, aliases, precedence mechanism

---

### Phase 6: Function Support

**Objective:** Understand if and how functions are supported in expressions.

1. Search for built-in function definitions:
   - Look for `len`, `length`, `upper`, `lower`, `year`, `abs`, `round`
   - Find where function calls are parsed and evaluated
2. Check for custom function registration:
   - Is there an API to add functions?
   - How are functions resolved at runtime?
3. Examine function call syntax:
   - Standard: `func(arg1, arg2)`
   - Method-style: `column.upper()`
   - Other?

**Record:** Built-in functions list, registration mechanism, call syntax

---

### Phase 7: Error Handling

**Objective:** Understand error behavior and message quality.

1. Search for error throwing in parser:
   - What triggers errors? (unexpected token, unclosed string, etc.)
   - Are there custom error classes?
2. Examine error message content:
   - Is position information included?
   - Are messages user-friendly or technical?
3. Check error recovery strategy:
   - Does it fail on first error?
   - Does it attempt to collect multiple errors?
4. Look at test files for expected error cases

**Record:** Error types, message quality, recovery strategy

---

### Phase 8: Edge Cases via Tests

**Objective:** Discover edge cases the maintainers considered important.

1. Read through expression-related test files
2. Note tests for:
   - Empty expressions
   - Deeply nested parentheses
   - String literals with quotes inside
   - String literals containing keywords (`"and"`, `"null"`)
   - Column names with spaces/special characters
   - Unicode in identifiers or strings
   - Null/undefined comparisons
   - Numeric edge cases (negative, decimal, scientific notation)
   - Boolean column handling
   - Type mismatches in comparisons

**Record:** List of edge cases tested, any surprising behaviors

---

### Phase 9: Ideas and Warnings

**Objective:** Extract actionable insights.

1. **Ideas to adopt:**
   - Elegant patterns worth copying
   - Good error messages to emulate
   - Clever solutions to tricky problems
2. **Warnings to heed:**
   - Overly complex approaches that seem unnecessary
   - Known issues mentioned in GitHub issues
   - Places where tests reveal bugs or limitations
3. **Applicability to Syto:**
   - What can be directly reused?
   - What needs adaptation?
   - What should be explicitly avoided?

**Record:** Specific code patterns, approaches, and anti-patterns

---

## Per-Project Notes Template

Use this template for detailed notes on each project:

```markdown
## [Project Name]

### Orientation

- **Source location:**
- **Expression-related paths:**
- **Terminology used:**
- **Language/module system:**

### Entry Point

- **Public API:**
- **Input types:**
- **First processing step:**

### Parsing

- **Approach:**
- **Key files:**
- **AST structure:**

### Column References

- **Datum syntax:**
- **Bracket notation:**
- **Validation:**

### Operators

- **Supported:**
- **Aliases:**
- **Precedence handling:**

### Functions

- **Built-ins:**
- **Registration:**
- **Syntax:**

### Error Handling

- **Error types:**
- **Message quality:**
- **Recovery:**

### Edge Cases Tested

-

### Ideas to Adopt

-

### Warnings

-

### Code Snippets of Interest
```

---

## Research Approach Guidelines

### Scope & Depth

**Coverage:** Analyze all aspects stated in the research guide for each project

- Include filter expressions in transforms
- Include calculate/derive expressions
- Cover all 9 phases exhaustively for each project

**Depth Strategy:** Breadth-first research

- Once you understand the general approach for each topic, document findings and move on
- Don't dive deep into implementation details
- Focus on "what" and "why", not exhaustive "how"

### Execution Method

**Iterative Documentation:**

1. Complete one phase
2. Immediately update documentation with findings
3. Move to next phase without waiting
4. Write findings as you discover them

**Parallel Work:**

- Update comparison table cells as soon as you learn the answer
- Add details to per-project notes file as you go
- Don't batch updates until the end

### Output Format

**Two deliverables per project:**

1. **Comparison table** (in this RESEARCH-GUIDE.md file)
   - Brief 1-2 sentence findings per cell
   - Fill in Vega-Lite column, then Arquero, then jsep, etc.

2. **Per-project detailed notes** (separate markdown file)
   - Filename: `{project-name}-analysis.md` (e.g., `vega-lite-analysis.md`)
   - Use the template structure from "Per-Project Notes Template" section
   - Include all findings that don't fit in comparison table cells
   - Add code snippets, architectural insights, recommendations

### Research Philosophy

**Breadth over depth:**

- Understand the approach, don't replicate it
- Note key functions/files, don't read entire implementations
- Capture patterns and decisions, not every detail

**Practical focus:**

- What can Syto adopt directly?
- What needs adaptation?
- What should be avoided?

**Move quickly:**

- Don't get stuck on hard-to-find details
- Mark unclear items with "?" and move on
- Better to cover all 9 phases broadly than 3 phases deeply

---

## Deliverable

After analyzing all projects, produce:

1. **Completed comparison table** (above)
2. **Per-project notes** (using template, in separate files named `analysis__{project}.md`)
3. **Recommendation summary:** Based on findings, recommend parsing approach for Syto with rationale
