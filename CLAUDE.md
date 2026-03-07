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
- **[DATE-STORAGE-ARCHITECTURE.md](docs/DATE-STORAGE-ARCHITECTURE.md)**: Date/datetime handling strategy, JavaScript Date pitfalls, and developer rules

### Reference

- **[docs/arquero/](docs/arquero/)**: Arquero library documentation (verbs, expressions, operators)
- **[docs/archive/](docs/archive/)**: Architecture Decision Records (ADRs) - key architectural choices and rationale
- **[docs/future/](docs/future/)**: Future roadmap documents (native app spec, custom icons, example workflows)

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
├── core/           # Portable data engine (transforms, expressions, schema)
│                   # No browser APIs, no Preact — usable in Node.js
├── i18n/
│   ├── core.ts     # Portable i18n registry (i18next only)
│   ├── index.ts    # App i18n (adds Preact bindings + language detection)
│   └── locales/    # Translation files (en, uk)
├── app/
│   ├── components/ # Preact UI components with CSS Modules
│   ├── stores/     # Signal-based state (AppStore, DialogStore)
│   ├── services/   # Business logic (import, export, persistence)
│   ├── handlers/   # Event handlers and UI logic
│   ├── infrastructure/ # Browser-specific adapters (IndexedDB, localStorage, URL)
│   └── types.ts    # TypeScript definitions
├── content/        # Markdown content (about, help)
styles/             # Global CSS (variables, base, layout)
docs/               # Documentation
```

### Key Entry Points

- `src/main.tsx` — Application bootstrap (renders `App`, creates `SytoApp` instance)
- `src/syto-app.ts` — App initialization: callback wiring, data loading, URL restore, keyboard listeners
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

### AI Developer Protocol

- **No Staging or Committing**: Never run `git add`, `git commit`, or `git push`. Staging and committing is strictly reserved for the USER.
- **Verification**: After changes, run `npm run typecheck` or `npm test` to catch errors.
- **Spec Before Code**: For non-trivial features, draft a brief spec (goals, constraints, edge cases, testing strategy) collaboratively with the user before writing implementation code.
- **Ask for Context**: Before working on unfamiliar code areas or library-specific logic, ask the user which files, docs, or examples to read — don't assume from file names alone.
- **Flag Entropy**: If you notice growing complexity, duplication, or structural drift during a task, proactively suggest refactoring — don't wait to be asked.
- **Explain Stack Choices**: When introducing stack-specific patterns, configs, or dependencies, explain what problem they solve in plain terms — not just what they do.

### Testing Philosophy

- High coverage on core logic (parsing, transforms, schema)
- Tests co-located in `src/core/*.test.ts`
- UI tests in `src/app/components/*.test.tsx`

---

## Quick Reference

| Topic                 | Where to Look                                                     |
| --------------------- | ----------------------------------------------------------------- |
| Data structures       | [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md) §1-3          |
| Expression syntax     | [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md) §4            |
| Expression functions  | [FUNCTION-DOCS-SYSTEM.md](docs/FUNCTION-DOCS-SYSTEM.md)           |
| How transforms work   | [SPECIFICATION.md](docs/SPECIFICATION.md) §3, §5                  |
| Adding new transforms | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §1        |
| Testing patterns      | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §3        |
| State management      | [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) §2        |
| UI component patterns | [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md) §3                |
| What's safe to change | [FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)                     |
| Date handling rules   | [DATE-STORAGE-ARCHITECTURE.md](docs/DATE-STORAGE-ARCHITECTURE.md) |
| CSS debugging         | [DEBUGGING.md](docs/DEBUGGING.md)                                 |
| Project philosophy    | [SOUL.md](SOUL.md)                                                |

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
