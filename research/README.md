# Research: Expression Parser Design

This directory contains background research conducted to inform Chumak's expression parser design decisions.

## Purpose

Before implementing the parser, we analyzed 8 production systems to understand different approaches, their trade-offs, and lessons learned. This research directly informed the decisions documented in [PARSER-DESIGN-DECISION.md](../PARSER-DESIGN-DECISION.md).

## Contents

### Research Protocol

- **[RESEARCH-GUIDE.md](RESEARCH-GUIDE.md)** - Structured analysis protocol with comparison table (completed)

### Detailed Analysis Reports

| Project        | Type                     | Key Finding                                | Analysis                                             |
| -------------- | ------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| **Vega-Lite**  | Declarative viz compiler | Predicate objects as primary API           | [analysis\_\_vega-lite.md](analysis__vega-lite.md)   |
| **Arquero**    | Data transformation      | Acorn parser + AST rewriting (complex)     | [analysis\_\_arquero.md](analysis__arquero.md)       |
| **OpenRefine** | Data cleaning tool       | GREL: handwritten parser, errors-as-values | [analysis\_\_openrefine.md](analysis__openrefine.md) |
| **ag-Grid**    | Enterprise datagrid      | Direct eval (insecure but simple)          | [analysis\_\_ag-grid.md](analysis__ag-grid.md)       |

**Note**: jsep, filtrex, Tidyjs, and danfo.js were covered in the comparison table but not analyzed in detail, as their approaches were adequately represented by the systems above.

## Key Decisions Influenced by Research

1. **Dual-mode input** (Vega-Lite) - Structured predicates for beginners, expressions for power users
2. **jsep parser** (jsep) - Lightweight, zero dependencies, extensible
3. **AST interpretation** (OpenRefine) - Security-first, no Function() constructor
4. **Errors-as-values** (OpenRefine) - One bad cell doesn't break entire column
5. **Bare identifiers** (simplest) - No prefix required: `sales > 1000` instead of `d.sales > 1000`

## Research Methodology

Each project was analyzed through 9 phases:

1. Orientation (structure, terminology)
2. Entry Point (API, input types)
3. Parsing Mechanism (approach, AST)
4. Column Reference Handling (syntax, validation)
5. Operator Handling (supported, precedence)
6. Function Support (built-ins, registration)
7. Error Handling (messages, recovery)
8. Edge Cases via Tests (what they tested)
9. Ideas and Warnings (what to adopt/avoid)

See [RESEARCH-GUIDE.md](RESEARCH-GUIDE.md) for the complete protocol.

## Status

✅ Research completed (2025-01-23)
✅ Decision documented in [PARSER-DESIGN-DECISION.md](../PARSER-DESIGN-DECISION.md)
⏭️ Next: Implementation

## Integration with Main Docs

The findings from this research are integrated into:

- [SPECIFICATION.md](../SPECIFICATION.md) - Updated Section 11 (Expression Syntax)
- [PARSER-DESIGN-DECISION.md](../PARSER-DESIGN-DECISION.md) - Comprehensive design document
