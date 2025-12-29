# Chumak - Data Wrangling in the Browser

> Named after Ukrainian star-navigating traders, Chumak transforms raw data into insights—guided by clarity and precision.

**Status**: 📋 Design Phase

## Documentation

### For AI Sessions
- **[CLAUDE.md](CLAUDE.md)** - Onboarding document for Claude AI sessions
  - Project context and current status
  - Key design decisions and rationale
  - Implementation roadmap and next steps
  - Common pitfalls and best practices
  - Quick reference for all docs

### Core Specification
- **[SPECIFICATION.md](SPECIFICATION.md)** - Complete product specification
  - What Chumak is and who it's for
  - Technical architecture and constraints
  - Data model and transform operations
  - UI design and user workflows
  - Phased roadmap (3 phases)
  - Testing strategy

### Design Decisions
- **[PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md)** - Expression parser design
  - Comprehensive analysis of parser options
  - Recommended architecture (jsep + predicates)
  - Security model and validation strategy
  - Implementation phases and code estimates
  - Based on research of 8 production systems

### Research
- **[research/](research/)** - Background research on expression parser design
  - Analysis of Vega-Lite, Arquero, OpenRefine, ag-Grid, and others
  - Comparison table of approaches
  - Detailed findings that informed design decisions
  - See [research/README.md](research/README.md) for details

## Quick Start

**For Contributors:**
1. Read [SPECIFICATION.md](SPECIFICATION.md) for product vision and architecture
2. Read [PARSER-DESIGN-DECISION.md](PARSER-DESIGN-DECISION.md) for parser implementation approach
3. Check the phased roadmap in SPECIFICATION.md Section 8

**For Researchers:**
- See [research/](research/) for detailed analysis of existing systems

## Design Principles

| Principle | Implication |
|-----------|-------------|
| **Local-first** | All data stays in browser. No uploads, no accounts. |
| **Progressive disclosure** | Simple defaults, optional advanced configuration. |
| **Declarative specification** | Transformations are data (JSON), not code. |
| **Reproducibility** | Workflows can be exported, shared, and replayed. |
| **Security-first** | Untrusted expressions sandboxed, no code injection. |

## Technology Stack

- **PapaParse** - CSV parsing
- **Arquero** - Data transformation engine
- **jsep** - Expression parser
- **Alpine.js** - Reactive UI
- **No build system** - CDN-loaded libraries, runs in any browser

## Current Phase: Design

- ✅ Product specification complete
- ✅ Expression parser design complete
- ✅ Research and analysis complete
- ⏭️ Next: Implementation Phase 1 (MVP)

## Target Audience

- Students learning data wrangling
- Analysts needing quick CSV cleaning
- Users on restricted machines (no Python/R/Excel installation)

## Contact & Contribution

This is currently a design-phase project. Implementation will follow the phased roadmap in the specification.

---

**License**: TBD
**Version**: 0.1.0-design
