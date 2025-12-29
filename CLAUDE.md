# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Phase**: Design Complete, Ready for Implementation

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

## Current Status: Design Phase Complete ✅

### What's Been Done

1. **Product Specification** - Complete product spec in SPECIFICATION.md
   - Data model (Sources, Models, Workflows)
   - Transform operations for 3 phases
   - UI design and layouts
   - Testing strategy
   - Performance targets

2. **Expression Parser Research** - Analyzed 8 production systems
   - Vega-Lite (predicate objects)
   - Arquero (Acorn parser, complex)
   - OpenRefine (GREL, handwritten parser)
   - ag-Grid (direct eval, insecure)
   - jsep (lightweight parser)
   - Full research in `research/` directory

3. **Parser Design Decision** - Comprehensive design document
   - **Decision**: Hybrid approach (structured predicates + jsep parser)
   - **Security**: AST interpretation, no Function() constructor
   - **Syntax**: Bare identifiers with bracket escape
   - **Phases**: 3-phase rollout (operators → functions → extensibility)
   - Full details in PARSER-DESIGN-DECISION.md

4. **Documentation Structure** - Organized and cross-referenced
   - Main docs: README.md, SPECIFICATION.md, PARSER-DESIGN-DECISION.md
   - Research background: research/ directory
   - All links verified and working

### What's NOT Been Done

- ❌ No code written yet
- ❌ No UI mockups created
- ❌ No tests written
- ❌ No dependencies installed
- ❌ No build system set up (intentionally - using CDN libraries)

---

## Key Design Decisions

### 1. Expression Parser: Hybrid Approach

**Decision**: Use structured predicates (primary) + expression strings (advanced)

```json
// Primary API - Structured predicates (80% of users)
{ "filter": { "field": "sales", "gt": 1000 } }

// Advanced API - Expression strings (20% of users)
{ "filter": "sales > 1000 && region == 'North'" }
```

**Why**:
- Vega-Lite research showed predicates work well for beginners
- Expression strings provide escape hatch for complex logic
- Best UX for target audience (non-programmers)

### 2. Parser Library: jsep

**Decision**: Use jsep library for parsing expression strings

**Why**:
- Zero dependencies, ~600 LOC, ~10KB minified
- ESTree-compatible AST (standard format)
- Plugin system for extensibility
- CDN-loadable
- Security: Parser-only, no code execution

**Alternatives rejected**:
- Acorn (too complex, needs Function() constructor)
- Handwritten (~700 lines of untested code)
- Direct eval (fundamentally insecure like ag-Grid)

### 3. Execution Model: AST Interpretation

**Decision**: Interpret AST, don't compile to Function()

**Why**:
- Security: No code injection possible
- Validation: Check column names, types before execution
- Better errors: Position-aware with suggestions
- Acceptable performance: Preview only evaluates 100 rows

**Trade-off**: 2-5x slower than compiled functions (acceptable for use case)

### 4. Column Reference Syntax: Bare Identifiers

**Decision**: `sales > 1000` (not `d.sales` or `datum.sales`)

**Why**:
- Simplest for non-programmers
- Schema available at parse time (can auto-detect)
- Bracket notation for spaces: `[Total Sales] > 1000`

**Implementation**: Parser rewrites `sales` → `d.sales` for Arquero compatibility

### 5. Boolean Operators: JavaScript Standard

**Decision**: Use `&&`, `||`, `!` (not `and`, `or`, `not`)

**Why**:
- JavaScript standard (familiar to anyone with JS background)
- Supported by jsep out of the box
- Can add word forms in Phase 3 via plugins if users want them

### 6. Security Model: No Function() Constructor

**Decision**: Never use `new Function()` with user input

**How**:
- Parse with jsep → get AST
- Validate AST (whitelist operators, check columns)
- Interpret AST safely (no code execution)
- Sandbox completely isolated from window/global scope

**Critical**: This is non-negotiable. ag-Grid's approach (direct eval) is fundamentally unsuitable for Chumak's untrusted environment.

---

## Technology Stack

### Core Dependencies (CDN-loaded)
- **PapaParse** (~35KB) - CSV parsing and generation
- **Arquero** (~200KB) - Data transformation engine (our runtime)
- **jsep** (~10KB) - Expression parser
- **Alpine.js** (~40KB) - Reactive UI framework

### No Build System
- All libraries loaded from CDN (unpkg.com)
- No npm, no webpack, no bundler
- Works by opening HTML file in browser
- GitHub Pages compatible

