# Weaverbird (ToucanToco) -- Architectural Comparison

**Status**: Research Reference (March 2026)
**Purpose**: Detailed comparison between Syto and the most architecturally similar open-source project

---

## What Weaverbird Is

[Weaverbird](https://github.com/ToucanToco/weaverbird) is an open-source visual query builder extracted from [ToucanToco](https://www.toucantoco.com/), a French commercial BI platform. It was created in 2019 and is actively maintained (pushed to as recently as March 2026, 2,200+ closed PRs, 3,094+ commits).

Weaverbird is to ToucanToco what `src/core/` + `src/app/components/` is to Syto -- the data transformation engine and its visual interface, extracted as a reusable open-source component. ToucanToco imports it as an npm package into their commercial product.

**Key stats** (as of March 2026):

- 108 GitHub stars, 16 forks
- BSD-3-Clause license
- npm: `weaverbird` v0.118.0
- PyPI: `weaverbird` v0.62.2
- Languages: TypeScript 46%, Python 35%, Vue 18%
- Still on Vue 2 (significant technical debt)

---

## Architecture Overview

### Monorepo Structure

```
weaverbird/
├── ui/          # TypeScript/Vue.js visual query builder (npm package)
├── server/      # Python backend: executors + translators (PyPI package)
└── docs/        # Jekyll documentation site
```

### How It Works

1. The Vue frontend presents form-based step editors (one per transform type)
2. User interactions produce a **pipeline** -- a JSON array of step objects
3. The pipeline JSON is sent to a `BackendService` (pluggable interface)
4. The Python server receives the JSON, validates it via Pydantic, and either:
   - **Executes** it (Pandas executor -- runs step-by-step, returns DataFrame)
   - **Translates** it (MongoDB aggregation pipeline or SQL via pypika)

**Critical architectural point**: The frontend cannot execute transforms. Every change requires a server round-trip.

---

## Pipeline Spec Format

### Structure

A pipeline is an array of steps. The first step is always `domain` (equivalent to SQL `FROM`):

```json
[
  { "name": "domain", "domain": "my_dataset" },
  { "name": "filter", "condition": { "column": "planet", "operator": "eq", "value": "Earth" } },
  {
    "name": "aggregate",
    "on": ["country"],
    "aggregations": [{ "columns": ["sales"], "newcolumns": ["total_sales"], "aggfunction": "sum" }]
  }
]
```

Each step uses a discriminated union pattern with `name` as the discriminator. Remaining fields are step-specific.

### Step Examples

**Filter:**

```json
{
  "name": "filter",
  "condition": { "column": "age", "operator": "gt", "value": 18 }
}
```

**Join:**

```json
{
  "name": "join",
  "rightPipeline": "otherPipelineReference",
  "type": "left",
  "on": [["leftCol1", "rightCol1"]]
}
```

**Pivot:**

```json
{
  "name": "pivot",
  "index": ["category"],
  "columnToPivot": "month",
  "valueColumn": "revenue",
  "aggFunction": "sum"
}
```

**Formula (calculated column):**

```json
{
  "name": "formula",
  "newColumn": "margin",
  "formula": "[Revenue] - [Cost]"
}
```

### Supported Steps (~50)

Categories and representative steps:

| Category        | Steps                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Column ops**  | `select`, `delete`, `rename`, `duplicate`, `convert`, `lowercase`, `uppercase`, `trim`, `substring`, `concatenate`, `split`, `replacetext` |
| **Row ops**     | `filter`, `sort`, `top`, `uniquegroups`, `append`                                                                                          |
| **Reshaping**   | `pivot`, `unpivot`, `aggregate`, `rollup`, `join`                                                                                          |
| **Calculation** | `formula`, `absolutevalue`, `cumsum`, `percentage`, `rank`, `movingaverage`, `evolution`                                                   |
| **Date ops**    | `dateextract`, `dategranularity`, `fromdate`, `todate`, `duration`, `addmissingdates`                                                      |
| **Logic**       | `ifthenelse`, `fillna`, `replace`                                                                                                          |
| **Statistics**  | `statistics`, `argmax`, `argmin`, `totals`                                                                                                 |
| **Advanced**    | `custom` (raw backend query), `customsql` (raw SQL), `waterfall`, `hierarchy`, `dissolve`                                                  |

### Comparison to Syto's Transform Format

| Aspect                  | Weaverbird                                                | Syto                                                             |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| **Discriminator**       | `name` field                                              | Transform-specific key (`filter`, `derive`, etc.)                |
| **Step count**          | ~52                                                       | 33                                                               |
| **Expressions**         | Basic arithmetic only (`[Col] + 1`)                       | Full expression language (jsep parser, functions, ternary, etc.) |
| **Filter conditions**   | Structured objects with AND/OR trees                      | Expression strings                                               |
| **Pipeline references** | Steps like `join` reference other pipelines by name       | Multi-model dependency graph                                     |
| **Validation**          | JSON Schema (ajv) at form level, Pydantic at server level | TypeScript types + schema engine                                 |

---

## Multi-Backend Architecture

This is Weaverbird's most important architectural contribution. Three backends share the same pipeline spec:

### 1. Pandas Executor

Located at `server/src/weaverbird/backends/pandas_executor/`. An **executor** -- it receives a pipeline and runs it step-by-step:

```python
def execute_pipeline(pipeline, domain_retriever):
    for step in pipeline.steps:
        df = steps_executors[step.name](step, df, domain_retriever=domain_retriever, ...)
    return df
```

`steps_executors` is a `dict[str, StepExecutor]` mapping step names to functions. Each function takes `(step_config, DataFrame) -> DataFrame`.

### 2. MongoDB Translator

Located at `server/src/weaverbird/backends/mongo_translator/`. A **translator** -- converts each step to MongoDB aggregation stages:

```python
def translate_pipeline(pipeline):
    mongo_pipeline = []
    for step in pipeline.steps:
        mongo_pipeline.extend(mongo_step_translator[step.name](step))
    return mongo_pipeline
```

Each function returns `list[dict]` (MongoDB aggregation stages).

### 3. SQL Translator (pypika)

Located at `server/src/weaverbird/backends/pypika_translator/`. The most sophisticated translator. Uses an abstract `SQLTranslator` class with per-step methods. Concrete subclasses for each dialect: **Snowflake, PostgreSQL, MySQL, Redshift, Athena, BigQuery**.

Each step builds CTEs (Common Table Expressions) that chain together. The pypika library generates SQL strings.

### The Pattern

```
Pipeline JSON  ->  Backend dispatch  ->  { step_name: implementation_fn }
                                              |
                                    Pandas: execute directly
                                    MongoDB: emit aggregation stages
                                    SQL: build CTE chains via pypika
```

To add a new backend: create a new dict/class mapping each step to the target representation. No changes to pipeline models or other backends.

### Adding a New Step

Their contributing guide documents that a new step requires touching ~10 files across two languages:

1. TypeScript step type definition
2. TypeScript default values
3. Vue form component
4. JSON Schema for validation
5. Frontend translator declaration (per backend)
6. Step labeller (human-readable description)
7. UI registration
8. Python Pydantic model
9. Python executor/translator implementation (per backend)
10. Tests

---

## Side-by-Side Comparison

### Fundamental Architecture

| Aspect                    | Weaverbird                        | Syto                       |
| ------------------------- | --------------------------------- | -------------------------- |
| **Execution location**    | Server-side (Python)              | Client-side (browser)      |
| **Infrastructure**        | Docker + Python + DB connectors   | Static hosting / no server |
| **Preview latency**       | Network round-trip per step       | Instant (in-memory)        |
| **Offline capable**       | No                                | Yes                        |
| **Dataset size**          | Large (server memory)             | Limited by browser memory  |
| **Backend flexibility**   | 3 backends (Pandas, MongoDB, SQL) | 1 backend (Arquero)        |
| **Deployment complexity** | High                              | Zero                       |

### Code Architecture

| Aspect                 | Weaverbird                                                  | Syto                                                                     |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Step definition**    | Defined TWICE (TypeScript + Python Pydantic)                | Defined ONCE (TypeScript)                                                |
| **Schema propagation** | None (re-executes to discover output schema)                | Static inference through pipeline                                        |
| **Expression engine**  | Basic arithmetic only (Python `ast` module, +, -, \*, /, %) | Full expression language (jsep + custom interpreter, functions, ternary) |
| **Validation**         | JSON Schema (ajv) for forms, Pydantic for server            | TypeScript types + AST validator + schema engine                         |
| **Security model**     | Python `ast` (relatively safe)                              | Strict AST whitelist (no eval, no Function())                            |
| **UI framework**       | Vue 2 (outdated)                                            | Preact (current)                                                         |
| **State management**   | Vuex store                                                  | Signals                                                                  |

### Spec Format Philosophy

| Aspect                    | Weaverbird                                          | Syto                                                 |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| **Step discriminator**    | `name` field                                        | Transform-specific key                               |
| **Filter representation** | Structured condition objects with operator enums    | Expression strings                                   |
| **Formula/derive**        | String with `[Column]` references, basic arithmetic | String with bare identifiers, full expression syntax |
| **Pipeline composition**  | Steps reference other pipelines by name             | Multi-model dependency graph                         |

### What Weaverbird Does Better

1. **Multi-backend support.** The translator/executor pattern is proven and elegant. Same pipeline, different execution targets. Syto has one backend.

2. **Step count.** ~52 steps vs Syto's 33. More transformation vocabulary out of the box, though many Weaverbird steps are subsumed by Syto's expression engine (see Feature Parity Map below).

3. **Pipeline references in joins.** Clean pattern for referencing other named pipelines.

4. **`@unsupported` decorator pattern.** Base translator marks all steps as unsupported by default. Concrete backends override only what they support. Makes it obvious which operations each backend handles.

5. **JSON Schema validation for step forms.** Runtime validation of step configuration, not just TypeScript compile-time checks.

### What Syto Does Better

1. **Client-side execution.** Zero infrastructure needed. Instant preview. Works offline. This is the fundamental advantage.

2. **Single source of truth.** Steps defined once in TypeScript. No dual-definition problem, no TypeScript/Python drift risk.

3. **Schema propagation.** Syto's `schema-engine.ts` infers output types through the entire pipeline without executing it. Weaverbird must execute to discover output schema. This enables better UI responsiveness and validation.

4. **Expression engine.** Syto's jsep-based system supports 71 functions across 9 categories, nested expressions, ternary operators, column name validation with suggestions. Weaverbird's formula system is basic arithmetic only.

5. **Ribbon quick actions bridge the discoverability gap.** Syto's ribbon provides one-click chips for common operations (Upper, Lower, Trim, Year, Month, Round, Abs, etc.) that generate `derive` steps without requiring expression knowledge. This gives Syto the best of both approaches: form-based discoverability for common operations AND expression power for advanced ones.

6. **Security model.** Strict AST whitelist with validation before execution. Weaverbird relies on Python's `ast` module, which is safer than `eval()` but less controlled.

7. **Modern stack.** Preact + Signals vs Vue 2 + Vuex. Lower maintenance burden, easier for contributors.

---

## Feature Parity Map

A step-by-step mapping of every Weaverbird step to its Syto equivalent (or lack thereof).

### Direct Equivalents

These steps exist in both systems with the same or near-identical semantics:

| Weaverbird Step | Syto Transform | Notes                                                                                                                          |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `select`        | `select`       | Identical                                                                                                                      |
| `delete`        | `remove`       | Same semantics, different name                                                                                                 |
| `rename`        | `rename`       | Identical                                                                                                                      |
| `sort`          | `sort`         | Identical                                                                                                                      |
| `filter`        | `filter`       | WB: structured condition objects with operator enums. Syto: expression strings                                                 |
| `aggregate`     | `aggregate`    | Same concept; Syto uses Arquero `op` functions                                                                                 |
| `pivot`         | `pivot`        | Minor parameter naming differences                                                                                             |
| `unpivot`       | `fold`         | Standard unpivot/melt equivalence                                                                                              |
| `split`         | `split`        | Syto version more flexible                                                                                                     |
| `join`          | `join`         | WB: left/inner only. Syto: inner/left/right/full/cross                                                                         |
| `append`        | `concat`       | Vertical concatenation                                                                                                         |
| `convert`       | `types`        | Type conversion                                                                                                                |
| `replace`       | `replace`      | Both support simple and regex modes                                                                                            |
| `ifthenelse`    | `conditional`  | WB: structured nested conditions. Syto: expression-based when/then                                                             |
| `formula`       | `derive`       | WB: arithmetic only. Syto: 71 expression functions (see below)                                                                 |
| `fillna`        | `impute`       | WB: constant value only. Syto: 8 strategies (constant, mean, median, min, max, forwardFill, backwardFill, linearInterpolation) |
| `uniquegroups`  | `dedupe`       | Remove duplicates on specified columns                                                                                         |

### Weaverbird Steps Absorbed by Syto's `derive`

This is the core philosophical difference. Weaverbird has ~15 dedicated steps for operations that Syto handles through one `derive` transform + expression functions:

| WB Step               | Syto Expression      | Example                                                     |
| --------------------- | -------------------- | ----------------------------------------------------------- |
| `lowercase`           | `lower()`            | `derive: { name: "lower([name])" }`                         |
| `uppercase`           | `upper()`            | `derive: { name: "upper([name])" }`                         |
| `trim`                | `trim()`             | `derive: { name: "trim([name])" }`                          |
| `substring`           | `substring()`        | `derive: { part: "substring([name], 0, 5)" }`               |
| `absolutevalue`       | `abs()`              | `derive: { val: "abs([value])" }`                           |
| `concatenate`         | `+` operator         | `derive: { full: "[first] + ' ' + [last]" }`                |
| `dateextract`         | date functions       | `derive: { yr: "year([date])" }`                            |
| `duration`            | `days_between()`     | `derive: { days: "days_between([start], [end])" }`          |
| `fromdate`            | `format_date()`      | `derive: { label: "format_date([date], 'YYYY-MM-DD')" }`    |
| `todate`              | `parse_date()`       | `derive: { d: "parse_date([text], 'YYYY-MM-DD')" }`         |
| `duplicate`           | identity expression  | `derive: { copy: "[original]" }`                            |
| `text` (add constant) | string literal       | `derive: { status: "'active'" }`                            |
| `replacetext`         | `regexp_replace()`   | `derive: { clean: "regexp_replace([text], 'foo', 'bar')" }` |
| `comparetext`         | comparison functions | `derive: { match: "equals_ci([a], [b])" }`                  |
| `simplify`            | `lower()` + `trim()` | `derive: { clean: "lower(trim([text]))" }`                  |

This means Syto has **fewer named transforms but more computational power per transform**. A Weaverbird pipeline that chains `lowercase` → `trim` → `substring` is a single Syto `derive` step.

### Weaverbird Steps Mapped to Syto's `window`

| WB Step         | Syto Window Function                    | Notes                                      |
| --------------- | --------------------------------------- | ------------------------------------------ |
| `rank`          | `window` with `rank()` / `dense_rank()` | Syto also supports `percent_rank`, `ntile` |
| `cumsum`        | `window` with cumulative sum            | Via window derive expression               |
| `movingaverage` | `window` with frame-based average       | Via window frame specification             |
| `percentage`    | `window` or `derive`                    | Calculate ratio against total              |

### Weaverbird-Only Steps (No Syto Equivalent)

| WB Step                  | Purpose                                              | Gap Significance                                                                     |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `custom`                 | Raw Python code execution                            | High -- escape hatch for anything. Syto intentionally excludes this (security model) |
| `customsql`              | Raw SQL execution                                    | High -- same rationale as `custom`                                                   |
| `addmissingdates`        | Fill gaps in time series with missing date rows      | Medium -- genuinely useful for time series analysis                                  |
| `evolution`              | Period-over-period change calculation                | Medium -- common analyst need (YoY, MoM)                                             |
| `rollup`                 | Hierarchical subtotals (aggregation with sub-levels) | Medium -- useful for reporting                                                       |
| `waterfall`              | Waterfall/bridge chart data preparation              | Medium -- visualization-specific data shaping                                        |
| `totals`                 | Insert total/subtotal rows into results              | Low -- achievable with concat + aggregate                                            |
| `hierarchy` / `dissolve` | Build/flatten hierarchical structures                | Low -- niche use case                                                                |
| `dategranularity`        | Change date grouping level (month → quarter)         | Low -- achievable with `date_trunc()` in derive                                      |
| `top`                    | Top N rows per group                                 | Low -- achievable with sort + sliceRows                                              |
| `statistics`             | Summary statistics (count, mean, stdev, etc.)        | Low -- achievable with aggregate                                                     |
| `argmax` / `argmin`      | Row containing max/min value                         | Low -- achievable with sort + sliceRows                                              |

### Syto-Only Transforms (No Weaverbird Equivalent)

| Syto Transform                    | Purpose                                                                                                                                               | WB Workaround                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `semijoin`                        | Keep rows with a match in another table                                                                                                               | Filter after join, then drop columns                                     |
| `antijoin`                        | Keep rows with NO match in another table                                                                                                              | Left join + filter for nulls                                             |
| `lookup`                          | VLOOKUP-style: join + project specific columns                                                                                                        | Join + select                                                            |
| `union`                           | Concatenate + deduplicate                                                                                                                             | `append` + `uniquegroups`                                                |
| `spread`                          | Unnest object/array columns into multiple columns                                                                                                     | Not possible                                                             |
| `unroll`                          | Explode array column (one row per element)                                                                                                            | Not possible                                                             |
| `selectPattern` / `removePattern` | Select/remove columns by regex pattern                                                                                                                | Manual `select`/`delete`                                                 |
| `renamePattern`                   | Bulk rename by pattern (prefix/suffix/regex)                                                                                                          | Manual `rename` per column                                               |
| `sample`                          | Random row sampling with optional seed                                                                                                                | Not possible                                                             |
| `promoteHeader`                   | Promote a data row to column headers                                                                                                                  | Not possible                                                             |
| `keepRows` / `removeRows`         | Keep/remove by row indices                                                                                                                            | Not possible                                                             |
| `window` (full)                   | 13 window functions (lag, lead, row_number, rank, dense_rank, percent_rank, cume_dist, ntile, first_value, last_value, nth_value, fill_down, fill_up) | Partially covered by `rank`, `cumsum`, `movingaverage` as separate steps |
| `impute` (advanced)               | 8 fill strategies including linear interpolation                                                                                                      | `fillna` supports constant only                                          |

---

## Expression Engine Comparison

The deepest architectural divergence between the two systems.

### Weaverbird Formula Capabilities

Weaverbird's `formula` step supports **only basic arithmetic**:

- **Operators**: `+`, `-`, `*`, `/`, `%`
- **Operands**: Column references `[column_name]` and numeric literals
- **Parser**: Python `ast` module on the server side
- **No functions of any kind** -- no string, date, math, or type functions

Valid Weaverbird formulas:

```
[Revenue] - [Cost]
[price] * 1.1
([quantity] * [unit_price]) / 100
```

Invalid in Weaverbird (no functions):

```
UPPER([name])       -- no string functions
YEAR([date])        -- no date functions
ABS([value])        -- no math functions
IF([x] > 0, 1, 0)  -- no conditionals in formula
```

This is why Weaverbird needs ~15 dedicated steps for text, date, and math operations that other systems handle through expressions.

### Syto Expression Capabilities

Syto's expression engine (jsep parser → AST whitelist validator → safe interpreter) supports **71 functions** across 9 categories:

| Category              | Count | Functions                                                                                                                                                                                                  |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regex**             | 3     | `regexp_match`, `regexp_extract`, `regexp_replace`                                                                                                                                                         |
| **Date extraction**   | 9     | `year`, `month`, `day`, `hour`, `minute`, `second`, `weekday`, `week`, `quarter`                                                                                                                           |
| **Date utilities**    | 2     | `today`, `now`                                                                                                                                                                                             |
| **Date arithmetic**   | 5     | `days_between`, `date_add`, `date_trunc`, `format_date`, `parse_date`                                                                                                                                      |
| **String**            | 7     | `upper`, `lower`, `titlecase`, `trim`, `substring`, `len`, `split`                                                                                                                                         |
| **String comparison** | 8     | `equals`, `contains`, `starts_with`, `ends_with` + `_ci` variants                                                                                                                                          |
| **Math**              | 26    | `abs`, `pow`, `sqrt`, `cbrt`, `exp`, `ln`, `log10`, `log2`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `radians`, `degrees`, `sign`, `trunc`, `pi`, `e`, `round`, `floor`, `ceil`, `min`, `max` |
| **Type / logic**      | 5     | `parse_int`, `parse_float`, `is_nan`, `if`, `coalesce`                                                                                                                                                     |
| **JSON**              | 6     | `is_json`, `json_extract`, `json_keys`, `json_array_length`, `json_type`, `json_stringify`                                                                                                                 |

Plus operators: arithmetic (`+`, `-`, `*`, `/`, `%`), comparison (`>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`), logical (`&&`, `||`, `!`, `??`, `and`, `or`, `not`), ternary (`? :`).

### Architectural Implications

| Aspect                  | Weaverbird (step-centric)                                                       | Syto (expression-centric)                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discoverability**     | Each operation is a named menu item. Non-programmers find `uppercase` in a list | Ribbon provides quick-action chips (Upper, Lower, Trim, Year, Round, etc.) that generate `derive` steps without requiring expression knowledge. Expression docs and autocomplete cover the rest |
| **Pipeline length**     | Tends to be longer. Chaining lowercase → trim → substring = 3 steps             | Tends to be shorter. Same chain = 1 derive step: `lower(trim(substring([col], 0, 5)))`                                                                                                          |
| **Composability**       | Limited. Can't combine operations within a single step                          | High. Arbitrary nesting: `if(contains_ci([name], 'test'), upper([name]), lower([name]))`                                                                                                        |
| **Backend portability** | Each step must be re-implemented per backend (Pandas, Mongo, SQL)               | Expression engine is part of the portable core. One implementation serves all backends                                                                                                          |
| **Learning curve**      | Easier for beginners (visual, menu-driven)                                      | Steeper initially, but more powerful once learned                                                                                                                                               |

---

## Step Definition Cost

Adding a new operation has very different costs in the two systems.

### Weaverbird: ~10 Files Across 2 Languages

Their contributing guide documents the full checklist for adding a step:

1. **TypeScript** step type definition (`ui/src/lib/steps.ts`)
2. **TypeScript** default values
3. **Vue** form component (UI editor)
4. **JSON Schema** for form validation (ajv)
5. **Frontend** translator declaration (per backend)
6. **Step labeller** (human-readable description)
7. **UI registration** (component registry)
8. **Python** Pydantic model (`server/src/weaverbird/pipeline/steps/`)
9. **Python** executor/translator implementation (per backend: Pandas, MongoDB, SQL × 6 dialects)
10. **Tests** in both languages

The dual-language requirement means every step definition exists in two places that must stay in sync. A step supported across all 3 backends needs **3 separate implementations** of the same logic.

### Syto: ~4 Files in 1 Language

1. **TypeScript** type in `src/core/transforms/types.ts` (add fields to `FullTransformStep`)
2. **TypeScript** handler in `src/core/transforms/handlers/` (implementation)
3. **TypeScript** schema derivation case in `src/core/schema-engine.ts` (type inference)
4. **Tests** in `src/core/*.test.ts`

Plus optionally: a describer in `src/core/transforms/describers/` and a dialog component in `src/app/components/`.

Since the core is portable JavaScript, a future Node.js CLI would share 100% of the transform implementations. No second implementation needed until a genuinely different backend (e.g., DuckDB SQL generation) is added.

### Adding an Expression Function (Syto Only)

For operations that fit the `derive` pattern, Syto can add capability without adding a new transform at all:

1. Add function spec to `ALLOWED_FUNCTIONS` in `src/core/ast-validator.ts`
2. Add implementation to the appropriate file in `src/core/functions/`
3. Add JSDoc for auto-generated documentation
4. Tests

This is how Syto added 71 functions without 71 transform types.

---

## Schema Propagation

A significant architectural difference with practical UX consequences.

### Weaverbird: No Schema Inference

Weaverbird has **no static schema propagation**. To discover the output columns and types after a step, the system must execute the pipeline up to that point. This means:

- Every step change requires a server round-trip to see the resulting schema
- Column autocomplete in form editors depends on prior execution results
- No way to validate downstream steps without running the full pipeline
- UI responsiveness is bounded by network + execution latency

### Syto: Static Schema Engine

Syto's `schema-engine.ts` (~900 lines) infers output column names and types through the entire pipeline **without executing the data transforms**. Each transform type has a corresponding schema derivation rule:

- `select` → keep only selected columns from current schema
- `derive` → add new columns, infer types from sample data (first 100-200 rows)
- `join` → merge schemas from both tables with conflict resolution
- `pivot` → infer pivoted column names from sample values
- `aggregate` → output columns from groupby keys + aggregation specs
- etc.

This enables:

- **Instant column autocomplete** in expression editors (no server call needed)
- **Type-aware validation** before execution (e.g., warning when applying math to strings)
- **Downstream impact preview** (show how a step change affects later steps)
- **UI responsiveness** independent of dataset size

---

## Frontend Framework Comparison

### Weaverbird: Vue 2.7 + Class Components

**Framework**: Vue 2.7.14 with `vue-class-component` and `vue-property-decorator`. Every component uses TypeScript class syntax with decorators (`@Component`, `@Prop`, `@Watch`). Zero Composition API or `<script setup>` usage. No Vue 3 migration in progress.

**Component architecture**: 100 `.vue` files totaling ~29,000 lines. Organized in a three-tier class hierarchy:

1. **BaseStepForm\<T\>** (abstract, 273 lines) -- validation via AJV JSON Schema, submission/cancellation, error handling
2. **89 concrete step forms** inheriting from BaseStepForm -- one per pipeline step type (median ~80 lines each, largest 363 lines)
3. **33 reusable widgets** -- input controls (InputText, Multiselect, List, Checkbox, DatePicker, etc.)

**State management**: No Vuex store. Pure props-based architecture with event bubbling (`$emit('formSaved', ...)`). State lives in the top-level parent component and threads through the tree via prop drilling.

**Validation**: AJV (JSON Schema) at the form level. Each step form loads a JSON Schema that validates the step configuration at runtime. This provides runtime safety beyond TypeScript's compile-time checks.

**CSS**: SCSS with `<style lang="scss" scoped>` blocks. Some components also have unscoped global styles for deeply nested selectors. No CSS Modules.

**Build**: Vite with `@vitejs/plugin-vue2`. Outputs UMD + ES Module dual package. Vue is externalized as a peer dependency.

**Key technical debt**: The class-based component pattern is abandoned by Vue's ecosystem. `vue-class-component` and `vue-property-decorator` have no Vue 3 equivalents. Migrating 100 class-based components would require converting every one to either Options API or `<script setup>` + Composition API. The deep inheritance hierarchy (BaseStepForm → concrete forms) would need to become composable functions.

### Syto: Preact 10 + Signals

**Framework**: Preact 10.28 with `@preact/signals` 2.5. Functional components with hooks and signals. No class components.

**Component architecture**: 79 `.tsx` files totaling ~13,000 lines (source only, excluding tests). Flat structure with no inheritance hierarchy:

- **Dialog components** (one per transform) -- functional, typically 100-400 lines
- **Core UI components** -- DataTable, Sidebar, RibbonToolbar, AppHeader
- **Shared components** -- ExpressionEditor (CodeMirror), ColumnSelector, previews

**State management**: `@preact/signals` for reactive state. Centralized in `AppStore` (global signals) and `DialogStore` (per-dialog signals). No prop drilling for global state -- signals are imported directly. Business logic lives in handler modules and service classes, not in components.

**Validation**: TypeScript types at compile time + AST validator for expressions at runtime + schema engine for type propagation. No JSON Schema / AJV at the form level.

**CSS**: CSS Modules (`.module.css` files, 22 total). Scoped by default, class names auto-mangled at build time. No global style leakage concerns.

**Build**: Vite with `@preact/preset-vite`. Single-target browser build. Preact is bundled (3KB gzipped).

### Side-by-Side

| Aspect                | Weaverbird                                    | Syto                               |
| --------------------- | --------------------------------------------- | ---------------------------------- |
| **Framework**         | Vue 2.7                                       | Preact 10                          |
| **Component style**   | Class-based (decorators)                      | Functional (hooks + signals)       |
| **Component count**   | 100 `.vue` files                              | 79 `.tsx` files                    |
| **Component source**  | ~29,000 lines                                 | ~13,000 lines                      |
| **Largest component** | 363 lines (StatisticsStepForm)                | 785 lines (RibbonToolbar)          |
| **State management**  | Props + events (no store)                     | Signals (centralized stores)       |
| **Inheritance**       | Deep (BaseStepForm\<T\> → 89 subclasses)      | None (flat, functional)            |
| **Form validation**   | AJV JSON Schema (runtime)                     | TypeScript types (compile-time)    |
| **CSS approach**      | SCSS scoped styles                            | CSS Modules                        |
| **Framework size**    | Vue 2 externalized (~33KB gzipped)            | Preact bundled (~3KB gzipped)      |
| **Ecosystem health**  | Vue 2 EOL, class components abandoned         | Preact stable, minimal API surface |
| **Migration path**    | Blocked (100 class components, no Vue 3 plan) | N/A (current, no migration needed) |

### Key Takeaways

**Weaverbird's class inheritance is both its strength and its trap.** The `BaseStepForm<T>` pattern gives excellent code reuse -- 89 step forms share validation, error handling, and submission logic with minimal boilerplate. But class-based Vue components are a dead end: `vue-class-component` is unmaintained, Vue 3 dropped class component support, and converting 100 components to Composition API would be a massive rewrite. This is a cautionary tale about coupling to framework-specific abstractions.

**Syto's flat functional approach trades inheritance for composition.** Instead of a base class, shared behavior lives in hooks (`useFocusTrap`), services (`StepService`, `ValidationEngine`), and the dialog registry pattern. This is more verbose for individual components but eliminates the framework migration risk entirely. Preact's React-compatible API means the component code would work in React with near-zero changes.

**The signals vs props difference has real UX consequences.** Weaverbird's prop drilling means the parent must re-render the entire form tree on any state change. Syto's signals provide fine-grained reactivity -- only the component reading a specific signal re-renders when it changes. This contributes to Syto's instant-feel UI responsiveness.

**Component code volume is revealing.** Syto does more with less code: 79 components in 13K lines vs Weaverbird's 100 components in 29K lines. Part of this is the expression engine absorbing what would otherwise be dedicated form components. Part is the functional style eliminating decorator boilerplate. Part is CSS Modules vs inline SCSS blocks.

---

## Lessons for Syto's CLI

### What Weaverbird Validates

1. **The spec-as-contract pattern works.** Multiple backends can consume the same pipeline JSON. This is proven at production scale (ToucanToco's commercial product).

2. **Name-keyed dispatch is the right pattern.** Both sides use `{ stepName: implementationFn }` dictionaries. Clean, extensible, easy to reason about. Syto already does this.

3. **The frontend and backend can be independently versioned.** Weaverbird publishes separate npm and PyPI packages from the same monorepo.

### What Weaverbird Warns Against

1. **Open-source as company byproduct = low adoption.** 2,200+ PRs but 108 stars in 7 years. If the tool only serves one company's needs, the community won't form. A Syto CLI should have standalone value.

2. **Dual-language tax is real.** Every step defined in TypeScript AND Python = maintenance burden, drift risk, boilerplate. Syto's advantage is that a Node.js CLI shares 100% of the browser engine code.

3. **Server requirement kills casual adoption.** Weaverbird's frontend literally cannot function without a running Python server. Users can't just try it. Syto's browser-first approach and a lightweight CLI avoid this entirely.

4. **Vue 2 in 2026.** Framework lock-in is dangerous. Syto's choice of Preact (stable, minimal API surface) is vindicated.

### Architectural Ideas Worth Borrowing

1. **Pluggable executor/translator interface.** Even if Syto ships only one backend (Arquero) initially, designing the CLI with a clean executor interface enables a future DuckDB or Polars backend without refactoring.

2. **Step labels/describers as a formal pattern.** Weaverbird has a `StepLabeller` that generates descriptions like `'Duplicate "foo" in "bar"'`. Syto has `describeTransform()` but could formalize this further.

3. **Backend capability declarations.** The pattern of declaring which steps each backend supports (rather than failing at runtime) is worth adopting if/when Syto supports multiple backends.

4. **Runtime validation of loaded workflows.** Weaverbird validates every step config at runtime via AJV JSON Schema before execution. Syto's `transform-linter.ts` already validates in the JSON editor path (structure, unknown keys, expression syntax), but workflows loaded from IndexedDB or URL hash are trusted as-is. Adding a lightweight validation pass on load would catch corrupted or forward-incompatible workflow files before they silently produce wrong results or crash. This is a small effort with meaningful robustness gains.

---

## The Multi-Backend Future

Weaverbird's most important lesson is that the **pipeline spec can outlive any single executor**. Their pipeline JSON runs against Pandas, MongoDB, and 6 SQL dialects today.

Syto's equivalent roadmap:

```
workflow.json  -->  Arquero executor (browser + Node.js CLI)     [current]
               -->  DuckDB translator (large datasets, SQL)      [potential]
               -->  Polars/Arrow translator (performance)        [potential]
```

This aligns with SOUL.md's stated vision: "The transformation JSON format should become stable enough to be a portable specification that could be executed by different backends (browser/Arquero today, potentially DuckDB/CLI in the future)."

The difference from Weaverbird: Syto wouldn't need the dual-language overhead. Since `src/core/` is portable JavaScript, the CLI shares the exact same transform implementations as the browser. A DuckDB backend would be the first time a second implementation is needed.

---

## References

- [Weaverbird GitHub](https://github.com/ToucanToco/weaverbird) -- Source code and documentation
- [Weaverbird Docs -- General Principles](https://weaverbird.toucantoco.dev/docs/general-principles/)
- [Weaverbird Docs -- About](https://weaverbird.toucantoco.dev/about.html)
- [ToucanToco Blog -- Why We Created WeaverBird](https://www.toucantoco.com/en/blog/why-we-decided-to-create-weaverbird-an-open-source-visual-query-builder)
- [Weaverbird Steps Documentation](https://github.com/ToucanToco/weaverbird/blob/master/docs/_docs/tech/steps.md)
- [Weaverbird Translators Documentation](https://github.com/ToucanToco/weaverbird/blob/master/docs/_docs/tech/translators.md)
- [Weaverbird Contributing: New Step Guide](https://github.com/ToucanToco/weaverbird/blob/master/docs/_docs/contributing/new-step.md)
- [PARSER-DESIGN-DECISION.md](../archive/PARSER-DESIGN-DECISION.md) -- Syto's original expression engine research

---

**End of Document**
