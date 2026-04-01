# Recommendations: What to Borrow from Voyager

Voyager (github.com/vega/voyager) is an interactive visualization tool built on CompassQL, a recommendation engine that enumerates and ranks visualization options using a wildcard/constraint system. While Syto is a data wrangling tool (not a visualization builder), several of Voyager's architectural patterns translate well to Syto's EDA panel and could inform future features.

---

## 1. Type-Aware EDA Chart Selection

**What Voyager does**: Instead of hardcoding "numeric → histogram, categorical → bar chart", Voyager's `histograms` QueryCreator builds a wildcard query per column: field + `count(*)` with wildcard mark, bin, and timeUnit. CompassQL evaluates all valid chart types and picks the most effective one for each column's data characteristics.

**What Syto should do**: Replace the fixed chart-type mapping in `src/core/charts.ts` with a type-aware selector that considers data characteristics beyond just the column type.

**Current behavior** (charts.ts):

- numeric → box plot + histogram
- date/datetime → temporal chart
- categorical → top-values bar chart

**Improved behavior**:
| Column type | Data characteristics | Best chart |
|-------------|---------------------|------------|
| integer, few unique values (< 10) | Looks categorical | Bar chart (not histogram) |
| integer/float, normal-ish distribution | Standard numeric | Histogram + box plot |
| integer/float, heavy skew | Long tail | Histogram with log-scale x |
| date, sparse | Few distinct dates | Bar chart by date |
| date, dense | Continuous time series | Line chart (count over time) |
| string, high cardinality (> 50 unique) | Too many bars | Top-N bar + "N others" |
| string, low cardinality (< 5) | Few categories | Horizontal bar (better label space) |
| boolean | Binary | Stacked proportion bar |

**Implementation**: Add a `selectChartType(columnType, stats)` function that takes the existing EDA stats (unique count, min, max, distribution shape) and returns the best chart config. This is Voyager's ranking logic distilled to a lookup table.

**Effort**: Low. EDA stats are already computed. This is a decision function over existing data.

**Voyager reference**: `src/queries/histograms.ts`

---

## 2. Cross-Column Bivariate Suggestions in EDA

**What Voyager does**: The `addQuantitativeField`, `addCategoricalField`, and `addTemporalField` QueryCreators take a univariate spec and suggest a second field to encode. The result: "you're looking at revenue → here's revenue by region, revenue over time, revenue vs. cost."

**What Syto should do**: After the user clicks on a column's EDA chart, suggest bivariate charts that pair it with other columns. This turns the EDA panel from a column-by-column inspection tool into a relationship discovery tool.

**Suggested pairings**:
| Selected column type | Partner column type | Chart |
|---------------------|-------------------|-------|
| Numeric | Categorical | Grouped box plot or bar (mean) |
| Numeric | Numeric | Scatter plot |
| Numeric | Temporal | Line chart (value over time) |
| Categorical | Categorical | Heatmap (count) |
| Temporal | Categorical | Stacked area or grouped line |

**Implementation sketch**:

- When a column is selected in EDA, scan other columns by type
- Generate 3-5 bivariate specs using the pairing rules above
- Display as a "Related charts" row below the univariate chart
- Use sampling (already in place -- up to 1000 rows) for performance

**Effort**: Medium. Requires new Vega-Lite spec templates for bivariate charts and a pairing heuristic, but rendering infrastructure already exists.

**Voyager reference**: `src/queries/field-suggestions.ts`, `src/queries/index.ts:106-126` (`makeRelatedViewQueries`)

---

## 3. The `groupBy` / `orderBy` / `chooseBy` Ranking Pattern

**What Voyager does**: Every CompassQL query specifies three ranking axes:

- **`groupBy`**: How to deduplicate candidates (e.g., group by encoding, by field+transform)
- **`orderBy`**: How to sort groups (field importance, aggregation quality, perceptual effectiveness)
- **`chooseBy`**: Within each group, pick the best representative

This is a general "generate many, rank, pick best" pattern.

**Where Syto can apply this**:

### 3a. Transform Suggestions

When a user selects a column, rank possible transforms by relevance:

| Signal                               | Suggested transform             | Why                        |
| ------------------------------------ | ------------------------------- | -------------------------- |
| Type errors present                  | Type conversion                 | Fix data quality first     |
| Many nulls (> 10%)                   | Impute or filter nulls          | Address missing data       |
| Many duplicates                      | Dedupe                          | Likely unintentional       |
| High cardinality text                | Replace (pattern-based cleanup) | Common wrangling need      |
| Skewed numeric distribution          | Derive (log transform)          | Normalize for analysis     |
| Date strings not parsed              | ParseDate                       | Enable temporal operations |
| Column name has spaces/special chars | Rename                          | Clean for downstream use   |

