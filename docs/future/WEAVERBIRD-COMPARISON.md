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
| **Step count**          | ~50                                                       | ~20                                                              |
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

2. **Step count.** ~50 steps vs Syto's ~20. More transformation vocabulary out of the box.

3. **Pipeline references in joins.** Clean pattern for referencing other named pipelines.

4. **`@unsupported` decorator pattern.** Base translator marks all steps as unsupported by default. Concrete backends override only what they support. Makes it obvious which operations each backend handles.

5. **JSON Schema validation for step forms.** Runtime validation of step configuration, not just TypeScript compile-time checks.

### What Syto Does Better

1. **Client-side execution.** Zero infrastructure needed. Instant preview. Works offline. This is the fundamental advantage.

2. **Single source of truth.** Steps defined once in TypeScript. No dual-definition problem, no TypeScript/Python drift risk.

3. **Schema propagation.** Syto's `schema-engine.ts` infers output types through the entire pipeline without executing it. Weaverbird must execute to discover output schema. This enables better UI responsiveness and validation.

4. **Expression engine.** Syto's jsep-based system supports functions, nested expressions, ternary operators, column name validation with suggestions. Weaverbird's formula system is basic arithmetic only.

5. **Security model.** Strict AST whitelist with validation before execution. Weaverbird relies on Python's `ast` module, which is safer than `eval()` but less controlled.

6. **Modern stack.** Preact + Signals vs Vue 2 + Vuex. Lower maintenance burden, easier for contributors.

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
