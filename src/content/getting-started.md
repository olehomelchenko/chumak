# Getting Started

Welcome to Syto — a browser-based tool for cleaning and transforming tabular data.

## Core Concepts

### Sources

A **Source** is your raw data. You can import data by:

- Dragging and dropping a CSV file
- Pasting data from a spreadsheet (Ctrl+V)
- Importing from a URL
- Generating synthetic data

Each source is stored in your browser — nothing is sent to a server.

### Models

A **Model** is a transformed version of a source. When you add transform steps to a source, you create a model. Models update automatically when you add, edit, or remove steps.

You can create multiple models from the same source, each with its own pipeline.

### Steps

A **Step** is a single transformation in your pipeline. Steps are applied in order, top to bottom. Each step takes the output of the previous step as input.

Examples of steps: Filter rows, Derive a new column, Sort, Aggregate, Join with another dataset.

## Quick Workflow

1. **Import** — Drag a CSV file onto the app, or use the Upload/Paste/URL buttons
2. **Transform** — Click a transform from the ribbon toolbar (Prepare, Calculate, or Combine tabs)
3. **Preview** — Each step shows an instant preview of its effect on your data
4. **Iterate** — Add more steps, reorder, or edit existing ones by clicking on them
5. **Export** — Download your cleaned data as CSV or JSON

## Tips

- **Click a column header** to sort, filter, rename, or change type
- **Click a cell value** to quickly filter or replace
- **Use the EDA panel** (toggle with the chart icon) to see distributions and statistics
- **Arrow keys** navigate between steps when no dialog is open
- **Ctrl+S** downloads your workflow for later use
