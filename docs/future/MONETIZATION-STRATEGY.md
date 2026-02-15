# Syto — Monetization Strategy

> Brainstormed February 2026. This is a living document — revisit as the product evolves.

---

## Guiding Principles

- Monetization must not compromise Syto's core values: local-only, no tracking, no accounts required for the core tool
- The free tier must remain genuinely useful — it's the growth engine
- Early supporters are rewarded, not exploited
- Each monetization step should validate demand before the next step requires investment

---

## Product Tiers

### 1. Free Tier (The Sieve)

Everything Syto does today: import, transform, export, EDA previews. This is the funnel — what people discover, try, and recommend to others.

### 2. Forever Pass — One-Time Purchase (The Workbench)

A one-time license for all local Pro features, including all future updates. Runs entirely in-browser, no backend dependency.

**Pro features (current candidates):**

- Advanced joins (semijoin, antijoin, lookup)
- JSON editor with linting
- Data generation
- Expression autocomplete and inline docs

**Pro features (planned):**

- Proto-dashboards: build and arrange Vega-Lite charts via GUI or manual spec editing
- Snippet management: save/reuse chart specs and transform workflows locally

**Pricing approach:**

- Launch at a low entry price (~$20-25) to maximize early adoption and signal
- Raise price as features ship (e.g., $35 after dashboards, $50 after snippets)
- Early buyers get the best deal — they paid less and receive everything that comes later

**Implementation:** License key checked locally (signed token in localStorage). Payment via Gumroad or LemonSqueezy — no custom billing infrastructure.

### 3. Gallery — Public Free / Private Paid (The Gallery)

A backend-powered snippet and workflow gallery. Arrives later, only after the local product proves demand.

| Access level | Price        | What you get                                                 |
| ------------ | ------------ | ------------------------------------------------------------ |
| Public       | Free         | Publish workflows, chart specs, dashboards for anyone to use |
| Private      | Subscription | Private storage for proprietary workflows and data specs     |

**Why this model works:**

- Public assets are free marketing — shared workflows surface in search, drive new users to Syto
- Private storage is the natural paid tier — analysts with proprietary data won't publish but will pay for convenience
- Proven model (GitHub, CodePen, Observable, Figma Community)

**Early adopter reward:** Forever pass holders get private gallery access free or at a significant discount for an extended period. Details TBD — keep it simple (a flag on the license, not an elaborate tier system).

---

## Revenue Summary

| Product           | Model             | Audience                               |
| ----------------- | ----------------- | -------------------------------------- |
| Free tier         | Free forever      | Everyone — the growth engine           |
| Forever pass      | One-time purchase | Power users, repeat users, analysts    |
| Gallery (public)  | Free              | Community contributors, educators      |
| Gallery (private) | Subscription      | Teams, corporate analysts, consultants |

No overlap, no confusion between tiers.

---

## Rollout Sequence

Each step validates the next. No large upfront commitments.

### Step 1: Forever Pass (near-term)

- Gate current advanced features behind a local license check
- Set up payment page (Gumroad/LemonSqueezy)
- Start collecting revenue and demand signal

### Step 2: Dashboards & Snippets (medium-term)

- Add proto-dashboard feature (Vega-Lite chart builder on transformed data)
- Port snippet management from existing Vega-Lite project (extract core logic, build Syto-native UI)
- Pass holders get these automatically; raise price for new buyers

### Step 2.5: DuckDB-WASM Performance Tier (medium-term, optional)

- Integrate DuckDB-WASM to lift the browser's ~100K row ceiling to millions
- Add Parquet import/export (DuckDB-WASM handles this natively)
- Faster query execution for heavy transforms (joins, aggregations, pivots)
- Stays entirely in-browser — no Electron, no new distribution channel, no separate product
- Natural Pro feature for the forever pass; strong price-raise justification

This cherry-picks the highest-value capabilities from the [Native App Spec](NATIVE-APP-SPEC.md) — performance and format support — without the full Electron migration overhead. Relevant sections from that spec: §1 (data engine), §12 (performance), §14.2 (DuckDB integration), §14.4 (expression migration).

**What to reuse from the native spec:**

- Expression-to-SQL translation approach (§9, §14.4) — same AST, different target
- SQL generation patterns for transforms (§14.2) — adapt for DuckDB-WASM API
- Type system mapping (§2, §14.7) — DuckDB types map to Syto types identically

**What to skip (Electron-specific):**

- IPC/main-renderer architecture — not needed in browser
- Parquet file-based project storage — keep IndexedDB/localStorage for now
- Native dialogs, menus, window management — browser handles this
- Database connectors (PostgreSQL, MySQL, etc.) — out of scope for browser

