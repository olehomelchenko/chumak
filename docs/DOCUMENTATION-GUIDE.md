# Documentation Guide

> How documentation is organized, maintained, and contributed to in the Syto project

---

## Documentation Structure

### 1. Project Documentation (for developers/AI)

Located in `docs/`:

#### Core References

- **SOUL.md** (root) - Project philosophy, values, and vision
- **CLAUDE.md** (root) - Onboarding doc for AI assistants, documentation index
- **SPECIFICATION.md** - Technical architecture and codebase map
- **DATA-SPECIFICATION.md** - Data structures, transforms, expression syntax
- **UX-SPECIFICATION.md** - UI/UX patterns, component design
- **FUTURE-PROOFING.md** - Schema evolution and compatibility constraints

#### Development Guides

- **DEVELOPMENT-PATTERNS.md** - How to add transforms, testing patterns, conventions
- **FUNCTION-DOCS-SYSTEM.md** - Auto-generated function documentation system
- **DEBUGGING.md** - Debugging tips and tools
- **TRANSFORM-ARCHITECTURE-REVIEW.md** - Transform design analysis
- **MULTI-MODEL-ARCHITECTURE.md** - Dependency graph and multi-model system
- **BACKLOG.md** - Feature backlog and future enhancements

#### Supporting Folders

