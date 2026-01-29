# Syto — What This Project Is About

## The Problem

There's a gap in data tools. On one side, you have spreadsheets — familiar but painful for anything beyond basic filtering. On the other, you have Python/pandas/R — powerful but requiring coding skills. In between sit tools like OpenRefine and KNIME — capable but intimidating, with steep learning curves and complex interfaces.

Power Query in Excel hits a sweet spot: visual pipeline building, no code required, good enough for real work. But it's locked inside Microsoft's ecosystem.

Syto fills this gap: **a browser-based data wrangling tool that's as capable as Power Query but runs anywhere, stores nothing on servers, and doesn't require installation.**

## Core Values

### 1. Security by Architecture

User expressions are never executed as JavaScript. The project uses a custom parser (jsep) that converts expressions to an AST, validates them against a whitelist, and interprets them safely. No `eval()`, no `Function()` constructor, ever.

This isn't paranoia — it's the foundation. A tool that students use to clean assignment data, or analysts use with sensitive business data, cannot have injection vulnerabilities. The security model is baked into the architecture, not bolted on.

### 2. Local-Only by Default

Everything runs in the browser. Data never leaves the machine. No accounts, no uploads, no tracking. This makes the tool usable in contexts where cloud-based alternatives aren't allowed (educational institutions, corporate environments with data policies).

The trade-off is clear: we give up server-side processing power in exchange for privacy guarantees that don't require trust.

### 3. Visual Pipeline, JSON Underneath

Transformations are built through a GUI — click buttons, fill forms, see results. But underneath, everything is a declarative JSON specification. Users can view and edit this JSON directly (the "Danger Zone"), but they don't have to.

This means workflows are:

- **Reproducible**: Save the JSON, replay it on new data
- **Shareable**: Send someone your workflow spec, they can apply it
- **Inspectable**: Advanced users can see exactly what's happening
- **Debuggable**: When something goes wrong, the spec shows what was attempted

### 4. Beginner-Friendly, Not Beginner-Limited

The UI prioritizes accessibility — toolbar buttons instead of syntax, visual column selection instead of typing names, immediate preview of changes. But it doesn't cap out early.

Users who need more can write expressions (`revenue - cost > 1000`), use regex extraction, build multi-model joins. The tool grows with the user rather than forcing them to graduate to something else.

### 5. Do One Thing Well

Syto handles tabular data transformation: import, clean, reshape, export. It's not trying to become a spreadsheet, a statistical package, a visualization tool, or a database. The EDA features (histograms, boxplots, statistics) exist to help users understand their data before transforming it — not to replace dedicated analysis tools.

### 6. Non-Destructive by Design

Every transformation is a step in a pipeline, not a destructive change to the underlying data. The original raw data (the "Source") is always preserved exactly as it was imported.

This provides:

- **Traceability**: Users can see exactly how they got from raw data to the final result.
- **Experimental Freedom**: Users can add, remove, or modify steps without fear of corrupting their data.
- **Technical Rollback**: You can always revert to any previous state by simply moving back in the pipeline or deleting steps.
- **Reproducibility**: The pipeline is a recipe that can be applied to new versions of the same raw data.

### 7. Respect for User Agency (The "Adult in the Room")

Syto assumes the user is an intelligent human being capable of making their own decisions. We do not believe in paternalistic software that hides power or prevents potentially breaking actions if the user chooses to take them.

While we prioritize safety and non-destructiveness by default, we enter into a specific agreement with the user regarding high-stakes operations (like editing raw JSON or replacing a dataset):

- **No Over-Guardrailing**: We do not block the user from making changes that might be irreversible or break the pipeline's logic.
- **Informed Consent**: The app provides a fair and visible warning about the danger of an operation. It does not and cannot perform a comprehensive check for all possible things that can go wrong—but it expects the user to assess the risks once notified.
- **User Responsibility**: Once warned, the expectation is that the user is capable of assessing the risks and making an informed decision for themselves.
- **Pragmatic Compatibility**: We strive for backwards compatibility in the engine, but we prioritize giving the user full control over protecting them from themselves in "Danger Zone" scenarios.

## What We're Not

- **Not a spreadsheet replacement**: No cell-by-cell editing, no formulas that reference A1:B5
- **Not a coding environment**: No scripting, no custom functions (yet), no plugin system
- **Not a big data tool**: Browser-based means memory limits; we optimize for datasets that fit in RAM
- **Not a BI/visualization platform**: Charts are for exploration during wrangling, not final output

## The Name

"Syto" refers to Ukrainian word for "Sieve" - to reflect the tool's purpose of "sieving" data, while maintaining the connection to Ukrainian heritage.

**Historical Note**: The project was originally named "Chumak" (Чумак), which also refers to these Ukrainian salt traders. The name was changed to "Syto" (Сито, meaning "sieve")

## Technical Philosophy

### Leverage Existing Libraries

Arquero handles data operations. jsep handles expression parsing. Vega-Lite handles charts. Preact handles UI. The project wraps these with thin integration layers rather than reimplementing functionality.

The custom code focuses on what's unique to Syto: the expression validation/interpretation pipeline, the workflow specification format, the UI that ties it together.

### Test the Core, Trust the UI

High test coverage on the transformation engine, expression parser, and schema system. Lower coverage on UI components. The rationale: if `filter` breaks, users lose data; if a button has the wrong hover state, users are annoyed but their work is intact.

### Progressive Complexity

Simple operations (filter, sort, remove columns) should be one or two clicks. Complex operations (regex extraction, multi-table joins) can require more setup. The UI doesn't force beginners through advanced configuration, and it doesn't prevent power users from accessing full functionality.

## Current State

The core is solid: 20+ transformation types, expression parsing with security validation, type inference and propagation, EDA with charts, and a multi-model dependency graph for combining datasets. The project is usable for real data cleaning tasks.

What's still evolving:

- Performance limits with larger datasets
- More complex window functions and advanced statistical operations

## Where It's Going

The immediate focus is filling gaps in the existing architecture — functions in expressions, more operators, better error messages. The transformation JSON format should become stable enough to be a portable specification that could be executed by different backends (browser/Arquero today, potentially DuckDB/CLI in the future).

The goal isn't to build the most powerful data tool. It's to build the most accessible one that's still genuinely useful for real work.
