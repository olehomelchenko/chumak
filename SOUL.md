# Syto — What This Project Is About

## The Problem

There's a gap in data tools. On one side, you have spreadsheets — familiar but painful for anything beyond basic filtering. On the other, you have Python/pandas/R — powerful but requiring coding skills. In between sit tools like OpenRefine and KNIME — capable but intimidating, with steep learning curves and complex interfaces.

Power Query in Excel hits a sweet spot: visual pipeline building, no code required, good enough for real work. But it's locked inside Microsoft's ecosystem.

Syto fills this gap: **a browser-based data wrangling tool that's as capable as Power Query but runs anywhere, stores nothing on servers, and doesn't require installation.**

## The Core Idea

Syto's central artifact is the **workflow specification** — a declarative JSON document that describes a data transformation pipeline. Everything else is an interface to it.

The visual builder produces this spec. The CLI executes it. An LLM agent can generate it. A human can inspect it in the browser and understand exactly what happened. This transparency — the fact that the spec is data, not code — is what makes Syto different from writing a Python script or an SQL query.

Python scripts and SQL queries are opaque to non-programmers. A Syto workflow is an inspectable, visual, replayable artifact that anyone can open and understand. The spec bridges the gap between visual interaction and headless execution:

- **Build visually** in the browser (for humans who don't code)
- **Run headlessly** via CLI (for automation, CI, cron jobs)
- **Generate programmatically** (for LLM agents that produce inspectable artifacts instead of opaque scripts)
- **Inspect and modify** by reopening in the browser (always)

The workflow JSON is portable, diffable, and versionable. It is not tied to any single execution engine — the same spec can be executed by different backends (Arquero in the browser today, potentially DuckDB for large datasets in the future).

## Core Values

### 1. Security by Architecture

User expressions are never executed as JavaScript. The project uses a custom parser (jsep) that converts expressions to an AST, validates them against a whitelist, and interprets them safely. No `eval()`, no `Function()` constructor, ever.

This isn't paranoia — it's the foundation. A tool that students use to clean assignment data, or analysts use with sensitive business data, cannot have injection vulnerabilities. The security model is baked into the architecture, not bolted on.

### 2. Local-Only by Default

Everything runs in the browser. Data never leaves the machine. No accounts, no uploads, no tracking. This makes the tool usable in contexts where cloud-based alternatives aren't allowed (educational institutions, corporate environments with data policies).

The trade-off is clear: we give up server-side processing power in exchange for privacy guarantees that don't require trust.

### 3. Beginner-Friendly, Not Beginner-Limited

The UI prioritizes accessibility — toolbar buttons instead of syntax, visual column selection instead of typing names, immediate preview of changes. But it doesn't cap out early.

Users who need more can write expressions (`revenue - cost > 1000`), use regex extraction, build multi-model joins. The tool grows with the user rather than forcing them to graduate to something else.

### 4. Do One Thing Well

Syto handles tabular data transformation: import, clean, reshape, export. It's not trying to become a spreadsheet, a statistical package, a visualization tool, or a database. The EDA features (histograms, boxplots, statistics) exist to help users understand their data before transforming it — not to replace dedicated analysis tools.

### 5. Non-Destructive by Design

Every transformation is a step in a pipeline, not a destructive change to the underlying data. The original raw data (the "Source") is always preserved exactly as it was imported.

This provides:

- **Traceability**: Users can see exactly how they got from raw data to the final result.
- **Experimental Freedom**: Users can add, remove, or modify steps without fear of corrupting their data.
- **Technical Rollback**: You can always revert to any previous state by simply moving back in the pipeline or deleting steps.
- **Reproducibility**: The pipeline is a recipe that can be applied to new versions of the same raw data.

### 6. Respect for User Agency (The "Adult in the Room")

Syto assumes the user is an intelligent human being capable of making their own decisions. We do not believe in paternalistic software that hides power or prevents potentially breaking actions if the user chooses to take them.

While we prioritize safety and non-destructiveness by default, we enter into a specific agreement with the user regarding high-stakes operations (like editing raw JSON or replacing a dataset):

- **No Over-Guardrailing**: We do not block the user from making changes that might be irreversible or break the pipeline's logic.
- **Informed Consent**: The app provides a fair and visible warning about the danger of an operation. It does not and cannot perform a comprehensive check for all possible things that can go wrong—but it expects the user to assess the risks once notified.
- **User Responsibility**: Once warned, the expectation is that the user is capable of assessing the risks and making an informed decision for themselves.
- **Pragmatic Compatibility**: We strive for backwards compatibility in the engine, but we prioritize giving the user full control over protecting them from themselves in "Danger Zone" scenarios.

## What We're Not

- **Not a spreadsheet replacement**: No cell-by-cell editing, no formulas that reference A1:B5
- **Not a coding environment**: No scripting, no plugin system. The built-in expression functions are a deliberate ceiling, not a starting point for extensibility. The spec is data, not code — that's the point.
- **Not a big data tool**: The browser engine optimizes for datasets that fit in RAM. A DuckDB-backed engine may lift this ceiling in the future, but Syto is not trying to replace production data pipelines.
- **Not a BI/visualization platform**: Charts are for exploration during wrangling, not final output. Dashboards and reporting are a separate concern.

## Open-Core Model

The core transformation engine, the workflow specification format, and the browser-based visual builder are open-source. This is the growth engine — what people discover, try, and recommend.

Paid features layer on top without compromising the core:

- **Performance**: DuckDB-backed execution for larger datasets
- **Advanced transforms**: Specialized operations beyond the core set
- **Cloud storage**: Shared workflow gallery for teams

The free tier must remain genuinely useful on its own. It is not a demo of the paid product — it is the product. Paid features serve power users who have already found value.

## The Name

"Syto" refers to Ukrainian word for "Sieve" (Сито) — reflecting the tool's purpose of "sieving" data, while maintaining the connection to Ukrainian heritage.

**Historical Note**: The project was originally named "Chumak" (Чумак), referring to Ukrainian salt traders. The name was changed to "Syto" to better reflect what the tool does.

## Technical Philosophy

### The Spec is the Product

The workflow JSON specification is more important than any single execution engine. Engines can be swapped or added (Arquero today, DuckDB tomorrow). The spec must remain stable, portable, and human-readable. Design decisions should prioritize the spec's longevity over implementation convenience.

### Leverage Existing Libraries

Arquero handles data operations. jsep handles expression parsing. Vega-Lite handles charts. Preact handles UI. The project wraps these with thin integration layers rather than reimplementing functionality.

The custom code focuses on what's unique to Syto: the expression validation/interpretation pipeline, the workflow specification format, the UI that ties it together.

### No Parallel Systems

Each fact lives in one place. When the same information needs to appear in multiple surfaces — a transform's label in the ribbon tooltip and in the docs, a function's signature in autocomplete and in reference pages, a workflow's schema in validation and in type definitions — one is the source of truth and the others are derived from it.

This rules out a category of bugs (drift between a source and its copies) and rules out a category of work (updating the same thing in multiple places). It applies equally to code, content, and config: if you find yourself writing the same string or the same logic twice, one of them should be generated or imported from the other. When no clean derivation exists, prefer a single manual surface with others linking to it, not two manual surfaces kept in sync by discipline.

### Test the Core, Trust the UI

High test coverage on the transformation engine, expression parser, and schema system. Lower coverage on UI components. The rationale: if `filter` breaks, users lose data; if a button has the wrong hover state, users are annoyed but their work is intact.

### Progressive Complexity

Simple operations (filter, sort, remove columns) should be one or two clicks. Complex operations (regex extraction, multi-table joins) can require more setup. The UI doesn't force beginners through advanced configuration, and it doesn't prevent power users from accessing full functionality.

## Where It's Going

The workflow specification is becoming a portable standard with multiple execution paths:

- **Browser engine** (Arquero): The free, zero-install experience. Instant feedback, works offline, handles datasets that fit in browser memory.
- **CLI** (Node.js/Arquero): Run workflows headlessly for automation. Same engine, different entry point. Enables the "build visually, run in CI" loop and LLM agent workflows.
- **DuckDB engine** (WASM or native): Lifts the dataset size ceiling. Same workflow spec, different executor optimized for performance.

The core engine (`src/core/`) is architecturally portable — no browser APIs, no UI framework dependencies. This is by design, not accident. Adding a new execution backend means implementing the same transform interface against a different engine, not rewriting the product.

The goal isn't to build the most powerful data tool. It's to build the most accessible one that's still genuinely useful for real work — and to make the workflows it produces portable enough to run anywhere.
