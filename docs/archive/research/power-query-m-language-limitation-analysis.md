# **Architectural Critique of Power Query M: Implications for Declarative Data Transformation Engine Design**

## **1\. Introduction**

The design of a data transformation engine is a complex exercise in balancing expressiveness, performance, and usability. As you transition your internal tool—based on a JSON-based specification similar to Vega-Lite—into a public-facing product, a comparative analysis of established paradigms is essential for ensuring architectural robustness. Power Query, powered by the M formula language, serves as the preeminent case study in this domain. It represents a specific philosophical choice: a functional, case-sensitive, partially lazy, and strongly typed data mashup engine rooted in the semantics of F\# and Haskell.1 While M has achieved widespread adoption within the Microsoft ecosystem, its design decisions introduce distinct limitations regarding granularity, error propagation, performance predictability, and abstraction transparency.

This report provides an exhaustive technical critique of the M language architecture. It dissects the internal mechanisms of lazy evaluation, query folding, immutable data structures, and the data privacy firewall to expose the friction points that plague high-performance ETL (Extract, Transform, Load) scenarios. By contrasting M’s code-centric, functional flexibility with the constraints of a declarative JSON specification, this analysis identifies specific "unsatisfied requirements" in the M paradigm—such as the lack of native regular expressions, the opacity of push-down optimization, and the fragility of schema drift handling. These insights are synthesized into actionable architectural considerations for the design of a robust, granularity-aware JSON transformation engine.

## **2\. The Functional Paradigm and Evaluation Architecture**

The foundational architecture of M is built upon a functional paradigm that dictates how data flows, how state is managed—or rather, avoided—and, most critically, _when_ computations occur. For an architect designing a JSON-based specification, understanding the divergence between M’s lazy evaluation model and the typical imperative execution of transformation lists is prerequisite to mitigating performance volatility.

### **2.1 Lazy Evaluation Mechanics vs. Eager Execution**

M employs a hybrid evaluation model that is predominantly lazy but behaves eagerly in specific, often counter-intuitive contexts. In a standard eager language, expressions are evaluated as soon as they are bound to a variable. In M, evaluation is deferred until the value is strictly required by a downstream consumer, typically the final output (the in clause of a let expression) or a step requiring data inspection.2

#### **The Architecture of Laziness and Granularity**

Lazy evaluation allows M to define complex transformation graphs where entire branches of logic may never execute if they are filtered out prior to materialization. Ideally, this supports a "pay-for-play" performance model. For example, a user may define a transformation graph that joins two massive tables and subsequently filters the result to the top 10 rows. Because of laziness, the engine propagates the "top 10" requirement upstream. If the source supports push-down optimization (Query Folding), the join operation is never performed in the application memory; instead, a SELECT TOP 10 query is generated. If folding is not possible, the engine acts as a streaming pipeline, processing just enough data to satisfy the request.3

However, this architecture introduces significant unpredictability in debugging and performance tuning, a phenomenon described as the "illusion of sequentiality." The Power Query user interface presents transformations as a linear sequence of "Applied Steps." This is an abstraction over nested let expressions, where each step is a variable bound to the result of a function applied to the previous step. While the UI implies an imperative order ($Step\_1 \\rightarrow Step\_2 \\rightarrow Step\_3$), the lazy evaluator treats this as a dependency graph. The engine is free to reorder these steps for optimization, meaning the execution order does not necessarily match the lexical order of the script.3

For a JSON-based specification (like Vega-Lite’s transform array), users typically infer an imperative sequence: "First filter, then aggregate." If your engine adopts M’s lazy reordering without explicit transparency, users may encounter "time-traveling" errors. A data type mismatch in a column that is supposedly removed in Step 3 might cause a failure in Step 1 if the optimizer pushes a filter upstream that relies on that column. This deferred error propagation makes debugging complex; validity becomes context-dependent rather than intrinsic to the definition.5

#### **Partial Eagerness and Performance Cliffs**

M is not purely lazy, and its "partial laziness" creates treacherous performance cliffs. While list, record, and table member expressions are lazy, function arguments are typically evaluated eagerly.1 Furthermore, specific primitives force the materialization of the data stream. Operations such as List.Count, Table.RowCount, or Table.Sort act as "blocking" transformations. They require the engine to scan the entire input dataset to determine cardinality or order before a single result can be emitted.1

