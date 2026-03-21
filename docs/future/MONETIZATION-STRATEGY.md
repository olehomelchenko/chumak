# Syto — Monetization Strategy

> Brainstormed February 2026. Full research in git history (original 292 lines).

---

## Guiding Principles

- Monetization must not compromise core values: local-only, no tracking, no accounts for the core tool
- Free tier must remain genuinely useful — it's the growth engine
- Early supporters rewarded, not exploited
- Each step validates demand before the next requires investment

---

## Product Tiers

### 1. Free Tier

Everything Syto does today: import, transform, export, EDA. The funnel.

### 2. Forever Pass (one-time purchase)

All local Pro features, including future updates. No backend dependency.

**Pro features**: Advanced joins, JSON editor with linting, data generation, expression autocomplete, proto-dashboards (Vega-Lite chart builder), snippet management. Pricing starts low (~$20-25), rises as features ship.

**Implementation**: Signed token in localStorage. Payment via Gumroad/LemonSqueezy (they handle tax).

### 3. Gallery (later, only if validated)

Public-free / private-paid snippet and workflow gallery. Requires backend — only pursue after Steps 1-2 show demand.

---

## Rollout Sequence

1. **Forever Pass** — gate advanced features, set up payment, collect demand signal
2. **Dashboards & Snippets** — pass holders get these automatically; raise price for new buyers
3. **DuckDB-WASM** (optional) — lift ~100K row ceiling, add Parquet support. Stays in-browser. Strong price-raise justification.
4. **Gallery** — only if Steps 1-3 validate demand

---

## What to Avoid

- Ads (destroys clean UX), usage-based pricing (no backend to meter), account walls on core tool, subscription for local features, over-engineering tiers before 100 paying users

---

## Key Risks

| Risk                         | Severity | Mitigation                                                       |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| Backend security (Gallery)   | **High** | Delay it; managed auth (Clerk/Auth0); never roll own auth        |
| Payment processor dependency | Medium   | Stay portable, choose reputable processor                        |
| Support burden               | Medium   | Good docs, async support, set expectations                       |
| License piracy               | Low      | Accept it — people who pirate $25 tools weren't going to pay     |
| Feature commitment pressure  | Medium   | Frame pass as "access to all features" not "ongoing development" |
| Focus dilution               | Medium   | Sequence ruthlessly — one step at a time                         |

**Through-line**: Step 1 (forever pass, local-only) is low-risk. Step 4 (backend/gallery) is where real risk lives.

---

**Key insight**: Syto's best monetization comes from the trust it builds by being free, private, and genuinely useful. Monetize power users and institutions who want more, not casual users who spread the word.