### Testing (Phase 1)
- Mocha + Chai (CDN-loaded)
- Tests run in browser by opening test runner HTML
- 90%+ coverage target for transform compiler and parser

---

## File Structure

```
chumak/
├── README.md                        # Project overview
├── CLAUDE.md                        # This file - Claude onboarding
├── SPECIFICATION.md                 # Complete product spec
├── PARSER-DESIGN-DECISION.md        # Parser design (jsep + predicates)
└── research/                        # Background research
    ├── README.md                    # Research overview
    ├── RESEARCH-GUIDE.md            # Analysis protocol + comparison table
    ├── analysis__arquero.md         # Arquero deep-dive
    ├── analysis__vega-lite.md       # Vega-Lite deep-dive
    ├── analysis__openrefine.md      # OpenRefine/GREL deep-dive
    └── analysis__ag-grid.md         # ag-Grid deep-dive
```

**Future structure (implementation)**:
```
chumak/
├── index.html                       # Main app
├── tests/
│   ├── runner.html                  # Test runner
│   ├── transforms.test.js           # Transform compiler tests
│   ├── parser.test.js               # Expression parser tests
│   └── fixtures/                    # Test data
└── src/
    ├── predicate-compiler.js        # Predicate → Arquero
    ├── expression-parser.js         # jsep integration
    ├── ast-validator.js             # Security validation
    ├── ast-interpreter.js           # Safe execution
    ├── error-formatter.js           # User-friendly errors
    └── utils.js                     # Helpers
```

---

## Implementation Phases

### Phase 1: MVP (Current Target)

**Timeline**: 3-4 weeks of development

**Scope**:
- ✅ CSV import (file + URL)
- ✅ Basic transforms: filter, select, remove, rename, sort, derive, fillna, dropna, replace, aggregate
- ✅ Expression parser: Predicates + expressions, basic operators only (no functions)
- ✅ UI: Full layout, step list, preview, JSON viewer, predicate builder
- ✅ Persistence: IndexedDB auto-save, workflow export/import
- ✅ Export: Result CSV, workflow JSON
- ✅ Testing: 90%+ coverage on transform compiler and parser

**Code estimate**: ~1000 lines custom code + jsep

**Deliberately excluded**:
- ❌ Function calls (Phase 2)
- ❌ Joins/derived datasets (Phase 2)
- ❌ Advanced operators (ternary, optional chaining - Phase 2)

### Phase 2: Functions & Joins

**Additions**:
- Whitelist safe functions (Math.*, String.*, Date.*)
- Method-style syntax (value.toUpperCase())
- Ternary operator (? :)
- Multiple sources and joins
- Derived models

### Phase 3: Polish & Extensibility

**Additions**:
- User-defined functions (sandboxed)
- Custom operators (word forms: and, or, not)
- Pivot/unpivot
- Drag-reorder steps
- Performance optimization

---

## Important Context for Future Sessions

### User Profile (Critical)

**Target users**: Non-programmers
- Students learning data wrangling
- Analysts looking to transform arbitrary spreadsheet data into tidy tabular format
- Users needing quick CSV cleaning

**NOT target users**:
- JavaScript developers
- Data scientists with Python/R
- Enterprise users with IT support

**Implication**: Everything must be beginner-friendly:
- Error messages in plain language
- No jargon ("identifier" → "column name")
- Visual predicate builder (not raw expressions)
- Helpful suggestions for typos

### Security Requirements (Critical)

**Environment**: Browser-based, untrusted user input

**Threats**:
- Malicious CSV files
- Code injection via expressions
- XSS attacks
- Data exfiltration

