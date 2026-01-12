# Chumak — UX Specification

## 1. Design Foundation

### 1.1 Design Philosophy

| Aspect                 | Decision                                                 |
| ---------------------- | -------------------------------------------------------- |
| **Styling**            | Custom CSS with PostCSS nesting and CSS variables        |
| **Design Inspiration** | KSE Visual Identity (rigorous, clean, information-dense) |
| **Environment**        | Desktop-first, 13"+ screens, Chrome & Safari             |
| **Theme System**       | Dynamic themes (**Chumak** and **Blues**) with Vega sync |

### 1.2 Theme System

Chumak supports high-fidelity theme switching, accessible via the **Settings** dialog. Themes control both the application UI and all embedded visualizations.

- **Chumak (Classic)**: Heritage-focused Midnight Blue primaries with Cyan accents.
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

- **Metadata**: Real-time summary of the data shape and pipeline length.
- **Download Modal**: A unified menu for exporting current data as CSV/JSON or the workflow spec.
- **Overlapping Icon Buttons**: Reworked copy buttons using a format icon base (CSV/JSON) with a copy overlay icon.
- **JSON Editor Toggle**: Rapid switching between the visual steps view and the raw JSON specification.

### 3.4 Interactive Table Context

- **Column Toolbar**: Clicking a header reveals actions for filtering, sorting, and renaming.
- **Cell Toolbar**: Clicking a cell allows for rapid "Keep only this" or "Exclude this" filtering based on that specific value.
- **Type Badges**: Visual indicators for data types (Abc, #, 📅), synced with the granular schema engine.

### 3.5 Modal System

Two modal shells with consistent patterns:

- **Slide Panel (1/3 screen)**: Used for transform operations. Opens from left with backdrop blur when preview is active.
- **Centered Modal**: Used for imports, settings, and downloads.

**Preview Panel**: Appears in the remaining 2/3 of screen space when preview data exists. Supports highlighting of new/derived columns.

**Column Selection Patterns**:

- **Single-select chips**: For source column pickers (sort, replace, regexp-\*)
- **Multi-select chips**: For bulk column operations (remove, unpivot) with Cmd/Ctrl+click toggle

**Preview Triggers**:

- **Auto-updating (debounced)**: filter, derive, regexp-match, regexp-extract, date, select-columns
- **Button-triggered**: aggregate, join, pivot (expensive operations)

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

Styles are divided into component-specific files (e.g., `ribbon.css`, `table.css`, `step-removal.css`), preventing side-effects and ensuring localized maintenance.

### 6.2 Theming Logic

A two-tier variable system separates static palettes from functional tokens:

1.  **Palettes**: Raw hex codes grouped by brand (Chumak, KSE).
2.  **Functional Tokens**: Logic-based variables (e.g., `--color-primary`, `--shadow-md`) that map to palettes based on the active theme.

### 6.3 Unified Component Patterns

- **Elevations**: Unified shadow system (`--shadow-sm` to `--shadow-xl`) applied across all overlays.
- **Overlays**: Shared backdrop and blur tokens provide a consistent "glassmorphism" feel for both Slide Panels and Centered Dialogs.
- **Aesthetic Consistency**: Modals and Dialogs share standardized header/footer padding and styling, ensuring a contiguous visual language regardless of the interaction type.

---

**End of UX Specification**
