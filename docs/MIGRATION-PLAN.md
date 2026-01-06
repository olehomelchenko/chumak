# Migration Plan: Modernizing the Chumak Foundation

This document outlines the strategy for migrating **Chumak** from a "No-Build" CDN-based architecture to a modern, robust, and "agent-friendly" web project foundation.

## 1. Objectives

The primary goals of this migration are:

- **Scalability**: Move away from 1,400+ line CSS files and complex global script interdependencies.
- **Maintainability**: Use TypeScript (TS) to ensure type safety and reduce defensive "check-if-exists" boilerplate.
- **Code Reduction**: Leverage TS syntax sugar (like Decorators) to delete hundreds of lines of repetitive code.
- **Agent/CLI Friendliness**: Separate the transformation engine from the browser UI to allow CLI-based debugging and terminal-first testing.

---

## 2. Updated Technology Stack

| Component        | Current (Legacy)           | Proposed (Modern)                    |
| :--------------- | :------------------------- | :----------------------------------- |
| **Build Tool**   | None (Raw HTML/JS)         | **Vite**                             |
| **Language**     | Vanilla ES6 JavaScript     | **TypeScript (TS)**                  |
| **Logic Reuse**  | Manual try/finally blocks  | **TS Decorators**                    |
| **Testing**      | Browser-based (Mocha/Chai) | **Vitest** (CLI-first, blazing fast) |
| **Styling**      | Single large CSS file      | **PostCSS + CSS Nesting**            |
| **Dependencies** | CDN Loaders                | **npm / ESM Modules**                |

---

## 3. The "Agent-Friendly" Architecture

To make Chumak easier for AI agents (and developers) to interact with via CLI:

1. **Headless Engine**: Extract `expression-parser`, `transforms`, and `schema-engine` into a pure `src/core` library with **zero** browser dependencies.
2. **CLI Runner**: Create a terminal utility (`npm run chumak-cli`) that can:
   - Load a local CSV.
   - Apply a JSON workflow.
   - Output results as Markdown or JSON.
3. **Structured Debugging**: Replace `console.log` with a diagnostic system that can dump AST structures and schema evolution states directly to the terminal.

---

## 4. Proposed Directory Structure

```text
chumak/
├── src/
│   ├── core/           # HEADLESS: Parser, Engines, Transforms (TS)
│   ├── ui/             # UI: Alpine components, Dialogs, Interaction (TS)
│   ├── styles/         # CSS: Modularized PostCSS files
│   ├── cli/            # TOOLS: Headless runner for agents/debugging
│   ├── tests/          # TESTS: Vitest unit & integration tests
│   └── main.ts         # App entry point
├── public/             # Static assets (favicons, icons)
├── index.html          # Cleaned up template
├── package.json        # Dependencies & Scripts
├── tsconfig.json       # TS configuration
└── vite.config.ts      # Vite configuration
```

---

## 5. Implementation Phases

### Phase 1: The Foundation

- Initialize `package.json` and install Vite, TS, Vitest, and PostCSS.
- Configure `tsconfig.json` to support modern decorators.
- Set up a clean `index.html` that points to a `main.ts` entry module.

### Phase 2: Core Extraction (Moving to TS)

- Convert `expression-parser`, `ast-*`, and `schema-engine` to TypeScript.
- Move these to `src/core/`.
- Ensure they are 100% testable in Vitest without a browser.

### Phase 3: Test Migration

- Port the existing 30+ tests from the browser runner to Vitest.
- Achieve green lights in the terminal.

### Phase 4: UI Refactoring & Decorators

- Create the `@withStatus` and `@logTransform` decorators.
- Convert `chumak-app.js` and its handlers to TS modules.
- Refactor transformation methods to use decorators, deleting repetitive `try/finally` blocks.

### Phase 5: CSS Modularization

- Split the 1,400-line `chumak.css` into logical modules (e.g., `ribbon.css`, `table.css`, `dialogs.css`).
- Use PostCSS nesting to tighten the selectors.

---

## 6. Success Metrics

- **Build Speed**: < 2s for local dev startup.
- **Test Speed**: < 5s for the entire suite in the terminal.
- **Code Volume**: At least 15-20% reduction in total lines of code (LOC) due to decorators and removal of defensive checks.
- **Agent Efficiency**: Ability to fix and verify core transform bugs without launching a browser.
