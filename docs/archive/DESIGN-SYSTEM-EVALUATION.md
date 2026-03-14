# Design System Evaluation — March 2026

**Status**: Decision made — stay with custom CSS, cherry-pick Carbon's design documentation
**Research basis**: IBM Carbon Design System, Open Props, Shoelace/Web Awesome, Radix/Ark UI, Tailwind

---

## Executive Summary

We evaluated whether Syto should adopt an established design system (primarily IBM Carbon) to replace our custom CSS architecture. The conclusion: **adopt Carbon's design thinking (principles, patterns, guidelines) but not its code or components.**

The evaluation produced two concrete deliverables:

- **[CONTENT-GUIDELINES.md](../CONTENT-GUIDELINES.md)** — new document, adapted from Carbon's content guidelines
- **UX-SPECIFICATION.md additions** — design principles (§1.3), form patterns (§3.7), empty states (§3.8), disabled states (§3.9), spacing rationale (§5.1), motion guidelines (§5.2), notification framework (§3.6)

---

## Why Not IBM Carbon (Code)

### Hard conflicts

| Blocker                       | Detail                                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Preact vs React**           | Carbon's primary implementation is `@carbon/react`. Preact's `compat` layer works for simple libraries but breaks on Carbon's complex component internals. The web components alternative (`@carbon/web-components`) uses Shadow DOM and weighs 25.9MB unpacked.               |
| **Sass vs PostCSS**           | Carbon requires Dart Sass. Syto uses PostCSS + postcss-nested. Maintaining both preprocessors or migrating would be painful. Carbon's Sass compilation reportedly adds ~10s, degrading Vite's fast HMR.                                                                        |
| **Data table is the product** | Syto's table has floating context toolbars, type badges, expression editors, multi-selection with keyboard navigation, error-as-value rendering. No generic data table component provides these. Adopting Carbon's DataTable would mean losing them or fighting the component. |
| **Bundle discipline**         | App JS is 178KB gzip. Carbon's CSS alone adds ~26KB gzip; components add substantially more. Syto keeps Preact at 10KB and lazy-loads heavy dependencies.                                                                                                                      |
| **Dual token namespace**      | Syto has `--color-*` tokens; Carbon uses `--cds-*`. Bridging two systems creates confusion without clear benefit.                                                                                                                                                              |

### What Carbon's code would have provided

- Accessible form components (combobox, date picker, number input) — useful, but only if they worked with Preact
- Comprehensive icon library — Syto uses Iconify, which is already versatile
- Grid system — Syto's CSS grid is simpler and sufficient
- Notification patterns — Syto has its own toast system

None of these justify the migration cost.

---

## Why Carbon's Design Documentation Is Valuable

Carbon's documentation excels at the "why" and "when" — design rationale, decision frameworks, and principles that are technology-independent. Our existing docs covered "what exists" well but were thin on these.

### What we adopted

**High priority (implemented)**:

| Topic             | Carbon source                    | What we took                                                                                                                                                       |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content writing   | `guidelines/content/`            | Sentence-case rule, no "please", task-specific verbs, error message structure, i18n-friendly patterns                                                              |
| Form design       | `patterns/forms-pattern/`        | Validate on blur, "mark the minority" for required/optional, control selection thresholds, field composition pattern, helper vs placeholder vs tooltip distinction |
| Empty states      | `patterns/empty-states-pattern/` | Three-type taxonomy (no-data, user-action, error), positive framing, always provide next action                                                                    |
| Disabled states   | `patterns/disabled-states/`      | Three variants (disabled, read-only, hidden), "why disabled" tooltip pattern                                                                                       |
| Design principles | Cross-cutting                    | Match disruption to severity, two channels for status, progressive disclosure                                                                                      |

**Medium priority (documented, not yet implemented)**:

| Topic                           | Status                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Motion guidelines               | Documented in UX-SPECIFICATION.md §5.2. `prefers-reduced-motion` CSS tracked in BACKLOG.md |
| Notification decision framework | Documented in UX-SPECIFICATION.md §3.6                                                     |
| Spacing usage rationale         | Documented in UX-SPECIFICATION.md §5.1                                                     |
| Status indicator system         | Principle documented ("two channels for status"). Formal system deferred                   |

**Low priority (deferred)**:

- Accessibility checklist (Syto implements good patterns but doesn't document them as policy)
- Typography usage guide (tokens exist, role mapping deferred)
- Color layering model (not needed at current UI complexity)
- Overflow/truncation patterns (relevant when column resize is added)

---

## Alternatives Considered

### Open Props (CSS tokens only)

Pure CSS custom properties. Framework-agnostic, lightweight. But Syto already has a comparable token system in `variables.css`. Would introduce a second naming convention for no clear gain. **Verdict**: not worth migrating.

### Shoelace / Web Awesome (web components)

Framework-agnostic Lit-based components. Three-tier theming. But: no data table component, Shadow DOM makes deep CSS customization harder, web component patterns feel foreign in a Preact + JSX codebase, ~200KB bundle addition. **Verdict**: could work for isolated components (dialogs, dropdowns) but not for core UI. The lack of a data table is a dealbreaker for wholesale adoption.

### Headless libraries (Radix, Ark UI, Base UI)

Provide behavior and accessibility without styling. But: none officially support Preact. Radix reaches deep into React internals and breaks with `preact/compat`. Ark UI supports React, Vue, Solid, Svelte — not Preact. **Verdict**: Preact ecosystem is too small for any major headless library to support it.

### Tailwind CSS

Utility-class framework. Would require fundamental shift from Syto's semantic CSS approach. Conflicts with CSS Modules. Provides no components. **Verdict**: wrong paradigm for a mature codebase with established naming conventions.

---

## The Preact Question

We also evaluated whether Preact itself is a bottleneck for UI enhancement.

**Conclusion**: Preact is a net positive trade-off, not a bottleneck.

| What Preact gives                                           | What it costs                                    |
| ----------------------------------------------------------- | ------------------------------------------------ |
| 10KB gzip (competitive advantage for static hosting)        | Every major UI library targets React, not Preact |
| Signals (excellent fit for fine-grained data table updates) | Headless libraries break with `preact/compat`    |
| Simpler API surface, faster builds                          | Contributors expect React                        |

The components Syto is missing (combobox, toggle, segmented control) are each a bounded implementation task — not a systemic problem requiring a framework migration. Switching to React would give access to Radix/Shadcn for ~5-6 generic components, at the cost of a full migration, larger bundle, and losing native Signals support.

**Revisit if**: Syto needs rich text editing (ProseMirror/TipTap ecosystem is React-heavy), or Preact falls behind on browser API support (hasn't happened).

---

## Key Insight

The most valuable thing a design system offers to a small project is not components — it's **documented design decisions**. Carbon's component library is irrelevant to Syto, but its guidelines on when to use inline vs toast notifications, how to structure error messages, and when to show an empty state vs blank space are directly actionable regardless of framework.

**Approach going forward**: Continue building custom components. Use Carbon's design documentation as reference material for patterns, accessibility checklists, and interaction conventions. Document our own principles and conventions in UX-SPECIFICATION.md and CONTENT-GUIDELINES.md so they survive across sessions.

---

## References

- [IBM Carbon Design System](https://carbondesignsystem.com/) — guidelines, patterns, components
- [Carbon GitHub](https://github.com/carbon-design-system/carbon) — source code and discussions
- [Open Props](https://open-props.style/) — CSS custom properties library
- [Web Awesome / Shoelace](https://webawesome.com/) — web component library
- [Ark UI](https://ark-ui.com/) — headless component library
