# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Status**: Production-ready data wrangling application with comprehensive transform capabilities

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

### Core Features (Production-Ready)

**Data Import/Export**:

- ✅ CSV file upload + drag-drop
- ✅ Clipboard paste (Ctrl+V)
- ✅ CSV export with timestamp
- ✅ Workflow JSON export/import

**Transformations** (9 implemented):

- ✅ Filter (expression-based, security-validated AST)
- ✅ Select (with pattern matching: prefix/suffix/exact)
- ✅ Remove columns
- ✅ Rename columns
- ✅ Sort (single field)
- ✅ Derive (calculated columns with expressions)
- ✅ Types (explicit type assignment)
- ✅ Aggregate (group by + rollup)
- ✅ Join (multi-model joins, all types)

**Advanced Features**:

- ✅ **SchemaEngine**: Granular type inference (integer vs float, date vs datetime)
- ✅ **EDAEngine**: Statistical profiling (mean, median, quartiles, frequency)
- ✅ **ChartsEngine**: Vega-Lite visualizations (boxplot, histogram, categorical bar)
- ✅ **URL State**: Hash-based routing, shareable links
- ✅ **Multi-Model**: Multiple transform pipelines per source
- ✅ **Auto-Save**: IndexedDB with 500ms debounced saves

**UI Features**:

- ✅ Ribbon toolbar (Microsoft Office-style tabs)
- ✅ Floating column toolbar (sort, filter, rename, remove)
- ✅ Floating cell toolbar (keep/exclude value, copy)
- ✅ Type indicators with visual badges
- ✅ Column hover highlighting
- ✅ Step navigation (view intermediate results)
- ✅ EDA panel with chart switcher

**Testing**:

- ✅ Comprehensive test suite across 5 files
- ✅ Browser-based test runner (Mocha + Chai)
- ✅ High coverage on core transform logic

### Roadmap (Near-Term)

**Next 4 transforms** (~180 lines, 8-12 hours):

1. **Dedupe** - Remove duplicate rows
2. **Impute** - Fill missing values (constants only initially)
3. **Pivot** - Wide format (cross-tabulation)
4. **Fold** - Long format (unpivot, inverse of pivot)

**Mid-Term** (~230 lines, 1-2 weeks): 5. **Expression Functions** - Whitelist `op.*` functions (string, date, math)

See [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md) for detailed roadmap.

---

## Key Design Decisions

### 1. Expression Parser: Hybrid Architecture

**Approach**: Custom AST interpretation for user expressions, Arquero delegation for data operations.

**Rationale**:

- **Security**: Never use `Function()` constructor with user input
- **Validation**: AST validation catches errors before execution
- **Error Quality**: Position-aware error messages with suggestions
- **Arquero Leverage**: Use built-in verbs for data manipulation (faster, tested)

**Current Support** (expressions):

- Operators: Arithmetic, comparison, logical
- Column references: Bare identifiers or bracket notation
- Security: AST validation, operator whitelist, no property access

**Not Yet Supported** (planned):

- Function calls (`upper()`, `year()`, `abs()`, etc.)
- Ternary operator (`? :`)
- Advanced operators (`?.`, `??`)

See [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md) for comprehensive design rationale.

### 2. Schema System: Granular Types

**Decision**: Distinguish `integer` vs `float`, `date` vs `datetime`.

**Benefits**:

