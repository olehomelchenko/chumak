# BI Engine Architecture: A Technical Reference

## Tableau Internals, Formula Engine Design, and Comparative BI Patterns

> Synthesized from primary sources: Stolte, Tang & Hanrahan (Polaris, CACM 2008), Hanrahan (VizQL, SIGMOD 2006), Wesley & Terlecki (TDE Compression, SIGMOD 2014), Kemper & Neumann (HyPer, ICDE 2011), and supplementary research.

---

## Table of Contents

1. [Origins and Intellectual Lineage](#1-origins-and-intellectual-lineage)
2. [The Polaris Table Algebra](#2-the-polaris-table-algebra)
3. [VizQL: The Query Compilation Model](#3-vizql-the-query-compilation-model)
4. [The Three-Tier Formula System](#4-the-three-tier-formula-system)
5. [Order of Operations](#5-order-of-operations)
6. [The Tableau Data Engine (Pre-Hyper)](#6-the-tableau-data-engine-pre-hyper)
7. [HyPer: The Academic System](#7-hyper-the-academic-system)
8. [Tableau Hyper in Production](#8-tableau-hyper-in-production)
9. [Comparative Engine Architectures](#9-comparative-engine-architectures)
10. [Data Model Patterns in BI Tools](#10-data-model-patterns-in-bi-tools)
11. [Design Quirks and Non-Obvious Behaviors](#11-design-quirks-and-non-obvious-behaviors)
12. [Architectural Lessons](#12-architectural-lessons)

---

## 1. Origins and Intellectual Lineage

Understanding Tableau's engine requires understanding that it is not a traditional database with a visualization layer bolted on. It is a visualization language that happens to compile to database queries — a fundamentally different design philosophy.

### 1.1 The Polaris Research System

The intellectual ancestor of Tableau is **Polaris**, a research system built at Stanford by Chris Stolte, Diane Tang, and Pat Hanrahan, originally published in IEEE Transactions on Visualization and Computer Graphics (2002) and reprinted in Communications of the ACM (2008). Both Stolte and Hanrahan went on to co-found Tableau Software.

The central problem Polaris addressed was that existing tools offered two unsatisfying options: predefined chart typologies with fixed layouts (Excel, early BI tools), or raw query languages with no visualization capability (SQL, MDX). Neither supported **exploratory analysis** — the iterative cycle of hypothesis, experiment, and discovery that real analysts actually do.

Polaris's solution was to design a **declarative visual query language** grounded in formal algebra. The key insight, borrowed from Wilkinson's Grammar of Graphics, is that any visualization can be described as a composition of primitives rather than selected from a finite menu. This algebra simultaneously specifies what data to retrieve and how to visually encode it — a unification that makes the two problems inseparable by design.

### 1.2 Relationship to Grammar of Graphics and Vega-Lite

Polaris, ggplot2, and Vega-Lite all descend from the same intellectual tradition (Bertin's Semiology of Graphics and Wilkinson's Grammar of Graphics). The key shared properties are:

- Fields are mapped to visual channels (position, color, size, shape, orientation)
- Dimensions partition data into groups; measures compute aggregates over those groups
- The table/pane structure emerges from the algebra, not from a chart type picker
- Every intermediate state of a specification is valid and produces a valid visualization

Polaris's specific contribution over Wilkinson was making the language **compile directly to database queries**. Wilkinson described visualization; Polaris described visualization _and_ retrieval as a single unified expression.

### 1.3 VizQL as the Commercialized Descendant

VizQL (Visual Query Language) is Tableau's productized, proprietary descendant of Polaris. The SIGMOD 2006 abstract by Hanrahan describes it as "a formal language for describing tables, charts, graphs, maps, time series and tables of visualizations." The VizQL query analyzer compiles expressions to both **SQL** (for relational databases) and **MDX** (for OLAP cubes), enabling Tableau to work with both from the beginning.

The shelf-based drag-and-drop interface is not a GUI wrapper around an otherwise separate query engine — it is a **direct manipulation interface** for constructing VizQL expressions. Every drag-and-drop action produces a new algebraic statement. The SQL that gets sent to the database is an artifact of that algebraic statement, not a primary product.

---

## 2. The Polaris Table Algebra

This is the formal foundation that most documentation about Tableau does not explain. When you place fields on shelves, you are constructing expressions in a three-operator algebra. Understanding this algebra is necessary to understand why Tableau behaves the way it does in non-obvious cases.

### 2.1 Fields and Their Types

Fields are classified along two independent dimensions:

**Scale** (how values are represented):

- **Ordinal**: discrete, ordered values — represented as headers or categories
- **Quantitative**: continuous values — represented as axes or smoothly varying encodings

**Role** (how fields participate in queries):

- **Dimension**: independent variable — goes into GROUP BY, partitions panes
- **Measure**: dependent variable — gets aggregated (SUM, AVG, etc.)

The critical insight from the Polaris paper: **scale and role are orthogonal and can change depending on the question**. The field `Age` is quantitative by nature, but when you ask "what is the average purchase amount by age group?" it is acting as a dimension. When you ask "what is the average age of purchasers?" it is acting as a measure. Tableau uses data type and domain cardinality as heuristics to set defaults, but both properties can be overridden.

This orthogonality is a design decision, not an obvious one — most tools conflate type with role. Its implications cascade through the formula system: calculated fields inherit their scale from the fields they reference, and their default role from whether they produce aggregated or row-level output.

### 2.2 The Three Operators

A complete table configuration consists of three expressions — one for the x-axis (columns shelf), one for the y-axis (rows shelf), and one for the z-axis (layers/pages). Each expression is built from **field operands** and three operators:

**Concatenation (`+`)**: Appends two sequences end-to-end.

```
Quarter + Product = {Qtr1, Qtr2, Qtr3, Qtr4, Coffee, Espresso, Tea, ...}
```

This creates adjacent headers at the same level — not nested, just sequential.

**Cross (`×`)**: Cartesian product of two sequences.

```
Quarter × Product = {(Qtr1,Coffee), (Qtr1,Espresso), ..., (Qtr4,Tea)}
```

This creates fully nested headers with all possible combinations. For 4 quarters and 4 products: 16 combinations, regardless of which (quarter, product) pairs actually have data.

**Nest (`/`)**: Like cross, but only creates entries where data actually exists.

```
Quarter / Month = {(Qtr1,Jan), (Qtr1,Feb), (Qtr1,Mar), (Qtr2,Apr), ...}
```

The nest operator is formally defined as:

```
A/B = { aᵢbⱼ | ∃r ∈ R such that A(r) = aᵢ AND B(r) = bⱼ }
```

That is, a pair (aᵢ, bⱼ) appears only if there exists at least one record `r` in the dataset where field A has value aᵢ and field B has value bⱼ. This is "B within A" — the months that actually occur within each quarter. For calendar months nested within quarters, this produces exactly 3 entries per quarter (not 12). For irregular hierarchies (e.g., products within categories with different product counts), it produces exactly the entries that exist in the data.

### 2.3 Normalized Form

Every expression in the algebra can be reduced to a **normalized form**: a sequence of terms, where each term is an ordered combination of zero or more ordinal values and zero or more quantitative field names. This normalized form directly determines the table axis structure — one column (or row) per entry in the normalized sequence.

The implication: every valid shelf expression produces a unique, deterministic table layout. The system does not need to guess what layout the user wants — the algebra specifies it exactly. This is why Tableau can generate a valid visualization for every intermediate drag state.

### 2.4 Comparison with MDX

The Polaris paper notes that "the Polaris table algebra is very similar to the operations in the MDX query language for data cubes." MDX's tuple and set operations map closely to the cross and nest operators. The difference is that Polaris/VizQL derives these structures from relational data on the fly (the nest relationship must be computed), whereas OLAP cubes store the hierarchy explicitly.

---

## 3. VizQL: The Query Compilation Model

### 3.1 The Four-Step Data Flow

Polaris describes an explicit four-step pipeline from user interaction to rendered visualization:

1. **Select records** from the database, applying user-defined filters
2. **Partition records** into layers and panes based on the table structure
3. **Transform records** within each pane (grouping, aggregation, sorting)
4. **Render** and compose layers into the final visualization

Each step corresponds to a distinct SQL clause or operation.

### 3.2 Step 1 — Filter (WHERE clause)

For an ordinal field A with user-selected subset `filter(A)`:

```sql
WHERE A IN filter(A)
```

For a quantitative field P with user-defined range:

```sql
WHERE P >= min(P) AND P <= max(P)
```

The full filter predicate is the conjunction of all individual field filters:

```sql
SELECT * WHERE {all filters}
```

**Important quirk**: This only covers dimension filters. Measure filters cannot be applied here because aggregates have not yet been computed — they appear as HAVING clauses in Step 3. This is not a UI limitation; it is a fundamental consequence of when each type of calculation is evaluated in the pipeline.

### 3.3 Step 2 — Partition into Panes

The normalized set form of the shelf expressions determines which records belong to each pane. For a y-axis expression with normalized form `{a₁b₁P, a₁b₂P, a₂b₁P, a₂b₂P}`, the records for pane at row i, column j, layer k are:

```sql
SELECT * WHERE Row(i) AND Column(j) AND Layer(k)
```

where each Row/Column/Layer predicate is derived from the ordinal values in the corresponding normalized set entry.

Naively, this requires iterating over the table once per pane, which is O(panes × rows). The Polaris PhD thesis (Stolte 2003, referenced in the paper) discusses optimizations that collapse this into a smaller number of queries. In practice, VizQL generates a single SQL query with GROUP BY that covers all panes simultaneously, with the pane membership conditions folded into the grouping dimensions.

### 3.4 Step 3 — Aggregate within Panes

```sql
SELECT {dimensions}, SUM(sales), AVG(profit), ...
GROUP BY {dimensions on grouping shelf}
HAVING {measure filters}
ORDER BY {sort fields}
```

If no aggregation is specified, this reduces to:

```sql
SELECT * ORDER BY {sort fields}
```

This three-step pattern directly explains the order of operations that Tableau users must understand:

- Dimension filters = WHERE clause (applied before grouping)
- Measure filters = HAVING clause (applied after grouping)
- Aggregations = expressions in SELECT, evaluated over grouped rows

### 3.5 Dual Compilation Targets: SQL and MDX

VizQL compiles to SQL for relational sources and to MDX for OLAP cube sources (Hyperion Essbase, SQL Server Analysis Services, etc.). This dual-target design means the formula engine has two code paths at the SQL-generation level. Most Tableau documentation focuses on the SQL path; the MDX path is why Tableau could connect to enterprise OLAP systems in its earliest versions.

For live connections to relational databases, the compiled SQL is sent directly to the source system using a dialect-specific driver (BigQuery SQL, Snowflake SQL, PostgreSQL, etc.). Tableau maintains a connector layer that handles dialect differences — functions like `DATETRUNC()` are rewritten to their database-specific equivalents at emit time.

### 3.6 The Declarative Principle

VizQL is declarative in the same sense as SQL — it describes _what_ to compute, not _how_. The shelf specification declares "I want sales grouped by region and colored by segment" and VizQL emits the appropriate query. The user does not write the GROUP BY; it emerges from the presence of a dimension on the rows/columns shelf. The user does not write the SELECT; it emerges from the fields on the marks card.

This declarativeness is architecturally important: it means the system can rewrite queries for optimization without user involvement, adapt the SQL dialect to the data source, and maintain correctness as the user modifies the specification incrementally.

---

## 4. The Three-Tier Formula System

Tableau's formula engine has three distinct tiers of computation that differ in where they execute, when they execute relative to filters, and what they can reference. This is the most important thing to understand about Tableau's formula design — conflating these tiers causes subtle, hard-to-debug errors.

### 4.1 Tier 1 — Row-Level Calculated Fields

Row-level calculations operate on individual records before any aggregation. They compile to **inline SQL expressions** embedded within the SELECT clause.

```
[Profit Ratio] = [Sales] / [Profit]
```

compiles to:

```sql
SELECT sales / profit AS profit_ratio, ...
```

```
[Region Label] = IF [Region] = "West" THEN "W" ELSE "Other" END
```

compiles to:

```sql
SELECT CASE WHEN region = 'West' THEN 'W' ELSE 'Other' END AS region_label, ...
```

These calculations are completely transparent to the database — they are standard SQL column expressions. They respect all filters, have no ordering dependencies, and add no overhead beyond the expression evaluation itself. They are the correct tool for any transformation that needs to happen at the row level before aggregation.

**Quirk**: Date functions, string functions, and type casts in row-level calculations are rewritten per source dialect at emit time. `DATEPART('month', [Order Date])` becomes `EXTRACT(MONTH FROM order_date)` on PostgreSQL, `MONTH(order_date)` on SQL Server, `FORMAT_TIMESTAMP('%m', order_date)` on BigQuery. The formula language is source-agnostic; the compiler handles dialect differences. This is one of the more practically valuable things Tableau does.

### 4.2 Tier 2 — LOD (Level of Detail) Expressions

LOD expressions are the most architecturally novel part of Tableau's formula system. They address a class of problems that SQL handles awkwardly: when you need to compute an aggregation at a _different granularity_ than the main query, within the same view.

The canonical example: you want to show, for each customer, their sales as a percentage of total sales. The main query groups by customer. The total sales requires aggregating over _all_ customers. These are two different granularities, and expressing both in a single SQL query requires a subquery or window function.

LOD expressions provide a declarative syntax for specifying the granularity of a calculation independently of the view granularity. There are three variants:

#### FIXED

```
{ FIXED [Customer ID] : SUM([Sales]) }
```

Computes `SUM(Sales)` grouped by `Customer ID` regardless of what is in the view. Compiles to a subquery:

```sql
SELECT main.*, sub.customer_total
FROM orders main
JOIN (
    SELECT customer_id, SUM(sales) AS customer_total
    FROM orders
    GROUP BY customer_id
) sub ON main.customer_id = sub.customer_id
```

**Critical behavior**: FIXED LODs are evaluated **before dimension filters** but **after context filters and extract filters**. If you filter the view to show only the West region, a FIXED LOD calculating total sales per customer will still include customers from all regions — unless you promote the region filter to a Context Filter. This is often surprising to users but is logically consistent: FIXED ignores view context.

#### INCLUDE

```
{ INCLUDE [Product] : SUM([Sales]) }
```

Aggregates at a granularity _finer_ than the view by adding the specified dimension(s) to the view's existing dimensions. If the view is at the Region level, this calculates `SUM(Sales)` at Region × Product, then the view re-aggregates (typically averages) the result back to Region.

This answers questions like "what is the average per-product sales total across each region?" — a question that requires computing at two levels simultaneously.

INCLUDE LODs are evaluated **after dimension filters** (unlike FIXED). Adding or removing dimensions from the view changes the result, because INCLUDE adds to the view's context rather than overriding it.

#### EXCLUDE

```
{ EXCLUDE [Category] : SUM([Sales]) }
```

Aggregates at a granularity _coarser_ than the view by removing the specified dimension(s). Useful for "percent of total" and "difference from group average" patterns.

EXCLUDE always produces replicated values when placed on a shelf — the same aggregated value repeats across all rows that share the same coarser grouping. Tableau defaults to `ATTR()` aggregation for EXCLUDE LODs to signal this non-aggregating behavior.

#### LOD Compilation Pattern

All three variants compile to SQL using subquery or JOIN patterns. The internal VizQL query log (visible via `tabadmin` or the Performance Recorder) shows the actual SQL. A FIXED LOD producing a customer-level total that appears in a region-level view produces SQL roughly like:

```sql
SELECT region, SUM(customer_total) AS regional_total
FROM (
    SELECT customer_id, region, SUM(sales) AS customer_total
    FROM orders
    WHERE {dimension filters apply to inner query for INCLUDE/EXCLUDE, not for FIXED}
    GROUP BY customer_id, region
) sub
GROUP BY region
```

The outer GROUP BY is the view level; the inner GROUP BY is the LOD level. Nesting depth can increase with nested LOD expressions (LODs within LODs).

### 4.3 Tier 3 — Table Calculations

Table calculations are fundamentally different from the first two tiers: **they do not compile to SQL at all**. They operate on the result set after the database has returned data, running in-process within the Tableau application or VizQL server.

```
RUNNING_SUM(SUM([Sales]))
RANK(SUM([Sales]))
WINDOW_AVG(SUM([Sales]), -2, 0)   -- 3-period moving average
LOOKUP(SUM([Sales]), -1)          -- previous mark value
INDEX()                           -- position within partition
```

Table calculations operate on the in-memory table of aggregated results using the concept of **partitions** (groups within which the calculation runs) and **addressing** (the order/direction of traversal within a partition). These are configured via "Compute Using" settings — fields that determine how the calculation traverses the result set.

**Why this matters architecturally**: Table calculations see only the data currently in the view. Filtering via a table calculation filter hides marks but does not remove the underlying data from the calculation — the calculation still runs over all marks, including hidden ones. This is in direct contrast to dimension filters (WHERE clause — data excluded before aggregation) and measure filters (HAVING clause — rows excluded after aggregation). The four filter types are not interchangeable.

**Performance implication**: Table calculations scale with the number of marks in the view, not the number of rows in the database. A table calculation on a 10,000-mark view is fast regardless of whether the database has 10M or 10B rows.

---

## 5. Order of Operations

Tableau has a formally defined order in which filters and calculations are evaluated. Understanding this is necessary to explain behaviors that appear inconsistent but are actually mathematically correct.

```
1. Extract filters          — applied when creating/refreshing an extract
2. Data source filters      — applied to all worksheets sharing the data source
3. Context filters          — dimension filters promoted to context
4. FIXED LOD expressions    — evaluated after context filters
5. Dimension filters        — standard WHERE-clause filters
6. INCLUDE / EXCLUDE LODs   — evaluated after dimension filters
7. Measure filters          — HAVING-clause filters on aggregated measures
8. Table calculation filters — applied post-computation; hide marks, don't remove data
```

This order has direct SQL analogues:

- Steps 1–3: applied as WHERE conditions before the main query
- Step 4: subquery JOINed before dimension filtering
- Step 5: WHERE conditions in the main query
- Step 6: subquery JOINed after dimension filtering
- Step 7: HAVING conditions
- Step 8: post-query in-process filtering

**The most important quirk**: A FIXED LOD can produce values that do not change when you apply a dimension filter, even when you intuitively expect them to. A `{ FIXED [Customer] : SUM([Sales]) }` calculating total customer sales will not change when you filter by Region, because it was computed at step 4, before the region filter at step 5 was applied. To make a dimension filter affect a FIXED LOD, promote it to a Context Filter (step 3). This is a frequent source of confusion in enterprise dashboards.

---

## 6. The Tableau Data Engine (Pre-Hyper)

The original Tableau Data Engine (TDE), described in Wesley & Terlecki's SIGMOD 2014 paper, was in use from approximately 2011 to 2018 when it was replaced by Hyper. It was a purpose-built column store designed specifically for use with the Tableau visualization environment. Understanding it illuminates design decisions that carry forward into Hyper.

### 6.1 Why Build a Custom Engine at All?

The TDE team surveyed existing commercial, academic, and open-source systems and found that none met their requirements, specifically:

- **Collated strings**: locale-sensitive string comparison and sorting, not just binary collation
- **Single-file databases**: the entire extract must be one file so users can select it in a file dialog
- **32-bit hardware**: the engine had to run on consumer laptops, not just servers
- **Calculation language semantics**: Tableau's formula language has specific NULL-handling and type-coercion behaviors that differ from standard SQL
- **NULL join semantics**: Tableau treats NULL = NULL as true in certain join contexts, which differs from standard SQL behavior

These constraints ruled out every existing option. This "build your own because nothing fits" decision has a recurring pattern in BI tool development — both VertiPaq (Power BI) and Hyper were built for similar reasons.

### 6.2 Query Plan Architecture: The Volcano Model

The TDE expresses every query as a **Volcano-style block-iterated operator tree** — the same model used by most modern analytical databases, including DuckDB, MonetDB, and many others. There are two classes of operators:

**Flow operators**: consume a block of input rows, produce a block of output rows, then pass the block to the next operator. Examples: `Select` (filter), `Project` (column expression), `TextScan` (CSV parse). These pipeline naturally — data flows through them without full materialization.

**Stop-and-go operators**: must consume all input before producing any output. Examples: `Sort`, `Aggregate` (hash-based), `FlowTable` (build a temp table). These are materialization points — they break the pipeline and create an intermediate result in memory.

**Architectural implication**: Any calculation that requires global ordering (RANK, NTILE) or global aggregation at a different level (LOD pre-aggregation) necessarily involves a stop-and-go operator. The cost of such calculations is proportional to the cardinality of the intermediate result, not just the final result. This explains why FIXED LOD expressions on very high-cardinality dimensions (like order IDs) are expensive — the subquery materializes all order-level values before joining back.

### 6.3 Two-Phase Optimization

The TDE query optimizer runs in two phases:

**Strategic phase** (compile-time, rule-based): Determines the shape of the optimal plan. A rule-based component derives properties for all tree nodes from metadata and performs transformations:

- Elimination of common sub-expressions
- Computation and filter move-around (predicate pushdown)
- Parallelism injection
- Expression simplification

**Tactical phase** (runtime, data-driven): Delayed until execution, when decisions can be based on actual data statistics. The tactical optimizer tracks per-column properties:

- Minimum and maximum value
- Cardinality (number of distinct values)
- Nullability (whether the column contains NULLs)
- Sortedness (whether the column is ordered)

These properties are extracted during data loading and updated as computations pass through `FlowTable` operators. The tactical optimizer uses them to choose among algorithms — for example, choosing a perfect hash function (no collision detection) when column cardinality fits in 1–2 bytes, versus a general hash with collision detection for wider data.

This two-phase model is a general design principle worth adopting in any analytical engine: static rules for structural optimization, dynamic statistics for algorithmic selection.

### 6.4 Compression Architecture and Invisible Joins

The TDE makes a distinction between **compression** (dictionary-based) and **encoding** (lightweight transformations on fixed-width data). This distinction is architecturally important.

#### Dictionary Compression

Each column can have an associated dictionary — a heap of unique values. The main column stores integer tokens (indices into the dictionary) rather than the actual values. For string columns with low cardinality, this is enormous: a column with 50 distinct country names, repeated millions of times, stores 4-byte tokens rather than variable-length strings.

The key insight: these compressed columns are **not decompressed before querying**. Instead, the optimizer introduces a `DictionaryTable` — a pseudo-table containing the distinct values — and expresses decompression as a **foreign-key join**:

```
Main column: [row_id → token (integer)]
DictionaryTable: [token → actual value]

Decompression = JOIN(main, dict ON main.token = dict.token)
```

By representing decompression as a join in the query plan, the **strategic optimizer can push predicates down to the dictionary side**. A filter like `WHERE country = 'Ukraine'` becomes a lookup on the dictionary (which may have 50 entries), producing a single matching token, which is then used to filter the main column via a fast integer comparison. The actual string comparison happens once against 50 values, not millions of times against millions of rows.

This technique is called an **invisible join** because it is transparent to the user — they write a filter on the string column, and the optimizer silently rewrites it as a join on the integer token column.

#### Lightweight Encodings

Beyond dictionary compression, the TDE supports lightweight encodings for fixed-width columns:

- **Frame-of-Reference**: stores values as `base + delta`, bit-packed. `value = base + bits[i]`. Good for dense integer ranges.
- **Delta encoding**: stores successive differences. Good for monotonically increasing values (timestamps, sequential IDs).
- **Affine encoding**: a special case of delta where the delta is constant. `value = base + row × delta`. Requires _zero_ bit-packed data — the entire column is represented by just two numbers. Detected automatically when a column contains sequential integers (e.g., a row ID column).
- **Run-length encoding (RLE)**: stores (value, count) pairs. Good for sorted categorical columns with long runs of repeated values.
- **Dictionary encoding**: for low-cardinality fixed-width data (distinct from the heap-based dictionary compression above).

**Affine encoding is worth noting specifically**: a column `[1, 2, 3, 4, ..., N]` occupies constant space regardless of N. The column is entirely encoded as `base=1, delta=1`. This sounds trivial but has real performance implications — a join on a sequential ID column after affine detection becomes a **fetch join**: `row_id = base + token × delta`, which is arithmetic, not a table lookup. The paper reports that this situation "happens most often in primary-key/foreign-key joins" and that detecting it "improves join performance significantly."

#### Rank Joins for Run-Length Encoded Columns

For run-length encoded columns, a similar pseudo-table technique applies. An `IndexTable` is constructed with columns `(value, count, start)`, where `start` is the running sum of counts. The join condition is a range predicate:

```sql
Index.start <= Outer.rank < Index.start + Index.count
```

This allows predicate pushdown to the compressed run-length structure, evaluating filters on the few unique values rather than the many repeated rows. On a 1-billion-row table with high run-length compression, this approach outperforms full scan by approximately 3×.

### 6.5 The Single-File Constraint as a Design Driver

The TDE's requirement to exist as a single `.tde` file shaped the entire compression architecture. A multi-file column store (MonetDB's approach: one file per column) is not user-friendly — users cannot easily move, share, or back up a database that is a directory of 200 files. The single-file requirement forced all column data and dictionaries to be packed into one container.

The compression techniques described above have an effect beyond storage savings: they reduce the I/O cost of writing the final packed file. The paper shows that import with encoding on is comparable in speed to simply splitting the flat file without encoding — the compression cost is paid during computation that would happen anyway, not as additional overhead.

This design carries forward into Hyper: `.hyper` files are also single-file databases, queryable via a Postgres-compatible network interface, portable between machines.

### 6.6 Tableau's Minimal Type System

The TDE (and by extension Tableau's formula language) supports only six data types: Boolean, integer, real, date, timestamp, and locale-sensitive string. No decimal (uses real), no varchar(n) (all strings are variable-length), no bytea, no JSON, no array.

This minimal type system, which looks like a limitation, is actually a design choice that enables type design flexibility. The TDE can store an integer column in any representation that fits (1, 2, 4, or 8 bytes) because Tableau will never ask "is this a SMALLINT or a BIGINT?" — it is just "an integer." This flexibility is what enables the type narrowing optimization (storing a column with values 0–100 as 1-byte integers even if the source declared it as INT64) and consequently better hash performance.

---

## 7. HyPer: The Academic System

### 7.1 Origin and Problem Statement

HyPer was developed at Technische Universität München by Alfons Kemper and Thomas Neumann, published at ICDE 2011. **This is not the Tableau Hyper** — it is the academic system whose team Tableau acquired in 2015. Understanding the original design goals clarifies which parts of HyPer made it into Tableau's product and which did not.

The problem HyPer addressed was the **OLTP/OLAP separation**: businesses in 2011 ran two separate database systems — an OLTP database for transactions (orders, payments, inventory) and a data warehouse for analytics. ETL processes ran nightly to copy data from the OLTP system to the warehouse. This introduced latency: analytical queries always operated on yesterday's data. The industry term was "data freshness" and it was a genuine business problem.

### 7.2 The Core Innovation: VM Snapshot Isolation

HyPer's solution is elegant in its use of OS primitives. Both the transactional OLTP workload and analytical OLAP queries run on the same main-memory database. The isolation mechanism is the OS `fork()` system call:

1. OLTP transactions run serially in a single process (no locking needed — the process "owns" the entire database)
2. When an OLAP query arrives, the OLTP process calls `fork()`, creating a child process with an identical copy of the virtual address space
3. The OS uses **copy-on-write**: parent and child initially share the same physical memory pages. Only when the OLTP process (parent) modifies a page does the OS copy that page, giving the parent a new version while the child retains the old version
4. OLAP queries run in the child process against the frozen snapshot, while OLTP continues writing in the parent

The cost: creating a snapshot for a 1 GB database using small 4KB pages takes approximately 7ms. With large 2MB pages, it takes approximately 0.087ms. The snapshot is deleted when the OLAP session completes, by simply terminating the child process.

The memory overhead is proportional to the number of pages modified by OLTP since the snapshot was created. The paper shows this is manageable: after 500,000 OLTP transactions, the snapshot overhead was approximately 1 GB on top of the base database. Most updated pages contain newly inserted data — pages holding stable reference data are never copied.

### 7.3 Serial OLTP Execution

A counterintuitive design choice: OLTP transactions run **serially**, one at a time, with no concurrency control. No locking, no latching, no MVCC.

This works because the database is entirely in main memory. A typical OLTP transaction (order entry, payment processing) completes in 10 microseconds. At this speed, the overhead of acquiring and releasing locks would dominate the transaction itself. The serialized approach is simpler, eliminates all concurrency bugs, and still achieves 56,000+ new-order transactions per second on a single server — comparable to VoltDB's published benchmarks on a 6-node cluster.

The benchmark results from the paper: HyPer achieved 56,961 new-order tps (single-threaded OLTP) while simultaneously running OLAP queries, versus VoltDB's 55,000 tps on 6 nodes without any OLAP capability.

### 7.4 What Tableau Kept

Tableau acquired the TU Munich team in 2015 and integrated their technology into Tableau Desktop/Server starting in version 10.5 (2018). The `hyperd` process (Hyper daemon) replaced the TDE as the extract engine.

**What survived the acquisition**:

- Columnar storage architecture
- LLVM query compilation (queries compiled to native machine code)
- Aggressive CPU parallelism (near-linear scaling with core count)
- Postgres network compatibility and SQL dialect (`.hyper` files are accessible via `libpq`)
- Single-file database format

**What did not survive** (because Tableau does not need it):

- The `fork()`-based OLAP snapshot mechanism (Tableau's extracts are read-only — no concurrent OLTP writes)
- Serial OLTP transaction processing
- Redo/undo logging for ACID transactions
- The hybrid OLTP+OLAP scheduling system

The transformation makes sense: Tableau needs a fast, scalable, portable analytical store for pre-extracted data. It does not need to handle concurrent writes. The OLAP half of HyPer was exactly what Tableau needed; the OLTP half was unnecessary.

---

## 8. Tableau Hyper in Production

### 8.1 LLVM Compilation

The single most important performance characteristic of Hyper is that it is a **compiling query engine**. Queries are not interpreted by a general-purpose query executor — they are compiled to native machine code via LLVM and executed directly.

The benefits:

- **No interpreter overhead**: no switch-dispatch on operator types, no virtual function calls in hot loops
- **CPU-specific instruction selection**: LLVM can emit SIMD instructions (AVX2, AVX-512) that process 8–16 values per clock cycle on modern CPUs
- **Inlining of operator chains**: a pipeline of filter → project → aggregate can be compiled into a single tight loop with no intermediate materialization
- **Vectorization**: tight inner loops can be auto-vectorized by the LLVM backend

The tradeoff: compilation has startup cost. For queries on small datasets, interpreted execution can be faster. Hyper handles this with an adaptive strategy: simple or short queries are interpreted; complex or large queries are compiled. The compilation overhead is amortized over the execution time, which is worth it once the dataset exceeds a threshold.

### 8.2 Columnar Storage and Compression

Hyper stores data in columnar format: each column is stored as a contiguous array of values, separately from other columns. For an analytical query that reads 3 out of 50 columns, columnar storage means only 6% of the data is read from storage.

Compression is applied per-column based on data characteristics:

- **Dictionary encoding** for low-cardinality columns (categorical data, status flags)
- **Run-length encoding** for sorted low-cardinality columns
- **Bit-packing** for columns with limited value ranges
- **Delta encoding** for monotonically increasing values (timestamps, sequence numbers)

Advanced metadata: Hyper materializes **min and max values per column per block** (zone maps or mini-indices). Before reading a block, the executor checks whether the block's range overlaps the query's filter predicates. If not, the block is skipped entirely without reading it. For a range filter on a sorted column, this enables O(log N) block access rather than O(N) full scan.

### 8.3 Parallelism Model

Hyper is designed to use all available CPU cores on the machine. The parallelism model has two levels:

**Intra-query parallelism**: A single query can execute across multiple cores simultaneously. The data is partitioned into chunks, and multiple threads process different chunks in parallel. The paper reported near-linear scaling with core count for OLAP queries.

**Inter-query parallelism**: Multiple queries can execute simultaneously, with the scheduler managing CPU allocation. The Tableau Server documentation recommends targeting ~75% average CPU utilization during query processing as a signal of healthy load.

**Memory pressure**: When a query's working set exceeds available RAM (typically when more than 80% of RAM is in use), Hyper switches to spooling — writing intermediate results to temporary disk files. The temporary files are deleted when the query completes. Spooling is detectable via the Hyper log (`spool: true` flag) and is a reliable signal that the machine needs more memory.

### 8.4 Postgres Compatibility

Hyper exposes a Postgres-compatible network protocol. This means `.hyper` files can be queried using:

- `psql` command-line tool
- Any `libpq`-based application
- The Tableau Hyper API (Python, Java, C++)
- Standard Postgres ODBC/JDBC drivers (with caveats)

The SQL dialect is Postgres-like but not identical. The Hyper API enables programmatic creation and querying of `.hyper` files without a Tableau installation, which makes it useful as a standalone embedded analytical database for other applications.

The Postgres compatibility also enabled creative use cases: the open-source community built distributed Hyper clusters by using Postgres 11's foreign data wrapper (FDW) functionality to federate multiple Hyper instances, treating each as a remote Postgres server.

---

## 9. Comparative Engine Architectures

### 9.1 Power BI: DAX and VertiPaq

Power BI's analytical engine is built around two components: VertiPaq (the storage engine) and the DAX Formula Engine (the computation engine). The separation is explicit and architecturally fundamental.

#### VertiPaq (Storage Engine)

VertiPaq is a columnar in-memory store with encoding strategies similar to Hyper's TDE predecessor:

- **Value encoding**: stores integers in the minimum required width
- **Run-length encoding**: stores (value, count) pairs for sorted low-cardinality columns
- **Hash encoding**: for high-cardinality columns where other encodings are inefficient
- **Dictionary compression**: similar to TDE's invisible join approach

When a table is imported ("Import mode"), VertiPaq reads the source once, transforms data into columnar structure, encodes and compresses each column independently, and builds per-column dictionaries and indices.

VertiPaq is **multi-threaded**: it can parallelize column scans and aggregations across cores.

#### DAX Formula Engine

The Formula Engine (FE) receives DAX queries, interprets them, generates a query plan, and executes that plan by making requests to the Storage Engine. The FE is **single-threaded** — it processes operations sequentially. No matter how many CPU cores are available, the FE will only execute one step at a time.

This creates the central performance principle for DAX optimization: **push as much work as possible to the Storage Engine**. Operations that the SE can handle (column scans, aggregations, simple joins) are fast and parallel. Operations that fall back to the FE (complex filter contexts, certain CALCULATE expressions, cross-joins) are sequential and slower.

The FE communicates with the SE via "datacache" requests — the SE returns a datacache (a temporary in-memory table), the FE operates on it, and may issue additional SE requests. A DAX query that causes many small SE requests performs worse than one that causes few large SE requests, even if the total data processed is the same.

#### DAX Context Model

DAX's formula language is organized around two concepts: **row context** (what row is currently being iterated) and **filter context** (what filters are currently active). The `CALCULATE()` function is the mechanism for modifying filter context. Understanding context propagation is the central intellectual challenge of DAX — it is more powerful than LOD expressions but significantly harder to reason about.

The comparison to Tableau:

- DAX's filter context is analogous to Tableau's view level of detail
- `CALCULATE(expr, filter)` is analogous to a FIXED LOD with the filter as the dimension specification
- The `ALL()` function (removes filters) is analogous to an EXCLUDE LOD
- Row context is analogous to Tableau's row-level calculated fields

DAX provides more precise control than Tableau's LOD syntax but at the cost of explicit context management. The power and the complexity are the same thing.

#### DirectQuery Mode

Power BI supports DirectQuery as an alternative to Import: every report interaction generates a live query against the source database. In DirectQuery mode, VertiPaq is not used — the SE generates SQL and sends it to the source. The FE still operates on the results. This trades performance for freshness, and disables some DAX functions that require in-memory data.

Power BI also supports Composite Models: some tables imported (cached in VertiPaq), others in DirectQuery. The query optimizer chooses which engine to use for each table in a query.

### 9.2 Looker: No Local Engine

Looker's architecture is philosophically opposite to both Tableau and Power BI. There is **no local compute engine**. All computation happens in the source database. Looker is, at its core, a sophisticated SQL generator.

#### LookML as a Semantic Layer

LookML (Looker Modeling Language) is a domain-specific language for defining a **semantic model** — dimensions, measures, joins, and derived tables — on top of a database schema. LookML files define:

- **Dimensions**: how raw database columns are transformed and labeled for business users
- **Measures**: aggregation expressions (SUM, COUNT, COUNT DISTINCT, etc.) with business-meaningful names
- **Explores**: join graphs that define how tables can be combined
- **Derived tables**: either native SQL subqueries or PDTs (Persistent Derived Tables) materialized in the database

At query time, user interactions (selecting dimensions, adding filters, drilling) are compiled from the LookML model into SQL, which is sent to the underlying database. The database (BigQuery, Snowflake, Redshift, etc.) executes the SQL and returns results.

#### Implications of the No-Engine Approach

Advantages:

- Data freshness is immediate — no extract to refresh
- No ETL or extract management
- Scales with the data warehouse — Looker can query petabytes if the warehouse can handle it
- Governance is natural — metrics are defined once in code, versioned in Git, consistent everywhere
- The warehouse's own optimizations (query caching, materialized views, partitioning) are fully utilized

Disadvantages:

- Every calculation must be expressible in SQL on the target database
- No post-query computations (no table-calculation equivalent)
- No LOD-equivalent declarative syntax — multi-granularity calculations must be written as explicit SQL subqueries or derived tables
- Performance depends entirely on the warehouse — Looker cannot locally accelerate a slow query
- Caching is limited compared to in-memory engines

#### Persistent Derived Tables (PDTs)

Looker's closest equivalent to Tableau's extract is a PDT — a derived table that Looker materializes in the database using a scheduled job. PDTs pre-aggregate or pre-join data, improving query performance at the cost of freshness. This is essentially a BI-tool-managed materialized view — similar in concept to a dbt model.

### 9.3 Comparison Summary

| Dimension                          | Tableau                                                | Power BI                                                | Looker                                            |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| **Computation model**              | Hybrid: push SQL to source + local post-processing     | Hybrid: VertiPaq (in-memory) + DirectQuery option       | Push-down only: always runs in the warehouse      |
| **Local engine**                   | Hyper (LLVM-compiled columnar)                         | VertiPaq (dictionary-encoded columnar)                  | None                                              |
| **Formula language**               | Calculated fields + LOD + Table calcs                  | DAX (functional, context-propagating)                   | LookML (declarative YAML-like) + SQL              |
| **Multi-granularity calculations** | LOD expressions (FIXED/INCLUDE/EXCLUDE)                | CALCULATE() + ALL() / filter context                    | Explicit SQL subqueries or derived tables         |
| **Post-query calculations**        | Table calculations (in-process)                        | DAX FE (single-threaded, complex)                       | Not supported                                     |
| **Storage format**                 | `.hyper` (Postgres-compatible)                         | `.pbix` (proprietary binary)                            | None — warehouse is source of truth               |
| **Data freshness**                 | Extract: delayed by refresh schedule. Live: current    | Import: delayed. DirectQuery: current. Composite: mixed | Always current                                    |
| **Governance**                     | Workbook-level, Tableau Server-managed                 | Semantic model in Power BI Service                      | Git-versioned LookML — strongest governance       |
| **Formula complexity ceiling**     | High for SQL patterns, medium for contextual reasoning | Very high (DAX context model)                           | High if you know SQL, low for non-technical users |
| **Dependency on warehouse**        | Low (extract is self-contained)                        | Low (import is self-contained)                          | Total — Looker is useless without the warehouse   |

---

## 10. Data Model Patterns in BI Tools

### 10.1 The Semantic Layer Concept

A **semantic layer** is an abstraction over raw database schemas that translates technical table/column names into business-meaningful terms, defines how tables relate, and encodes metric definitions. It answers the question: "when we say revenue, what does that mean, and how do we compute it?"

Every major BI tool has some form of semantic layer:

- Tableau: the published data source + calculated fields + relationships model
- Power BI: the Tabular model (DAX measures + relationships defined in Power BI Desktop)
- Looker: LookML (the strongest, most explicit, most governance-friendly)
- dbt + metrics layer: a source-agnostic approach where metrics are defined in YAML

The semantic layer trend matters because metric definitions are currently **locked inside BI tools** — Tableau's calculated field definitions cannot be read by Power BI, and vice versa. This creates tool lock-in: switching BI tools means rewriting every metric. The industry is moving toward **headless semantic layers** (Cube, AtScale, dbt Semantic Layer) that sit between the warehouse and multiple BI tools, exposing metrics via SQL or GraphQL.

### 10.2 Tableau's Relationship Model

Tableau's data model has evolved through several paradigms:

**Classic joins (pre-2020)**: Users defined explicit SQL joins between tables at the data source level. Joins happened before the query, making all tables behave as one flat table. This was simple but problematic: many-to-many joins inflated aggregates, and the correct join type had to be chosen at model definition time.

**Relationships model (Tableau 2020.2+)**: Relationships are defined between tables using join keys, but the actual join is deferred to query time and generated based on the fields in the current visualization. If a visualization only uses fields from one table, no join is generated. If it uses fields from multiple tables, Tableau generates the appropriate join type automatically, handling fanout/inflation by issuing separate queries per table when needed and combining results.

This is a significant architectural change — the data model is now a **logical model** (relationships between tables) rather than a **physical model** (pre-specified join SQL). The practical impact: fewer cases where adding a second table to a view silently inflates measure values due to row duplication.

### 10.3 Star Schema and BI Performance

The star schema (a central fact table surrounded by dimension tables) is the canonical data model for analytical databases. Its performance advantages stem from:

- **Narrow fact tables**: fewer columns = better columnar storage compression
- **Pre-aggregated dimensions**: filtering happens on small dimension tables, reducing the number of fact rows that need to be scanned
- **Simple join patterns**: star schema joins are always fact-to-dimension, never dimension-to-dimension, which prevents many-to-many complexity

For VertiPaq specifically, the star schema matters for an additional reason: VertiPaq is optimized for one-to-many relationships from dimension to fact. Denormalized tables (one big flat table) actually perform worse in VertiPaq than star schemas because dictionary compression is less effective when there are many columns with high cardinality.

For Hyper/TDE, the model matters less because full table scans are fast — but star schemas still help by reducing the amount of data that needs to be joined.

---

## 11. Design Quirks and Non-Obvious Behaviors

This section documents specific behaviors that are architecturally correct but frequently surprising to practitioners.

### 11.1 FIXED LOD and Dimension Filter Independence

A `{ FIXED [Customer] : SUM([Sales]) }` expression calculates the total sales per customer, ignoring the current view's dimensions. If you then filter the view by Region = "West", the FIXED LOD value for each customer remains their _total_ sales (including non-West sales) — because the dimension filter was applied after the FIXED LOD was computed (step 5 vs step 4 in the order of operations).

This is not a bug. It is the designed behavior: FIXED means "fixed regardless of view context." The solution is a Context Filter, which is applied at step 3, before FIXED LODs.

### 11.2 EXCLUDE Always Replicates Values

EXCLUDE LODs always produce replicated values in the view. If you have [Category] and [Sub-Category] in the view, and you compute `{ EXCLUDE [Sub-Category] : SUM([Sales]) }`, you get the category total repeated for every sub-category row. Tableau defaults to `ATTR()` aggregation on EXCLUDE LODs to signal that no actual aggregation is happening — all values within a category are identical.

Placing an EXCLUDE LOD on a continuous axis produces a single reference line across all sub-categories within a category. This is useful for "difference from group total" calculations.

### 11.3 Table Calculation Filters Are Not Real Filters

Filtering using a table calculation filter (via the filter shelf, but on a table calculation) **hides marks** from the view but does not remove them from the calculation. A `RANK(SUM([Sales]))` calculation still ranks all rows, including those hidden by the filter. The visible rows show their original ranks (with gaps where hidden rows would be), not re-ranked positions.

This is commonly misunderstood: users add a table calculation filter expecting it to behave like a dimension filter, and are confused when summary totals do not change.

### 11.4 ATTR() Is Not a Real Aggregation

`ATTR(expr)` returns the value of the expression if it is the same for all rows in the group, otherwise returns an asterisk (`*`). It is not an aggregation in the mathematical sense — it is a diagnostic that signals "this value should be the same for all rows, and I'm checking that it is."

ATTR is automatically applied to dimensions placed on the Detail shelf (which do not affect the view's level of detail) and to EXCLUDE LODs. Seeing `*` in an ATTR field means the underlying data contains multiple distinct values within a group that you expected to be homogeneous — often a signal of a data quality issue or an incorrect join.

### 11.5 Dual-Axis Mark Type Differences

When using dual axes, marks on each axis are rendered independently and then layered. Synchronizing axes does not synchronize mark types. If one axis uses bars and the other uses lines, they are computed entirely independently, with separate aggregations, and only share the axis scale. This means it is possible for the two axes to compute different aggregates on the same field, or to apply different level-of-detail configurations.

### 11.6 Context Filter Performance Cost

Context filters are evaluated before dimension filters and before FIXED LODs, which sounds like they would be faster (less data to process downstream). In reality, they have a hidden cost: Tableau creates a **temporary table** in the data source containing the IDs of records that pass the context filter, and subsequent queries JOIN against this temporary table.

The creation of this temp table is a separate query. For live connections to large databases, this extra query can add latency. For extracts (Hyper), the cost is different — Hyper executes the context filter as an initial scan and then applies subsequent filters to the reduced result set.

### 11.7 String Functions Are Slower Than Expected

The TDE paper notes that "users love text fields and string functions, often performing complex calculations with strings of text and dates" — and that Hyper needed numerous micro-optimizations to handle this. String comparison in particular is expensive because Tableau supports locale-sensitive collation: `"café" < "cafe"` depends on the locale's collation rules, not on byte comparison. Locale-sensitive comparison requires calling collation library functions rather than using direct memory comparison, which is 10–100× slower per comparison.

For high-cardinality string columns with complex string calculations, this performance cost can be significant. The TDE's invisible join approach helps — string calculations are evaluated once on the dictionary (N distinct values) rather than once per row — but for high-cardinality string columns (e.g., free-text product descriptions), there is no avoiding the cost.

### 11.8 The Nest Operator and Sparse Headers

When you drag a field like `Month` inside `Quarter` in Tableau, Tableau uses the nest operator (`/`), not the cross operator (`×`). This means only month-within-quarter combinations that actually exist in the data are shown. If February has no data in a given quarter, there will be no February column in that quarter's header.

This is correct behavior for most analyses but can cause alignment issues in certain small-multiple layouts where you want all months to appear even if they have no data (for visual comparison purposes). The workaround is to use a cross operator explicitly, which requires custom SQL or a density function.

---

## 12. Architectural Lessons

These are the generalizable design principles that emerge from studying these systems — applicable to any analytical tool or formula-processing pipeline.

### 12.1 Separate What from How

The fundamental decision in Polaris/VizQL: the user specifies what they want (field roles, aggregations, filters), not how to retrieve it. The compiler handles the how. This separation enables:

- Query optimization without user involvement
- Dialect translation (same spec → BigQuery SQL or Postgres SQL or MDX)
- Incremental specification (every intermediate state is valid)
- Rewriting for performance (predicate pushdown, join reordering)

Any system that mixes user intent with execution details pays the cost of that coupling in every subsequent optimization attempt.

### 12.2 Computation Has Strata; Honor Them

Tableau's three-tier formula system (row-level → LOD → table calcs) is not arbitrary. Each tier corresponds to a natural stratum in the SQL execution model:

- Row-level = SQL expressions in SELECT
- LOD = SQL subqueries at different GROUP BY levels
- Table calcs = post-SQL in-process computation

The order of operations (with its filter ordering) is the consequence of SQL's own execution model. Any formula system built on top of SQL will encounter the same strata. Pretending they do not exist (treating all calculations as equivalent) leads to subtly incorrect results that are hard to debug.

### 12.3 Represent Transformations as Query Plan Operators

The TDE's invisible join approach generalizes: if a transformation (decompression, LOD pre-aggregation, type conversion) can be represented as a join in the query plan, the strategic optimizer can apply standard techniques (predicate pushdown, join reordering, common subexpression elimination) to it. Opaque transformations cannot be optimized.

For a pipeline-based data wrangling system, this means: each transformation step should have a logical representation that the optimizer can reason about, not just an executable closure.

### 12.4 Two-Phase Optimization: Static Structure + Runtime Statistics

The TDE's strategic + tactical model is a practical architecture for query optimization under uncertainty:

- Compile-time rules determine the shape of the plan (which operators appear, in what order)
- Runtime statistics determine the implementation of each operator (which algorithm, which data structure)

This separation avoids both over-fitting to statistics that may be stale and under-utilizing information that is only available at runtime. Modern analytical engines (DuckDB, Hyper, ClickHouse) all use variants of this pattern.

### 12.5 Track Metadata Throughout the Pipeline

Column-level statistics (min, max, cardinality, nullability, sortedness) are cheap to compute during data loading and enormously valuable for downstream decisions. The TDE showed that this metadata can be extracted at near-zero additional cost when it is computed as a side effect of compression steps that are happening anyway.

For any system that processes data through a pipeline, instrumenting each step to extract and propagate these statistics enables better decisions at every subsequent step without requiring the user to annotate schemas or maintain separate statistics.

### 12.6 The Single-File Principle

Both `.tde` and `.hyper` files are single portable files. This is not an accident — it was a deliberate constraint that drove the entire compression architecture. Single-file databases are fundamentally more user-friendly than multi-file or process-based databases:

- Users understand files, not database connections
- Sharing is trivial (copy one file)
- Backup is trivial (copy one file)
- Version control is possible (though impractical at large sizes)
- No setup or configuration required

For any tool that needs to persist analytical state for offline or portable use, the single-file model is worth the architectural constraints it imposes.

### 12.7 Minimal Type Systems Enable Maximum Optimization

Tableau's six types (Boolean, integer, real, date, timestamp, string) enable the engine to make aggressive storage decisions without breaking user-facing semantics. A user who declares a field "integer" does not care whether it is stored as 1, 2, 4, or 8 bytes — but that choice has a 2–8× impact on memory usage and hash performance.

SQL's rich type system (NUMERIC(p,s), VARCHAR(n), TIMESTAMPTZ, etc.) constrains what an engine can do. Abstracting away the storage representation behind a minimal semantic type system decouples user intent from storage reality.

### 12.8 The Semantic Layer Lock-In Problem

Every BI tool that stores metric definitions internally (Tableau calculated fields, Power BI DAX measures, Looker LookML) creates tool lock-in. When "revenue" is defined in three places — a Tableau workbook, a Power BI model, and a Jupyter notebook — it will eventually be defined three different ways. The industry resolution is the headless semantic layer: metrics defined once, in a source-of-truth system, consumed via standard interfaces by any downstream tool.

For any tool building toward a data ecosystem position (rather than a standalone tool position), the question is whether to join the semantic layer ecosystem or build another silo. The tools that built silos (Tableau's published data sources, Power BI's tabular models) have strong network effects but face growing pressure from warehouse-native semantic layers (Snowflake Semantic Views, Databricks Unity Catalog Metric Views) that make the BI tool's semantic layer redundant.

---

## References

- Stolte, C., Tang, D., & Hanrahan, P. (2008). Polaris: A System for Query, Analysis, and Visualization of Multidimensional Databases. _Communications of the ACM_, 51(11), 75–84. (Originally IEEE TVCG 2002.)
- Hanrahan, P. (2006). VizQL: A Language for Query, Analysis and Visualization. _SIGMOD 2006_, Chicago, IL.
- Wesley, R. & Terlecki, P. (2014). Leveraging Compression in the Tableau Data Engine. _SIGMOD 2014_, Snowbird, UT.
- Kemper, A. & Neumann, T. (2011). HyPer: A Hybrid OLTP&OLAP Main Memory Database System Based on Virtual Memory Snapshots. _ICDE 2011_.
- Russo, M. & Ferrari, A. _The Definitive Guide to DAX_. Microsoft Press.
- Looker / Google. LookML Reference Documentation. https://cloud.google.com/looker/docs
- Tableau Software. Hyper API Documentation. https://tableau.github.io/hyper-db
- Tableau Software. Order of Operations. https://help.tableau.com/current/pro/desktop/en-us/order_of_operations.htm
