# Chumak - Data Wrangling in the Browser

> Named after Ukrainian star-navigating traders, Chumak transforms raw data into insights—guided by clarity and precision.

**Status**: ✅ Phase 0 Complete (Walking Skeleton) → 🚧 Starting Phase 1 (MVP)

## Documentation

### For AI Sessions
- **[CLAUDE.md](CLAUDE.md)** - Onboarding document for Claude AI sessions
  - Project context and current status
  - Key design decisions and rationale
  - Implementation roadmap and next steps
  - Common pitfalls and best practices
  - Quick reference for all docs

### Testing
- **[PHASE-0-TESTING-CHECKLIST.md](PHASE-0-TESTING-CHECKLIST.md)** - Manual testing checklist for Phase 0
  - Comprehensive test scenarios for all implemented features
  - CSV import, transforms, persistence, export
  - Error handling and edge cases
  - Browser compatibility checks

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

## Current Phase: Phase 0 Complete ✅

**Walking Skeleton (Phase 0)** - COMPLETE (2025-12-30)
- ✅ Product specification complete
- ✅ Expression parser design complete
- ✅ Research and analysis complete
- ✅ Expression parser implemented (jsep → validation → interpretation)
- ✅ IndexedDB persistence with auto-save
- ✅ Filter and Select transforms working
- ✅ CSV and JSON export functional
- ✅ All architectural layers validated end-to-end

**Key achievements:**
- Successfully validated security model (no Function() constructor)
- Proven data flow: CSV import → transform → persist → export
- Identified and documented implementation discoveries (jsep behavior, Arquero limitations)

**Next:** Phase 1 (MVP) - Remaining transforms, predicate builder, automated testing

## Target Audience

- Students learning data wrangling
- Analysts needing quick CSV cleaning
- Users on restricted machines (no Python/R/Excel installation)

## Contact & Contribution

This project is in active development. Phase 0 (Walking Skeleton) is complete, validating all architectural layers. Phase 1 (MVP) implementation is next.

See [SPECIFICATION.md](SPECIFICATION.md) Section 8 for the phased roadmap and [CLAUDE.md](CLAUDE.md) for current status and next steps.

---

**License**: TBD
**Version**: 0.1.0-phase0
