# Syto — UX Improvement Plan

> **Status**: Phase 1 complete (1.1–1.6 done)
> **Date**: March 2026
> **Basis**: Comprehensive audit against IBM Carbon Design System best practices
> **Related**: [DESIGN-SYSTEM-EVALUATION.md](archive/DESIGN-SYSTEM-EVALUATION.md), [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md), [UX-SPECIFICATION.md](UX-SPECIFICATION.md)

---

## Audit Summary

Five parallel audits covered every `.tsx` component, `.css` module, and i18n JSON file in the codebase:

| Area                 | Findings                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Content & i18n       | 39 "please" violations, ~100 title case violations, ~30 dialogs with generic "Apply", ~28 error messages without fix guidance  |
| Component states     | No loading indicator on Apply, zero-rows shows blank table, disabled buttons unexplained                                       |
| CSS tokens           | Z-index tokens 100% unused, shadow tokens 87% unused, 33 hardcoded colors, ~95 hardcoded spacings, no `prefers-reduced-motion` |
| Accessibility        | No `role="dialog"`, no `aria-live` on toasts, no skip-to-content, close buttons lack `aria-label`                              |
| Interaction patterns | All confirms use "Yes" instead of task-specific verbs, no column search in dialogs, no drop-target indicator                   |

The plan is organized into **4 phases** by effort and impact. Each phase is independently shippable.

---

## Phase 1 — Quick Wins (i18n text + CSS foundations)

_Estimated scope: ~200 string edits across JSON files + 1 CSS rule + token cleanup_
_No component logic changes. Pure text and style fixes._

### 1.1 Remove "please" from all validation messages ✅

Removed 39 instances of "Please" / "Будь ласка" from `errors.json` and `dialogs.json` in both locales.

### 1.2 Fix title case → sentence case ✅

Fixed ~100+ Title Case violations to sentence case across all i18n JSON files (`dialogs.json`, `ui.json`, `settings.json`, `common.json`, `tools.json`) in both locales. Preserved proper nouns and acronyms.

### 1.3 Add task-specific button verbs ✅

Replaced generic "Apply" with task-specific verbs in `dialog-registry.ts` `buttonText` entries for all transform dialogs. Added 23 new i18n keys in `en/common.json` and `uk/common.json`. Only `sliceRows` (dual keep/remove mode) and `column-editor` (heterogeneous batch edits) retain "Apply".

### 1.4 Add `prefers-reduced-motion` support ✅

One CSS rule in `styles/base.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This covers all existing animations: dialog zoom-in, StatusBar loading bar, util.css spinner, and ~42 transition declarations.

### 1.5 Fix confirmation button labels ✅

Extend `confirm()` in `notification-handlers.ts` to accept an optional `confirmLabel` parameter. Update `GlobalDialogs.tsx` to use it instead of hardcoded "Yes".

| Action           | Current button | Should be |
| ---------------- | -------------- | --------- |
| Delete model     | Yes            | Delete    |
| Delete source    | Yes            | Delete    |
| Clear all data   | Yes            | Clear all |
| Remove column    | Yes            | Remove    |
| Remove step      | Yes            | Remove    |
| Overwrite column | Yes            | Overwrite |
| Replace source   | Yes            | Replace   |

### 1.6 Add fix guidance to error messages ✅

Added recovery hints to 28 error messages across `errors.json` in both locales. Every message now follows the two-part pattern from CONTENT-GUIDELINES.md §5.1: what happened + how to fix it.

Changes by category:

- **import** (5): CSV/Excel errors now suggest checking format/encoding; fetch errors suggest checking URL
- **export** (2): `noData` → "Import a dataset first"; `noWorkflow` → "Add transform steps first"
- **transform** (7): All `*Failed` messages now append "Check the configuration and try again"
- **system** (14): `modelNotFound`/`noActiveModel` → "Select a model from the sidebar"; `undoFailed`/`redoFailed` → "Nothing to undo/redo"; step errors suggest specific recovery actions; `circularDependency` explains the constraint; import step errors explain why removal is blocked

---

## Phase 2 — Accessibility Foundations

_Estimated scope: ~15 component files, mostly adding attributes_

### 2.1 Add dialog ARIA semantics (Critical)

Add to both slide panel and centered modal containers in `App.tsx`:

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to the dialog title `<h3>` (add `id` to each `<h3>`)

Also add to:

- `GlobalDialogs.tsx`: `role="alertdialog"` + `aria-labelledby` + `aria-describedby`
- `StepRemovalDialog.tsx`: `role="alertdialog"`
- `DependencyImpactDialog.tsx`: `role="dialog"`
- `TablePreviewModal.tsx`: `role="dialog"` + `aria-modal="true"`

### 2.2 Add `aria-live` to toasts (Critical)

In `ToastContainer.tsx`, add:

- `role="alert"` on error toasts
- `aria-live="polite"` on the toast container for success/info/warning toasts

Also add `aria-live="polite"` to `StatusBar.tsx` for transform progress messages.

### 2.3 Add skip-to-content link (Critical)

Add a visually-hidden skip link as the first element in `App.tsx`:

```tsx
<a href="#main-content" class="visually-hidden-focusable">
  Skip to main content