**Ranking structure** (borrowing Voyager's pattern):

- `groupBy`: transform category (cleanup, reshape, derive)
- `orderBy`: data-quality-impact (fixes errors first, then improves structure, then enriches)
- `chooseBy`: specificity (prefer "convert column X to integer" over generic "change types")

### 3b. Join Key Suggestions

When joining two tables, rank column pairs:

- `groupBy`: column pair
- `orderBy`: type compatibility (same type > compatible types > incompatible), name similarity (exact match > substring > no match), uniqueness ratio
- `chooseBy`: pick the pair with highest combined score

**Effort**: Low-medium per application. The pattern is a framework for thinking, not a library to import.

**Voyager reference**: `src/queries/alternative-encodings.ts` (orderBy/chooseBy usage), `src/queries/base.ts` (QueryCreator interface)

---

## 4. Wildcard Enumeration for Expression Autocomplete

**What Voyager does**: When a property is set to `'?'` (SHORT_WILDCARD), CompassQL enumerates all valid values for that slot given the constraints of other properties. For example, wildcard aggregate on a quantitative field enumerates `[count, sum, mean, median, min, max]`.

**What Syto should do**: Apply the same enumeration approach to the expression language autocomplete. Given the column type and expression context, enumerate valid functions and operators.

**Current state**: The expression language has 50+ built-in functions across 7 modules. CodeMirror provides syntax highlighting but autocomplete could be smarter about context.

**Improved autocomplete**:
| Context | Column type | Suggested functions |
|---------|-------------|-------------------|
| Filter expression | numeric | `> < >= <= == != between()` |
| Filter expression | string | `contains() startsWith() endsWith() matches()` |
| Filter expression | date | `year() month() dayOfWeek() before() after()` |
| Derive expression | numeric | `round() abs() log() sqrt() pow()` |
| Derive expression | string | `trim() upper() lower() replace() split()` |
| Derive expression | date | `dateAdd() dateDiff() formatDate()` |
| Aggregate rollup | numeric | `sum() mean() median() min() max() std()` |

This is conceptually the same as Voyager enumerating valid aggregates per encoding type.

**Effort**: Low. The function modules already categorize functions. Adding a `getRelevantFunctions(columnType, expressionContext)` filter is straightforward.

**Voyager reference**: `src/models/shelf/spec/function.ts` (per-type function enumerations)

---

## 5. Feature Detection for Contextual Actions

**What Voyager does**: `getFeaturesForRelatedViewRules()` inspects the current spec and returns boolean flags (`hasOpenPosition`, `hasStyleChannel`, `hasOpenFacet`, `isSpecAggregate`). These flags drive which suggestion categories appear.

**What Syto should do**: Apply the same feature-detection pattern to drive contextual toolbar actions and suggestions.

**Data-level feature detection**:

```typescript
interface DataFeatures {
  hasNulls: boolean; // → show "Handle nulls" actions
  hasTypeErrors: boolean; // → show "Fix types" actions
  hasDuplicateRows: boolean; // → show "Dedupe" action
  hasHighCardinality: boolean; // → show "Group/Replace" actions
  hasDateStrings: boolean; // → show "Parse dates" action
  isWide: boolean; // → show "Fold/Unpivot" action
  hasNumericColumns: boolean; // → show "Aggregate" action
  rowCount: number; // → show "Sample" if large
}
```

This replaces showing all possible transforms at all times. Instead, surface the most relevant actions based on what the data actually needs.

**Effort**: Low. Most of these flags can be derived from existing EDA stats and schema info.

**Voyager reference**: `src/queries/index.ts:83-104` (`getFeaturesForRelatedViewRules`)

---

## Priority Summary

| #   | Recommendation                                 | Effort     | Impact                                                | Status                                                                  |
| --- | ---------------------------------------------- | ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Type-aware EDA chart selection                 | Low        | Medium -- smarter defaults, less manual toggling      | **Done** — `selectChartDefaults()` in `eda-engine.ts`, treatment toggle |
| 2   | Cross-column bivariate suggestions             | Medium     | High -- transforms EDA from inspection to discovery   | **Done** — `bivariate.ts`, `EdaBivariateStrip`, `EdaBivariateModal`     |
| 3a  | Transform suggestions (ranked by data signals) | Low-Medium | Medium -- reduces cognitive load in transform dialogs | **Skipped** — ColumnToolbar lacks per-column stats at menu time         |
| 3b  | Join key suggestions (auto-match by name)      | Low        | Medium -- reduces manual key selection                | **Done** — `findMatchingColumns()` in `join-handlers.ts`                |
| 4   | Context-aware expression autocomplete          | Low        | Medium -- faster expression writing                   | Open                                                                    |
| 5   | Feature detection for contextual actions       | Low        | Medium -- cleaner toolbar, less overwhelm             | Open                                                                    |

---

## What NOT to Borrow

- **CompassQL as a dependency**: Pinned to vega-lite 2.x; Syto uses 6.x. The algorithms are worth studying but the library is incompatible.
- **The shelf/encoding UI model**: Syto is not a chart builder. The EDA panel generates charts programmatically -- there's no need for a user-facing encoding shelf.
- **Redux**: Syto uses Preact Signals, which is a better fit. Voyager's Redux boilerplate would be a regression.
- **Full visualization recommendation engine**: Syto's primary value is data wrangling. Chart suggestions should be lightweight and serve the wrangling workflow (helping users understand data to decide what to clean), not become a standalone feature.
