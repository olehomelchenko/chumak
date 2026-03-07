# Example Workflows — Brainstorming

> **Status**: Brainstorming / early design
> **Purpose**: Define example workflows that showcase Syto's capabilities, serving both as in-app onboarding and as a companion video for the website landing page.

---

## Two Delivery Formats

### Website Video (60-90 sec)

A single cohesive demo shown alongside onboarding on the website. Its job: "show me what this tool does so I decide to try it."

Requirements:

- One compelling scenario legible to the broad target audience (students, analysts, non-programmers)
- Fast pace — every step visibly transforms the data
- At least one "wow" moment
- Ends with a clean, satisfying result

### In-App Onboarding

Guides users once they've already decided to try the tool. Possible forms:

- **"Start with an example" button** — loads a synthetic dataset + pre-built pipeline the user can explore step by step
- **Empty state scenario cards** — 2-3 options like "Clean survey data", "Reshape a gradebook", "Join two tables"
- **Step-level hints** — contextual example when a user adds a transform type for the first time

The video shows the _result_, the in-app example lets the user _poke at it_.

---

## Candidate Workflows

### Tier 1 — Strong for both video and in-app

#### Messy Survey Cleanup

A Google Forms / Typeform export with inconsistent responses. "Yes", "yes", "Y", "yeah" all mean the same thing. Free-text fields with mixed formats.

Transforms showcased: `replace` (regex), `conditional`, `trim`/`lower` (via `derive`), `types` conversion with error cells, `aggregate`.

Why it works: universally relatable, visually dramatic before/after, decomposes into clean in-app tips. **Best candidate for the landing page video.**

#### JSON Column Parsing

A CSV where one column contains JSON blobs (common when exporting from tools/APIs). Pull nested fields into proper columns.

Transforms showcased: `derive` with `json_extract`, `json_array_length`, `json_keys`, `json_type`.

Why it works: unique differentiator — most visual tools choke on embedded JSON. Clear before/after.

#### Wide-to-Long Reshape

A student gradebook or multi-metric dataset in wide format (one column per item). Unpivot it, then analyze.

Transforms showcased: `fold`, `derive` (letter grades via `conditional`), `aggregate` (averages), optionally `pivot` back.

Why it works: one of the most common data problems. The `fold` step is a natural "aha moment."

#### Synthetic Data → Full Pipeline

Start with the built-in data generator (no file needed), build a complete pipeline, export the result.

Transforms showcased: synthetic data generator, then a curated chain of transforms.

Why it works: zero friction for in-app onboarding — no file to find or download. Good "tour" format for video.

### Tier 2 — Better for video than in-app

#### Sales + Product Catalog Join

Transaction log with product IDs joined to a product reference table. Enrich, aggregate by category, rank top sellers.

Transforms showcased: `lookup`/`join`, `aggregate`, `sort`, `derive`.

Why it works: great story arc for a demo. But join setup is complex for a quick in-app hint.

#### Log Parsing with Regex

Apache/Nginx log lines parsed via regex into structured columns. Then aggregate by status code, analyze by time.

Transforms showcased: `derive` with `regexp_extract`, `parse_date`, `aggregate`, `filter`.

Why it works: impressive demo, but niche audience.

### Tier 3 — Better for in-app than video

#### Dedup a Contact List

Names in mixed formats, phone numbers inconsistent, duplicate entries.

Transforms showcased: `derive` with `regexp_extract`, `replace` with capture groups, `dedupe`, `split`.

Why it works: common practical need, good for in-app discovery. Not visually exciting enough for video.

#### Fill Missing Values

A dataset with gaps. Use imputation strategies, then analyze.

Transforms showcased: `impute` (constant, mean, median, forward fill, etc.).

Why it works: useful to discover in-app. A whole video might feel thin.

#### Time Series / Window Analytics

Daily prices or metrics. Moving averages, lag comparisons, rankings.

Transforms showcased: `window` with `op.lag`, `op.rank`, `op.row_number`, `derive` for % change.

Why it works: powerful analytical capability, great for in-app. Needs more context than a 90-sec video allows.

---

## Design Considerations

### Complexity Ladder

Workflows should span three levels:

- **Beginner** (3-5 steps): survey cleanup, dedup, impute
- **Intermediate** (6-10 steps): reshape + analyze, JSON parsing
- **Advanced** (10+ steps): joins, window functions, full pipelines

### "Aha Moment" Design

Each workflow should include at least one step where the user thinks "that's way easier than doing it in Excel." Natural candidates: reshape, regex, JSON parsing, conditional branching.

### Synthetic Data as Onboarding Ramp

The data generator means example workflows can be fully self-contained — no external files needed. This is a major advantage for in-app onboarding and removes the "bring your own CSV" barrier.

---

## Open Questions

- Which audience does the video primarily target — students, analysts, or generic?
- How many in-app example workflows to ship initially? (2-3 feels right)
- Should in-app examples be pre-built pipelines or guided walkthroughs?
- Should the video scenario match one of the in-app examples exactly?
