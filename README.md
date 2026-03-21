# Syto - Data Wrangling in the Browser

> Named after Ukrainian star-navigating traders, Syto transforms raw data into insights—guided by clarity and precision.

**Status**: ✅ Production-Ready Data Wrangling Application

## Documentation

### For AI Sessions

- **[CLAUDE.md](CLAUDE.md)** - Onboarding document for Claude AI sessions
  - Project context and current status
  - Key design decisions and rationale
  - Implementation roadmap and next steps
  - Common pitfalls and best practices
  - Quick reference for all docs

### Core Specification

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - Complete product specification
  - What Syto is and who it's for
  - Technical architecture and constraints
  - Data model and transform operations
  - UI design and user workflows
  - Implementation roadmap
  - Testing strategy

- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)** - UI/UX design guidelines
  - Layout structure and grid system
  - Component patterns and interaction design
  - Theme system and CSS architecture
  - Typography and visual standards

### Development Guides

- **[DEBUGGING.md](docs/DEBUGGING.md)** - Debugging and development tools
  - CSS Module debugging techniques
  - Component identification helpers
  - DevTools tips and tricks

### Design Decisions

- **[DECISIONS.md](docs/archive/DECISIONS.md)** - Key architecture decisions and rationale
  - Expression parser: jsep + AST validation + interpretation (§1)
  - Data engine: custom AST + Arquero delegation (§2)
  - Design system: custom CSS over frameworks (§3)
  - Non-destructive architecture decisions (§4)

### Research

- **[research/](research/)** - Background research on expression parser design
  - Analysis of Vega-Lite, Arquero, OpenRefine, ag-Grid, and others
  - Comparison table of approaches
  - Detailed findings that informed design decisions
  - See [research/README.md](research/README.md) for details

## Quick Start

**For Contributors:**

1. Read [SPECIFICATION.md](docs/SPECIFICATION.md) for product vision and architecture
2. Read [DECISIONS.md](docs/archive/DECISIONS.md) for architecture decisions
3. Read [CLAUDE.md](CLAUDE.md) for development context and current status

**For Researchers:**

- See [research/](research/) for detailed analysis of existing systems

## Design Principles

| Principle                     | Implication                                         |
| ----------------------------- | --------------------------------------------------- |
| **Local-first**               | All data stays in browser. No uploads, no accounts. |
| **Progressive disclosure**    | Simple defaults, optional advanced configuration.   |
| **Declarative specification** | Transformations are data (JSON), not code.          |
| **Reproducibility**           | Workflows can be exported, shared, and replayed.    |
| **Security-first**            | Untrusted expressions sandboxed, no code injection. |

## Technology Stack

- **PapaParse** - CSV parsing
- **Arquero** - Data transformation engine
- **jsep** - Expression parser
- **Alpine.js** - Reactive UI
- **No build system** - CDN-loaded libraries, runs in any browser

## Features

**Data Import/Export**:

- ✅ CSV file upload with drag-drop
- ✅ Clipboard paste (Ctrl+V)
- ✅ CSV/JSON export with clipboard copy
- ✅ Workflow JSON export/import

**Transformations** (10 implemented):

- ✅ Filter, Select, Remove, Rename, Sort
- ✅ Derive (calculated columns)
- ✅ Types (explicit type assignment)
- ✅ Aggregate (group by + rollup)
- ✅ Join (multi-table operations)
- ✅ Fold (unpivot/wide to long)

**Advanced Features**:

- ✅ Schema engine with granular type inference
- ✅ Statistical profiling (EDA)
- ✅ Vega-Lite visualizations
- ✅ URL-based state & shareable links
- ✅ Multi-model pipelines
- ✅ IndexedDB auto-save
- ✅ Step editing

**Security**:

- ✅ Expression sandboxing (no `Function()` constructor)
- ✅ AST validation for user expressions
- ✅ Operator whitelisting

**Testing**:

- ✅ Comprehensive automated test suite (6 test files)
- ✅ Browser-based test runner
- ✅ High coverage on core transform logic

## Target Audience

- Students learning data wrangling
- Analysts needing quick CSV cleaning
- Users on restricted machines (no Python/R/Excel installation)

## Development

This project is production-ready with comprehensive features for data wrangling. Future development focuses on additional transforms (dedupe, impute, pivot) and expression functions (string, date, math operations).

See [docs/SPECIFICATION.md](docs/SPECIFICATION.md) for complete specification and [CLAUDE.md](CLAUDE.md) for development context.

---

**License**: TBD
