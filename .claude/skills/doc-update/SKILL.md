---
name: doc-update
description: Update project documentation based on knowledge gaps discovered during the current session
disable-model-invocation: true
---

# Documentation Update from Session Context

Review the current session to identify knowledge gaps that caused suboptimal codebase navigation, then update the relevant documentation.

## The quality bar

Every addition must pass this test: **"Would this save a future session at least 5 minutes of exploration?"**

Documentation serves two purposes — know **where to look** and know **what to do**. Both are valuable, but at different levels of detail:

- **Navigation map** (good): "Settings flow: `SettingsDialog.tsx` → callbacks → `AppController` → `localStorage`" — lists the files and their roles so you don't read 12 files to find the right 4
- **Decision rule** (good): "Immediate-apply dialogs must omit `getState` — no unsaved-changes confirmation needed" — captures a non-obvious convention
- **Code walkthrough** (bad): "DialogStore.settingsState signals are initialized from AppStore values when the dialog opens via initDialogState(). The handleLanguageChange() function updates the signal and calls onLanguageChange callback..." — restates the code, goes stale on any rename

**Navigation maps** use file/module names (stable) to show flow direction. **Decision rules** capture "when/why" constraints. **Code walkthroughs** restate implementation details — that's what reading the code is for.

For documentation organization standards and the "When to Update Which Doc" table, see **[DOCUMENTATION-GUIDE.md](docs/DOCUMENTATION-GUIDE.md)**.

## Process

### 1. Analyze the session

Look back through the conversation and identify:

- **Missing navigation maps**: Where did you have to read many files to discover which 3-4 files are involved in a flow? A one-line map of file roles would have saved that.
- **Missing rules**: What conventions or constraints were discovered that a new session would violate or re-discover?
- **Non-obvious "when/why" knowledge**: What decisions or patterns require understanding intent, not just implementation?

Produce a brief list of gaps before proceeding. For each gap, state what's needed in one sentence — either a navigation map ("X flow: file → file → file") or a decision rule ("X must/must not do Y"). If you can't state it concisely, it may be too implementation-specific to document.

### 2. Categorize and target

Map each gap to the right document using the project's single-source-of-truth principle:

| Gap type                                         | Target document                     |
| ------------------------------------------------ | ----------------------------------- |
| Architecture, features, system behavior          | `docs/SPECIFICATION.md`             |
| Data structures, transform schemas, expressions  | `docs/DATA-SPECIFICATION.md`        |
| UI patterns, component design, styling           | `docs/UX-SPECIFICATION.md`          |
| UI terminology, design vocabulary, control types | `docs/UI-VOCAB.md`                  |
| Development conventions, how-to patterns         | `docs/DEVELOPMENT-PATTERNS.md`      |
| Schema evolution, compatibility                  | `docs/FUTURE-PROOFING.md`           |
| Dependency graph, multi-model ops                | `docs/MULTI-MODEL-ARCHITECTURE.md`  |
| Date/datetime handling                           | `docs/DATE-STORAGE-ARCHITECTURE.md` |

If a gap doesn't fit any existing document, consider whether it warrants a new dedicated doc or belongs as a new section in an existing one. Prefer extending existing docs.

### 3. Read, locate, and check for bloat

For each target document, read the relevant sections to:

- Confirm the gap isn't already covered (even partially — if partially covered, extend rather than duplicate)
- Find the right insertion point (existing section to extend, or placement for a new subsection)
- **Check section length**: If the target section is already long (>50 lines), look for content that can be tightened or consolidated before adding more. Documentation that only grows eventually becomes noise.

### 4. Apply updates

Write documentation additions that follow these principles:

- **Rules and constraints over descriptions**: "X must do Y because Z" is more valuable than "X works by doing A, B, C"
- **Stability over specifics**: No line numbers, no file counts, no volatile details that become outdated as code evolves
- **Proportional**: A missing sentence doesn't need a new section. A missing concept does.
- **Match existing style**: Follow the formatting, heading levels, and tone of the surrounding content
- **Prefer extending over creating**: Add to existing sections before creating new ones
- **Consolidate while adding**: If adding a rule to a section that has grown unwieldy, tighten the surrounding text. The net size increase should be minimal.

### 5. Update index (if needed)

Only update `CLAUDE.md` if:

- A new document was created
- A major new section was added that should appear in the Quick Reference table

Do NOT update CLAUDE.md for minor additions to existing sections.

## What NOT to document

- **Code walkthroughs**: "Function A calls B which updates C" — restate the code in prose; goes stale on any rename. (Navigation maps that list file roles are fine — just don't narrate the implementation.)
- **Obvious-from-code patterns**: If reading the relevant file makes the pattern clear, don't add docs
- **Session-specific context**: Current task details, debugging steps taken
- **Speculative patterns**: Only document conventions confirmed across multiple instances
- **Implementation details that change with refactoring**: If renaming a variable would invalidate the doc, it's too specific