**Decision point:** If DuckDB-WASM proves sufficient for the target audience, the full Electron native app (documented in [NATIVE-APP-SPEC.md](NATIVE-APP-SPEC.md)) may be deferred indefinitely. If users consistently need offline projects, database connectors, or 100M+ row support, the native spec becomes the blueprint for a separate premium product.

### Step 3: Gallery (later, only if validated)

- Launch with public-free / private-paid model
- Reward early adopters with free or extended private access
- Requires backend infrastructure — only pursue if Steps 1-2 show real demand

---

## Expansion Path: Vega-Lite Project Merger

An existing Vega-Lite snippet management project can be incorporated into Syto. Key considerations:

- **Don't rush the merge.** Extract core logic (spec management, editing), then build Syto-native UI around it using existing component patterns (signals, CSS modules)
- **The snippet storage layer is the real asset.** Chart specs are just JSON — the management UX (tagging, search, preview) is what's worth porting carefully
- **Dashboards keep Syto coherent** when framed as part of a linear flow: Import → Transform → Visualize → Share

---

## Organic Growth: SEO Landing Pages

### Strategy

Create focused landing pages optimized for specific data transformation queries ("pivot CSV online", "remove duplicate rows", "merge two CSV files"). Each page solves one problem end-to-end using Syto's existing capabilities, then invites the user to the full app.

**Why this comes before monetization:** SEO takes 3-6 months to compound. Publishing pages now builds the audience that the forever pass later monetizes. Launching a paid product to an empty room doesn't work.

**Why Syto wins these searches:** Most competing tools are ad-laden wrappers that upload data to servers, docs pages that explain but don't do anything, or apps that require signup first. Syto offers no signup, no upload, instant results, and privacy by default.

### Landing Page Candidates

| Page                       | Target queries                                | Syto transform  |
| -------------------------- | --------------------------------------------- | --------------- |
| Pivot data online          | "pivot table online", "unpivot CSV"           | pivot, fold     |
| Remove duplicate rows      | "deduplicate CSV", "remove duplicates online" | dedupe          |
| Split column into multiple | "split column CSV", "separate values"         | split           |
| Filter CSV rows            | "filter CSV online", "extract rows matching"  | filter          |
| Merge/join two CSVs        | "merge two CSV files", "join CSV online"      | join            |
| Convert JSON to CSV        | "JSON to CSV online", "flatten JSON"          | import + export |
| Rename/reorder columns     | "rename CSV columns online"                   | rename, select  |
| Group by and summarize     | "aggregate CSV", "sum by category"            | aggregate       |

### Page Structure

Each page follows the same pattern:

1. Brief explanation of the operation (SEO-relevant copy, not keyword-stuffed)
2. Embedded Syto instance or direct link pre-configured for that transform
3. User drops file, gets result, exports — the problem is solved end-to-end
4. Soft invitation: "Need more? Syto handles 20+ transforms" → main app

### Timing in Rollout

- **Now (pre-monetization):** Start publishing 1-2 pages per week. App is still free — no friction, maximum conversion from search to user
- **Step 1 (forever pass):** Landing pages are already driving steady traffic; paid conversion starts from an existing audience
- **Step 2+ (new features):** Each new capability (dashboards, DuckDB-WASM large file support) opens new landing page opportunities
- **Step 3 (gallery):** Public workflows and snippets become organic SEO content on their own

### Implementation Notes

- Low effort: no new functionality needed, just content + routing
- Track which pages drive app usage (referrer parameter)
- Each page must genuinely solve the problem — users who get a real result come back and tell others
- Landing pages are growth infrastructure, not a one-time campaign

---

## What to Avoid

- **Ads**: Destroys the clean UX that defines Syto
- **Usage-based pricing**: No backend to meter, conflicts with local-only
- **Account walls on the core tool**: Friction kills adoption
- **Subscription for local features**: A tool that runs in your browser with no server costs should feel like you own it
- **Over-engineering tiers before validation**: Don't build elaborate systems before 100 paying users

---

## Secondary Revenue (Low Effort)

These complement the main strategy but aren't the focus:

- **Donations / Sponsorships**: GitHub Sponsors, Ko-fi. Zero effort, covers hosting/domain costs
- **Education outreach**: Universities teaching data literacy are a natural fit. Syto requires no installation, has no privacy concerns, works offline. A branded landing page + teaching guide could lead to institutional agreements ($100-500/year per department)
- **Template packs**: Curated workflow JSONs for specific domains (survey cleanup, financial data normalization). Free templates drive adoption; premium packs ($5-15) for specialized use cases
- **Consulting**: Syto as portfolio piece and lead generator for data cleaning consulting

---

## Risk Assessment

### Liability Shift (Low risk — Step 1)