**Mitigation**:
- Never use Function() constructor with user input
- Always validate AST before execution
- Whitelist operators and functions
- No access to window/document/localStorage from expressions
- Errors as values (don't throw exceptions)

### Arquero Relationship (Important)

**Arquero is the runtime, not the model**:
- Chumak uses Arquero for actual data transformation
- Chumak does NOT copy Arquero's parser approach
- Arquero requires functions: `d => d.sales > 1000`
- Chumak accepts predicates and expressions: `sales > 1000`

**Implementation flow**:
```
User input (predicate/expression)
    ↓
Parse & validate (Chumak's parser)
    ↓
Generate Arquero function (Chumak's compiler)
    ↓
Execute transform (Arquero runtime)
    ↓
Return results
```

### Testing Philosophy (Important)

**Test-driven development**:
- Write tests first for new transforms
- 90%+ coverage on transform compiler
- 90%+ coverage on expression parser
- Tests run in browser (no Node.js)

**Edge cases matter**:
- Empty data
- Null/undefined values
- Column names with spaces/special chars
- Division by zero
- Type mismatches
- Deeply nested expressions

### Performance Constraints (Good to Know)

**Targets**:
- Parse + validate: <10ms per expression
- Evaluate 100 rows: <50ms per expression
- UI remains responsive during preview

**Trade-offs accepted**:
- AST interpretation 2-5x slower than compiled functions
- Acceptable because preview only evaluates 100 rows
- Can optimize in Phase 3 if needed

---

## Common Pitfalls to Avoid

### 1. Don't Use Function() Constructor

```javascript
// ❌ NEVER do this (ag-Grid's approach)
const fn = new Function('d', userExpression);

// ✅ ALWAYS do this (Chumak's approach)
const ast = jsep(userExpression);
validateAST(ast, schema);
const result = interpretAST(ast, data);
```

### 2. Don't Copy Arquero's Parser

Arquero uses Acorn + AST rewriting (~800 lines + complexity). This is:
- Too complex for Chumak's needs
- Requires Function() constructor (security issue)
- Assumes JavaScript developer audience

Chumak uses jsep + validation (~700 lines, no Function()).

### 3. Don't Force JavaScript Syntax on Users

**Bad**: Require `d.sales > 1000` (Arquero style)
**Good**: Accept `sales > 1000` (bare identifier, rewrite to Arquero)

**Bad**: Technical errors "identifier not found"
**Good**: User-friendly "Column 'Slaes' not found. Did you mean 'Sales'?"

### 4. Don't Add Features Prematurely

**Phase 1 scope is deliberately limited**:
- No functions (Phase 2)
- No joins (Phase 2)
- No pivot/unpivot (Phase 3)
- No custom functions (Phase 3)

Stick to the roadmap. Simple MVP first.

### 5. Don't Forget Error-as-Value Pattern

From OpenRefine research:

```javascript
// Bad - throws exception, breaks entire column
if (divisor === 0) throw new Error('Division by zero');

// Good - returns error object, isolates failure
if (divisor === 0) return { type: 'error', message: 'Division by zero' };
```

One bad cell shouldn't break 10,000 good cells.

---

## Frequently Referenced Sections

### Expression Syntax Examples

**From SPECIFICATION.md Section 11**:

```javascript
// Simple comparisons
sales > 1000
region == "North"

// Boolean operators
sales > 1000 && region == "North"
status == "active" || status == "pending"

// Arithmetic
revenue - cost
(revenue - cost) / revenue * 100

// Column names with spaces
[Total Sales] > 1000
[Q1 Revenue] - [Q1 Cost]
```

### Predicate Object Schema

**From SPECIFICATION.md Section 11**:

```json
// Field predicates
{ "field": "sales", "gt": 1000 }
{ "field": "sales", "equal": 1000 }
{ "field": "region", "oneOf": ["North", "South"] }

// Logical composition
{
  "and": [
    { "field": "sales", "gt": 1000 },
    { "field": "region", "equal": "North" }
  ]
}
```

### Security Validation Rules

**From PARSER-DESIGN-DECISION.md**:

Phase 1 whitelist:
- ✅ Arithmetic: `+`, `-`, `*`, `/`, `%`
- ✅ Comparison: `>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`
- ✅ Logical: `&&`, `||`, `!`
- ✅ Grouping: `(`, `)`
- ❌ Function calls (Phase 2)
- ❌ Property access except columns
- ❌ Assignments
- ❌ Bitwise operators

---

## Quick Reference Commands

### When Starting a New Session

1. Read this file (CLAUDE.md) first
2. Check git status to see what's been done
3. Review recent commits if any
4. Ask user what they want to work on

### When User Mentions...

- **"expressions"** → See PARSER-DESIGN-DECISION.md and SPECIFICATION.md Section 11
- **"transforms"** → See SPECIFICATION.md Section 5
- **"UI"** → See SPECIFICATION.md Section 6
- **"testing"** → See SPECIFICATION.md Section 13
- **"research"** → See research/ directory
- **"phase 1"** → See SPECIFICATION.md Section 8 (MVP scope)
- **"security"** → See PARSER-DESIGN-DECISION.md Security Analysis section

### When Implementing...

- **Parser**: Start with PARSER-DESIGN-DECISION.md Sections 1-3
- **Predicates**: See PARSER-DESIGN-DECISION.md Section 1 (Input Layer)
- **Validation**: See PARSER-DESIGN-DECISION.md Section 3 (Validation Layer)
- **Error messages**: See PARSER-DESIGN-DECISION.md Section 5 (Error Handling)
- **Tests**: See SPECIFICATION.md Section 13 (Testing Strategy)

---

## Next Steps (Implementation Roadmap)

### Immediate Next Steps (Phase 1 Start)

1. **Set up project structure**
   - Create index.html with CDN script tags
   - Create src/ directory
   - Create tests/ directory with runner.html

2. **Implement predicate compiler** (~250 lines)
   - TypeScript interfaces for predicate types
   - Predicate → Arquero function generator
   - Logical composition (and/or/not)
   - Field reference handling

3. **Integrate jsep parser** (~100 lines)
   - Load jsep from CDN
   - Basic parsing wrapper
   - Error handling

4. **Implement AST validator** (~150 lines)
   - Whitelist node types
   - Whitelist operators
   - Column name validation
   - Schema-aware suggestions

5. **Implement AST interpreter** (~200 lines)
   - Safe expression evaluation
   - Null propagation
   - Error-as-value handling
   - Type coercion

6. **Create error formatter** (~100 lines)
   - Position highlighting
   - User-friendly messages
   - Suggestions for typos

7. **Build UI** (Timeline TBD)
   - Predicate builder forms
   - Expression text input
   - Preview table
   - Step list
   - JSON viewer

8. **Write tests** (~500 lines)
   - Transform compiler tests
   - Parser tests
   - Validator tests
   - Interpreter tests
   - Integration tests

### Success Criteria for Phase 1

- ✅ User can load CSV file
- ✅ User can build filter using predicate builder (no typing expressions)
- ✅ User can write simple expression (advanced mode)
- ✅ Preview shows first 100 rows after filter
- ✅ Invalid expressions show helpful errors
- ✅ Workflow can be exported as JSON
- ✅ Exported workflow can be imported and replayed
- ✅ 90%+ test coverage on core logic

---

## Communication Guidelines

### Tone & Style
- Professional but friendly
- Assume user has domain knowledge (data wrangling concepts)
- Ask clarifying questions when ambiguous
- Suggest alternatives when appropriate
- Flag potential issues proactively

### Code Style (When Writing Code)
- ES6+ JavaScript (browser-native, no transpilation)
- Functional style preferred
- Clear variable names
- JSDoc comments for public APIs
- No TypeScript (to avoid build system)
- Consistent formatting (2-space indent)

### Documentation Style
- Use markdown
- Short paragraphs (3-4 lines max)
- Code examples for clarity
- Tables for comparisons
- Bullets for lists
- Emoji sparingly (status indicators only)

---

## Questions to Ask User

### When Unclear About Scope
- "Should this be in Phase 1, or can we defer to Phase 2?"
- "Does this feature need to work for all cases, or is 80% coverage acceptable for MVP?"

### When Multiple Approaches Exist
- "I see two ways to implement this: [A] and [B]. Which aligns better with your vision?"
- "The research showed [project X] did [approach Y]. Should we follow that, or adapt it?"

### When Security Considerations Arise
- "This could be a security risk if [scenario]. Should we add validation for this?"
- "This requires executing user code. Should we whitelist this, or defer to Phase 2?"

### When Performance Trade-offs Exist
- "This simple approach is slower but easier to implement. For Phase 1, is that acceptable?"
- "Optimizing this would add [N] lines of code. Worth it for Phase 1?"

---

## Helpful Reminders

1. **The user is the project owner** - defer to their judgment on vision and priorities
2. **Design phase is complete, but can be changed by the user** - focus on implementation, not redesigning
3. **Research informed decisions** - leverage the 8-project analysis in research/
4. **Security is non-negotiable** - never compromise on sandboxing/validation
5. **Target audience matters** - non-programmers, not JavaScript developers
6. **Test coverage is important** - 90%+ on core logic (transform compiler, parser)
7. **Keep it simple** - MVP is deliberately limited in scope
8. **Document as you go** - update this file when making significant decisions

---

## Version History

- **2025-01-23**: Initial version (Design phase complete)
  - Product specification finalized
  - Expression parser research completed
  - Parser design decision documented
  - Documentation structure organized

---

**End of Onboarding Document**

When you start a new session on this project, read this file first, then ask the user what they'd like to work on.
