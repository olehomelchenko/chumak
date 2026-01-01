# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Phase**: Phase 0 Complete ✅ → Phase 1 (MVP) In Progress

---

## Project Overview

**Chumak** is a browser-based data wrangling tool for cleaning and transforming tabular data. Think "Power Query in the browser" or "OpenRefine but simpler."

**Key characteristics:**
- Runs entirely in browser (no backend)
- Visual pipeline builder (like Power Query)
- Declarative JSON specification for transforms
- Target users: students, analysts, non-programmers
- No installation required, works on restricted machines

**Name origin**: Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh).

---

## Current Status

**Phase 0**: Walking skeleton complete ✅ - All architectural layers validated
- Expression parser pipeline (jsep → validation → interpretation)
- IndexedDB persistence with auto-save
- Filter, Select, Derive, Sort, Rename, Remove, and Join transforms working
- CSV/clipboard import and CSV/JSON export functional
- URL-based state persistence
- Automated test infrastructure in place

**Phase 1 (Current)**: Building out full MVP transform set
- See SPECIFICATION.md Section 8 for complete roadmap
- Priority: Remaining transforms (aggregate, fillna, dropna, replace)

**Key technical discoveries** documented in PARSER-DESIGN-DECISION.md:
- jsep parses `&&`/`||` as BinaryExpression (not LogicalExpression)
- Arquero `.filter()` rejects try-catch blocks (workaround: `.objects()` → filter → `aq.from()`)
- On-demand step computation (compute intermediate results when viewing, don't cache)

---

## Key Design Decisions

### 1. Expression Parser: Hybrid Approach

Use structured predicates (primary) + expression strings (advanced):

```json
// Primary API - Structured predicates (80% of users)
{ "filter": { "field": "sales", "gt": 1000 } }

// Advanced API - Expression strings (20% of users)
{ "filter": "sales > 1000 && region == 'North'" }
```

**Rationale**: Vega-Lite research showed predicates work well for beginners; expressions provide escape hatch for complex logic.

### 2. Parser Library: jsep

- Zero dependencies, ~10KB minified, ESTree-compatible AST
- Parser-only (no code execution), CDN-loadable
- **Alternatives rejected**: Acorn (too complex), handwritten parser (untested), direct eval (insecure)

### 3. Security Model: AST Interpretation

**Never use `new Function()` with user input**

```javascript
// ❌ NEVER
const fn = new Function('d', userExpression);

// ✅ ALWAYS
const ast = jsep(userExpression);
validateAST(ast, schema);
const result = interpretAST(ast, data);
```

**Why**: No code injection, better validation, position-aware errors. Trade-off: 2-5x slower (acceptable for preview use case).

### 4. Column Syntax: Bare Identifiers

Accept `sales > 1000` (not `d.sales` or `datum.sales`) - simplest for non-programmers. Bracket notation for spaces: `[Total Sales] > 1000`.

### 5. Operator Choices

- Boolean: `&&`, `||`, `!` (JavaScript standard, jsep native support)
- Can add word forms (`and`, `or`, `not`) in Phase 3 if needed

---

## Technology Stack

**Core Dependencies (CDN-loaded)**:
- PapaParse (~35KB) - CSV parsing
- Arquero (~200KB) - Data transformation runtime
- jsep (~10KB) - Expression parser
- Alpine.js (~40KB) - Reactive UI

**No Build System**: All libraries from CDN, works by opening HTML file, GitHub Pages compatible

**Testing**: Mocha + Chai (CDN-loaded), browser-based test runner at `src/tests/runner.html`

---

## Codebase Map

**Before implementing, check if it already exists below.**

### Core Modules (Expression Pipeline)
- **[expression-parser.js](src/expression-parser.js)** - jsep wrapper, entry point for parsing
- **[ast-validator.js](src/ast-validator.js)** - Whitelist validation (security layer)
- **[ast-interpreter.js](src/ast-interpreter.js)** - Safe AST execution (no Function() constructor)
- **[transforms.js](src/transforms.js)** - Transform implementations (filter, select, derive, etc.)

### Infrastructure
- **[storage.js](src/storage.js)** - IndexedDB persistence (sources, models, settings)
- **[error-formatter.js](src/error-formatter.js)** - User-friendly error messages with position highlighting
- **[performance-logger.js](src/performance-logger.js)** - Optional performance tracking (toggle-able)
- **[ux-settings.js](src/ux-settings.js)** - localStorage preferences (pagination, theme, etc.)

### Application
- **[chumak-app.js](src/chumak-app.js)** - Main Alpine.js component (UI state & logic)

### Tests
- **[src/tests/runner.html](src/tests/runner.html)** - Browser test runner (Mocha + Chai)
- Test files mirror module names: `expression-parser.test.js`, `ast-validator.test.js`, etc.

**Tip**: Each module has header comments with purpose and exports. Read headers before implementing.

---

## Documentation Map

- **SPECIFICATION.md** - Complete product spec (data model, transforms, UI, phases)
- **PARSER-DESIGN-DECISION.md** - Parser architecture and security design
- **PHASE-0-TESTING-CHECKLIST.md** - Manual testing checklist
- **research/** - 8-project analysis (Vega-Lite, Arquero, OpenRefine, ag-Grid, etc.)

---

## Important Context for Future Sessions

### User Profile (Critical)

**Target users**: Non-programmers
- Students learning data wrangling
- Analysts transforming spreadsheet data to tidy format
- Users needing quick CSV cleaning

**NOT target users**: JavaScript developers, data scientists with Python/R, enterprise users

**Implication**: Everything beginner-friendly
- Plain language errors (not "identifier not found")
- Visual predicate builder (not raw expressions)
- Helpful typo suggestions

### Security Requirements (Critical)

**Environment**: Browser-based, untrusted user input

**Mitigation**:
- Never use Function() constructor with user input
- Always validate AST before execution
- Whitelist operators and functions (Phase 1: arithmetic, comparison, logical only)
- No window/document access from expressions
- Error-as-value pattern (don't throw exceptions that break 10,000 cells)

### Arquero Relationship

**Arquero is the runtime, not the model**:
- Chumak uses Arquero for data transformation execution
- Chumak does NOT copy Arquero's parser approach (Acorn + Function() constructor)
- Flow: User input → Parse & validate (Chumak) → Generate Arquero function → Execute (Arquero runtime)

### Testing Philosophy (Important)

**MANDATORY: Update tests when implementing features**

1. Write tests FIRST in `src/tests/`
2. Run `src/tests/runner.html` to verify tests fail (red)
3. Implement the feature
4. Run tests again to verify pass (green)
5. All tests must pass before feature complete

**Test files**: `expression-parser.test.js`, `ast-validator.test.js`, `ast-interpreter.test.js`, `transforms.test.js`

**Edge cases**: Empty data, nulls, column names with spaces, division by zero, type mismatches, deeply nested expressions

### Performance Constraints

**Targets**: Parse + validate <10ms, evaluate 100 rows <50ms, UI responsive

**Trade-offs**: AST interpretation 2-5x slower than compiled (acceptable for preview-only evaluation)

---

## Common Pitfalls to Avoid

### 1. Don't Use Function() Constructor
See Security Requirements above - this is non-negotiable.

### 2. Don't Copy Arquero's Parser
Arquero uses Acorn (~800 lines) + Function() constructor. Chumak uses jsep + validation (~700 lines, no Function()).

### 3. Don't Force JavaScript Syntax on Users
Bad: Require `d.sales > 1000` (Arquero style)
Good: Accept `sales > 1000` (bare identifier)

Bad: "identifier not found"
Good: "Column 'Slaes' not found. Did you mean 'Sales'?"

### 4. Don't Add Features Prematurely
Phase 1 scope is deliberately limited:
- No functions (Phase 2)
- No joins (Phase 2)
- No pivot/unpivot (Phase 3)

Stick to roadmap. Simple MVP first.

### 5. Don't Over-Engineer (Critical)

**Code size should reflect importance and complexity, not "might need it someday"**

This is a small, focused project. Every line of code is maintenance burden.

**Guidelines**:
- Auxiliary/helper code should be minimal (~50-100 lines)
- Core features can be larger only if complexity warrants it
- YAGNI: Don't build for hypothetical future use cases
- Simple and focused beats "enterprise-ready"

**Balance**: Not too simplistic (brittle), not over-engineered (bloated). Right-sized for current needs.

**Minimize diff noise**:
- Avoid mass re-indentation of existing code
- Don't wrap entire functions if it forces indenting 50+ lines
- Add instrumentation at start/end instead of wrapping
- Git diff should show functional changes, not formatting churn

### 6. Don't Forget Error-as-Value Pattern

From OpenRefine research:

```javascript
// Bad - throws exception, breaks entire column
if (divisor === 0) throw new Error('Division by zero');

// Good - returns error object, isolates failure
if (divisor === 0) return { type: 'error', message: 'Division by zero' };
```

One bad cell shouldn't break 10,000 good cells.

### 7. Don't Forget to Write Tests

**CRITICAL**: Every new feature MUST have tests

See Testing Philosophy above. Tests in `src/tests/runner.html`, 90%+ coverage required, all tests pass before committing.

---

## Quick Reference

### When Starting a New Session
1. Read this file (CLAUDE.md) first
2. Check git status
3. Ask user what they want to work on

### Documentation Pointers
- **Expressions/syntax** → PARSER-DESIGN-DECISION.md, SPECIFICATION.md Section 11
- **Transforms** → SPECIFICATION.md Section 5
- **UI** → SPECIFICATION.md Section 6
- **Testing** → src/tests/runner.html, SPECIFICATION.md Section 13
- **Research** → research/ directory
- **Phases** → SPECIFICATION.md Section 8
- **Security** → PARSER-DESIGN-DECISION.md Security Analysis

### When Implementing
1. Write tests FIRST in `src/tests/`
2. Implement feature
3. Run `src/tests/runner.html` to verify
4. Refer to PARSER-DESIGN-DECISION.md for parser design, SPECIFICATION.md for transform specs

---

## Communication Guidelines

### Tone & Style
- Professional but friendly
- Assume domain knowledge (data wrangling concepts)
- Ask clarifying questions when ambiguous
- Flag potential issues proactively

### Output Verbosity
- **Default: CONCISE** - Brief and to the point
- **Only verbose when explicitly requested** - User will say "comprehensive" for detail
- **Example**: "list what works" = brief bullets, NOT extensive multi-section document

**Effective concise style**:
- Lead with actionable summary
- Use tables and bullets for structure
- Include specific file references with line numbers
- Highlight key metrics without overwhelming
- Balance: Informative without verbose, specific without exhaustive

### Code Style
- ES6+ JavaScript (browser-native, no transpilation)
- Functional style preferred
- Clear variable names
- JSDoc comments for public APIs
- No TypeScript (avoid build system)
- 2-space indent

### Documentation Style
- Markdown, short paragraphs (3-4 lines max)
- Code examples for clarity
- Tables for comparisons
- Bullets for lists
- Emoji sparingly (status indicators only)

### Documentation Best Practices (CRITICAL)

**Avoid information that quickly goes stale:**

❌ **DON'T include**:
- Specific dates, exact test counts, time estimates
- Exact line counts, specific coverage percentages
- "NEW" markers with dates

✅ **DO use instead**:
- Status indicators without dates ("Complete", "In Progress")
- Qualitative descriptions ("comprehensive test suite", "well-tested")
- References to actual code/files ("see tests/ directory", "check git log")

**Rationale**: Documentation describes *what exists* and *how it works*, not *when* or *exact metrics*. Git history is source of truth for timeline.

---

## Questions to Ask User

### When Unclear About Scope
- "Should this be in Phase 1, or defer to Phase 2?"
- "Does this need to work for all cases, or is 80% coverage acceptable for MVP?"

### When Multiple Approaches Exist
- "I see two ways: [A] and [B]. Which aligns better?"
- "Research showed [project X] did [approach Y]. Follow that, or adapt?"

### When Security Considerations Arise
- "This could be a security risk if [scenario]. Add validation?"
- "This requires executing user code. Whitelist, or defer to Phase 2?"

### When Performance Trade-offs Exist
- "Simple approach is slower but easier. Acceptable for Phase 1?"
- "Optimizing would add [N] lines. Worth it for Phase 1?"

---

## Helpful Reminders

1. **User is project owner** - defer to their judgment
2. **Design phase complete** - focus on implementation, not redesigning (unless user requests)
3. **Research informed decisions** - leverage 8-project analysis in research/
4. **Security is non-negotiable** - never compromise on sandboxing/validation
5. **Target audience matters** - non-programmers, not JavaScript developers
6. **Test coverage important** - 90%+ on core logic
7. **Keep it simple** - MVP deliberately limited in scope
8. **Document as you go** - update this file for significant decisions

---

**End of Onboarding Document**

When you start a new session on this project, read this file first, then ask the user what they'd like to work on.