This has profound implications for the granularity of transformation steps. A user might insert a seemingly innocuous step, such as adding an Index Column to track row lineage. In M, generating a sequential index forces a full scan of the table to establish order, effectively breaking the streaming pipeline. If this step is placed early in a query targeting a 10-million-row dataset, the engine shifts from a low-memory streaming mode to a high-memory buffering mode, potentially paging gigabytes of data to disk. The M language provides no inherent warning that the "granularity" of the pipeline has shifted from $O(1)$ memory complexity to $O(N)$.6

### **2.2 Immutability and the Cost of State**

M enforces strict immutability. Variables in M are immutable; once a table, list, or record is assigned a value, it cannot be modified. A "transformation" is semantically the creation of a new data structure that references the previous one. This aligns with functional programming principles but introduces specific memory management challenges in high-volume ETL.

#### **The Recursive Evaluation Trap**

In a mutable system, adding a column modifies the table in place. In M, it wraps the existing table in a new "view." While this enables features like time-travel debugging (inspecting any previous step), it relies heavily on the engine's ability to optimize the chain of wrappers. Research indicates a critical flaw in this design regarding repeated references. Because intermediate states are not cached by default—unless explicitly buffered via Table.Buffer—referencing a step multiple times in downstream logic can trigger the re-evaluation of the entire upstream dependency chain for _each_ reference.7

Consider a scenario where a user sorts a table (Step A) and then calculates two separate statistics from it (Step B and Step C). In a naive imperative execution, Step A runs once. In M’s immutable, lazy model, calculating Step B triggers the evaluation of A, and calculating Step C triggers the evaluation of A _again_. This redundancy is often invisible to the user until execution times balloon. This suggests that your JSON specification must explicitly define semantics for intermediate caching. If a JSON step defines an intermediate dataset ID, the engine must rigorously decide whether that ID represents a _view_ (re-calculated on access) or a _materialized artifact_ (calculated once). M defaults to the view, which traps many users into performance loops.7

### **2.3 Streaming Semantics vs. Buffering**

The distinction between streaming and buffering is central to M’s ability to handle datasets larger than available RAM. The engine attempts to stream data row-by-row whenever possible. However, the mixing of streaming and non-streaming sources often leads to "fallback" behaviors that are detrimental to performance.

When a query involves a native SQL source (streaming) and an Excel file (streaming but often loaded into memory), M attempts to stream both. However, if a transformation requires multiple passes over the data—such as a self-join or a complex grouping—the engine may decide to "spool" the data to a local disk cache. The limits of this cache and the thresholds for triggering it are opaque. Users often encounter "Container exited unexpectedly" errors when the spooled data exceeds temporary storage limits, a failure mode that is essentially a granularity problem: the engine failed to break the large operation into manageable chunks.6

**Insight for JSON Engine Design:** If your JSON specification allows users to arbitrarily mix streaming transformations (e.g., filter, map) with blocking transformations (e.g., sort, join), you must provide granular feedback on when the pipeline switches execution modes. M’s failure is its silence; it attempts to manage this switching invisibly, leading to catastrophic performance degradation that appears random to the user.

## ---

**3\. The Query Folding Mechanism (Push-down Optimization)**

Query Folding is arguably the most powerful yet fragile feature of Power Query. It is the process of translating M expressions into the native query language of the source system (e.g., T-SQL, OData, Snowflake SQL). For a tool intended to be robust and granular, the mechanics and failures of M’s folding engine provide a critical roadmap of what to avoid.

### **3.1 The Mechanics of Translation and the "Opaque" Barrier**

The M engine constructs a query plan by traversing the expression tree from the final output back to the source. As long as the nodes in the tree map to direct equivalents in the source language, the engine collapses ("folds") them into a single request string. This allows operations like filtering, selection, and aggregation to occur on the database server, utilizing the database's indexing and compute power.3

However, this folding chain is incredibly brittle. Folding stops the moment the engine encounters a transformation it cannot translate. This is often an "opaque" function—a custom M function, a specific transform like Table.TransformColumns with complex logic, or a data type conversion that doesn't map perfectly to the SQL type system. Once folding breaks, _all_ subsequent transformations must be performed locally by the M engine.10

This introduces a massive granularity issue. If a user applies a "Capitalize Each Word" transform (which might not fold to certain SQL dialects) on a 10-million-row dataset _before_ applying a filter for the current year, the folding chain breaks at the capitalization step. The M engine is then forced to retrieve all 10 million rows from the database, transmit them over the network, and filter them in local memory. The difference in granularity is strictly the difference between fetching 10 million rows vs. fetching 1,000 rows, yet the user specification looks nearly identical in the UI.5

