---
name: alignment
description: Review staged or uncommitted code to ensure quality, test coverage, and alignment with project specifications
disable-model-invocation: true
---

# Code Alignment

Review staged or uncommitted code to ensure quality, test coverage, and alignment with project specifications.

## Scope

Determine the review scope using `git diff` (unstaged) and `git diff --staged` (staged). Review all changes in scope. If changes span multiple patterns below, apply all relevant sections.

## General Instructions

### Process

1. **Git**: **NEVER** stage (`git add`) or commit (`git commit`) changes — this is the USER's responsibility. If the reviewed changes span multiple independent concerns (e.g. a feature + an unrelated fix, or a refactor + a new capability), suggest splitting them into separate commits and mention the logical boundaries.

2. **Verification**: After changes, run `npm run typecheck` and/or `npm run build` to catch errors. If tests fail, fix the issue if straightforward; ask the user if non-trivial or ambiguous.

3. **Judgment**: If unsure or multiple approaches exist, ask the user before proceeding. When guidelines conflict, prefer in this order: SOUL.md philosophy > FUTURE-PROOFING.md compatibility > DEVELOPMENT-PATTERNS.md conventions > local cleanup. These instructions are not strictly prohibitive — if a guideline has valid reason to be bypassed, mention it in the summary.

### Code Quality

4. **Code Cleanup**: Remove leftover code, unnecessary defensive programming, and simplify over-engineered solutions from iterative development. Examples: dead code from previous iterations, try/catch around internal calls that can't throw, abstraction layers wrapping a single implementation. Proceed with caution; ask for clarification if unsure.

5. **Styles and UI**: When implementing or altering CSS or layout, follow or generalize to existing patterns rather than writing them from scratch. Do not fix whitespace or formatting issues (trailing blank lines, extra newlines) — the project uses Prettier for that.

6. **Code Comments**: Comments should not duplicate what the code already expresses. Remove parroting comments (e.g., `// increment counter` above `counter++`). Instead, ensure comments capture non-obvious design decisions, constraints, "why" reasoning, and gotchas that would be hidden from reading the code alone. Flag missing comments where a reader would reasonably ask "why is this done this way?"

7. **Workarounds**: Flag code that works around a problem rather than solving it (e.g., `// HACK`, `// WORKAROUND`, silent catch-and-ignore, feature detection for internal bugs). If a workaround is justified (e.g., upstream bug, browser quirk, time constraint), ensure it has a comment explaining why and a reference to track resolution. If unjustified, replace it with a proper fix.

8. **Internationalization (i18n)**: All user-facing strings must use i18n. Flag any new hardcoded English strings in UI components (use `useTranslation()` hook), handlers, or services (use `i18n.t()` with namespace option). New keys must be added to both `src/i18n/locales/en/` and `src/i18n/locales/uk/` JSON files. Run `npm run i18n:check` to verify key parity across locales. See [DEVELOPMENT-PATTERNS.md §9](docs/DEVELOPMENT-PATTERNS.md) for patterns.

### Output

9. **Summary**: After performing the instructions, respond with a summary of changes: choices made due to these instructions, choices where multiple approaches existed, and any non-obvious architectural choices or assumptions the user should know about but might not notice from the diff alone.

---

## Pattern A: New Functionality

### Testing

- Write unit tests for new core logic
- Add UX tests for new UI components or interactions
- Ensure tests pass before proceeding

### Documentation

Update relevant internal docs if the feature is significant:

- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: Architecture or feature additions
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: New data structures or transform schemas
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: New UI patterns or components
- **[UI-VOCAB.md](docs/UI-VOCAB.md)**: If new controls or interaction patterns are introduced
- **[MULTI-MODEL-ARCHITECTURE.md](docs/MULTI-MODEL-ARCHITECTURE.md)**: If feature affects dependency graph or multi-model operations
- **[BACKLOG.md](docs/BACKLOG.md)**: Mark completed items

If adding expression functions:

- Update JSDoc comments in `src/core/ast-interpreter.ts` with full metadata
- Run `npm run docs:generate` to update user-facing function docs
- Verify with `npm test -- function-docs-validation.test.ts`

For documentation guidance, see **[CLAUDE.md](CLAUDE.md)** — the Documentation Index and Quick Reference table.

The list is not exclusive - if you think another document needs update, proceed with it.

### User-Facing Content

If the feature changes user-visible behavior or adds new capabilities:

