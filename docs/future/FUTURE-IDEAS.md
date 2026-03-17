# Future Ideas

Ideas worth revisiting if the app gains traction. Not on the active backlog — these become relevant at scale or with a larger user base.

---

## Custom Icon Library

**Effort**: Medium-Large
**Revisit when**: Branding/identity becomes a priority, or offline support is needed

Migrate from Iconify CDN to custom hand-drawn SVG icons. Current icons (Carbon, Material Symbols Light, Codicon) work fine functionally. The value is brand consistency and offline support — neither is critical yet.

See [custom-icons-setup.md](custom-icons-setup.md) for the detailed setup guide and migration strategy (~100+ icons to replace).

---

## Performance Profiling & Web Workers

**Effort**: Investigation + Medium
**Revisit when**: Users report performance issues with real datasets

Current soft limit is ~100K rows. Systematic benchmarking and Web Worker investigation for heavy Arquero transforms (join, aggregate, large filters) would matter at scale. No concrete user-reported problems yet.

---

## Workflow Format Stability

**Effort**: Documentation + validation
**Revisit when**: There's a user base depending on saved workflows, or a second execution backend (e.g., DuckDB) is being considered

The transformation JSON format should eventually be stable enough that saved workflows survive version upgrades and could be executed by different backends. Premature to formalize now — the format isn't changing rapidly.

---

## Template Landing Page for i18n

**Effort**: Small
**Revisit when**: Adding a 3rd locale or rewriting landing page copy

The UK landing page (`/uk/`) uses ~15 positional string replacements — fragile but functional for 2 locales. Templating with `{{placeholder}}` tokens would eliminate this fragility. Worth doing before adding a third language, not before.

---

**Last updated**: March 2026