</a>
```

Add `id="main-content"` to the `<main>` element. Add `.visually-hidden-focusable` utility in `util.css`.

### 2.4 Fix close button accessible names (Critical)

Add `aria-label` to all close buttons that render only "x" / "&times;":

- `App.tsx` slide panel close button (line 277)
- `App.tsx` centered modal close button (line 462)
- `GlobalDialogs.tsx` message box close button (line 71)
- `StepRemovalDialog.tsx` (line 38)
- `TablePreviewModal.tsx` (lines 25, 109)
- `TypeConversionDialog.tsx` (line 47)
- `EdaPanel.tsx` (line 218)

Pattern: `aria-label={t('common:buttons.close')}`

### 2.5 Add `aria-hidden="true"` to decorative icons

All `<span class="iconify">` elements that appear next to text labels are decorative and should have `aria-hidden="true"`. This is a bulk change across ~50+ locations.

### 2.6 Add `aria-label` to icon-only buttons

Buttons in `PaginationBar.tsx`, `ColumnToolbar.tsx`, `RowToolbar.tsx` that have only an icon + `title` should also get `aria-label` (matching the `title` value). `title` is not reliably announced by screen readers.

### 2.7 Add `<nav>` and tab roles to ribbon

In `AppHeader.tsx`:

- Wrap the tabs in `<nav aria-label="Workspace tabs">`
- Add `role="tablist"` to the tab container
- Add `role="tab"` and `aria-selected` to each tab button

### 2.8 Add `<caption>` or `aria-label` to data table

In `DataTable.tsx`: `<table aria-label={modelName}>` or add a `<caption class="visually-hidden">`.

---

## Phase 3 — Component UX Improvements

_Estimated scope: New components + modifications to existing ones_

### 3.1 Empty state for zero rows after filter (High)

When `DataTable` receives zero data rows, render an empty state message instead of a blank table body.

Content: "No rows match this filter. Try adjusting the expression." (already defined in UX-SPECIFICATION.md §3.8)

Implementation: In `DataTable.tsx`, when `data.length === 0 && columns.length > 0`, render an empty state row spanning all columns.

### 3.2 Disabled Apply button tooltip (High)

When `dialogError.value` is true on the Apply button in `App.tsx`:

- Switch from native `disabled` to `aria-disabled="true"` (so tooltips still show)
- Add `title` with the current validation error message

This requires `activeDialogHasError()` to also expose the error message text, not just a boolean.

### 3.3 Column search in ColumnSelector (High)

Add an optional `searchable` prop to `ColumnSelector.tsx`. When enabled, render a text input above the column list that filters visible items in real time. Enable it in dialogs where column lists commonly exceed 20 items: ColumnEditorDialog, AggregateDialog, FoldDialog, DescribeDialog, JoinColumnSelector.

### 3.4 Improve success toast context (Medium)

- `StepService.ts` "Step removed" / "Step updated" → include step description: "Removed: Filter: age > 18"
- `ExportService.ts` clipboard copy → include row count: "Copied 250 rows (CSV)"
- `keyboard-handlers.ts` workflow download → include filename

### 3.5 Drag & drop insertion indicator (Medium)

In `ColumnSelector.tsx` / `column-editor.module.css`:

- Track `dragOverIndex` state during `onDragOver`
- Render a blue insertion line between rows at the drop position
- Apply subtle background tint to the drop target zone

### 3.6 Loading state for Apply button (Medium)

When the Apply button is clicked and the transform is executing:

- Show a brief "Applying..." text or disable with a spinner
- Ensure `startTransformation()` is called consistently for all dialog-based apply paths

### 3.7 Function reference search (Low)

Add a search input at the top of `FunctionReferenceDialog.tsx` sidebar. Build a simple function-name index that maps to categories for filtering.

### 3.8 Create shared InlineBanner component (Low)

Extract the ad-hoc warning/info/error banner patterns from ImportCsvDialog, DedupeDialog, JsonEditorModal, and PivotDialog into a shared `InlineBanner.tsx` component with typed variants (info, warning, error) and consistent styling.

---

## Phase 4 — CSS Token Discipline

_Estimated scope: ~20 CSS files, systematic search-and-replace_

### 4.1 Migrate z-index to tokens (High — 18 violations, 0% token usage)

Every component CSS file uses hardcoded z-index values despite tokens existing in `variables.css`. Map each to the correct token:

| Current                            | Token                                        |
| ---------------------------------- | -------------------------------------------- |
| `9999` (StatusBar, ToastContainer) | `var(--z-index-toast)`                       |
| `1200` (FloatingToolbar)           | New `var(--z-index-toolbar)` or use existing |
| `1100` (AppHeader)                 | `var(--z-index-sidebar)`                     |
| `1000` (EdaPanel)                  | `var(--z-index-header)`                      |

### 4.2 Migrate shadows to tokens (High — 14/16 hardcoded)

Replace all hardcoded `box-shadow: 0 Xpx Xpx rgba(...)` with `var(--shadow-sm)` / `var(--shadow-md)` / `var(--shadow-lg)` / `var(--shadow-xl)`.

### 4.3 Fix hardcoded colors (High — 33 hex violations + rgba)

Priority files:

- `SchemaDiffPanel.module.css`: 14 raw hex values → extract to semantic tokens (e.g., `--color-danger-bg`, `--color-success-bg`, `--color-warning-bg`)
- `App.module.css`: 5 uses of `#e0e0e0` → `var(--border-color)`
- Type indicator colors (`#9b59b6`, `#e67e22`) in 3 files → new `--color-type-date`, `--color-type-json` tokens
- Sidebar `#888` → `var(--color-dark-gray)`

