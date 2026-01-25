# Code Alignment

Review staged or uncommitted code to ensure quality, test coverage, and alignment with project specifications.

---

## General Instructions

1. **Code Cleanup**: Remove leftover code, unnecessary defensive programming, and simplify over-engineered solutions from iterative development. Proceed with caution; ask for clarification if unsure.

2. **Verification**: After changes, run `npm run typecheck` and/or `npm run build` to catch errors.

3. **Clarification**: If unsure or multiple approaches exist, ask the user before proceeding.

4. **Amendment**: the instructions are not strictly prohibitive. If you notice that some guidelines have valid reason to be violated or bypassed, you should mention it in the summary.

5. **Summary**: after performing the instructions, finish by responding the summary of the changes, focusing on what choices were made due to following the instructions, which choices were made in case when there was more than one way to solve it.

---

## Pattern A: New Functionality

### Testing

- Write unit tests for new core logic
- Add UX tests for new UI components or interactions
- Ensure tests pass before proceeding

### Documentation

Update relevant docs if the feature is significant:

- **[SPECIFICATION.md](docs/SPECIFICATION.md)**: Architecture or feature additions
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: New data structures or transform schemas
- **[UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)**: New UI patterns or components
- **[BACKLOG.md](docs/BACKLOG.md)**: Mark completed items

The list is not exclusive - if you think another document needs update, proceed with it.

### Alignment Check

Verify changes align with:

- **[SOUL.md](SOUL.md)**: Project philosophy (must not violate without good reason)
- **[DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md)**: Coding conventions and patterns

---

## Pattern B: Bug Fixes

### Testing

- Add regression tests that reproduce the bug and verify the fix
- UX tests if the bug affected user interactions

### Documentation

Usually not required unless:

- The bug revealed incorrect documentation
- The fix changes documented behavior

### Alignment Check

Verify the fix respects:

- **[FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)**: Backwards compatibility constraints
- **[DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)**: Data format consistency

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

| Document                                                | Purpose                            |
| ------------------------------------------------------- | ---------------------------------- |
| [SOUL.md](SOUL.md)                                      | Project philosophy and core values |
| [SPECIFICATION.md](docs/SPECIFICATION.md)               | Technical architecture             |
| [DATA-SPECIFICATION.md](docs/DATA-SPECIFICATION.md)     | Data structures and persistence    |
| [UX-SPECIFICATION.md](docs/UX-SPECIFICATION.md)         | UI/UX guidelines                   |
| [FUTURE-PROOFING.md](docs/FUTURE-PROOFING.md)           | Schema evolution constraints       |
| [DEVELOPMENT-PATTERNS.md](docs/DEVELOPMENT-PATTERNS.md) | Coding conventions                 |
| [DEBUGGING.md](docs/DEBUGGING.md)                       | CSS Module debugging               |
| [BACKLOG.md](docs/BACKLOG.md)                           | Feature backlog                    |
