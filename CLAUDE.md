# Claude Context - Chumak Project

> **Purpose**: Onboarding document for Claude AI sessions working on Chumak

**Current Status**: Production-ready data wrangling application with comprehensive transform capabilities

---

## Project Overview

**Chumak** is a browser-based data wrangling tool for cleaning and transforming tabular data. Think "Power Query in the browser" or "OpenRefine but simpler."

**Key characteristics:**

- Runs entirely in browser (no backend)
- **Vite/TypeScript/Vitest** modern stack
- Visual pipeline builder (like Power Query)
- Declarative JSON specification for transforms
- Target users: students, analysts, non-programmers
- No installation required, works on static hosting

**Name origin**: Ukrainian star-navigating traders who transformed raw goods into traded wealth, guided by the Milky Way (Chumatskyi Shliakh).

---

## Current Status

### Core Features (Production-Ready)

**Data Import/Export**:

- ✅ CSV file upload + drag-drop
- ✅ Clipboard paste (Ctrl+V)
- ✅ CSV export with timestamp
- ✅ Clipboard copy (CSV/JSON)
- ✅ Workflow JSON export/import

**Transformations** (13 implemented):

- ✅ **Filter**: Expression-based row filtering (security-validated AST)
- ✅ **Select**: Column selection with pattern matching (prefix/suffix/exact)
- ✅ **Remove**: Drop specific columns
- ✅ **Rename**: Change column names
- ✅ **Sort**: Single field ordering
- ✅ **Derive**: Calculated columns with expressions
- ✅ **Types**: Explicit type assignment and detection
- ✅ **Aggregate**: Group by + rollup (sum, mean, count, etc.)
- ✅ **Join**: Multi-model joins (inner, left, right, full, cross)
- ✅ **Fold**: Unpivot/Melt (wide to long format)
- ✅ **Split**: Delimiter-based column splitting (supports regex)
- ✅ **Replace**: Value replacement within columns
- ✅ **Regex**: Dedicated Match (boolean) and Extract (string) transforms

**Advanced Features**:

- ✅ **SchemaEngine**: Granular type inference (integer vs float, date vs datetime)
- ✅ **EDAEngine**: Statistical profiling (mean, median, quartiles, frequency)
- ✅ **ChartsEngine**: Vega-Lite visualizations (boxplot, histogram, categorical bar)
- ✅ **URL State**: Hash-based routing, shareable links
- ✅ **Multi-Model**: Multiple transform pipelines per source
- ✅ **Auto-Save**: IndexedDB with debounced saves
- ✅ **JSON Editor**: Editable raw JSON workflow with "Danger Zone" validation

**UI Features**:

- ✅ **Ribbon Toolbar**: Workflow-based (Data | Prepare | Calculate | Combine)
- ✅ **Visual Groups**: Logical grouping within tabs (Clean Rows, Manage Columns, etc.)
- ✅ **Context Toolbars**: Floating column and cell toolbars for rapid actions
- ✅ **Visual Feedback**: Type badges, hover highlighting, and truncation tooltips
- ✅ **Pipeline Navigation**: View intermediate results at any step
- ✅ **Step Editing**: Edit existing steps with full recomputation and rollback

**Testing**:

- ✅ Comprehensive test suite covering core engines and UI handlers
- ✅ **Vitest** test runner (CLI and Browser modes)
- ✅ High coverage on transform logic, expression parsing, and schema propagation

---

## Project Status

### Core Capabilities

The application is a production-ready data wrangling tool. All core data transformation verbs (Select, Filter, Join, Reshape) are implemented and verified.

### Current Priorities

- **Next Transforms**: Dedupe (duplicates), Impute (missing values), and Pivot (long to wide).
- **Expression Support**: Expanding the function whitelist (string, date, and math operations).
- **CLI Utility**: Building out the headless runner for automated workflows.

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

**Implementation**: SchemaEngine (`src/core/schema-engine.ts`) infers from sample data, propagates through transforms.

### 3. Visualization: Vega-Lite

**Decision**: Use Vega-Lite for charts

