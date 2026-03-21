# Research Findings Summary

Condensed findings from evaluating expression parser designs and data transformation architectures (January 2025). Full analyses archived in `docs/archive/research/`.

---

## Arquero (Adopted: Data Engine)

### Decisions it influenced

- **Arquero is the execution engine, not the expression model.** Syto generates Arquero-compatible functions from its own expression parser rather than copying Arquero's developer-facing API.
- **Chose jsep over Acorn.** Arquero uses Acorn + complex AST rewriting (350+ lines). jsep is lighter and sufficient for Syto's row-level expressions.
- **Bare column identifiers.** Arquero requires `d.col` prefix. Syto adopted bare identifiers (`sales > 1000`) since target users are non-programmers.
- **AST interpretation instead of code generation.** Arquero compiles to `Function()` constructor calls. Syto interprets the AST directly for security (no `eval`/`Function`).

### Warnings

- **Arquero's error messages are developer-oriented.** Syto must provide contextual, suggestion-based errors.
- **Arquero has no runtime type checking.** Syto adds schema-aware validation at parse time.
- **Aggregate/window ops belong in Arquero, not the expression parser.** Syto's expression layer handles only row-level expressions; aggregation is delegated to Arquero verbs.

---

## Vega-Lite (Adopted: Visualization)

### Decisions it influenced

- **Dual-mode input: structured predicates + expression strings.** Vega-Lite's field predicates inspired Syto's structured transform parameters for beginners, with raw expressions as an advanced escape hatch.
- **Logical composition as tree structure.** `{and: [...]}` / `{or: [...]}` nesting informed Syto's compound filter design.
- **Validate early, not at runtime.** Vega-Lite passes expressions through unvalidated. Syto took the opposite approach: validate at parse time.

### Warnings

- **No field name validation is a UX trap.** Typos pass silently. Syto validates column references against the current dataset.
- **DateTime/TimeUnit adds disproportionate complexity.** Syto defers advanced date predicates and uses Arquero's date functions.

---

## ag-Grid (Rejected)

### Decisions it influenced

- **Confirmed that `Function()` constructor is unacceptable.** ag-Grid's expression system uses `new Function()` with zero sandboxing, validating Syto's AST interpretation approach.
- **Expression caching pattern adopted.** ag-Grid's object-keyed cache inspired Syto's expression caching strategy.

### Warnings

- **No validation before execution is a dead end.** For a visual tool where users build pipelines incrementally, parse-time validation is essential.
- **JavaScript syntax is wrong for non-programmers.** Syto's simpler expression syntax (bare identifiers, word-like functions) was a direct response.

---

## OpenRefine / GREL (Rejected, but influential)

### Decisions it influenced

- **Errors-as-values pattern adopted.** GREL returns `EvalError` objects instead of throwing. Syto's `isConversionError()` system directly implements this.
- **Error propagation through expression trees.** Errors propagate like null; `??` / `coalesce()` treat errors as missing values.
- **Two-phase parse/evaluate model adopted.** Compile to AST once, evaluate per row.

### Warnings

- **GREL's error messages use compiler jargon.** Syto uses user-facing vocabulary: "column name," "closing parenthesis."
- **No logical operators (`&&`, `||`) is surprising.** Syto supports both operators and `and()`/`or()` functions.

---

## Power Query M (Rejected, competitive analysis)

### Decisions it influenced

- **Eager validation, not lazy.** Power Query's lazy evaluation causes errors to surface steps later. Syto validates the full pipeline schema eagerly.
- **Explicit pipeline semantics.** Power Query reorders steps freely. Syto executes strictly in order with no implicit optimization.
- **Native regex support is non-negotiable.** Power Query lacks regex, forcing users to chain many text functions.
- **Pattern-based column selection.** Power Query hardcodes column names, breaking on schema drift. Syto supports column selection by pattern or type.

### Warnings

- **Immutability without caching causes re-evaluation.** Syto's dependency graph tracks staleness to avoid redundant recomputation.
- **"Escape hatch" expressions become unvalidatable.** Power Query M is Turing-complete. Syto constrains expressions to a safe subset enforced by the AST whitelist.

---

_Research completed January 2025. Full analyses: `docs/archive/research/`. Decisions: `docs/archive/DECISIONS.md` section 1._