- Better formatting (integers don't need decimal places)
- Correct aggregation defaults
- Type hints for derived columns
- User can override via `types` transform

**Implementation**: SchemaEngine ([schema-engine.js](src/schema-engine.js)) infers from sample data, propagates through transforms.

### 3. Visualization: Vega-Lite

**Decision**: Use Vega-Lite for charts

**Benefits**:

- Declarative JSON specs (aligns with transform approach)
- Interactive features (brushing, tooltips) built-in
- Well-maintained library

**Trade-off**: ~200KB dependency, but avoids reinventing charting.

### 4. No Build System

**Decision**: CDN-loaded libraries, no npm/webpack/build step.

**Benefits**:

- Open `index.html` in browser, it works
- Static hosting, no server required
- Source code readable in dev tools
- Non-programmers don't need Node.js tooling

**Trade-off**: Slightly larger initial load, but acceptable for use case.

### 5. On-Demand Step Computation

**Decision**: Compute intermediate results when viewing steps, don't cache.

**Rationale**:

- Simplicity: No cache invalidation logic
- Memory: Don't store N copies of data
- Performance: Acceptable for preview (100 rows)

**Future**: Could add caching for large datasets if needed.

---

## Technology Stack

**Core Dependencies** (CDN-loaded):

- **PapaParse** (~35KB) - CSV parsing
- **Arquero** (~200KB) - Data transformation runtime
- **jsep** (~10KB) - Expression parser
- **Alpine.js** (~40KB) - Reactive UI
- **Vega-Lite** (~200KB) - Visualization

**Testing**: Mocha + Chai (CDN-loaded), browser-based test runner

**No Build System**: All libraries from CDN, GitHub Pages compatible

---

## Codebase Map

### Core Modules (Expression Pipeline)

- **[expression-parser.js](src/expression-parser.js)** - jsep wrapper, entry point for parsing
- **[ast-validator.js](src/ast-validator.js)** - Security validation (operator whitelist)
- **[ast-interpreter.js](src/ast-interpreter.js)** - Safe AST execution (no `Function()` constructor)
- **[error-formatter.js](src/error-formatter.js)** - User-friendly error messages with position highlighting

### Transform Engine

- **[transforms.js](src/transforms.js)** - Transform implementations
  - Filter, Select, Remove, Rename, Sort, Derive, Types, Aggregate, Join
  - Each transform ~10-100 lines
  - Direct Arquero wrappers or custom AST interpretation

### Advanced Features

- **[schema-engine.js](src/schema-engine.js)** - Granular type inference & propagation
- **[eda-engine.js](src/eda-engine.js)** - Statistical analysis & profiling
- **[charts.js](src/charts.js)** - Vega-Lite chart rendering

### Infrastructure

- **[storage.js](src/storage.js)** - IndexedDB persistence (sources, models, settings)
- **[url-state.js](src/url-state.js)** - Hash-based routing & shareable links
- **[ux-settings.js](src/ux-settings.js)** - localStorage preferences
- **[performance-logger.js](src/performance-logger.js)** - Optional transform timing

### Application

- **[chumak-app.js](src/chumak-app.js)** - Main Alpine.js component (UI state & logic)

### Tests

- **[src/tests/runner.html](src/tests/runner.html)** - Browser test runner (Mocha + Chai)
- **Test files**: `expression-parser.test.js`, `ast-validator.test.js`, `ast-interpreter.test.js`, `transforms.test.js`, `join.test.js`
- **Coverage**: High coverage on core logic

**Tip**: Each module has header comments with purpose and exports. Read headers before implementing.

---

## Documentation Map

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - Complete product spec (features, data model, transforms, UI, roadmap)
- **[PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md)** - Expression parser architecture & security design
- **[ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md)** - Roadmap & Arquero integration strategy
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)** - UI/UX design system (colors, typography, components)
- **[research/](research/)** - 8-project analysis (Vega-Lite, Arquero, OpenRefine, ag-Grid, etc.)

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
- Visual interface (not raw expressions when avoidable)
- Helpful typo suggestions

### Security Requirements (Critical)

**Environment**: Browser-based, untrusted user input

**Mitigation**:

