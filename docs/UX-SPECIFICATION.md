# Syto — UX Specification

> **Related Documentation**:
>
> - **[SPECIFICATION.md](SPECIFICATION.md)**: Technical architecture and codebase map
> - **[DATA-SPECIFICATION.md](DATA-SPECIFICATION.md)**: Data structures, transform format, and persistence
> - **[DEVELOPMENT-PATTERNS.md](DEVELOPMENT-PATTERNS.md)**: How to add transforms, testing, state management
> - **[CLAUDE.md](../CLAUDE.md)**: Development onboarding and quick reference
> - **[DEBUGGING.md](DEBUGGING.md)**: CSS Module debugging and component identification

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

The ribbon is divided into functional stages of data wrangling:

- **Prepare**: Data cleaning, column management, and sorting.
- **Calculate**: New column derivations, aggregations, and value replacements.
- **Combine**: Multi-model operations and joins.

_Note: All Data I/O actions are relocated to the Sidebar for better context._

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

- **Column Headers**: Keyboard-navigable using roving tabindex — ArrowLeft/Right moves focus between headers (with wrapping), Home/End jump to first/last. Enter or Space selects the column and opens the Column Toolbar.
- **Column Toolbar**: Clicking or keyboard-selecting a header reveals a floating toolbar (`role="toolbar"`) with actions for sorting, filtering, renaming, splitting, deduplication, imputation, and removal. When opened via keyboard, the first button auto-focuses. ArrowLeft/Right navigates between buttons (with wrapping), Home/End jump to first/last. Escape returns focus to the column header.
- **Cell Toolbar**: Clicking a cell allows for rapid "Keep only this" or "Exclude this" filtering based on that specific value.
- **Type Badges**: Visual indicators for data types (Abc, #, 📅), synced with the granular schema engine.
- **Type Menu**: Keyboard-navigable (`role="menu"`) with arrow key support (Up/Down/Home/End) and auto-focus on open.

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

---

## 6. CSS Architecture & Maintainability

The project follows a **Modular Token-Based Architecture** designed for high modularity and theme-swapping reliability.

### 6.1 Modular Structure

Styles are divided into component-specific files (e.g., `ribbon.css`, `table.css`, `step-removal.css`), preventing side-effects and ensuring localized maintenance. This styling modularity is mirrored in the TypeScript architecture, where UI logic is delegated to specialized handler modules.

- **Global Styles**: `styles/variables.css`, `styles/base.css`, `styles/layout.css`
- **Component Styles**: CSS Modules co-located with components in `src/app/components/`
- **Debugging**: See [DEBUGGING.md](DEBUGGING.md) for CSS Module class name patterns and DevTools tips

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

| Component              | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `ColumnToolbar.tsx`    | Floating actions on column header                |
| `CellToolbar.tsx`      | Floating actions on cell click                   |
| `TypeIndicator.tsx`    | Column type indicator with icon                  |
| `ExpressionEditor.tsx` | CM6 single-line input with syntax highlighting   |
| `ExpressionDocs.tsx`   | Context-aware inline docs for expression dialogs |
| `GlobalUI.tsx`         | Toast notifications (see §3.6) and global modals |
| `ToastContainer.tsx`   | Renders toast notification stack                 |

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

**End of UX Specification**
