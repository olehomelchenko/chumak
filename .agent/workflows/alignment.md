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
