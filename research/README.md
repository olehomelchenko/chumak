# Research: Expression Parser Design

Background research conducted January 2025 to inform Syto's expression parser design.

## Summary

See [FINDINGS-SUMMARY.md](FINDINGS-SUMMARY.md) for condensed, project-relevant takeaways from all analyses.

Detailed analysis reports are archived in [docs/archive/research/](../docs/archive/research/).

## Key Decisions Influenced

1. **Dual-mode input** (Vega-Lite) — Structured predicates for beginners, expressions for power users
2. **jsep parser** — Lightweight, zero dependencies, extensible
3. **AST interpretation** (OpenRefine) — Security-first, no `Function()` constructor
4. **Errors-as-values** (OpenRefine) — One bad cell doesn't break entire column
5. **Bare identifiers** — No prefix required: `sales > 1000` instead of `d.sales > 1000`

Decisions documented in [DECISIONS.md](../docs/archive/DECISIONS.md) section 1.
