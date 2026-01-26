# Claude Context - Syto Project

> **Purpose**: Onboarding document for Claude AI sessions working on Syto

---

## Documentation Index

### Project Vision

- **[SOUL.md](SOUL.md)**: Project philosophy, core values, and design principles — _read this first_

### Core Specifications

- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: Technical architecture, codebase map, and implementation details
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: Data structures, transform format, expression syntax, and persistence
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: UI/UX design guidelines, component patterns, and theming system
- **[FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)**: Schema evolution constraints and persistence compatibility

### Development Guides

- **[DOCUMENTATION-GUIDE.md](docs/DOCUMENTATION-GUIDE.md)**: Documentation organization, user vs. internal docs, maintenance practices
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: How to add transforms, testing patterns, state management conventions
- **[FUNCTION-DOCS-SYSTEM.md](docs/FUNCTION-DOCS-SYSTEM.md)**: Auto-generated function documentation system (JSDoc → markdown/JSON)
- **[DEBUGGING.md](docs/DEBUGGING.md)**: CSS Module debugging and DevTools tips
- **[BACKLOG.md](docs/BACKLOG.md)**: Feature backlog and future enhancements
- **[TRANSFORM-ARCHITECTURE-REVIEW.md](docs/TRANSFORM-ARCHITECTURE-REVIEW.md)**: Transform design analysis and improvement roadmap
- **[MULTI-MODEL-ARCHITECTURE.md](docs/MULTI-MODEL-ARCHITECTURE.md)**: Dependency graph system, staleness tracking, and multi-model operations

### Reference

- **[docs/arquero/](docs/arquero/)**: Arquero library documentation (verbs, expressions, operators)
- **[docs/archive/](docs/archive/)**: Architecture Decision Records (ADRs) - key architectural choices and rationale
- **[docs/future/](docs/future/)**: Future roadmap documents (native app spec, custom icons)

---

## Project Overview

**Syto** is a browser-based data wrangling tool for cleaning and transforming tabular data. Think "Power Query in the browser" or "OpenRefine but simpler."

### Key Characteristics

- Runs entirely in browser (no backend)
- Visual pipeline builder with declarative JSON specification
- Target users: students, analysts, non-programmers
- No installation required, works on static hosting

### Technical Stack

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| Build         | Vite, TypeScript, Vitest              |
| UI            | Preact, Signals, CSS Modules          |
| Data          | Arquero (transforms), PapaParse (CSV) |
| Expressions   | jsep (parsing), custom interpreter    |
| Visualization | Vega-Lite                             |
| Storage       | IndexedDB, localStorage, URL hash     |

---

## Security Requirements (Critical)

These constraints are non-negotiable:

1. **No `eval()` or `Function()`**: Never execute user input as raw JavaScript
2. **AST Whitelist**: All expression nodes and functions must be explicitly allowed
3. **Sandbox**: Expressions cannot access global objects (`window`, `document`)

See `src/core/ast-validator.ts` for the whitelist implementation.

---

## Codebase Orientation

### Directory Structure

```
src/
├── core/           # Data engine (transforms, expressions, schema)
├── app/
│   ├── components/ # Preact UI components with CSS Modules
│   ├── stores/     # Signal-based state (AppStore, DialogStore)
│   ├── services/   # Business logic (import, export, persistence)
│   ├── handlers/   # Event handlers and UI logic
│   └── types.ts    # TypeScript definitions
├── content/        # Markdown content (about, help)
styles/             # Global CSS (variables, base, layout)
docs/               # Documentation
```

### Key Entry Points

- `src/main.tsx` — Application bootstrap
- `src/syto-app.ts` — Main orchestration (coordinates stores and services)
- `src/core/transforms.ts` — Transform implementations
- `src/core/schema-engine.ts` — Type inference and propagation

For detailed codebase map, see [SPECIFICATION.md](docs/SPECIFICATION.md) §3.

---

## Development

### Common Scripts

```bash
npm run dev      # Start dev server
npm run build    # Type-check and build
npm test         # Run Vitest
npm run format   # Prettier
```

### Testing Philosophy

- High coverage on core logic (parsing, transforms, schema)
- Tests co-located in `src/core/*.test.ts`
- UI tests in `src/app/components/*.test.tsx`

---

## Quick Reference

| Topic                 | Where to Look                                              |
| --------------------- | ---------------------------------------------------------- |
| Data structures       | [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md) §1-3   |
| Expression syntax     | [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md) §4     |
| Expression functions  | [FUNCTION-DOCS-SYSTEM.md](docs/FUNCTION-DOCS-SYSTEM.md)    |
| How transforms work   | [SPECIFICATION.md](docs/SPECIFICATION.md) §3, §5           |
| Adding new transforms | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §1 |
| Testing patterns      | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §3 |
| State management      | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §2 |
| UI component patterns | [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) §3         |
| What's safe to change | [FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)              |
| CSS debugging         | [DEBUGGING.md](docs/DEBUGGING.md)                          |
| Project philosophy    | [SOUL.md](SOUL.md)                                         |

---

## Documentation Maintenance

> **Important**: Keep this file stable. Avoid volatile details (specific counts, file lists, line numbers) that become outdated as the codebase evolves. Delegate specifics to the referenced documents below and update them instead.

When editing project documentation:

- **CLAUDE.md**: High-level orientation only. No specific file counts, component lists, or implementation details.
- **SPECIFICATION.md**: Technical architecture, codebase structure, implementation details.
- **DATA-SPECIFICATION.md**: Data structures, transform schemas, expression syntax, persistence format.
- **UX-SPECIFICATION.md**: UI patterns, component catalog, styling details.

---

**End of Context**
