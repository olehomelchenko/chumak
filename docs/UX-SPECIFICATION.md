# Syto — UX Specification

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures, transform format, and persistence
> - **[DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md)**: How to add transforms, testing, state management
> - **[CLAUDE.md](../CLAUDE.md)**: Development onboarding and quick reference
> - **[DEBUGGING.md](DEBUGGING.md)**: CSS Module debugging and component identification
> - **[CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md)**: UI text conventions, error messages, writing patterns

## 1. Design Foundation

### 1.1 Design Philosophy

| Aspect                 | Decision                                                 |
| ---------------------- | -------------------------------------------------------- |
| **Styling**            | Custom CSS with PostCSS nesting and CSS variables        |
| **Design Inspiration** | KSE Visual Identity (rigorous, clean, information-dense) |
| **Environment**        | Desktop-first, 13"+ screens, Chrome & Safari             |
| **Theme System**       | Dynamic themes (**Syto** and **Blues**) with Vega sync   |

### 1.2 Theme System

Syto supports high-fidelity theme switching, accessible via the **Settings** dialog. Themes control both the application UI and all embedded visualizations.

- **Syto (Classic)**: Heritage-focused Midnight Blue primaries with Cyan accents.
- **Blues (KSE)**: Rigorous Navy palette, optimized for academic and business environments.

**Integration**: Vega-Lite charts automatically inherit the active theme's color palette, axis styling, and typography for a seamless visual experience.

### 1.3 Design Principles

Principles guiding Syto's UX decisions, adapted from established design systems. See [DESIGN-SYSTEM-EVALUATION.md](archive/DESIGN-SYSTEM-EVALUATION.md) for the evaluation rationale.