### **3.2 Opacity of Folding Status**

One of M's significant design deficits is the opacity of this folding status. Until very recently, there were no visual indicators in the Power Query UI to show which steps were folding. Users were forced to right-click steps and check if the "View Native Query" option was active—a heuristic that is famously unreliable and often grayed out even when folding is occurring.12

For your JSON-based tool, this highlights a critical requirement: **Explicit Pushdown Metadata**. If your tool intends to support push-down optimization (translating JSON specs to SQL), the "foldability" of a step should not be a mystery. The specification should support strict execution modes, such as a property "executionMode": "source", which causes the pipeline to fail explicitly if the step cannot be executed at the source. This prevents the silent fallback to slow local execution that plagues M users.14

### **3.3 Structural Limitations and Native Queries**

Folding in M is also inhibited by structural rigidity. If a user writes a raw SQL statement in the source step (e.g., Value.NativeQuery), M treats this as a black box. Because it cannot parse the user-supplied SQL to safely append WHERE clauses, it refuses to fold subsequent steps unless the user explicitly sets EnableFolding=true, an advanced and often undiscoverable setting.6

This "Native Query" limitation is a warning for JSON specification design. If your tool allows users to inject raw SQL snippets (a common "escape hatch"), you must consider how those snippets interact with the rest of the declarative pipeline. M’s approach is defensive (disable optimization), which protects correctness but sacrifices performance. A more robust approach might involve using a transpiler that can parse and extend the user's SQL, or forcing user SQL to be a sub-query or Common Table Expression (CTE) that can be safely wrapped.6

### **3.4 Recursion and Query Plan Depth**

Research into M’s limitations reveals that deep recursion or complex lineage can trigger stack overflow errors or recursion limit exceptions in the engine. When the expression tree becomes too deep—common in scenarios involving recursive parent-child hierarchy flattening or iterative API pagination—the folding engine can crash or timeout.15