**Benefits**:

- Declarative JSON specs (aligns with transform approach)
- Interactive features (brushing, tooltips) built-in
- Well-maintained library

**Trade-off**: ~200KB dependency, but avoids reinventing charting.

### 4. Modern Build System (Vite + TypeScript)

**Decision**: Use Vite for development and bundling, TypeScript for type safety.

**Benefits**:

- **Fast HMR**: Instant updates during development
- **Type Safety**: Catches bugs at compile time
- **Modular CSS**: CSS nesting and variables in separate files
- **Vitest**: Integrated unit and integration testing
- **Agent-Friendly**: Easier for AI agents to navigate structured modular code

### 5. On-Demand Step Computation

**Decision**: Compute intermediate results when viewing steps, don't cache.

**Rationale**:

- Simplicity: No cache invalidation logic
- Memory: Don't store N copies of data
- Performance: Acceptable for preview (100 rows)

**Future**: Could add caching for large datasets if needed.

### 6. Workflow-Based Ribbon Organization

**Decision**: Organize ribbon tabs by workflow stage: Prepare | Calculate | Combine.

**Structure**:

- **Data**: Import/Export operations
- **Prepare**: Clean rows, manage columns, types/format (most frequent operations)
- **Calculate**: New columns, aggregations, reshaping, value transformations
- **Combine**: Multi-table operations (join, append, union)

**Benefits**:

- Mirrors actual data wrangling workflow (clean → shape → calculate → combine)
- Visual groups within tabs show operation scope (rows vs columns vs table)
- Intuitive for beginners learning data wrangling progression
- Reduces tabs from 5 to 3 (cleaner interface)

**Key Rename**: "Aggregate" → "Group By" (matches SQL/Power Query terminology)

---

## Technology Stack

**Core Dependencies**:

- **Iconify**: Unified icon framework (Iconify.design)
- **PapaParse**: CSV parsing and export
- **Arquero**: Data transformation runtime
- **jsep**: Expression parser
- **Alpine.js**: Reactive UI
- **Vega-Lite**: Visualization

**Infrastructure**:

- **Vite**: Build tool and dev server
- **TypeScript**: Typed programming language
- **Vitest**: Testing framework (Unit & Integration)
- **PostCSS**: CSS processing with nesting support

---

## Codebase Map

### Core Modules (`src/core/`) - Headless Engines

- **[expression-parser.ts](src/core/expression-parser.ts)** - jsep wrapper, entry point for parsing
- **[ast-validator.ts](src/core/ast-validator.ts)** - Security validation (operator whitelist)
- **[ast-interpreter.ts](src/core/ast-interpreter.ts)** - Safe AST execution
- **[schema-engine.ts](src/core/schema-engine.ts)** - Granular type inference & propagation
- **[transforms.ts](src/core/transforms.ts)** - Transform implementations
- **[transform-result.ts](src/core/transform-result.ts)** - Schema-data synchronization contract
- **[eda-engine.ts](src/core/eda-engine.ts)** - Statistical analysis & profiling
- **[charts.ts](src/core/charts.ts)** - Vega-Lite chart rendering
- **[error-formatter.ts](src/core/error-formatter.ts)** - User-friendly error messages

### UI & Application (`src/`)

- **[chumak-app.ts](src/chumak-app.ts)** - Main application class (UI state & logic)
- **[main.ts](src/main.ts)** - Entry point, Alpine initialization & legacy bridge
- **[app/types.ts](src/app/types.ts)** - Global type definitions

### Styling (`styles/`)

- **[index.css](styles/index.css)** - Main entry point importing all modules
- **[variables.css](styles/variables.css)** - Design tokens
- **[layout.css](styles/layout.css)**, **[ribbon.css](styles/ribbon.css)**, **[table.css](styles/table.css)**, etc. - Modular styles

### Tests (`src/core/*.test.ts`)

- **Vitest** unit tests for all core modules.
- Run with `npm test` or `npm run test:ui`.

**Tip**: Each module has header comments with purpose and exports. Read headers before implementing.

