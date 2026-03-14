# UX Improvement Plan

**Date**: March 2026
**Status**: All 28 items complete across 4 phases
**Basis**: Comprehensive audit against IBM Carbon Design System best practices

---

## Phase 1 — Quick Wins (i18n text + CSS foundations) ✅

- **1.1** Removed 39 "please" instances from validation messages (both locales)
- **1.2** Fixed ~100+ title case → sentence case violations across all i18n files
- **1.3** Replaced generic "Apply" with task-specific verbs in 23 transform dialogs
- **1.4** Added `prefers-reduced-motion` global CSS rule
- **1.5** Replaced "Yes" confirmation buttons with task-specific verbs (Delete, Remove, Clear all, etc.)
- **1.6** Added recovery hints to 28 error messages (what happened + how to fix)

## Phase 2 — Accessibility Foundations ✅

- **2.1** Added `role="dialog"`, `aria-modal`, `aria-labelledby` to all dialog containers
- **2.2** Added `aria-live` to toast container and status bar
- **2.3** Added skip-to-content link with `.visually-hidden` utility
- **2.4** Added `aria-label` to all 7 close buttons rendering `×`
- **2.5** Added `aria-hidden="true"` to ~104 decorative icon spans
- **2.6** Added `aria-label` to all icon-only buttons (23 across 3 toolbars)
- **2.7** Added `role="tablist"` / `role="tab"` / `aria-selected` to ribbon tabs
- **2.8** Added `aria-label` to data table

## Phase 3 — Component UX Improvements ✅

- **3.1** Empty state message for zero rows after filter
- **3.2** Disabled Apply button shows validation error via tooltip (`aria-disabled` pattern)
- **3.3** Column search in ColumnSelector (enabled in 4 dialogs)
- **3.4** Contextual success toasts (step description, row counts)
- **3.5** Drag & drop insertion indicator (blue line + background tint)
- **3.6** Loading state for Apply button during transform execution
- **3.7** Search input in function reference dialog sidebar
- **3.8** Shared `InlineBanner` component (replaced 6 ad-hoc patterns across 3 files)

## Phase 4 — CSS Token Discipline ✅

- **4.1** Migrated all global z-index values to tokens (added `--z-index-toolbar`)
- **4.2** Migrated shadows to tokens (added `--shadow-panel`, `--shadow-up`)
- **4.3** Eliminated all hardcoded hex/rgba colors (added 18 semantic color tokens)
- **4.4** Added missing tokens: `--font-size-xxs`, `--border-radius-sm`, `--icon-{xs,sm,md,lg,xl}`
- **4.5** Assessed rem values — local layout values, no migration needed
- **4.6** Consolidated 9 icon sizes → 5-tier token system

## Deferred Items

| Item                             | Reason                               |
| -------------------------------- | ------------------------------------ |
| Sidebar tree keyboard navigation | Keyboard shortcuts cover main flows  |
| Cell-level keyboard selection    | Row/column navigation already exists |
| Keyboard shortcuts help panel    | Shortcuts shown in tooltips          |
| Color contrast audit (WCAG AA)   | Requires automated tooling           |
| Typography role mapping          | No visible UX change                 |