- Never use `Function()` constructor with user input
- Always validate AST before execution
- Whitelist operators (current) and functions (future)
- No window/document access from expressions
- Error-as-value pattern (don't throw exceptions that break 10,000 cells)

### Arquero Relationship

**Arquero is the runtime, not the model**:

- Chumak uses Arquero for data transformation execution
- Chumak does NOT copy Arquero's parser approach (Acorn + `Function()` constructor)
- Flow: User input → Parse & validate (Chumak) → Generate Arquero expression → Execute (Arquero runtime)

**Leverage Arquero verbs**: Most planned transforms are thin wrappers around Arquero methods (see [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md)).

### Testing Philosophy (Important)

**MANDATORY: Write tests before implementing features**

1. Write tests FIRST in `src/tests/`
2. Run `src/tests/runner.html` to verify tests fail (red)
3. Implement the feature
4. Run tests again to verify pass (green)
5. All tests must pass before feature complete

**Test files**: `expression-parser.test.js`, `ast-validator.test.js`, `ast-interpreter.test.js`, `transforms.test.js`, `join.test.js`

**Edge cases**: Empty data, nulls, column names with spaces, division by zero, type mismatches, deeply nested expressions

**Coverage**: High coverage on core logic (expression parsing, transform engine)

### Performance Constraints

**Targets**:

- Parse + validate: <10ms
- Evaluate 100 rows: <50ms
- UI responsive

**Trade-offs**: AST interpretation 2-5x slower than compiled (acceptable for preview-only evaluation)

---

## Common Pitfalls to Avoid

### 1. Don't Use Function() Constructor

See Security Requirements above - this is non-negotiable.

### 2. Don't Copy Arquero's Parser

Arquero uses Acorn (~800 lines) + `Function()` constructor. Chumak uses jsep + validation (~700 lines, no `Function()`).

### 3. Don't Force JavaScript Syntax on Users

❌ Bad: Require `d.sales > 1000` (Arquero style)
✅ Good: Accept `sales > 1000` (bare identifier)

❌ Bad: "identifier not found"
✅ Good: "Column 'Slaes' not found. Did you mean 'Sales'?"

### 4. Don't Over-Engineer (Critical)

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

### 5. Don't Forget Error-as-Value Pattern

From OpenRefine research:

```javascript
// Bad - throws exception, breaks entire column
if (divisor === 0) throw new Error('Division by zero');

// Good - returns error object, isolates failure
if (divisor === 0) return { type: 'error', message: 'Division by zero' };
```

One bad cell shouldn't break 10,000 good cells.

### 6. Don't Forget to Write Tests

**CRITICAL**: Every new feature MUST have tests

See Testing Philosophy above. Tests in `src/tests/runner.html`, high coverage required, all tests pass before committing.

### 7. Don't Reinvent Arquero

For data operations (dedupe, impute, pivot, fold, etc.):

- Use Arquero verbs directly
- Don't implement custom logic
- Thin wrappers only (~30-60 lines)

See [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md) for patterns.

---

## Quick Reference

### When Starting a New Session

1. Read this file (CLAUDE.md) first
2. Check git status
3. Ask user what they want to work on

### Documentation Pointers

- **Expressions/syntax** → [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md), [SPECIFICATION.md](docs/SPECIFICATION.md) Section 10
- **Transforms** → [SPECIFICATION.md](docs/SPECIFICATION.md) Section 6
- **Roadmap** → [SPECIFICATION.md](docs/SPECIFICATION.md) Section 8, [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md)
- **UI** → [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)
- **Testing** → [src/tests/runner.html](src/tests/runner.html), [SPECIFICATION.md](docs/SPECIFICATION.md) Section 12
- **Research** → [research/](research/) directory
- **Security** → [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md) Security Analysis

### When Implementing

1. **Check roadmap**: [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md) for implementation patterns
2. **Write tests FIRST** in `src/tests/`
3. **Implement feature** (prefer Arquero wrappers over custom logic)
4. **Run tests**: `src/tests/runner.html` to verify
5. **Refer to docs**: [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md) for parser design, [SPECIFICATION.md](docs/SPECIFICATION.md) for transform specs

### Implementation Patterns

**Pattern 1: Direct Arquero Wrapper** (~30 lines)

- Example: Dedupe, Slice, Sample
- Parameter mapping only
- No expression parsing

**Pattern 2: Options Wrapper** (~50 lines)

- Example: Pivot, Fold, Impute (simple)
- Parameter + options mapping
- Optional configuration

**Pattern 3: Expression Wrapper** (~80 lines)

- Example: Filter, Derive (current), Impute (future)
- Expression parsing + validation
- AST to Arquero generation

See [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md) for detailed examples.

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

**Rationale**: Documentation describes _what exists_ and _how it works_, not _when_ or _exact metrics_. Git history is source of truth for timeline.

---

## Questions to Ask User

### When Unclear About Scope

- "Should this be in the near-term roadmap, or defer to mid/long-term?"
- "Does this need to work for all cases, or is 80% coverage acceptable for MVP?"

### When Multiple Approaches Exist

- "I see two ways: [A] and [B]. Which aligns better?"
- "Research showed [project X] did [approach Y]. Follow that, or adapt?"

### When Security Considerations Arise

- "This could be a security risk if [scenario]. Add validation?"
- "This requires executing user code. Whitelist, or defer to function support?"

### When Performance Trade-offs Exist

- "Simple approach is slower but easier. Acceptable?"
- "Optimizing would add [N] lines. Worth it now?"

---

## Helpful Reminders

1. **User is project owner** - defer to their judgment
2. **Design phase complete** - focus on implementation, not redesigning (unless user requests)
3. **Research informed decisions** - leverage 8-project analysis in [research/](research/)
4. **Security is non-negotiable** - never compromise on sandboxing/validation
5. **Target audience matters** - non-programmers, not JavaScript developers
6. **Test coverage important** - high coverage on core logic
7. **Keep it simple** - YAGNI, right-sized for current needs
8. **Document as you go** - update this file for significant decisions
9. **Leverage Arquero** - thin wrappers, not reimplementation

---

**End of Onboarding Document**

When you start a new session on this project, read this file first, then ask the user what they'd like to work on.
