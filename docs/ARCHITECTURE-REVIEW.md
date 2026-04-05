# Architecture Review

> Critical review of Syto's architecture — what works, what hinders extensibility, and what to change.
> Written April 2025.

---

## Framework: Three Types of Extensibility Friction

| Type                    | Definition                                                        | Impact pattern                                |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| **Per-feature tax**     | Boilerplate/ceremony paid on every new feature                    | Linear — grows with feature count             |
| **Cognitive coupling**  | How much unrelated system you must understand to change one thing | Slows every developer, worsens with team size |
| **Composition ceiling** | Things that become impossible/impractical to build                | Binary — blocks entire categories of features |

---

## Priority 1: Handler/Service Layering + Callback Wiring

**Type:** Per-feature tax

Adding a new transform requires coordinated changes across ~6 files: dialog component, dialog state in DialogStore, handler module, service call, callback registration in orchestrator, and the core transform itself. Most of this is wiring, not feature logic.

The `setXxxCallbacks()` → `createExecutionCallbacks()` indirection means you can't trace from user action to result without jumping through stored callback references. "Go to definition" stops at a callback variable, not at the implementation.

**Fix:** Collapse handlers + services into a single "actions" layer. One file per feature that imports stores directly, calls core transforms, writes results. Components dispatch actions, actions orchestrate.

**Status:** Partially addressed. `executeTransform()` utility bypasses callback wiring. `useDialogState` hook eliminates handler files for migrated dialogs. Apply logic inlined in dialog registry entries. See [DIALOG-MIGRATION.md](DIALOG-MIGRATION.md) for migration progress.

---

## Priority 2: DialogStore as Global State

**Type:** Per-feature tax + Cognitive coupling

Every dialog requires: a global signal state file, a reset function registered with `reset-registry.ts`, a case in DialogCoordinator's 332-line `initDialogState` switch, and `getState`/`hasError`/`getError` functions in the dialog registry. ~100-150 lines of boilerplate per dialog before feature logic.

All dialog states coexist globally, requiring lifecycle awareness of other dialogs to avoid stale signals.

**Fix:** Dialog state becomes local signals owned by the component via `useDialogState` hook. DialogStore bridge signals handle integration with the existing lifecycle (snapshot, dirty detection, error state).

**Status:** Partially addressed. `useDialogState` hook implemented. Sort, sliceRows, sample dialogs migrated. See [DIALOG-MIGRATION.md](DIALOG-MIGRATION.md).

---

## Priority 3: Preact Ecosystem Lock-in

**Type:** Composition ceiling

Preact saves ~30KB gzipped over React but blocks access to:

- Radix UI, Headless UI, Ark UI (accessible component primitives)
- `@dnd-kit` (drag-and-drop)
- Tree views, date pickers, virtualized lists from the React ecosystem

Each missing primitive is a multi-day build-from-scratch. The 30KB saving is dwarfed by Vega-Lite (700KB) and xlsx (800KB) already in the bundle.

**Fix:** Migrate to React with Radix/Headless UI for accessible components. Focus engineering on the data engine (the differentiator), not on reimplementing combobox keyboard navigation.

**Status:** Not started. Migration cost increases with each custom component built.

---

## Priority 4: Expression Language Ceiling

**Type:** Composition ceiling

jsep is the right parser for security (no eval, sandboxed AST). But the interpreter lacks:

- `let` bindings — complex expressions become unreadable (`if(len(trim(lower([Name]))) > 0, trim(lower([Name])), "unknown")`)
- Lambdas — no user-defined column transforms beyond single expressions
- Pipe operator — no composition

Each expression limitation pushes toward adding new transform types (e.g., the `conditional` transform proposal) as workarounds, which pay the per-feature tax from priorities 1-2.

**Fix:** Add `let` bindings to the expression language (`let x = trim([Name]) in if(len(x) > 0, x, "unknown")`). Safe (no mutation, no side effects), bounded effort, high leverage.

**Status:** Not started.

---

## Priority 5: Linear Pipeline Replay

**Type:** Composition ceiling (deferred)

Transform pipeline replays from step 0 (or a single checkpoint) on every change. Adequate for 5-10 steps on 10K rows. Blocks: real-time preview on large datasets, step-level debugging, "what-if" branching.

**Fix:** Cache each step's output, keyed by `hash(input + transform config)`. When step 7 changes, replay from step 7, not step 0.

**Status:** Not urgent. Current single-checkpoint cache is adequate for the current feature set.

---

## What Works Well

These are genuinely strong and hard to retrofit:

- **Security architecture** — No eval, AST whitelist, sandboxed interpreter. Baked in, not bolted on.
- **Error-as-value** — Power Query's best idea. One bad cell doesn't break a pipeline.
- **Workflow JSON as primary artifact** — Diffable, versionable, LLM-friendly. The strategic differentiator.
- **Non-destructive pipeline** — Correct for the target audience. Students and analysts need traceability.
- **Dependency graph with staleness tracking** — Model-level DAG is the right granularity for now.
- **Chunk splitting strategy** — Thoughtful manual configuration for real bundle concerns.
- **Test infrastructure** — 116 test files with proper factories and i18n mocking.
- **Theme system with CSS variables** — Clean, maintainable, performant.

---

## Other Observations

### core/app Split

The stated goal is that `src/core/` is portable (no browser APIs, usable in Node.js). The CLI uses its own build pipeline. If the CLI is a real product, make `core/` a separate package. If not, don't pretend the boundary is clean. The current half-measure means maintaining the discipline without the benefit.

### Per-Step Caching

The current single-checkpoint approach (cache at `editingIndex - 1`) works but is fragile. A hash-based per-step cache would be cleaner and enable incremental computation. Not urgent until pipeline lengths or dataset sizes cross a threshold.