M is a functional language that relies on recursion for iteration in the absence of traditional loops. While it supports tail-call optimization (TCO), not all recursive functions are tail-recursive, and the query planner has finite depth limits (often around 1,000 to 2,000 frames). This limits the granularity of recursion; users cannot simply "process until done" on deeply nested structures without risking a crash. For a JSON tool, avoiding implicit recursion in favor of explicit iterative constructs (like List.Generate equivalents handled by the engine's loop) is crucial for robustness.17

## ---

**4\. Data Privacy and the Partitioning Firewall**

A unique, security-focused, and often frustrating aspect of M is its "Data Privacy Firewall." This mechanism is designed to prevent unintentional data leakage between sources, but its implementation introduces significant complexity and imposes artificial boundaries on data granularity.

### **4.1 The "Formula.Firewall" Partitioning Logic**

The Firewall operates by dividing the M code into "partitions." A partition is a self-contained unit of execution. The core rule governing these partitions is strict: **A partition may access compatible data sources OR reference other partitions, but not both.** This is intended to prevent "cross-contamination," such as a query that reads a list of confidential customer IDs from an internal SQL database (Source A) and uses them to query an external, public web API (Source B).18

While noble in intent, this logic creates the infamous Formula.Firewall error: _"Query references other queries or steps, so it may not directly access a data source."_ This error blocks valid data integration patterns. For example, if a user tries to parameterize a SQL query using a value derived from a separate Excel configuration file, the Firewall may interpret this as mixing partitions and block execution.

### **4.2 The "Fast Combine" Paradox**

To bypass these errors, users are often forced to restructure their code into a single, monolithic query (flattening the logic) or disable the Firewall entirely via the "Ignore the Privacy Levels" setting (often called "Fast Combine"). Disabling the Firewall restores performance and flexibility but removes the security guarantees, exposing the organization to data leakage risks. This binary choice—broken query or insecure query—is a significant design flaw.19

### **4.3 Granularity of Privacy Controls**

The root of the problem is the granularity of M’s privacy controls. Privacy levels (Private, Organizational, Public) are applied at the _source_ level (e.g., the entire SQL server domain), not at the _table_, _column_, or _row_ level. This coarse granularity means that even safe data (e.g., a public currency exchange rate table) cannot be used to filter a query against a sensitive source if the firewall rules are triggered.

**Implication for Internal Tools:** If your JSON tool is intended for internal use, you might be tempted to skip this complexity. However, the lesson from M is that mixing data sources requires explicit boundaries. If your JSON spec allows interpolating values from one dataset into the query parameters of another, you must explicitly decide if this is allowed. M’s restrictive approach causes friction; a completely permissive approach risks security. A superior design would involve explicit "Safe to Send" tagging in the JSON specification, allowing users to granularly whitelist specific fields for transmission to external sources, rather than blocking entire queries.21

## ---

**5\. Type Systems, Schema Drift, and Metadata**

In strictly typed ETL tools (like SSIS or Informatica), the schema is static and defined at design time. In M, the schema is dynamic but propagated via metadata, creating a hybrid environment that struggles with "Schema Drift."

### **5.1 The Table.Schema Performance Penalty**

M provides introspection via Table.Schema, which returns metadata about columns (names, types, precision). However, calculating this schema can be expensive. Some connectors require reading actual data rows to infer schema (e.g., CSVs or JSONs without headers), while others provide it via metadata endpoints (like $metadata in OData). Because M is lazy, it tries to defer this schema discovery, but the UI often forces it to render previews.23

Research highlights that deep metadata propagation is fragile. If transformation logic is complex—for example, a custom function applied to a column—M often loses track of the specific metadata (like "IsKey" or precision) and reverts to a generic any type. This forces downstream steps to re-discover or re-validate types, adding computational overhead and breaking optimizations that rely on known types.25

### **5.2 Handling Dynamic Columns (Schema Drift)**

One of the most requested features in M is better handling of dynamic columns. M scripts generated by the UI usually hardcode column names (e.g., Table.SelectColumns(Source, {"ColA", "ColB"})). If the source schema changes (drift)—for example, if "ColB" is renamed to "Col_Beta"—the script fails immediately with a "Column not found" error.26

While M allows for dynamic coding (e.g., Table.SelectColumns(Source, Table.ColumnNames(Source))), the language defaults to static lists for stability. This creates a robustness gap. A robust JSON specification should support **pattern-based column selection** natively. Inspired by Vega-Lite’s declarative nature, your tool should allow selecting columns via regex (e.g., select: { pattern: "^Sales\_.\*" }) or by type (e.g., select: { type: "number" }). M lacks these native "smart selection" primitives, forcing users to write verbose custom M code to handle inevitable schema changes.28

## ---

**6\. Granularity, Recursion, and Error Handling**

The user query specifically asks about "granularity." In the context of M, this refers to the atomic unit of transformation and how errors are handled within those units.

### **6.1 The "Applied Steps" Abstraction vs. Performance**

Power Query encourages users to create many small steps (e.g., Step 1: Rename Column, Step 2: Change Type, Step 3: Filter). While this improves readability and debugging (allowing users to preview the data at any state), it introduces performance overhead. Each step is conceptually a new let-binding. While the compiler attempts to optimize this, excessive stepping can bloat the query graph.

Research suggests that consolidating steps—for example, performing renaming, type changing, and filtering in a single Table.TransformColumns or Table.SelectRows call—can improve performance by reducing the overhead of intermediate table wrappers. However, M’s UI generates granular steps by default. For your JSON tool, you must decide: does one entry in the transform array correspond to one atomic operation that triggers a full pass over the data, or can a single object describe a composite operation? M shows that granular steps are easier to debug but can be verbose and computationally redundant if not optimized by the engine.29

### **6.2 Regex and Advanced String Parsing**

A significant functional gap in M is the lack of native **Regular Expression (Regex)** support. Users are forced to parse strings using awkward Text.PositionOf, Text.Split, and Text.Range logic, or invoke JavaScript via a hidden Web control hack which is slow and unsupported in all environments. This forces users to break what should be a single "Parse" step into 10 or 20 granular substring operations, ruining the readability of the solution and exploding the step count.31

**Design Recommendation:** For a modern transformation tool, native Regex support is non-negotiable. It allows complex parsing logic to be expressed in a single, granular step rather than a sprawling chain of text functions.

### **6.3 Error Handling and the try Primitive**

M’s error handling mechanism is built around the try...otherwise construct (similar to try...catch). However, its granularity is a frequent point of criticism. try operates on the expression level. If a user wraps a massive table transformation in a try, any error in _any_ cell causes the catch to fire.

There is no native, performant way to say "skip rows with errors" without writing row-by-row logic (Table.AddColumn(Source, "SafeVal", each try \[Val\] otherwise null)). This row-by-row iteration usually prevents query folding and forces the engine to process data in memory. Furthermore, M errors often lack a detailed stack trace showing exactly _which_ step in the dependency graph caused the failure. The error message usually comes from the primitive operator (e.g., "We couldn't convert to Number"), without context on the business logic step that invoked it.34

## ---

**7\. Comparative Analysis: Imperative Script vs. Declarative JSON**

The user is building a tool inspired by Vega-Lite’s JSON transform specification. This fundamentally changes the architecture from an _Evaluated Script_ (M) to an _Interpreted Specification_ (JSON).

### **7.1 Expressiveness vs. Safety**

**Power Query M (Script):**

- **Nature:** Turing-complete functional language.
- **Pros:** Infinite flexibility. Users can define custom functions, use recursion, and implement complex control flow.36
- **Cons:** Difficult to analyze statically. Security risks (infinite loops, resource exhaustion). Hard to build a UI that covers 100% of the language surface. The "Advanced Editor" often breaks the visual "Gear Icon" UI when users write custom code.37

**JSON Spec (Declarative):**

- **Nature:** Constrained configuration. Describes _what_ to do (Filter, Aggregate, Bin) rather than _how_.
- **Pros:** Easy to validate via JSON Schema. Easy to serialize and transport. Easy to build a UI over (property editors). Optimization is easier because the intent is explicit (e.g., "Aggregate" is a known high-level op, not a user-written loop).39
- **Cons:** The "Wall of Impossibility." If the spec doesn't support a specific transformation (e.g., a specific mathematical regression), the user is stuck unless there is an "escape hatch."

### **7.2 The "Escape Hatch" Problem and Stringly-Typed Logic**

Tools like Azure Data Factory (ADF) use a JSON-based pipeline language (Data Flow Script \- DFS). However, to handle complex logic, ADF allows "Visual Expressions" which are essentially code snippets inside the JSON strings. This creates a "stringly typed" architecture where logic is buried in escaped JSON strings, difficult to lint, validate, or read. M avoids this by being a first-class language. Your tool must ensure that the JSON structure doesn't simply become a wrapper for ugly, unvalidatable code strings.41

### **Table 1: Feature Comparison \- M vs. Declarative JSON Architectures**

| Feature             | Power Query M (Functional Script) | Declarative JSON (e.g., Vega-Lite/ADF)    | Implications for Robustness                                                        |
| :------------------ | :-------------------------------- | :---------------------------------------- | :--------------------------------------------------------------------------------- |
| **Execution Model** | Lazy Evaluation (Pull)            | Typically Eager/DAG (Push)                | M's laziness hides errors; JSON's eagerness fails fast (better for debugging).     |
| **Optimization**    | Implicit Query Folding            | Explicit Push-down / Transpilation        | M's folding is opaque and fragile. JSON allows for explicit "run on server" flags. |
| **Custom Logic**    | First-class functions             | "Stringly-typed" expressions or rigid ops | JSON tools struggle with custom logic without embedding a script engine.           |
| **State**           | Immutable, strictly scoped        | Pipeline state (steps passed forward)     | M's immutability causes memory bloat on wide tables if not optimized.              |
| **Schema Drift**    | Weak (Static names default)       | Can be strong (Pattern matching)          | JSON specs can easily support regex-based field selection, unlike M.               |
| **Granularity**     | High (Cell/Row level access)      | Medium (Set/Column level operations)      | M allows deeper granularity but risks performance; JSON enforces set-based ops.    |

## ---

**8\. Conclusion and Recommendations**

Power Query M is a marvel of functional language design applied to the mundane world of ETL. Its strengths—laziness, expressiveness, and a code-first approach—are also the sources of its greatest limitations: performance unpredictability, opaque optimization (folding), and difficult error handling.

For your internal tool transitioning to a public product, the path to robustness lies in **constraining flexibility in favor of predictability**. The "granularity" of your solution should not mimic M's cell-level access, which invites performance degradation, but should rather focus on set-based operations that are transparently optimized.

**Key Architectural Recommendations:**

1. **Abandon the "Lazy" Default for Validation:** Do not replicate M's deferred error reporting. Implement a strict "validate-first" phase that checks schema and types eagerly before execution begins. This avoids the "time bomb" effect where pipelines fail hours into a run due to a type mismatch in the first step.
2. **Make Push-down Explicit:** Avoid the "black box" of M’s query folding. If your JSON spec translates to SQL, provide a visual or metadata indicator of _exactly_ what is being pushed down. Allow users to enforce push-down with an executionMode: "remote" flag.
3. **Implement Native "Smart" Granularity:** Include high-level primitives that M lacks—specifically **Regular Expressions** and **Pattern-based Column Selection**. This allows users to express complex parsing and schema-drift handling logic in single, atomic steps, reducing the "step explosion" seen in M queries.
4. **Manage State Explicitly:** Unlike M’s implicit caching of immutable views, allow users to mark specific steps as **Checkpoints** (cache: true). This gives the user control over the memory/performance trade-off, fixing the re-evaluation loops common in Power Query.
5. **Granular Privacy/Security:** If data integration is a feature, implement security boundaries at the _column_ level (masking sensitive fields) rather than the query level, avoiding the "Firewall" blocking issues that force users to disable security for performance.

By addressing these "blind spots" in the M architecture, your JSON-based tool can offer a more robust, transparent, and performant experience, successfully bridging the gap between the flexibility of code and the safety of configuration.

#### **Works cited**

1. Power Query M Primer (Part 5): Paradigm | Ben Gribaudo, accessed January 18, 2026, [https://bengribaudo.com/blog/2018/02/28/4391/power-query-m-primer-part5-paradigm](https://bengribaudo.com/blog/2018/02/28/4391/power-query-m-primer-part5-paradigm)
2. Evaluation model \- PowerQuery M \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/powerquery-m/evaluation-model](https://learn.microsoft.com/en-us/powerquery-m/evaluation-model)
3. Understanding query evaluation and query folding in Power Query \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/power-query/query-folding-basics](https://learn.microsoft.com/en-us/power-query/query-folding-basics)
4. On lazy value evaluation order in Power Query and Power BI | Excel Inside, accessed January 18, 2026, [http://excel-inside.pro/blog/2017/01/17/on-lazy-value-evaluation-order-in-power-query-and-power-bi/](http://excel-inside.pro/blog/2017/01/17/on-lazy-value-evaluation-order-in-power-query-and-power-bi/)
5. How smart (lazy) is Power Query M? : r/PowerBI \- Reddit, accessed January 18, 2026, [https://www.reddit.com/r/PowerBI/comments/1nkwf1q/how_smart_lazy_is_power_query_m/](https://www.reddit.com/r/PowerBI/comments/1nkwf1q/how_smart_lazy_is_power_query_m/)
6. Query folding guidance in Power BI Desktop \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/power-bi/guidance/power-query-folding](https://learn.microsoft.com/en-us/power-bi/guidance/power-query-folding)
7. Tables, Numbers, Immutability And Power Query Performance \- Chris Webb's BI Blog, accessed January 18, 2026, [https://blog.crossjoin.co.uk/2019/08/18/immutability-and-power-query-performance/](https://blog.crossjoin.co.uk/2019/08/18/immutability-and-power-query-performance/)
8. How do immutable data structures give a performance optimization over mutable data structures? \- Quora, accessed January 18, 2026, [https://www.quora.com/How-do-immutable-data-structures-give-a-performance-optimization-over-mutable-data-structures](https://www.quora.com/How-do-immutable-data-structures-give-a-performance-optimization-over-mutable-data-structures)
9. Power Query specifications and limits in Excel \- Microsoft Support, accessed January 18, 2026, [https://support.microsoft.com/en-us/office/power-query-specifications-and-limits-in-excel-5fb2807c-1b16-4257-aa5b-6793f051a9f4](https://support.microsoft.com/en-us/office/power-query-specifications-and-limits-in-excel-5fb2807c-1b16-4257-aa5b-6793f051a9f4)
10. PowerQuery Query Folding pros and cons : r/PowerBI \- Reddit, accessed January 18, 2026, [https://www.reddit.com/r/PowerBI/comments/1igop7l/powerquery_query_folding_pros_and_cons/](https://www.reddit.com/r/PowerBI/comments/1igop7l/powerquery_query_folding_pros_and_cons/)
11. Understand Query folding in Power BI in 13 minutes\! \- YouTube, accessed January 18, 2026, [https://www.youtube.com/watch?v=hIbR0EwdCqM](https://www.youtube.com/watch?v=hIbR0EwdCqM)
12. Understanding Query Folding in Power BI and How to Use View Native Query \- CertLibrary Blog, accessed January 18, 2026, [https://www.certlibrary.com/blog/understanding-query-folding-in-power-bi-and-how-to-use-view-native-query/](https://www.certlibrary.com/blog/understanding-query-folding-in-power-bi-and-how-to-use-view-native-query/)
13. Query folding indicators in Power Query \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/power-query/step-folding-indicators](https://learn.microsoft.com/en-us/power-query/step-folding-indicators)
14. Query Folding in Power BI: The Secret to Faster Data Refresh & Performance | phData, accessed January 18, 2026, [https://www.phdata.io/blog/query-folding-in-power-bi-the-secret-to-faster-data-refresh-performance/](https://www.phdata.io/blog/query-folding-in-power-bi-the-secret-to-faster-data-refresh-performance/)
15. RecursionError: maximum recursion depth exceeded in comparison · Issue \#1080 \- GitHub, accessed January 18, 2026, [https://github.com/fishtown-analytics/dbt/issues/1080](https://github.com/fishtown-analytics/dbt/issues/1080)
16. python \- What is the maximum recursion depth, and how to increase it? \- Stack Overflow, accessed January 18, 2026, [https://stackoverflow.com/questions/3323001/what-is-the-maximum-recursion-depth-and-how-to-increase-it](https://stackoverflow.com/questions/3323001/what-is-the-maximum-recursion-depth-and-how-to-increase-it)
17. Power Query \- Recursive Function Issues on Large Dataset : r/excel \- Reddit, accessed January 18, 2026, [https://www.reddit.com/r/excel/comments/ozt939/power_query_recursive_function_issues_on_large/](https://www.reddit.com/r/excel/comments/ozt939/power_query_recursive_function_issues_on_large/)
18. Behind the scenes of the Data Privacy Firewall \- Power Query | Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/power-query/data-privacy-firewall](https://learn.microsoft.com/en-us/power-query/data-privacy-firewall)
19. How to solve the Power Query "Privacy Firewall Error" \- Accounting.bi, accessed January 18, 2026, [https://accounting.bi/tips/how-to-solve-the-power-query-privacy-firewall-error/](https://accounting.bi/tips/how-to-solve-the-power-query-privacy-firewall-error/)
20. Formula Firewall Query References Other Queries or Steps \- Power BI forums, accessed January 18, 2026, [https://community.powerbi.com/t5/Power-Query/Formula-Firewall-Query-References-Other-Queries-or-Steps/td-p/2990837](https://community.powerbi.com/t5/Power-Query/Formula-Firewall-Query-References-Other-Queries-or-Steps/td-p/2990837)
21. Formula.Firewall Error when Iterating through one table to create another \- Power BI forums, accessed January 18, 2026, [https://community.powerbi.com/t5/Power-Query/Formula-Firewall-Error-when-Iterating-through-one-table-to/td-p/891753](https://community.powerbi.com/t5/Power-Query/Formula-Firewall-Error-when-Iterating-through-one-table-to/td-p/891753)
22. Behind the scenes of the Data Privacy Firewall |Power Query Advanced Tutorial Ep3 |BI Consulting Pro \- YouTube, accessed January 18, 2026, [https://www.youtube.com/watch?v=RRA72BMcEUQ](https://www.youtube.com/watch?v=RRA72BMcEUQ)
23. Handling schema for Power Query connectors \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/power-query/handling-schema](https://learn.microsoft.com/en-us/power-query/handling-schema)
24. Metadata \- PowerQuery M | Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/powerquery-m/metadata](https://learn.microsoft.com/en-us/powerquery-m/metadata)
25. Power BI M-language Data Structures | by R. Ganesh \- Medium, accessed January 18, 2026, [https://medium.com/@rganesh0203/m-language-data-structures-2600268858bd](https://medium.com/@rganesh0203/m-language-data-structures-2600268858bd)
26. How to handle schema drift in Dataflow Gen2 \- Microsoft Fabric, accessed January 18, 2026, [https://learn.microsoft.com/en-us/fabric/data-factory/how-to-handle-schema-drift](https://learn.microsoft.com/en-us/fabric/data-factory/how-to-handle-schema-drift)
27. Has Power Query become stricter on schema changes? : r/PowerBI \- Reddit, accessed January 18, 2026, [https://www.reddit.com/r/PowerBI/comments/1begxyp/has_power_query_become_stricter_on_schema_changes/](https://www.reddit.com/r/PowerBI/comments/1begxyp/has_power_query_become_stricter_on_schema_changes/)
28. Dynamic column changes handler \- Microsoft Fabric Community \- Power BI forums, accessed January 18, 2026, [https://community.powerbi.com/t5/Desktop/Dynamic-column-changes-handler/td-p/2867766](https://community.powerbi.com/t5/Desktop/Dynamic-column-changes-handler/td-p/2867766)
29. Power BI Power Query best practices \- Zenzero, accessed January 18, 2026, [https://zenzero.co.uk/news/power-bi-power-query-best-practices](https://zenzero.co.uk/news/power-bi-power-query-best-practices)
30. Is combining steps better for performance? \- Microsoft Fabric Community \- Power BI forums, accessed January 18, 2026, [https://community.powerbi.com/t5/Power-Query/Is-combining-steps-better-for-performance/td-p/825828](https://community.powerbi.com/t5/Power-Query/Is-combining-steps-better-for-performance/td-p/825828)
31. Regex for subtracting texts by Power Query/ Dax \- Microsoft Fabric Community, accessed January 18, 2026, [https://community.powerbi.com/t5/Desktop/Regex-for-subtracting-texts-by-Power-Query-Dax/td-p/1220354](https://community.powerbi.com/t5/Desktop/Regex-for-subtracting-texts-by-Power-Query-Dax/td-p/1220354)
32. Power Query Regular Expression Hack \- Math Encounters Blog, accessed January 18, 2026, [https://www.mathscinotes.com/2020/02/power-query-regular-expression-hack/](https://www.mathscinotes.com/2020/02/power-query-regular-expression-hack/)
33. RegEx Support in PowerQuery (M) : r/excel \- Reddit, accessed January 18, 2026, [https://www.reddit.com/r/excel/comments/jdnx2s/regex_support_in_powerquery_m/](https://www.reddit.com/r/excel/comments/jdnx2s/regex_support_in_powerquery_m/)
34. M Language Error Handling \- PowerQuery M \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/powerquery-m/m-spec-error-handling](https://learn.microsoft.com/en-us/powerquery-m/m-spec-error-handling)
35. Power Query M Primer (Part 15): Error Handling | Ben Gribaudo, accessed January 18, 2026, [https://bengribaudo.com/blog/2020/01/15/4883/power-query-m-primer-part-15-error-handling](https://bengribaudo.com/blog/2020/01/15/4883/power-query-m-primer-part-15-error-handling)
36. M Language basic concepts \- PowerQuery M \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/powerquery-m/m-spec-basic-concepts](https://learn.microsoft.com/en-us/powerquery-m/m-spec-basic-concepts)
37. Excel Power Query Advanced Editor breaking code into steps \- Stack Overflow, accessed January 18, 2026, [https://stackoverflow.com/questions/55851220/excel-power-query-advanced-editor-breaking-code-into-steps](https://stackoverflow.com/questions/55851220/excel-power-query-advanced-editor-breaking-code-into-steps)
38. Edit Setting / Gear button (next to Source) is not visible \- Microsoft Fabric Community, accessed January 18, 2026, [https://community.fabric.microsoft.com/t5/Service/Edit-Setting-Gear-button-next-to-Source-is-not-visible/td-p/4063514](https://community.fabric.microsoft.com/t5/Service/Edit-Setting-Gear-button-next-to-Source-is-not-visible/td-p/4063514)
39. Programming language trade-offs | GarfieldTech, accessed January 18, 2026, [https://www.garfieldtech.com/blog/language-tradeoffs](https://www.garfieldtech.com/blog/language-tradeoffs)
40. Transformation \- Vega-Lite, accessed January 18, 2026, [https://vega.github.io/vega-lite/docs/transform.html](https://vega.github.io/vega-lite/docs/transform.html)
41. Mapping data flow script \- Azure Data Factory \- Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/azure/data-factory/data-flow-script](https://learn.microsoft.com/en-us/azure/data-factory/data-flow-script)
42. Parse data transformations in mapping data flow \- Azure Data Factory | Microsoft Learn, accessed January 18, 2026, [https://learn.microsoft.com/en-us/azure/data-factory/data-flow-parse](https://learn.microsoft.com/en-us/azure/data-factory/data-flow-parse)
