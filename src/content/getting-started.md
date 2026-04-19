# Getting Started

Syto is a browser-based tool for cleaning and transforming tabular data. Everything runs locally — your data never leaves your machine.

## Try it without data

Don't have a file handy? From the empty state, pick one of the bundled **sample datasets** (iris, cars, superstore, weather, airports, unemployment, S&P 500, stocks, barley, Anscombe's quartet). A good way to explore what Syto can do before bringing your own data.

## Core concepts

### Sources

A **Source** is raw data as it was imported. Each source is stored in your browser (IndexedDB) — nothing is sent to a server. You can create a source by:

- Dragging a CSV, JSON, or Excel file onto the app
- Pasting tabular data from a spreadsheet (`Ctrl/Cmd+V`)
- Entering a URL (e.g. a hosted CSV)
- Generating synthetic data (integer/date sequences, random numbers, categories)
- Picking a bundled sample dataset

You can refresh a source's data later without losing its downstream transforms — Syto keeps a one-level backup in case the new data turns out wrong.

### Models

A **Model** is a transformed version of a source. Adding steps to a source creates a model; models update automatically when inputs change.

From one source you can build many models, and a model can feed another model as its input (pipeline chaining). When an upstream source or model changes, downstream models are marked stale and re-run on demand.

### Steps

A **Step** is one transformation in the pipeline, applied top to bottom. Click a step to edit it; changes propagate downstream.

Transforms are grouped into three ribbon tabs:

- **Rows** — filter, sort, deduplicate, slice, sample, promote row to headers
- **Columns** — edit columns (select/rename/remove/reorder, pattern operations), split, merge, derive, conditional, match/extract (regex), index, transform values (text/date/number/convert shortcuts, replace, impute), types
- **Table** — group by, window (lag, rank, running total, moving average), describe, pivot / unpivot, spread / unroll, join, append

## A typical workflow

1. **Import** — drop a file, paste from the clipboard, or pick a sample dataset.
2. **Explore** — toggle the **EDA panel** (chart icon) for column distributions, summary stats, and bivariate chart suggestions. Click missing or error counts to filter them directly. Thin bars on column headers show error and missing percentages at a glance.
3. **Transform** — click a transform from the ribbon, or click a column header or cell to trigger one in context.
4. **Iterate** — undo (`Ctrl/Cmd+Z`), reorder, edit, or delete steps. Pipeline step caching replays only from the step you changed.
5. **Export** — download cleaned data as CSV or JSON, or save the entire workflow as a replayable JSON file (`Ctrl/Cmd+S`).

## Tips

- **Click a column header** to sort, filter, rename, change type, or duplicate a column.
- **Click a cell** to quickly filter by or replace its value — works on error and null cells too.
- **Shift+click column headers** to multi-select, then run a transform on the selection.
- Filter, Derive, and Conditional dialogs use a **CodeMirror expression editor** with autocomplete, syntax highlighting, and "did you mean" typo suggestions for column and function names.
- Arrow keys move between steps when no dialog is open.
- Full keyboard shortcut list: [Shortcuts](/docs/shortcuts/).

## Going further

- **Save a workflow** — `Ctrl/Cmd+S` exports the pipeline as JSON. Re-import it later, share it, or version it alongside your data.
- **Run headlessly** — the same JSON can be executed from the CLI: `syto run workflow.json --input data.csv`. Useful for scheduled jobs or regression-proofing a pipeline.
- **Expression reference** — functions for text, math, dates, regex, JSON, aggregation, and more are in the sidebar. `ExpressionDocs` also shows the same info contextually inside Filter / Derive / Conditional dialogs as you type.
- **Experimental SQL engine** — optional DuckDB-WASM engine available in Settings for EDA stats and transforms. Falls back to the JS engine automatically on failure.