- **`src/content/about.md`**: Update feature descriptions or counts if the about page references them
- **`src/content/functions/*.md`**: Auto-generated via `npm run docs:generate` — do not edit directly
- **UI copy**: Review labels, tooltips, placeholders, and help text in affected components for accuracy

### Dependencies

If `package.json` changed:

- Flag each new dependency and explain what it does and why it's needed
- Could it be avoided with a small custom implementation? If so, mention the trade-off
- Prefer dependencies that solve genuinely hard problems (parsing, rendering, crypto) over those that save boilerplate

### Alignment Check

Verify changes align with:

- **[SOUL.md](SOUL.md)**: Project philosophy (must not violate without good reason)
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: Coding conventions and patterns
- **[FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)**: Persistence compatibility if feature touches data formats or storage
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: UI consistency if feature adds or modifies components

---

## Pattern B: Bug Fixes

### Testing

- Add regression tests that reproduce the bug and verify the fix
- UX tests if the bug affected user interactions

### Documentation

Usually not required unless:

- The bug revealed incorrect documentation
- The fix changes documented behavior
- User-facing content (`src/content/`) described the broken behavior as expected

### Alignment Check

Verify the fix respects:

- **[SOUL.md](SOUL.md)**: Project philosophy
- **[FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)**: Backwards compatibility constraints
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: Data format consistency
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: Coding conventions

---

## Pattern C: Refactoring

### Impact Analysis

Before proceeding with refactoring:

1. **Search for usages**: Use Grep to find all references to modified functions/methods/types across the codebase
2. **Identify call sites**: Document where the refactored code is used (components, services, handlers, tests)
3. **Check exports**: Verify if refactored items are exported and used by other modules
4. **Review dependencies**: Check what the refactored code depends on and what depends on it

### Testing

- **Update existing tests**: Ensure all tests for refactored code still pass and reflect new structure
- **Verify call sites**: Check that all usages of refactored code work correctly
- **Run full test suite**: Execute `npm test` to catch any breaking changes
- **Integration check**: Test user-facing features that rely on refactored code
- **Type safety**: Run `npm run typecheck` to ensure no type errors were introduced

### Documentation

Update affected documentation:

- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: If architecture or module responsibilities changed
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: If data structures or interfaces were altered
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: If UI components or patterns were restructured
- **[UI-VOCAB.md](docs/UI-VOCAB.md)**: If control types or interaction patterns changed
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: If coding patterns or conventions evolved
- Code comments: Update JSDoc or inline comments if function signatures or behavior changed

### Alignment Check

Verify refactoring aligns with:

- **[SOUL.md](SOUL.md)**: Simplicity and clarity principles
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: Consistent with project patterns
- **[FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)**: Maintains backwards compatibility where needed
- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: Follows established architecture

### Common Refactoring Checks

- **Function signatures**: If changed, verify all call sites are updated
- **Type definitions**: Search for TypeScript type usages if interfaces/types changed
- **Imports**: Check that import paths are correct if files were moved
- **State management**: If signals/stores were refactored, verify all consumers
- **Props/interfaces**: If component props changed, check all usages
- **Constants/enums**: If renamed or restructured, find and update all references

---

## Reference Documents

| Document                                                          | Purpose                                         |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| [SOUL.md](SOUL.md)                                                | Project philosophy and core values              |
| [AGENTS.md](AGENTS.md)                                            | AI onboarding and project context               |
| [SPECIFICATION.md](docs/SPECIFICATION.md)                         | Technical architecture                          |
| [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)               | Data structures and persistence                 |
| [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)                   | UI/UX guidelines                                |
| [UI-VOCAB.md](docs/UI-VOCAB.md)                                   | UI terminology, design vocabulary, and patterns |
| [FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)                     | Schema evolution constraints                    |
| [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)           | Coding conventions                              |
| [MULTI-MODEL-ARCHITECTURE.md](docs/MULTI-MODEL-ARCHITECTURE.md)   | Dependency graph and multi-model system         |
| [FUNCTION-DOCS-SYSTEM.md](docs/FUNCTION-DOCS-SYSTEM.md)           | Auto-generated function documentation           |
| [I18N-GUIDE.md](docs/I18N-GUIDE.md)                               | Internationalization patterns                   |
| [DATE-STORAGE-ARCHITECTURE.md](docs/DATE-STORAGE-ARCHITECTURE.md) | Date/datetime handling rules                    |
| [DEBUGGING.md](docs/DEBUGGING.md)                                 | CSS Module debugging                            |
| [BACKLOG.md](docs/BACKLOG.md)                                     | Feature backlog                                 |