- **docs/arquero/** - Arquero library reference documentation
- **docs/archive/** - Architecture Decision Records (ADRs) explaining key design choices
- **docs/future/** - Future roadmap documents (native app spec, icon migration)

### 2. User-Facing Documentation

Located in `src/content/`:

#### Content Pages

Markdown files that are rendered as standalone static HTML pages on the site:

- **about.md** — About page (`/about/`)
- **getting-started.md** — Docs index (`/docs/`)
- **shortcuts.md** — Keyboard shortcuts (`/docs/shortcuts/`)
- **whats-new.md** — Changelog (`/docs/whats-new/`)
- **functions/\*.md** — Auto-generated function reference (`/docs/operators/`, `/docs/date/`, etc.)

These pages are also available in-app via `FunctionReferenceDialog.tsx` (Help → Expression Reference).

#### Content Pages System

Content pages are generated from markdown at build time by `scripts/build-content-pages.ts`. The page list and sidebar structure are defined in `scripts/content-pages-config.ts`. During development, `scripts/vite-plugin-content-pages.ts` serves them on-the-fly.

To add a new content page:

1. Create a markdown file in `src/content/`
2. Add a `PageDef` entry in `scripts/content-pages-config.ts`
3. If it's a docs page, add a sidebar entry in the same config file

#### Function Docs Generation

Function documentation is **auto-generated** from JSDoc comments in `src/core/ast-interpreter.ts`:

- Source: JSDoc tags in code
- Build: `npm run docs:generate`
- Output: `src/content/functions/*.md` + `src/schemas/functions.json`

See **FUNCTION-DOCS-SYSTEM.md** for complete details.

---

## Documentation Principles

### 1. Single Source of Truth

Each type of information has ONE authoritative location:

- **Project philosophy** → SOUL.md
- **Architecture overview** → SPECIFICATION.md
- **Data structures** → DATA-SPECIFICATION.md
- **UI patterns** → UX-SPECIFICATION.md
- **User help** → src/content/ (about, getting-started, shortcuts, whats-new)
- **Function reference** → JSDoc in ast-interpreter.ts (auto-generated docs)
- **Content page config** → scripts/content-pages-config.ts

### 2. Stability over Specifics

CLAUDE.md and SOUL.md should remain **stable**:

- ❌ Don't include: File counts, line numbers, component lists
- ✅ Do include: High-level concepts, philosophical principles, documentation structure
- Delegate volatile details to the specific spec files

### 3. Git is the Archive

- Don't keep outdated implementation plans in docs/
- Completed features should be documented in the main specs
- Only preserve Architecture Decision Records (ADRs) that explain "why" choices were made
- Everything else lives in git history

### 4. User-Facing = Auto-Generated

Function and expression documentation is generated from code:

- Write JSDoc comments with `@category`, `@description`, `@param`, `@returns`, `@example`
- Run `npm run docs:generate` to update markdown files
- Validation tests ensure completeness

---

## Contributing to Documentation

### When to Update Which Doc

| Change                        | Update                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| Add new transform             | DATA-SPECIFICATION.md, DEVELOPMENT-PATTERNS.md (if pattern is new) |
| Add new component pattern     | UX-SPECIFICATION.md                                                |
| Add new expression function   | JSDoc in ast-interpreter.ts → run `npm run docs:generate`          |
| Change architecture principle | SOUL.md                                                            |
| Add future feature idea       | BACKLOG.md                                                         |
| Make key design decision      | Create ADR in docs/archive/ (if foundational)                      |
| Change codebase structure     | SPECIFICATION.md                                                   |
| Add new import/export format  | DATA-SPECIFICATION.md                                              |
| Update user help content      | src/content/\*.md                                                  |
| Add new content page          | scripts/content-pages-config.ts + src/content/\*.md                |

### Writing Guidelines

#### Project Documentation (docs/)

**Style:**

- Use Markdown with clear headings and code blocks
- Include table of contents for docs >200 lines
- Link between related docs
- Use examples liberally

**Structure:**

- Start with "Purpose" or "Overview"
- Use numbered sections for sequential content
- Use tables for comparisons or references
- Include verification/testing sections where relevant

**Maintenance:**

- Review quarterly for outdated information
- Remove temporary implementation plans after completion
- Update CLAUDE.md if new essential docs are added

#### User-Facing Documentation (src/content/)

**about.md:**

- Keep concise (aim for <2 pages of reading)
- Use friendly, welcoming tone
- Focus on benefits, not technical details
- Include quick-start steps

**Function docs (auto-generated):**

- Write clear JSDoc comments with:
  - `@category` - One of: Date, Text, Math, Regex, Conversion, JSON
  - `@description` - Brief, action-oriented description
  - `@param` - Each parameter with clear explanation
  - `@returns` - What the function returns, including null cases
  - `@example` - At least 2 examples showing typical usage
- Run `npm run docs:generate` after changes
- Run tests to validate: `npm test -- function-docs-validation.test.ts`

---

## Documentation Maintenance Checklist

### After Adding a New Feature

- [ ] Update relevant spec (DATA-SPECIFICATION, SPECIFICATION, or UX-SPECIFICATION)
- [ ] Add tests documenting behavior
- [ ] Update BACKLOG.md (remove from roadmap if listed)
- [ ] If architectural decision was made, consider creating an ADR

### After Major Refactoring

- [ ] Update SPECIFICATION.md codebase map if structure changed
- [ ] Update DEVELOPMENT-PATTERNS.md if patterns changed
- [ ] Review CLAUDE.md for any needed updates
- [ ] Archive any outdated planning documents

### Quarterly Review

- [ ] Check all docs/ files for outdated information
- [ ] Verify all links in CLAUDE.md are still accurate
- [ ] Review BACKLOG.md and remove completed items
- [ ] Update about.md if feature set significantly changed

---

## Special Cases

### Architecture Decision Records (ADRs)

When making a significant architectural choice, document it in `docs/archive/`:

**Template:**

```markdown
# [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated

## Context

What is the issue we're trying to address?

## Decision

What was decided and why?

## Consequences

What are the positive and negative impacts?

## Alternatives Considered

What other options were evaluated?
```

**Examples in docs/archive/:**

- PARSER-DESIGN-DECISION.md - Why security-first AST validation
- ARQUERO-LEVERAGE-ANALYSIS.md - Why Arquero as data engine

### Future Roadmap Documents

Large planning documents for unimplemented features go in `docs/future/`:

- Use when planning a major change (>1000 lines of code)
- Include comprehensive specs with examples
- Move to docs/archive/ after implementation or remove if abandoned

---

## Tools and Commands

```bash
# Generate function documentation from JSDoc
npm run docs:generate

# Validate documentation completeness
npm test -- function-docs-validation.test.ts

# Type-check all TypeScript (including docs examples)
npm run typecheck

# Build (includes doc generation)
npm run build
```

---

## Key Philosophy

> "Documentation should explain the 'why', tests should verify the 'what', and code should show the 'how'."

The best documentation is:

1. Close to the code (JSDoc, inline comments)
2. Automatically validated (tests)
3. Easy to update (generated from source)
4. Focused on decisions and rationale, not implementation details

When in doubt: **Keep it simple, keep it current, and put it where people will find it.**