### 4.4 Add missing tokens

| Token                | Value | Purpose                                        |
| -------------------- | ----- | ---------------------------------------------- |
| `--font-size-xxs`    | 10px  | EDA stats, ribbon popover labels, type menus   |
| `--border-radius-sm` | 2px   | StatusBar, EDA toggle buttons, expression tags |
| `--icon-xs`          | 12px  | Compact type indicators                        |
| `--icon-sm`          | 16px  | Standard inline icons                          |
| `--icon-md`          | 20px  | Sidebar action icons                           |
| `--icon-lg`          | 24px  | Dialog and toolbar icons                       |
| `--icon-xl`          | 32px  | Ribbon buttons                                 |

### 4.5 Normalize units (rem → px or tokens)

The codebase mixes `rem` and `px` for the same purposes. ~130 `rem` values exist alongside px-based tokens. Choose one convention:

- **Option A**: Keep px-based tokens, convert rem values to their px equivalents then to tokens
- **Option B**: Migrate token definitions to rem (requires changing `variables.css`)

Recommendation: Option A — keep px, replace rem values with the nearest token. This is lower risk.

### 4.6 Consolidate icon sizes to tier system

Current: 9 distinct sizes (12, 14, 16, 18, 20, 24, 26, 32px).
Target: 5 tiers using new tokens (`--icon-xs` through `--icon-xl`).

Changes: 14px → 16px (`--icon-sm`), 18px → 16px or 20px, 26px → 24px (`--icon-lg`).

---

## Deferred Items (Not in Plan)

These were identified in the audit but are not prioritized for this plan:

| Item                                             | Reason deferred                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Sidebar tree keyboard navigation (`role="tree"`) | Significant implementation; keyboard shortcuts cover the main flows           |
| Cell-level keyboard selection                    | Complex; row/column keyboard navigation already exists                        |
| Keyboard shortcuts help panel                    | Nice-to-have; shortcuts are shown in tooltips                                 |
| Color contrast formal audit (WCAG AA)            | Requires automated tooling; current contrast appears reasonable               |
| Typography role mapping                          | Tokens exist; formal role system adds documentation without visible UX change |

---

## Implementation Notes

### Testing approach

- Phase 1: Run `npm run i18n:check` after JSON edits to verify key parity
- Phase 2: Manual screen reader testing (VoiceOver on macOS) for ARIA changes
- Phase 3: Unit tests for new components (empty state, search filter); UX tests for interactions
- Phase 4: Visual regression via `npm run build` + manual spot-check

### Ukrainian translations

All i18n text changes in Phase 1 require parallel updates to `uk/` locale files. The "please" removal is straightforward (remove "Будь ласка" prefix). Sentence case applies to Ukrainian too (Ukrainian capitalizes only the first word and proper nouns, matching the guideline).

### What not to change

- Do NOT migrate to Carbon components or Sass — per [DESIGN-SYSTEM-EVALUATION.md](archive/DESIGN-SYSTEM-EVALUATION.md)
- Do NOT add new dependencies for any of these changes
- Do NOT change any existing keyboard shortcuts or interaction patterns that work well

---

**End of UX Improvement Plan**