---

## Documentation Map

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - Complete product spec (features, data model, transforms, UI, roadmap)
- **[PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md)** - Expression parser architecture & security design
- **[ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md)** - Roadmap & Arquero integration strategy
- **[STEP-EDITING-IMPLEMENTATION.md](docs/STEP-EDITING-IMPLEMENTATION.md)** - Step editing feature (Phase 1-3 design, patterns, testing)
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

1. Write tests FIRST in `src/core/*.test.ts`
2. Run `npm test` to verify tests fail (red)
3. Implement the feature
4. Run tests again to verify pass (green)
5. All tests must pass before feature complete

**Test files**: `expression-parser.test.ts`, `ast-validator.test.ts`, `ast-interpreter.test.ts`, `transforms.test.ts`, `join.test.ts`, `integration.test.ts`

**Edge cases**: Empty data, nulls, column names with spaces, division by zero, type mismatches, deeply nested expressions

**Coverage**: High coverage on core logic (expression parsing, transform engine, schema propagation)

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

### 8. Don't Forget Schema Propagation

When implementing a new transform:

1.  **Implement logic**: In `src/transforms.js` (applyTransform)
2.  **Implement schema update**: In `src/schema-engine.js` (deriveNextSchema)

The `TransformResult` contract in `transform-result.js` handles the integration - it wraps schema derivation and ensures sample data is always provided. You don't need to call `TransformResult` directly; `computeModelUpToStep()` and `applyStepResult()` use it internally.

Missing step 2 leads to "ghost columns" (UI thinks column exists, data doesn't).

### 9. Step Editing Implementation Notes

**Current Implementation (Phase 1)**:

- Edit button appears only on last non-import, non-types step
- `editStep(stepIndex)` - Opens modal with pre-filled parameters
- `updateStep(stepIndex, transform)` - Replaces step + recomputes from that point
- `applyStepResult()` - Routes to `updateStep()` if `editingStepIndex` is set
- Rollback on error with clear user messaging

**Modal Pre-filling Pattern**:

```javascript
// In editStep(), populate dialog state based on transform type
if (step.filter) {
  this.filterExpression = step.filter;
  this.openDialog('filter');
}
// Repeat for each transform type
```

**Recomputation Pattern**:

```javascript
// Full pipeline recomputation from edited step to end
const result = this.computeUpToStep(lastStepIndex);
this.activeModel.data = result.data;
this.activeModel.schema = result.schema;
```

**Future Phases**:

- Phase 2: Edit any step (not just last)
- Phase 3: Dependency analysis + impact preview

---

## Quick Reference

### When Starting a New Session

1. Read this file (CLAUDE.md) first
2. Check git status
3. Use `npm test` to verify state
4. Ask user what they want to work on

### Documentation Pointers

- **Expressions/syntax** → [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md), [SPECIFICATION.md](docs/SPECIFICATION.md) Section 10
- **Transforms** → [SPECIFICATION.md](docs/SPECIFICATION.md) Section 6
- **Roadmap** → [SPECIFICATION.md](docs/SPECIFICATION.md) Section 8, [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md)
- **UI** → [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)
- **Testing** → `src/core/*.test.ts`, `npm test`
- **Research** → [research/](research/) directory
- **Security** → [PARSER-DESIGN-DECISION.md](docs/PARSER-DESIGN-DECISION.md) Security Analysis

### When Implementing

1. **Check roadmap**: [ARQUERO-LEVERAGE-ANALYSIS.md](docs/ARQUERO-LEVERAGE-ANALYSIS.md) for implementation patterns
2. **Write tests FIRST** in `src/core/*.test.ts`
3. **Implement feature** (prefer Arquero wrappers over custom logic)
4. **Run tests**: `npm test` to verify
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

- **TypeScript** (modern ESNext features)
- Functional style preferred
- Clear variable names
- JSDoc comments for public APIs
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
10. **Use `npm run dev`** to start the Vite development server.

---

**End of Onboarding Document**

When you start a new session on this project, read this file first, then ask the user what they'd like to work on.