| Principle                        | Meaning                                                                              | Example                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Match disruption to severity** | Low-priority feedback is non-blocking; high-priority interrupts the workflow         | Success → auto-dismissing toast. Error → persistent toast. Destructive action → confirmation dialog                                               |
| **Mark the minority**            | Label whichever state is less common — required or optional fields                   | If most fields are required, mark only optional ones "(optional)". If most are optional, mark required with asterisk                              |
| **Two channels for status**      | Never communicate status through color alone — always pair with icon, shape, or text | Error: red border + icon + message. Disabled: opacity + tooltip. Type: icon + label (Abc, #)                                                      |
| **Progressive disclosure**       | Show simple options first, advanced settings on demand                               | Quick actions in popovers for common operations; full dialog for complex configuration. Disclosure sections for advanced options in dialog bodies |

---

## 2. Layout Structure

### 2.1 Main Grid System

The interface is structured using a rigid grid system:

```css
body {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 48px auto 1fr;
  grid-template-areas:
    'header  header'
    'ribbon  ribbon'
    'left    main';
}
```

- **Header (48px)**: Persistent branding, ribbon tabs, and settings toggle.
- **Ribbon (~56px)**: Workflow-organized transform actions.
- **Left Panel (300px)**: Data sources and transformation pipeline.
- **Main Area (Flexible)**: Data table preview and EDA panels.

---

## 3. Core Components

### 3.1 Workflow Ribbon

The ribbon provides all transform operations organized across three tabs. Each tab contains grouped buttons and dropdown popovers. Many popovers include **quick actions** (one-click chips that generate `derive` steps without opening a dialog) alongside links to full dialogs.

_Note: All Data I/O actions are in the Sidebar, not the ribbon._

#### Rows Tab

| Group             | Actions                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **Filter & Sort** | Filter, Sort, Duplicates, Keep/Remove Rows (slice), Sample, Promote Header |

#### Columns Tab

| Group                | Actions                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Manage**           | Edit Columns (reorder/rename/select/remove), Split, Merge, More → (Spread, Unroll) |
| **New Columns**      | Derive, Conditional, Regexp Match, Regexp Extract, Add Index                       |
| **Transform Values** | Text ▾, Date ▾, Number ▾, Convert ▾, Replace, Impute                               |
| **Types**            | Auto Detect Schema                                                                 |

The **Transform Values** group uses dropdown popovers with type-aware quick actions:

- **Text ▾** (requires string column selected): Quick actions for Upper, Lower, Title Case, Trim, Length. Links to Split, Replace, Regexp Extract, and Text Operations dialogs.
- **Date ▾** (requires date/datetime column selected): Quick actions for extracting Year, Month, Day, Quarter, Weekday, Week. Quick actions for truncating to Year, Month, Week, Day. Links to Date Operations and Parse Date dialogs.
- **Number ▾** (requires numeric column selected): Quick actions for Round, Floor, Ceil, Truncate, Absolute Value, Sign. Link to Derive dialog.
- **Convert ▾** (requires column selected): Quick type conversions: To Text, To Number, To Integer, To Date.

Quick actions apply immediately to the selected column (generating a `derive` or `types` step) without opening a dialog. Buttons are disabled with explanatory tooltips when no column of the required type is selected.

#### Table Tab

| Group         | Actions                                |
| ------------- | -------------------------------------- |
| **Summarize** | Group By (aggregate), Window Functions |
| **Reshape**   | Pivot, Unpivot (Fold)                  |
| **Combine**   | Join, Append (concat/union)            |

### 3.2 Sources & Models Sidebar

The sidebar provides central management for all data assets:

- **Import Actions**: "Add File", "Paste Data", and "Import URL" are small-icon actions at the top of the panel.
- **Hierarchy**: Tree-view structure showing CSV sources and their dependent models.
- **Model Stats**: Inline counts for steps and data shape (rows x columns).

### 3.3 Model View Toolbar

Located above the data preview table, this toolbar provides status and model-specific actions:

- **Model Info Button**: Opens the Model Info view showing model metadata, comment, and column schema. Positioned leftmost, before the Rename button.
- **Metadata**: Real-time summary of the data shape and pipeline length.
- **Download Modal**: A unified menu for exporting current data as CSV/JSON or the workflow spec.
- **Overlapping Icon Buttons**: Reworked copy buttons using a format icon base (CSV/JSON) with a copy overlay icon.
- **JSON Editor Toggle**: Rapid switching between the visual steps view and the raw JSON specification.

### 3.3.1 Dataset & Model Info Views

Both datasets (sources) and models have dedicated info views accessible via:

- **Dataset Info**: Clicking a source in the sidebar or navigating to `#/src_xxx/info`
- **Model Info**: Clicking the "Model Info" button in the pagination bar or navigating to `#/src_xxx/mdl_xxx/info`

These views display:

- **Actions**:
  - **Dataset Info**: Replace Data (initiates replace flow), Restore Backup (visible only if backup exists), Rename, Delete
  - **Model Info**: Rename, Delete
- **Comment Section**: Editable text area for user notes about the dataset or model
- **Column Schema Table**: Complete list of columns with types and positions

Comments are persisted to IndexedDB and automatically saved when edited.

### 3.4 Interactive Table Context

- **Column Headers**: Keyboard-navigable using roving tabindex — ArrowLeft/Right moves focus between headers (with wrapping), Home/End jump to first/last. Enter or Space selects the column and opens the Column Toolbar. Shift+ArrowLeft/Right extends column range selection (clamped at boundaries, no wrapping).
- **Column Toolbar**: Clicking or keyboard-selecting a header reveals a floating toolbar (`role="toolbar"`) with context-sensitive actions. Standard actions: Sort Asc, Sort Desc, Filter, Rename, Split, Dedupe, Impute, Remove. Type-conditional: Date Operations button appears only for date/datetime columns. When opened via keyboard, the first button auto-focuses. ArrowLeft/Right navigates between buttons (with wrapping), Home/End jump to first/last. Escape returns focus to the column header.
- **Multi-Column Selection**: Cmd/Ctrl+Click toggles individual columns in a multi-selection; Shift+Click selects a range from the last anchor column. Multi-column toolbar shows count and bulk remove action.
- **Row Gutter**: A sticky left column displays 1-based row numbers. Clicking a gutter cell selects the row; Cmd/Ctrl+Click toggles rows; Shift+Click selects a contiguous range. Keyboard-navigable using roving tabindex — ArrowUp/Down moves focus between rows (with wrapping), Shift+ArrowUp/Down extends range selection (clamped at page boundaries).
- **Row Toolbar**: Floating toolbar (`role="toolbar"`) appears when rows are selected, offering Keep (filter to selected), Remove (delete selected), and Extract to Model (creates a new model with selected rows and current pipeline). Supports ArrowLeft/Right keyboard navigation.
- **Cell Toolbar**: Clicking a cell allows for rapid "Keep only this" or "Exclude this" filtering based on that specific value.
- **Type Badges**: Visual indicators for data types (Abc, #, 📅), synced with the granular schema engine.
- **Type Menu**: Keyboard-navigable (`role="menu"`) with arrow key support (Up/Down/Home/End) and auto-focus on open.

**Click-Outside & Selection Clearing**: A global click listener (`handleBodyClick` via `EventRouter`) clears column/row/cell selection when clicks land outside selection-relevant UI. Each surface that should **preserve** selection calls `e.stopPropagation()` on its root element — this is the primary protection mechanism. Protected surfaces: column headers, cells, row gutters (in App.tsx callbacks), floating toolbars, centered modals, RibbonToolbar, RibbonPopover content, and the EDA panel. Escape key also clears selection (priority: message box → dialog → type menu → selection). When adding a new UI surface that should preserve selection, add `onClick stopPropagation` to its root — do not add CSS class selectors to `handleBodyClick`.

### 3.5 Dialog System

**Slide Panel Dialogs**: Transform operations (filter, derive, sort, join, etc.) and import dialogs (CSV/URL) use slide panels that open from the right side, occupying approximately 1/3 of the screen width. These panels support a preview pane that appears to the left when preview data is available.

**Centered Modal Dialogs**: Settings, downloads, and informational dialogs (about, reference) use centered modals that overlay the main content.

**Unified Modal Shell**: Both dialog types use a shared component architecture that handles the backdrop, header (title + close button), and footer (actions). This ensures visual consistency and reduces code duplication across all dialogs.

**Keyboard Accessibility**: Both dialog types implement focus trapping via `useFocusTrap` hook — Tab/Shift+Tab cycles within the dialog, and focus is restored to the previously focused element on close. Slide panel dialogs support Enter-to-submit (skipped when focus is in textarea, select, contenteditable, or CodeMirror editors).

**Preview Panel**: Appears in the remaining 2/3 of screen space when preview data exists for slide panel dialogs. Supports highlighting of new/derived columns and shows import previews with configurable row limits via UX settings.

**Replace Mode Feedback**:
In replace mode, the Import Dialog displays:

- **Replace Mode Banner**: A contextual header indicating which source is being updated.
- **Schema Diff Panel**: A proactive analysis panel showing detected differences between the existing schema and the replacement data. It categorizes changes into **Missing Columns** (warning state), **New Columns**, and **Type Changes**.
- **Danger States**: If columns present in the original source are missing in the replacement data, the Schema Diff Panel adopts a danger (red) theme to warn about potential model breakages.

**Column Selection Patterns**:

- **Single-select chips**: For source column pickers (sort, replace, regexp-\*)
- **Multi-select chips**: For bulk column operations (remove, unpivot) with Cmd/Ctrl+click toggle
- **List Selection**: For detailed management (rename, reorder, select) with drag-and-drop support

**Form Control Conventions**:

- **Radio buttons**: Preferred for small option sets in dialogs (delimiter, header mode, sheet selection). Keeps all choices visible at a glance.
- **Native `<select>`**: Avoid in dialogs — use radio buttons or chip selectors instead. Reserve `<select>` only for inline/toolbar contexts where space is extremely constrained.

**Preview Triggers**:

- **Auto-updating (debounced)**: filter, derive, regexp-match, regexp-extract, date, select-columns, impute
- **Button-triggered**: aggregate, join, pivot (expensive operations)

### 3.6 Toast Notifications

Toast notifications provide non-blocking feedback for user actions. They appear in the top-right corner and use the `ToastContainer` component.

**Notification Types**:

| Type        | Behavior                 | Duration | Use Case                                       |
| ----------- | ------------------------ | -------- | ---------------------------------------------- |
| **Success** | Auto-dismisses           | 3 sec    | Operation completed (import, export, rename)   |
| **Warning** | Auto-dismisses           | 6 sec    | Caution needed but not blocking                |
| **Error**   | Persists until dismissed | Manual   | Operation failed, requires user acknowledgment |

**Success Notifications** are shown for:

- Data import completion (with row count)
- Export operations (CSV, JSON, workflow)
- Model operations (create, copy, rename, delete)
- Source operations (rename, delete)
- Transform application
- Step removal and updates
- Clipboard copy operations

**Error Notifications** include step context when applicable (e.g., "Step 3: Filter: sales > 1000") to help users identify which transformation failed.

#### Notification Channel Selection

| Channel                 | Persistence                                      | Blocks user? | When to use                                                               |
| ----------------------- | ------------------------------------------------ | ------------ | ------------------------------------------------------------------------- |
| **Toast**               | Auto-dismiss (success/warning) or manual (error) | No           | Confirming completed actions, reporting failures                          |
| **Inline message**      | Until resolved                                   | No           | Field-level errors, form validation (`.error`, `.warningBox`, `.noteBox`) |
| **Banner**              | Until dismissed                                  | Partial      | Ongoing conditions: stale model, replaced source data, multi-step errors  |
| **Confirmation dialog** | Until responded                                  | Yes          | Destructive actions: delete, replace, remove                              |

**Rules**:

- One action per notification — no multi-button toasts
- Never auto-dismiss error notifications
- Prefer inline feedback near the action over toasts — use toasts for operations that complete away from the trigger
- For content writing conventions (tone, length, capitalization): see [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md)

### 3.7 Form Design Patterns

#### Field Composition

Standard anatomy for form fields in dialogs:

```
label              ← identifies the field
input              ← the control itself
helper text        ← persistent guidance, always visible
error message      ← appears on validation failure
```

CSS classes for all four elements are defined in `form-controls.module.css` (`.label`, `.input`, `.helpText`, `.error`).

#### Validation Timing

- **Validate on blur** (field loses focus) — not on every keystroke
- **Expression editors**: validate on debounce (existing behavior, keep it)
- **Show error state**: red border on input + error message below field
- **Dialog-level errors** (affecting the entire operation): use `.error` box in dialog body

#### Required vs Optional Fields

Follow the **"mark the minority"** principle (see §1.3):

- If most fields are required → mark only optional ones with "(optional)" after the label
- If most fields are optional → mark required ones with red asterisk (\*)
- Never mark both required and optional — pick one

#### Control Selection Thresholds

| Option count  | Recommended control                |
| ------------- | ---------------------------------- |
| 2–3           | Radio buttons or segmented control |
| 4–7           | Radio buttons or chip selector     |
| 8+            | Combobox with type-ahead filtering |
| Dynamic / 50+ | Combobox (essential)               |

Cross-reference: [UI-VOCAB.md](UI-VOCAB.md) §1 for the full control inventory.

#### Helper Text vs Placeholder vs Tooltip

| Channel         | Persistence      | Content type                      | Example                             |
| --------------- | ---------------- | --------------------------------- | ----------------------------------- |
| **Helper text** | Always visible   | Format hints, constraints         | "e.g., `sales > 1000`"              |
| **Placeholder** | Until user types | Example value                     | "Enter expression..."               |
| **Tooltip**     | On hover only    | Supplementary, non-essential info | "Columns with spaces: `[Col Name]`" |

Never use placeholder as the sole label — it disappears on input. See [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) §6 for detailed rules.

#### Form Spacing in Dialogs

| Gap  | Token        | Use                                 |
| ---- | ------------ | ----------------------------------- |
| 4px  | `--space-xs` | Between label and input             |
| 8px  | `--space-sm` | Between input and helper/error text |
| 16px | `--space-md` | Between field groups                |
| 24px | `--space-lg` | Between form sections               |

### 3.8 Empty States

Every screen that can be empty should have a designed empty state — not blank space.

#### Types

| Type            | Trigger                                | Syto example                                       |
| --------------- | -------------------------------------- | -------------------------------------------------- |
| **No data**     | Nothing to display yet                 | Main area before import (`EmptyState.tsx`)         |
| **User action** | User filtered/searched to zero results | Zero rows after filter, no columns selected in EDA |
| **Error**       | Operation failed                       | Pipeline error, failed import                      |

#### Principles

- **Positive framing**: describe what the user can do, not what's missing. "Import data to get started" not "No data loaded."
- **Always provide next action**: button, link, or instruction.
- **Replace the container content** — don't show an empty table shell with column headers and zero rows.
- **Anatomy**: icon (optional) + title + subtitle (optional) + action button(s).

#### Key Scenarios

| Scenario                      | Empty state message                                        |
| ----------------------------- | ---------------------------------------------------------- |
| No data loaded                | "Import data to get started" + action buttons              |
| Zero rows after filter        | "No rows match this filter. Try adjusting the expression." |
| No steps in pipeline          | "Add a transform from the ribbon above"                    |
| No columns selected in dialog | "Select a column to begin"                                 |
| EDA panel with no column      | "Select a column to see statistics"                        |
| No search results             | "No matches found"                                         |

For text conventions in empty states: see [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) §8.

### 3.9 Disabled & Read-Only States

#### Variants

| State         | Visual treatment                    | Cursor        | Use case                          |
| ------------- | ----------------------------------- | ------------- | --------------------------------- |
| **Disabled**  | 50% opacity                         | `not-allowed` | Preconditions not met (temporary) |
| **Read-only** | Normal appearance, no hover effects | `default`     | Display-only contexts             |
| **Hidden**    | Not rendered                        | N/A           | Irrelevant to current context     |

#### "Why Disabled" Tooltip

Every disabled interactive element should explain _why_ it is disabled via a `title` attribute or tooltip. This pattern already exists for ribbon quick actions and should be generalized:

- Ribbon buttons: "Select a date column to use date operations"
- Dialog Apply button: "Fix validation errors to apply"
- Column-conditional controls: "Requires a numeric column"

#### CSS Convention

```css
/* Standard disabled pattern */
&:disabled,
&[aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: auto; /* preserve tooltip access */
}
```

Note: `pointer-events: auto` is required so that `title` tooltips remain accessible on disabled elements.

---

## 4. Typography & Scaling

- **Primary Font**: Graphik (fallback to Arial)
- **Hierarchy**: Medium weights (500) for headers and emphasis; Regular (400) for data.
- **Tabular Numerals**: Numeric cells and statistic tables use tabular numerals for better alignment and readability.

---

## 5. Implementation Standards

- **Borders**: Rigorous 1px solid borders in Medium Gray (`--color-medium-gray`) for structural separation.
- **Micro-interactions**: Subtle hover states and status transitions (`--transition-fast`).
- **Z-Index Strategy**: Centralized stacking order defined in `variables.css` to prevent overlap conflicts.
- **Token Usage**: Strict adherence to functional variables (e.g., `--color-text`, `--shadow-xl`) over hardcoded values.

### 5.1 Spacing Token Usage

| Token               | Size                                                               | Intended use |
| ------------------- | ------------------------------------------------------------------ | ------------ |
| `--space-xs` (4px)  | Tight internal gaps: label-to-input, icon-to-text, chip padding    |
| `--space-sm` (8px)  | Component internal padding, chip grid gaps, toolbar button spacing |
| `--space-md` (16px) | Between form field groups, dialog body padding, table cell padding |
| `--space-lg` (24px) | Between major sections within a dialog, panel content padding      |
| `--space-xl` (32px) | Page-level margins, large empty state padding                      |

**Principle**: proximity signals connection. Elements that are related should be closer together than elements that are not. Use the smallest token that maintains visual distinction between groups.

### 5.2 Motion & Animation

#### Reduced Motion

All animations must respect the user's OS preference. Add to `styles/base.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Duration Tiers

| Tier       | Token                 | Duration | Use                                                        |
| ---------- | --------------------- | -------- | ---------------------------------------------------------- |
| **Fast**   | `--transition-fast`   | 150ms    | Hover states, focus rings, toggle switches                 |
| **Normal** | `--transition-normal` | 200ms    | Slide panel open/close, expanding sections, dropdown menus |

Both tokens use `ease-out` easing, which is correct for entrances. Exit animations (elements leaving the screen) should use `ease-in` if distinct easing is needed, but for Syto's current scope the single easing is sufficient.

---

## 6. CSS Architecture & Maintainability

The project follows a **Modular Token-Based Architecture** designed for high modularity and theme-swapping reliability.

### 6.1 Modular Structure

- **Global Styles**: `styles/variables.css`, `styles/base.css`, `styles/layout.css`
- **Shared Dialog Styles**: Three utility modules provide reusable classes across all dialogs:
  - `form-controls.module.css` — labels, inputs, checkboxes, radios, toggles, chips, error/warning boxes
  - `expression-help.module.css` — expression docs, example grids, operator tags, dynamic docs
  - `column-editor.module.css` — drag/drop column lists, rename inputs
- **Dialog-Specific Styles**: Complex dialogs have their own `*.module.css` (e.g., `SettingsDialog.module.css`, `DateDialog.module.css`) for styles used by one or two components
- **Component Styles**: Other CSS Modules co-located with components in `src/app/components/`
- **Debugging**: See [DEBUGGING.md](DEBUGGING.md) for CSS Module class name patterns and DevTools tips

When a dialog needs classes from multiple modules, import each and merge via spread:

```ts
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };
```

**Rule**: Modifier classes (e.g., `.active` nested inside `.chip`) must come from the same module as their parent class — CSS Modules hashes are per-file, so cross-module compound selectors won't match.

### 6.2 Theming Logic

A two-tier variable system separates static palettes from functional tokens:

1.  **Palettes**: Raw hex codes grouped by brand (Syto, KSE).
2.  **Functional Tokens**: Logic-based variables (e.g., `--color-primary`, `--shadow-md`) that map to palettes based on the active theme.

### 6.3 Unified Component Patterns

- **Elevations**: Unified shadow system (`--shadow-sm` to `--shadow-xl`) applied across all overlays.
- **Overlays**: Shared backdrop and blur tokens provide a consistent "glassmorphism" feel for both Slide Panels and Centered Dialogs.
- **Aesthetic Consistency**: Modals and Dialogs share standardized header/footer padding and styling, ensuring a contiguous visual language regardless of the interaction type.

---

## 7. Component Catalog

All UI components are Preact/TSX with co-located CSS Modules in `src/app/components/`.

### 7.1 Layout Components

| Component           | Purpose                                 |
| ------------------- | --------------------------------------- |
| `App.tsx`           | Root component, orchestrates layout     |
| `RibbonToolbar.tsx` | Workflow tabs and transform actions     |
| `Sidebar.tsx`       | Sources/models tree and import actions  |
| `DataTable.tsx`     | Paginated data preview with type badges |
| `PaginationBar.tsx` | Stats, download, copy actions           |

### 7.2 Dialog Components

**Shell Components**:

- `DialogShell.tsx` — Shared backdrop, header, footer
- `SlidePanel.tsx` — Right-side panel for transforms
- `CenteredModal.tsx` — Overlay modal for settings/info

**Transform Dialogs**:

- `FilterDialog.tsx`, `DeriveDialog.tsx`, `SortDialog.tsx`
- `AggregateDialog.tsx`, `PivotDialog.tsx`, `JoinDialog.tsx`
- `SplitDialog.tsx`, `ReplaceDialog.tsx`, `FoldDialog.tsx`
- `RegexpMatchDialog.tsx`, `RegexpExtractDialog.tsx`
- `TypeConversionDialog.tsx`, `DedupeDialog.tsx`, `ImputeDialog.tsx`, `SampleDialog.tsx`
- `GenerateDialog.tsx` — Synthetic data generation

**Other Dialogs**:

- `ImportCsvDialog.tsx`, `ImportUrlDialog.tsx`
- `DownloadDialog.tsx`, `SettingsDialog.tsx`
- `FunctionReferenceDialog.tsx` — Expression function reference
- `JsonEditorModal.tsx` — Full-screen CodeMirror editor for pipeline JSON

### 7.3 EDA Components

Located in `src/app/components/eda/`:

| Component                       | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `EdaPanel.tsx`                  | Main panel orchestrating EDA sections  |
| `eda/EdaOverview.tsx`           | Stats summary (rows, missing, unique)  |
| `eda/EdaNumericSection.tsx`     | Numeric column statistics and boxplots |
| `eda/EdaCategoricalSection.tsx` | Categorical distribution charts        |

### 7.4 Pipeline Components

| Component             | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `StepEditor.tsx`      | Individual step display                      |
| `JsonEditorModal.tsx` | Full-featured CodeMirror editor for raw JSON |

### 7.5 Sub-Component Directories

Complex dialogs are split into focused sub-components organized in directories:

**Join Dialog** (`join/`):

| Component                | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `JoinTypeSelector.tsx`   | Join type selection (left, inner, etc.) |
| `JoinKeyPairEditor.tsx`  | Key pair management for join conditions |
| `JoinColumnSelector.tsx` | Column selection from joined tables     |

**Generate Dialog** (`generate/`):

| Component                   | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `GeneratorTypeSelector.tsx` | Generator type selection (sequence, etc.) |
| `GeneratorConfigEditor.tsx` | Type-specific configuration editors       |

**Column Selector** (`column-selector/`):

| Component            | Purpose                             |
| -------------------- | ----------------------------------- |
| `ColumnSelector.tsx` | Unified selection (Grid/List modes) |
| `ColumnChip.tsx`     | Individual column chip component    |
| `ColumnRow.tsx`      | List mode row component             |

### 7.6 Shared Components

| Component              | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `ColumnToolbar.tsx`    | Floating actions on column header (single + multi) |
| `CellToolbar.tsx`      | Floating actions on cell click                     |
| `RowToolbar.tsx`       | Floating actions on row selection                  |
| `TypeIndicator.tsx`    | Column type indicator with icon                    |
| `ExpressionEditor.tsx` | CM6 single-line input with syntax highlighting     |
| `ExpressionDocs.tsx`   | Context-aware inline docs for expression dialogs   |
| `GlobalUI.tsx`         | Toast notifications (see §3.6) and global modals   |
| `ToastContainer.tsx`   | Renders toast notification stack                   |

---

## 8. Global Styles

Located in `styles/` directory:

| File             | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `variables.css`  | Design tokens (colors, spacing, shadows, z-index) |
| `base.css`       | Resets, global defaults, `:focus-visible` ring    |
| `typography.css` | Font definitions and text styles                  |
| `layout.css`     | Grid system and structural layout                 |
| `buttons.css`    | Button variants and states                        |
| `util.css`       | Utility classes                                   |

---

## 9. Accessibility Patterns

Syto targets WCAG 2.1 AA for dialog and widget semantics. These conventions apply to all components.

### 9.1 Dialog ARIA Roles

Every modal surface must declare its role, trap focus, and be labeled:

| Attribute         | Value                                                                    | Notes                                                                  |
| ----------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `role`            | `"dialog"` (informational) or `"alertdialog"` (destructive/confirmation) | Use `alertdialog` for step removal, dependency impact, unsaved changes |
| `aria-modal`      | `"true"`                                                                 | Always present on dialog surfaces                                      |
| `aria-labelledby` | Unique ID matching the title element                                     | e.g., `"filter-dialog-title"`                                          |

Title elements (`<h2>`, `<h3>`) must have a matching `id`. Close buttons must have `aria-label={t('buttons.close', { ns: 'common' })}` (or a hardcoded string if the component doesn't use i18n).

### 9.2 Live Regions

| Component        | Role     | aria-live | Rationale                            |
| ---------------- | -------- | --------- | ------------------------------------ |
| `ToastContainer` | `log`    | `polite`  | Informational — should not interrupt |
| `StatusBar`      | `status` | `polite`  | Processing indicator                 |

Never use `role="alert"` (assertive) for toasts — it interrupts screen reader speech mid-sentence.

### 9.3 Decorative Icons

All `<span class="iconify">` elements must have `aria-hidden="true"`. Icons are decorative; adjacent text provides meaning.

```tsx
// Correct
<span class="iconify" aria-hidden="true" data-icon="carbon:filter"></span>

// Wrong — screen reader announces meaningless icon name
<span class="iconify" data-icon="carbon:filter"></span>
```

### 9.4 Icon-Only Buttons

Buttons with only an icon (no visible text) must have both `title` and `aria-label` with the same value:

```tsx
<button title={t('sort.ascending')} aria-label={t('sort.ascending')}>
  <span class="iconify" aria-hidden="true" data-icon="carbon:sort-ascending"></span>
</button>
```

Applies to: `ColumnToolbar`, `RowToolbar`, `PaginationBar`, and any toolbar with icon-only actions.

### 9.5 Tab Widgets

Tab-like navigation (e.g., `AppHeader` ribbon tabs) must use:

- `role="tablist"` + `aria-label` on the container
- `role="tab"` + `aria-selected` on each tab button

### 9.6 Data Tables

The `<table>` element in `DataTable` must have `aria-label={t('dataTable.ariaLabel')}`.

### 9.7 Skip Navigation

A visually-hidden skip link (`<a href="#main-content" class="visually-hidden">`) is rendered as the first child of `App.tsx`. The `<main>` element has `id="main-content"`. The `.visually-hidden` utility class in `styles/util.css` hides the link until focused.

---

**End of UX Specification**
