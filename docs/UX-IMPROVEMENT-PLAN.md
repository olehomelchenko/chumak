# Syto — UX Improvement Plan

> **Status**: Phase 3 complete (1.1–1.6, 2.1–2.8, 3.1–3.8 done)
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

### 2.1 Add dialog ARIA semantics (Critical) ✅

Added `role="dialog"` / `role="alertdialog"`, `aria-modal="true"`, and `aria-labelledby` to all dialog containers. Added unique `id` to each dialog title `<h3>`/`<h2>`.

Files changed: `App.tsx` (slide panel + centered modal), `GlobalDialogs.tsx`, `StepRemovalDialog.tsx`, `DependencyImpactDialog.tsx`, `TablePreviewModal.tsx` (both modals), `TypeConversionDialog.tsx`, `JsonEditorModal.tsx`.

### 2.2 Add `aria-live` to toasts (Critical) ✅

- `ToastContainer.tsx`: Added `role="log"` + `aria-live="polite"` + `aria-label` on the toast container. Added `aria-label` to toast close buttons.
- `StatusBar.tsx`: Added `role="status"` + `aria-live="polite"` to the `<footer>`.

### 2.3 Add skip-to-content link (Critical) ✅

Added `.visually-hidden` utility class in `util.css` (with `:focus`/`:active` override for visibility).

Added `<a href="#main-content" class="visually-hidden">` as first child of `appContainer` in `App.tsx`. Added `id="main-content"` to `<main>`.

### 2.4 Fix close button accessible names (Critical) ✅

Added `aria-label` to all 7 close buttons that render `×` without accessible names:

`App.tsx` (slide panel + centered modal), `GlobalDialogs.tsx`, `StepRemovalDialog.tsx`, `TablePreviewModal.tsx` (2 modals), `TypeConversionDialog.tsx`, `EdaPanel.tsx`.

`DependencyImpactDialog.tsx` and `JsonEditorModal.tsx` already had `aria-label` — no changes needed.

### 2.5 Add `aria-hidden="true"` to decorative icons ✅

Added `aria-hidden="true"` to all ~104 `<span class="iconify">` elements across ~30 component files. Handled both `class="iconify"` and template-literal `class={`iconify ${...}`}` patterns.

### 2.6 Add `aria-label` to icon-only buttons ✅

Added `aria-label` matching the existing `title` value to all icon-only buttons:

- `PaginationBar.tsx`: 7 buttons (download, copy CSV, copy JSON, first/prev/next/last page)
- `ColumnToolbar.tsx`: 12 buttons (sort asc/desc, filter, rename, split, date, dedupe, impute, duplicate, remove, multi-remove)
- `RowToolbar.tsx`: 4 buttons (keep, remove, extract, promote)

### 2.7 Add `<nav>` and tab roles to ribbon ✅

In `AppHeader.tsx`: Added `role="tablist"` + `aria-label` to the tabs container. Added `role="tab"` + `aria-selected` to each of the 3 tab buttons (rows, columns, table).

### 2.8 Add `<caption>` or `aria-label` to data table ✅

In `DataTable.tsx`: Added `aria-label={t('dataTable.ariaLabel')}` to the `<table>` element.

---

## Phase 3 — Component UX Improvements

_Estimated scope: New components + modifications to existing ones_

### 3.1 Empty state for zero rows after filter (High) ✅

Added empty state row in `DataTable.tsx` when `getPaginatedData().length === 0 && columns.length > 0`. Shows i18n message ("No rows match the current filter" / "Try adjusting the expression.") in a colspan'd cell with muted, centered styling.

### 3.2 Disabled Apply button tooltip (High) ✅

Switched Apply buttons (both slide panel and centered modal) from native `disabled` to `aria-disabled="true"` so tooltips display on hover. Added `getError?: () => string | null` to `DialogConfig` interface and implemented for 6 dialogs with `.error` signals (filter, derive, split, merge, regexpMatch, regexpExtract). Added `getActiveDialogError()` in `DialogCoordinator.ts`. Error message shown via `title` attribute.

### 3.3 Column search in ColumnSelector (High) ✅

Added `searchable?: boolean` prop to `ColumnSelector.tsx`. When enabled, renders a search input above the column list that filters visible columns by case-insensitive substring match. Enabled in ColumnEditorDialog, AggregateDialog, UnpivotDialog (fold), and DescribeDialog.

### 3.4 Improve success toast context (Medium) ✅

Added contextual details to success toasts:

- `StepService.ts`: "Step removed" / "Step updated" now include step description via `describeTransform()` — e.g., "Removed: Filter: age > 18", "Updated: Sort: name (asc)"
- `ExportService.ts`: Clipboard copy toasts now include row count — e.g., "Copied 250 rows (CSV)"
- `keyboard-handlers.ts`: Removed duplicate toast (ExportService already shows one with filename). Simplified `handleSave` error handling since ExportService handles its own errors.

### 3.5 Drag & drop insertion indicator (Medium) ✅

Added visual drop target feedback in `ColumnSelector.tsx` / `ColumnRow.tsx` / `column-editor.module.css`:

- Added `dragOverIndex` state tracked during index-aware `onDragOver` handler
- Blue insertion line (via `box-shadow`) appears above the target row during drag
- Subtle background tint on the drop target zone (`.dropTarget` CSS class)
- Indicator suppressed when hovering over the item being dragged
- Clears on drop and drag end

### 3.6 Loading state for Apply button (Medium) ✅

Added loading state to both slide panel and centered modal Apply buttons in `App.tsx`:

- Button shows "Processing..." text (reusing existing i18n key) during transform execution
- Button is `aria-disabled` and click-blocked while `AppStore.isTransforming` is true
- Uses `useComputed()` wrapper to avoid subscribing the entire App tree to the signal
- `startTransformation()` was already called consistently via `StepService.runTransform` callbacks

### 3.7 Function reference search (Low) ✅

Added search input at the top of `FunctionReferenceDialog.tsx` sidebar:

- Searches HTML content (stripped of tags) across all categories for case-insensitive text matching
- Filters sidebar to show only categories with matching content
- Auto-navigates to first matching category when search narrows results
- Styled with `.searchBox` / `.searchInput` in `FunctionReferenceDialog.module.css`
- i18n placeholder: "Search functions..." / "Пошук функцій..."

### 3.8 Create shared InlineBanner component (Low) ✅

Created `InlineBanner.tsx` with `InlineBanner.module.css` — typed variants (info, warning, error, success) with consistent styling using existing CSS tokens. Props: `variant`, `icon?`, `title?`, `children`, `className?`.

Refactored 6 ad-hoc banner patterns across 3 files:

- `JsonEditorModal.tsx`: warning banner + error bar → InlineBanner
- `DedupeDialog.tsx`: dynamic warning/success preview → InlineBanner with conditional variant
- `ImportCsvDialog.tsx`: replace mode (info), JSON error (error), duplicate warning → InlineBanner

Removed dead CSS: `.warningBanner`/`.errorBar` from JsonEditorModal, `.replaceBanner`/`.replaceIcon`/`.replaceInfo` from ImportCsvDialog, `.warningBox`/`.warningTitle`/`.warningText` from form-controls.

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