Moving from "free, use at your own risk" to paid changes user _expectations_ more than legal obligations. A standard "as-is / no warranty" Terms of Service covers the legal side — this is what every indie software product ships with.

The real cost of failure is refund requests and reputation damage, not lawsuits. Syto's non-destructive architecture helps here: the tool never touches source files, data never leaves the browser, and users can always recover.

**Mitigation:** Clear ToS, strong non-destructive guarantees, generous refunds in early days. A $25 refund costs nothing; a bitter early adopter costs much more.

### Backend Security (High risk — Step 3 only)

The gallery is the only component that requires a backend, and this is where real risk concentrates:

- **Authentication mistakes** are the #1 source of breaches for indie projects. Rolling your own auth is where most solo developers get burned (misconfigured JWT, missing validation, exposed endpoints)
- **LLM-assisted backend code** carries specific risks: plausible-looking code that skips input validation, uses outdated crypto, or has injection vulnerabilities. Works in testing, fails under adversarial conditions
- **Ongoing maintenance** is a permanent responsibility: patching dependencies, monitoring for breaches, handling GDPR/data deletion requests, staying on top of CVEs
- **Blast radius**: a local-only bug affects one user; a backend vulnerability affects everyone simultaneously

**Mitigation:** Delay the backend until Steps 1-2 validate demand. When building it:

- Use managed auth (Clerk, Auth0, Supabase Auth) — never roll your own
- Use managed database (Supabase, PlanetScale, Cloudflare D1) — minimize what you operate
- Keep attack surface tiny: the gallery stores JSON specs and metadata, not sensitive user data
- Human-review all security-critical code, don't ship LLM-generated auth/security code without verification

### Payment Processor Dependency (Medium risk — Step 1)

Gumroad and LemonSqueezy can change terms, raise fees, or freeze accounts — this has happened to multiple indie developers.

**Mitigation:** Choose a processor with good indie reputation. Don't build anything that can't be migrated to another processor within a week.

### License Key Piracy (Low risk — accept it)

For a $25 local-only tool, the license check will be cracked quickly. This is inevitable and not worth fighting.

People who pirate a $25 tool were never going to pay. People who find value will pay because it's easy and they want updates. Don't invest in elaborate DRM — it hurts paying customers more than pirates.

### Support Burden (Medium risk — Step 1, grows over time)

Charging money implicitly signs you up for support. "Doesn't work on my browser," "lost my license key," "how do I do X." Even 50 paying users can generate enough emails to become a part-time job.

**Mitigation:** Good documentation, a FAQ page, clear support channel (email, not real-time chat), explicit expectations on response time.

### Tax Obligations (Low risk — outsource it)

Selling software internationally means VAT/GST in the EU, UK, Australia, etc. This is the boring risk nobody thinks about until it arrives.

**Mitigation:** Gumroad and LemonSqueezy handle tax collection — this alone is a major reason to use them over Stripe directly.

### Feature Commitment Pressure (Medium risk — psychological)

A "forever pass with all future updates" creates implicit pressure to keep shipping. If development goes quiet for 6 months, buyers feel cheated even if the product works fine.

**Mitigation:** Frame the pass as "access to all features" rather than "ongoing development." Under-promise on cadence.

### Focus Dilution (Medium risk — ongoing)

Payment infrastructure, marketing pages, support workflows, and eventually a backend all take time away from the product itself. No single item is the problem — the aggregate drag on development velocity is.

**Mitigation:** Sequence ruthlessly. One step at a time. Don't build Step 3 infrastructure while Step 1 still needs attention.

### Risk Summary

| Risk              | Severity | When            | Key mitigation                                         |
| ----------------- | -------- | --------------- | ------------------------------------------------------ |
| Liability shift   | Low      | Step 1          | Standard ToS, generous refunds                         |
| Backend security  | **High** | Step 3          | Delay it; managed services; human-review security code |
| Payment processor | Medium   | Step 1          | Pick wisely, stay portable                             |
| Piracy            | Low      | Step 1          | Don't fight it                                         |
| Support burden    | Medium   | Step 1+         | Good docs, async support, set expectations             |
| Tax compliance    | Low      | Step 1          | Let payment processor handle it                        |
| Feature pressure  | Medium   | 6mo post-launch | Frame pass carefully                                   |
| Focus dilution    | Medium   | Ongoing         | Sequence ruthlessly                                    |

**Through-line:** Step 1 (forever pass, local-only) is low-risk. Step 3 (backend/gallery) is where real risk lives. Don't build Step 3 until Steps 1-2 prove it's worth it.

---

**Key insight:** Syto's best monetization comes from the trust it builds by being free, private, and genuinely useful. Monetize the power users and institutions who want more, not the casual users who spread the word.
