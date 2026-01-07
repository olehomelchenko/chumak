# Chumak — UX Specification (MVP)

## 1. Design Foundation

### 1.1 Design System & Philosophy

| Aspect                 | Decision                                                    |
| ---------------------- | ----------------------------------------------------------- |
| **CSS Framework**      | Custom CSS with normalize.css for browser consistency       |
| **Design Inspiration** | KSE Visual Identity (simplified for web app)                |
| **Philosophy**         | Information-dense, rigorous, clean — no decorative elements |
| **Target**             | Desktop, 13"+ screens                                       |
| **Browser**            | Chrome, Safari (latest 2 versions)                          |

### 1.2 Visual Principles

**Core principles:**

- **Rigorous simplicity** — no shadows, gradients, or decorative effects
- **Information density** — prioritize data visibility over whitespace
- **Color discipline** — use only brand colors, Dark Midnight Blue always present
- **Line designation** — use thin borders (0.75pt / 1px) to separate sections
- **Typographic hierarchy** — clear distinction between headings and body text

**Not a branded KSE product** — but borrows visual language for consistency if published under KSE.

### 1.3 CSS Dependencies

```html
<!-- Browser normalization (choose one) -->
<link rel="stylesheet" href="https://unpkg.com/normalize.css@8/normalize.css" />
<!-- OR -->
<link rel="stylesheet" href="https://unpkg.com/modern-normalize@2/modern-normalize.css" />

<!-- Custom Chumak styles (Modularized) -->
<link rel="stylesheet" href="styles/index.css" />
```

**Why normalize.css/modern-normalize:**

- Consistent baseline across browsers
- Minimal, non-opinionated
- ~3-5KB, single file
- No framework lock-in
- Well-maintained standards

---

## 2. Color System

### 2.1 Color Palette

Adapted from KSE brand guidelines:

| Color Name             | RGB           | Hex       | Usage                                         |
| ---------------------- | ------------- | --------- | --------------------------------------------- |
| **Dark Midnight Blue** | 0, 57, 100    | `#003964` | Primary: headers, text, borders               |
| **Cyan**               | 0, 187, 206   | `#00BBCE` | Accent: data highlights, links, active states |
| **Green**              | 167, 197, 57  | `#A7C539` | Accent: success states, positive indicators   |
| **Yellow**             | 228, 229, 65  | `#E4E541` | Accent: warnings, highlights                  |
| **Red**                | 241, 91, 67   | `#F15B43` | Accent: errors, critical actions              |
| **Dark Red**           | 211, 62, 44   | `#D33E2C` | Accent: delete/destructive actions            |
| **White**              | 255, 255, 255 | `#FFFFFF` | Background, contrast                          |
| **Light Gray**         | 245, 245, 245 | `#F5F5F5` | Subtle backgrounds, disabled states           |
| **Medium Gray**        | 200, 200, 200 | `#C8C8C8` | Borders, separators                           |
| **Dark Gray**          | 100, 100, 100 | `#646464` | Secondary text                                |

### 2.2 Color Application Rules

**From KSE guidelines:**

1. Dark Midnight Blue appears on every screen
2. Use maximum 5 colors per view (always including Dark Midnight Blue)
3. No additional colors outside this palette

**Chumak-specific applications:**

| Element                | Color                                              | Notes                          |
| ---------------------- | -------------------------------------------------- | ------------------------------ |
| **Primary text**       | Dark Midnight Blue                                 | Headers, labels, body text     |
| **Secondary text**     | Dark Gray                                          | Help text, metadata            |
| **Links**              | Cyan                                               | Hover: underline               |
| **Active/selected**    | Cyan background (10% opacity)                      | Selected rows, active tabs     |
| **Success indicators** | Green                                              | "Applied", "Saved", checkmarks |
| **Warnings**           | Yellow text + Light Yellow background              | Non-blocking issues            |
| **Errors**             | Red text + Light Red background                    | Blocking issues                |
| **Delete actions**     | Dark Red                                           | Destructive buttons            |
| **Primary buttons**    | Dark Midnight Blue background, White text          | Main actions                   |
| **Secondary buttons**  | White background, Dark Midnight Blue border + text | Cancel, secondary actions      |
| **Disabled elements**  | Light Gray background, Medium Gray text            | Inactive states                |

---

## 3. Typography

### 3.1 Font Stack

**Primary:** Graphik (KSE brand font)
**Fallback:** Arial, system sans-serif

```css
/* Heading font */
font-family:
  'Graphik',
  Arial,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;
font-weight: 500; /* Graphik Medium */

/* Body font */
font-family:
  'Graphik',
  Arial,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;
font-weight: 400; /* Graphik Regular */
```

**Font loading strategy:**

- Host Graphik locally or use CSS `@font-face` with fallback
- Use `font-display: swap` to avoid FOIT (Flash of Invisible Text)
- Acceptable to fall back to Arial if Graphik unavailable

### 3.2 Type Scale

| Element             | Font                             | Size | Weight        | Line Height | Color              | Usage               |
| ------------------- | -------------------------------- | ---- | ------------- | ----------- | ------------------ | ------------------- |
| **H1 (Page title)** | Graphik                          | 24px | Medium (500)  | 1.15        | Dark Midnight Blue | Main app title      |
| **H2 (Section)**    | Graphik                          | 18px | Medium (500)  | 1.15        | Dark Midnight Blue | Panel headers       |
| **H3 (Subsection)** | Graphik                          | 16px | Medium (500)  | 1.15        | Dark Midnight Blue | Dialog headers      |
| **Body**            | Graphik                          | 14px | Regular (400) | 1.3         | Dark Midnight Blue | Default text        |
| **Small**           | Graphik                          | 12px | Regular (400) | 1.3         | Dark Gray          | Metadata, help text |
| **Monospace**       | 'SF Mono', 'Consolas', monospace | 13px | Regular       | 1.4         | Dark Midnight Blue | JSON, expressions   |

### 3.3 Typography Rules

From KSE guidelines:

- **Headings:** Line height 1.15, fills ~85% of container width (large size)
- **Body:** Line height 1.3, comfortable reading width
- **No excessive bolding** — use Medium (500) for emphasis, not Bold (700)

---

## 4. Layout System

### 4.1 Block-Based Proportions

Inspired by KSE's "Continuous Impact" layout system (x → x×2 → x×3).

For Chumak, simplified to **2-block horizontal layout**:

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (full width, ~48px height)                         │
├─────────────────┬──────────────────────────────────────────┤
│                 │                                          │
│  LEFT PANEL     │  MAIN CONTENT AREA                       │
│  (x width)      │  (x×3 width)                             │
│                 │                                          │
│  ~300px         │  Remaining space                         │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

**Proportions:**

- Left panel: ~300px fixed (1x)
- Main content: Remaining space (3x proportional)
- Ratio approximately 1:3

### 4.2 Line Designation

Use **1px solid borders** (0.75pt → 1px at 96 DPI) in Medium Gray (`#C8C8C8`) to separate:

- Header from body
- Left panel from main content
- Panel sections (Sources from Steps)
- Toolbar from content area

**No heavy frames, no window chrome** — just clean lines.

### 4.3 Spacing System

Consistent spacing scale:

| Token        | Size | Usage                           |
| ------------ | ---- | ------------------------------- |
| `--space-xs` | 4px  | Tight spacing, icon padding     |
| `--space-sm` | 8px  | Form field gaps, button padding |
| `--space-md` | 16px | Section padding, default gaps   |
| `--space-lg` | 24px | Panel padding, major sections   |
| `--space-xl` | 32px | Page margins                    |

---

## 5. Main Layout Structure

### 5.1 Full Layout

```
┌──────────────────────────────────────────────────────────────────┐
├──────────────────────────────────────────────────────────────────┤
│ HEADER & RIBBON TABS (48px height)                               │
│  ☆ Chumak                 [Data] [Transform] [Add Column] ...    │
├──────────────────────────────────────────────────────────────────┤
│ RIBBON CONTENT (auto height, ~56px)                              │
│  [Import CSV] [Export CSV] [Paste] [Export JSON]                 │
├────────────────────┬─────────────────────────────────────────────┤
│                    │                                             │
│ LEFT PANEL         │ MAIN CONTENT AREA                           │
│ (300px fixed)      │ (flexible)                                  │
│                    │                                             │
│ ┌────────────────┐ │ ┌──────────────────────────────────────────┐│
│ │ Sources &      │ │ │                                          ││
│ │ Models         │ │ │  DATA PREVIEW TABLE                      ││
│ │                │ │ │  (scrollable horizontal + vertical)      ││
│ │ 📄 sales.csv   │ │ │                                          ││
│ │   └─ sales_    │ │ │                                          ││
│ │      cleaned   │ │ │                                          ││
│ │                │ │ │                                          ││
│ └────────────────┘ │ └──────────────────────────────────────────┘│
│ ┌────────────────┐ │                                             │
│ │ Steps | JSON   │ │ Showing 1-100 of 5,432        [<] [>]       │
│ ├────────────────┤ │                                             │
│ │ 1. Filter      │ │                                             │
│ │ 2. Derive      │ │                                             │
│ │ 3. Select      │ │                                             │
│ │                │ │                                             │
│ │ [+ Add Step]   │ │                                             │
│ └────────────────┘ │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

### 5.2 Layout Grid

Using CSS Grid:

```css
body {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 48px auto 1fr;
  height: 100vh;
  grid-template-areas:
    'header  header'
    'ribbon  ribbon'
    'left    main';
}

.header {
  grid-area: header;
} /* Header now contains ribbon tabs */
.ribbon {
  grid-area: ribbon;
} /* Contains only ribbon content */
.left-panel {
  grid-area: left;
}
.main-content {
  grid-area: main;
}
```

**Note:** Ribbon area is `auto` height (expands to fit tabs + content). Typically 88px total (32px tabs + 56px content).

### 5.3 Panel Specifications

| Panel            | Dimensions                | Styling                                                  |
| ---------------- | ------------------------- | -------------------------------------------------------- |
| **Header**       | Full width × 48px         | Background: White, border-bottom: 1px Dark Midnight Blue |
| **Ribbon**       | Full width × auto (~88px) | Tabs: Light Gray background; Content: White background   |
| **Left Panel**   | 300px × remaining         | Background: White, border-right: 1px Medium Gray         |
| **Main Content** | Remaining × remaining     | Background: White                                        |

---

## 6. Components

### 6.1 Header

```
┌──────────────────────────────────────────────────────────────┐
│ ☆ Chumak      [Data] [Transform] ...    [Run Tests] [Clear]  │
└──────────────────────────────────────────────────────────────┘
```

**Elements:**

- **Logo:** ☆ icon + "Chumak" in 18px Medium
- **Ribbon Tabs:** Integrated into header for space efficiency
- **Dev Actions:** "Run Tests" and "Clear All Data" buttons (right-aligned)

**Spacing:**

- Padding: 0 24px (left/right)
- Vertical align: center

### 6.2 Ribbon Toolbar

**Design decision:** Microsoft Office-style tabbed ribbon instead of flat horizontal toolbar.

**Rationale:**

- Better organization for 20+ transform operations across phases
- Progressive disclosure (only show relevant operations per tab)
- Familiar pattern for target users (Excel users)
- Easier to scale for Phase 2/3 features without UI cramping

**Structure:**

```
┌──────────────────────────────────────────────────────────────┐
│ [Import CSV] [Paste] [Export CSV] [Export JSON]              │ ← Content
└──────────────────────────────────────────────────────────────┘
```

**Tab row (32px height):**

- Background: Light Gray (`#F5F5F5`)
- Border-bottom: 1px Medium Gray
- Horizontal layout, no gaps between tabs
- Only one tab active at a time

**Tab specifications:**

```css
.ribbon__tab {
  padding: 6px 16px;
  background: transparent;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-dark-gray);
}

.ribbon__tab:hover {
  color: var(--color-midnight-blue);
  background: rgba(0, 187, 206, 0.05);
}

.ribbon__tab--active {
  background: var(--color-white);
  border-bottom: 2px solid var(--color-cyan);
  color: var(--color-midnight-blue);
}
```

**Content row (auto height, ~56px):**

- Background: White
- Padding: 8px 16px
- Contains operation buttons relevant to active tab
- Flex layout with wrapping

**Operation button specifications:**

- Vertical layout: Icon (18px) above text (12px)
- Min-width: 60px, Height: 40px
- Gap: 4px between buttons
- Transparent background, 1px transparent border
- Icons: Iconify (loaded via script)
- Font: 12px for text

**Button states:**

```css
.ribbon__button {
  /* Default */
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-midnight-blue);
}

.ribbon__button:hover {
  background: rgba(0, 187, 206, 0.08);
  border-color: var(--color-cyan);
}

.ribbon__button:active {
  background: rgba(0, 187, 206, 0.15);
}

.ribbon__button--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

| Tab           | Purpose                | Operations                                               |
| :------------ | :--------------------- | :------------------------------------------------------- |
| **Data**      | I/O & Workflow         | Import CSV, Paste, Export CSV, Export Workflow           |
| **Prepare**   | Cleaning & Schema      | Filter, Sort, Select, Remove, Rename, Split, Auto-Detect |
| **Calculate** | Derivation & Reshaping | Derive, Match, Extract, Group By, Unpivot, Replace       |
| **Combine**   | Multi-table            | Join, Append (future), Union (future)                    |

**Disabled tab behavior:**

- Prepare, Calculate, Combine tabs are disabled until data is loaded
- Visual: 40% opacity, cursor: not-allowed
- Clicking disabled tab does nothing
- Tooltip: "Import data first" (optional enhancement)

**Icons:**

- Library: Iconify (https://iconify.design/)
- Logic: SVG injection via `<span class="iconify" data-icon="..."></span>`
- Provider: carbon, codicon, material-symbols

**Implementation note:**

- Use Alpine.js reactive state: `ribbonTab = 'data'` (default)
- Switch tabs by setting `ribbonTab` variable
- Content panels shown conditionally: `x-show="ribbonTab === 'data'"`
- Tab disabling: `:disabled="!currentData"` for transform tabs

### 6.3 Sources & Models Panel

Tree view showing data hierarchy.

```
┌─ Sources & Models ──────────┐
│ 📄 sales.csv                │
│    └─ 📊 sales_cleaned      │
│ 📄 regions.csv              │
│    └─ 📊 regions_lookup     │
└─────────────────────────────┘
```

**Styling:**

- **Header:** "Sources & Models" in Graphik Medium 16px, Dark Midnight Blue
- **Items:**
  - Source: 📄 icon + name, Graphik Regular 14px
  - Model: Indented 16px, 📊 icon + name
- **Selected item:** Cyan background (10% opacity)
- **Hover:** Cyan background (5% opacity)

**Interaction:**

- Click source → Show dataset information view (metadata, models list, schema)
- Click model → Show model data with transform steps

**Tree structure:**

- Use `<ul>` with custom list styles
- Collapsible sources (click to expand/collapse)
- Icon rotates: ▶ (collapsed) → ▼ (expanded)

### 6.3.1 Dataset Information View ✅ Implemented

When clicking a source in the tree, the main content area shows comprehensive dataset information instead of automatically selecting the first model.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ sales_data                           [Rename]  [Delete]     │
│ Dataset Source                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Dataset Information ───┐  ┌─ Models (1) ──────────────┐ │
│ │ Source Name: sales_data │  │ 📊 main                   │ │
│ │ Original File: sales.csv│  │    0 steps • 432 rows  →  │ │
│ │ Rows: 432               │  └───────────────────────────┘ │
│ │ Columns: 5              │                                │
│ │ File Size: 12.4 KB      │                                │
│ │ Imported: 1/15/25 10am  │                                │
│ └─────────────────────────┘                                │
│                                                             │
│ ┌─ Column Schema ─────────────────────────────────────────┐ │
│ │ Column Name    Type      Position                      │ │
│ │ region         string    1                             │ │
│ │ sales          number    2                             │ │
│ │ profit         number    3                             │ │
│ │ date           date      4                             │ │
│ │ active         string    5                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Header section:**

- Title: Source name in 24px Medium
- Subtitle: "Dataset Source" in 13px uppercase
- Actions: Rename and Delete buttons (secondary and danger styles)

**Dataset Information card:**

- Metadata in definition list format
- Label-value pairs with monospace values
- Source name, original filename, row count, column count, file size, import timestamp

**Models list card:**

- Badge showing model count
- Clickable cards for each model
- Model icon, name, step count, row count
- Hover effect with arrow indicator
- Click to switch to model view

**Column Schema table:**

- Full-width table showing all columns
- Type badges with color coding (string: blue, number: purple, date: orange)
- Original position in source file

**Management Actions:**

- **Rename:** Prompt dialog for new source name, saves to IndexedDB
- **Delete:** Confirmation with model count warning, removes source and all models, returns to empty state if viewing deleted source

### 6.4 Steps Panel

Compact step list with tab toggle.

```
┌─ Steps | JSON ────────────┐
│ 1. Filter: sales > 1000  │
│ 2. Derive: profit = ...  │
│ 3. Select: 5 columns     │
│                          │
│ [+ Add Step]             │
└──────────────────────────┘
```

**Tab styling:**

- Tabs: "Steps" | "JSON" side-by-side
- Active tab: Cyan bottom border (2px), Dark Midnight Blue text
- Inactive tab: Medium Gray text, no border
- Font: Graphik Medium 14px

**Step row:**

- Format: `{index}. {type}: {summary}`
- Font: Graphik Regular 14px
- Hover: Cyan background (5% opacity), show [×] delete button
- Selected: Cyan background (10% opacity)
- Delete button: Small [×] on right, Dark Red color

**Add Step button:**

- Full width, left-aligned text
- Border: 1px dashed Medium Gray
- Color: Cyan
- Hover: Cyan background (5% opacity)

### 6.5 JSON View (Tab)

```
┌─ Steps | JSON ────────────┐
│ {                        │
│   "transforms": [        │
│     { "filter": "..." }, │
│     { "derive": {...} }  │
│   ]                      │
│ }                        │
│                          │
│              [Copy]      │
└──────────────────────────┘
```

**Styling:**

- Font: Monospace 13px
- Color: Dark Midnight Blue
- Background: Light Gray (subtle)
- Padding: 12px
- Max-height: Scroll if overflow
- No syntax highlighting (MVP) — plain text

**Copy button:**

- Secondary button, small size
- Bottom-right corner

### 6.6 Data Preview Table

```
┌────────────────────────────────────────────────────────────┐
│ region ▼     sales #    profit #    date 📅                │
├────────────────────────────────────────────────────────────┤
│ North        1,500      320         2025-01-15             │
│ South        2,100      450         2025-01-16             │
│ East         800        120         2025-01-17             │
│ ...                                                        │
├────────────────────────────────────────────────────────────┤
│ Showing 1-100 of 5,432                      [<] [>]        │
└────────────────────────────────────────────────────────────┘
```

**Table styling:**

- Border: 1px Medium Gray around table
- Cell padding: 8px 12px
- Font: Graphik Regular 14px
- Row separator: 1px Light Gray (subtle)

**Header row:**

- Background: Light Gray
- Font: Graphik Medium 14px
- Color: Dark Midnight Blue
- Sticky header (stays visible on scroll)
- Type indicator: Small icon/symbol after name
  - `#` for numbers
  - `Aa` for strings
  - `📅` for dates
  - `☑` for boolean

**Column headers:**

- Clickable (select column)
- Sort indicator: ▼ (descending) or ▲ (ascending)
- Hover: Cyan background (5% opacity)
- Selected: Cyan background (10% opacity)

**Cell styling by type:**

| Type       | Alignment | Color              | Style                 |
| ---------- | --------- | ------------------ | --------------------- |
| String     | Left      | Dark Midnight Blue | Normal                |
| Number     | Right     | Dark Midnight Blue | Tabular numerals      |
| Date       | Left      | Dark Midnight Blue | ISO format            |
| Boolean    | Center    | Dark Midnight Blue | true/false            |
| Null/Empty | Center    | Medium Gray        | Italic, "(empty)"     |
| Error      | Left      | Red                | Italic, error message |

**Row states:**

- **Default:** White background
- **Hover:** Cyan background (3% opacity)
- **Selected:** Cyan background (10% opacity)
- **Alternate rows** (optional): Very light gray (2% opacity) for readability

**Pagination & Filtering:**

- Footer row (or header) with: "Showing 1-100 of 5,432"
- Buttons: [‹] [›] for prev/next
- Row per page selector: 100, 250, 500, etc.

### 6.7 Floating Column Toolbar ✅ IMPLEMENTED

Appears when a column header is clicked.

**Actions:**

- **Sort Ascending/Descending:** Quick sort on the selected column
- **Rename:** Opens quick rename input in the toolbar or dialog
- **Filter:** Opens filter dialog for the column
- **Remove:** Immediately drops the column

**Styling:**

- Fixed position anchored slightly above the column header
- White background, 1px Dark Midnight Blue border
- Subtle arrow pointing to the column
- Box shadow for depth

### 6.8 Floating Cell Toolbar ✅ IMPLEMENTED

Appears when a data cell is clicked.

**Actions:**

- **Keep only this value:** Adds a filter `column == "value"`
- **Exclude this value:** Adds a filter `column != "value"`
- **Copy value:** Copies cell content to clipboard

---

## 7. Buttons

### 7.1 Button Types

**Primary button:**

```css
background: #003964; /* Dark Midnight Blue */
color: #ffffff;
border: none;
border-radius: 4px;
padding: 8px 16px;
font: Graphik Regular 14px;
```

**Secondary button:**

```css
background: #ffffff;
color: #003964; /* Dark Midnight Blue */
border: 1px solid #003964;
border-radius: 4px;
padding: 8px 16px;
font: Graphik Regular 14px;
```

**Danger button:**

```css
background: #d33e2c; /* Dark Red */
color: #ffffff;
border: none;
border-radius: 4px;
padding: 8px 16px;
font: Graphik Regular 14px;
```

**Text button:**

```css
background: transparent;
color: #00bbce; /* Cyan */
border: none;
padding: 4px 8px;
font: Graphik Regular 14px;
text-decoration: underline on hover;
```

### 7.2 Button States

| State                 | Style                                                           |
| --------------------- | --------------------------------------------------------------- |
| **Hover (Primary)**   | Background: lighter shade (+10% lightness), cursor: pointer     |
| **Hover (Secondary)** | Background: Cyan (5% opacity)                                   |
| **Active**            | Background: darker shade (-10% lightness), slight scale (98%)   |
| **Disabled**          | Background: Light Gray, Color: Medium Gray, cursor: not-allowed |
| **Focus**             | Outline: 2px Cyan, offset: 2px                                  |

---

## 8. Form Elements

### 8.1 Text Input

```css
border: 1px solid #c8c8c8; /* Medium Gray */
border-radius: 4px;
padding: 8px 12px;
font: Graphik Regular 14px;
color: #003964; /* Dark Midnight Blue */
background: #ffffff;
```

**States:**

- **Focus:** Border: 2px Cyan, outline: none
- **Error:** Border: 2px Red, background: Light Red (5% opacity)
- **Disabled:** Background: Light Gray, color: Medium Gray

### 8.2 Select Dropdown

Same styling as text input, with dropdown arrow on right.

```css
appearance: none; /* Remove default arrow */
background-image: url('data:image/svg+xml,...'); /* Custom arrow */
background-position: right 8px center;
background-repeat: no-repeat;
padding-right: 32px; /* Space for arrow */
```

### 8.3 Checkbox

```css
width: 18px;
height: 18px;
border: 1px solid #c8c8c8;
border-radius: 3px;
background: #ffffff;
```

**Checked state:**

```css
background: #003964; /* Dark Midnight Blue */
border-color: #003964;
/* Checkmark via SVG background */
```

### 8.4 Radio Button

```css
width: 18px;
height: 18px;
border: 1px solid #c8c8c8;
border-radius: 50%;
background: #ffffff;
```

**Checked state:**

```css
border-color: #003964;
/* Inner dot via ::after pseudo-element */
```

### 8.5 Form Layout

**Vertical forms:**

- Label above input
- Gap: 4px
- Label font: Graphik Medium 14px

**Horizontal forms:**

- Label left, input right
- Label width: 120px
- Gap: 12px

---

## 9. Modals & Dialogs

### 9.1 Modal Structure

```
┌────────────────────────────────────────────────────┐
│ ┌─ Dialog Title ─────────────────────────────────┐ │
│ │                                                │ │
│ │  Dialog content here                           │ │
│ │                                                │ │
│ │                      [Cancel]  [Apply]         │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│  (Backdrop: Dark Midnight Blue @ 40% opacity)     │
└────────────────────────────────────────────────────┘
```

**Modal styling:**

- Background: White
- Border: 1px Medium Gray
- Border-radius: 8px
- Box-shadow: None (per KSE guidelines)
- Max-width: 600px
- Padding: 24px
- Backdrop: Dark Midnight Blue @ 40% opacity

**Title bar:**

- Font: Graphik Medium 18px
- Color: Dark Midnight Blue
- Border-bottom: 1px Medium Gray
- Padding-bottom: 12px

**Content area:**

- Padding: 16px 0

**Footer:**

- Border-top: 1px Medium Gray
- Padding-top: 16px
- Buttons right-aligned
- Gap: 8px between buttons

### 9.2 Transform Dialog Example

```
┌─ Filter ──────────────────────────────────────────┐
│                                                   │
│  Keep rows where:                                 │
│  ┌────────────────────────────────────────────┐   │
│  │ sales > 1000                               │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  ─── Preview (47 rows match) ──────────────────   │
│  ┌────────────────────────────────────────────┐   │
│  │ [mini table preview]                       │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│                        [Cancel]  [Apply]          │
└───────────────────────────────────────────────────┘
```

**Preview section:**

- Border-top: 1px Medium Gray
- Margin-top: 16px
- Padding-top: 16px
- Max-height: 300px (scroll if overflow)
- Mini table: Same styling as main table, scaled down

---

## 10. Empty States & Drop Zone

### 10.1 No Data State

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                                                        │
│               ┌─────────────────────┐                  │
│               │                     │                  │
│               │   📄                │                  │
│               │   Drop CSV here     │                  │
│               │   or click to       │                  │
│               │   browse files      │                  │
│               │                     │                  │
│               └─────────────────────┘                  │
│                                                        │
│               Supports .csv and .tsv                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Drop zone styling:**

- Border: 2px dashed Medium Gray
- Border-radius: 8px
- Background: Light Gray (subtle)
- Padding: 48px
- Text-align: center
- Cursor: pointer

**Drag-over state:**

- Border: 2px dashed Cyan
- Background: Cyan (5% opacity)

**File icon:**

- Unicode 📄 or SVG, 48px size
- Color: Medium Gray

---

## 11. Error & Success States

### 11.1 Inline Errors

**Expression error in form:**

```
┌────────────────────────────────────────────┐
│ sales > > 1000                             │
└────────────────────────────────────────────┘
⚠️ Unexpected token '>' at position 8
```

**Styling:**

- Icon: ⚠️ Yellow or Red
- Font: Graphik Regular 13px
- Color: Red
- Background: Light Red (5% opacity)
- Border-left: 3px solid Red
- Padding: 8px 12px
- Margin-top: 4px

### 11.2 Error Dialog

```
┌─ Error ─────────────────────────────┐
│                                     │
│  ⚠️ Could not parse file            │
│                                     │
│  Please check it's a valid CSV.     │
│                                     │
│                    [OK]             │
└─────────────────────────────────────┘
```

**Styling:**

- Same as modal
- Icon: Large ⚠️ (24px), Red
- Message: Dark Midnight Blue

### 11.3 Success Toast

```
┌─────────────────────────────────────┐
│ ✓ Transform applied successfully    │
└─────────────────────────────────────┘
```

**Styling:**

- Position: Fixed top-right
- Background: Green
- Color: White
- Padding: 12px 16px
- Border-radius: 4px
- Font: Graphik Regular 14px
- Auto-dismiss: 3 seconds
- Animation: Slide in from top

---

## 12. Interaction Flows

### 12.1 First Launch

**Welcome modal** (optional for MVP, can be skipped):

```
┌─────────────────────────────────────────────┐
│ Welcome to Chumak                           │
│                                             │
│ Transform your data right in the browser.   │
│                                             │
│ [Get Started]                               │
│                                             │
│ ☐ Don't show this again                     │
└─────────────────────────────────────────────┘
```

For MVP, can skip welcome screen and go straight to drop zone.

### 12.2 Import CSV Flow

```
User drops file onto drop zone
         │
         ▼
   ┌─────────────┐
   │ Parsing...  │   (Loading spinner)
   └─────────────┘
         │
         ▼
   File parsed successfully
         │
         ├─── Source created (appears in left panel)
         ├─── Default Model created (e.g., "sales_cleaned")
         └─── Data preview shows first 100 rows
```

**Loading state:**

- Spinner: CSS-only animation (rotating border)
- Color: Cyan
- Text: "Parsing..." in Dark Gray

### 12.3 Add Transform Flow

```
User clicks toolbar button (e.g., "Filter")
         │
         ▼
Modal opens with form
         │
         ├─ User types expression
         ├─ Preview updates (debounced 300ms)
         └─ User clicks [Apply]
         │
         ▼
Step added to list
Main preview updates
Modal closes
```

### 12.4 Step Click Flow ✅ Implemented

Click step → Cyan highlight → Data shows intermediate result → Info banner "Viewing step N of M" with "View final result" button

### 12.5 Delete Step Flow ✅ Implemented

Hover step → × button appears → Click × → Confirmation dialog → Recompute from source → Return to final view

---

## 13. Dialog Forms

This section covers all dialogs: import configuration and transform operations. All use consistent styling.

### 13.0 Import CSV Dialog ✅ Implemented

**Features:** 5-row preview, header mode (first-row/auto-gen/manual), delimiter selection, editable column names, validation

### 13.1 Filter ✅ Implemented

**Features:** Expression input with live validation, error messages with position highlighting, help text with examples

### 13.2 Select Columns ✅ Implemented

**Features:** Checkbox list, Select All/None buttons, preview of selected columns (3 rows)

### 13.3 Rename ✅ IMPLEMENTED

```
┌─ Rename Columns ──────────────────────────────────┐
│                                                   │
│  Column:   ┌──────────────────────────┐           │
│            │ region                ▼ │           │
│            └──────────────────────────┘           │
│  New name: ┌──────────────────────────┐           │
│            │ area                    │           │
│            └──────────────────────────┘           │
│                                                   │
│  [+ Add another rename]                           │
│                                                   │
│  ─── Preview ──────────────────────────────────   │
│  [mini table with renamed column]                 │
│                                                   │
│                        [Cancel]  [Apply]          │
└───────────────────────────────────────────────────┘
```

### 13.4 Sort ✅ IMPLEMENTED

```
┌─ Sort ────────────────────────────────────────────┐
│                                                   │
│  Sort by:  ┌──────────────────┐                   │
│            │ sales         ▼ │                   │
│            └──────────────────┘                   │
│            ○ Ascending  ● Descending              │
│                                                   │
│  [+ Add secondary sort]                           │
│                                                   │
│  ─── Preview ──────────────────────────────────   │
│  [mini table showing sorted order]                │
│                                                   │
│                        [Cancel]  [Apply]          │
└───────────────────────────────────────────────────┘
```

### 13.5 Derive ✅ IMPLEMENTED

```
┌─ Derive Column ───────────────────────────────────┐
│                                                   │
│  New column name: ┌────────────────────────────┐  │
│                   │ profit                     │  │
│                   └────────────────────────────┘  │
│                                                   │
│  Expression:      ┌────────────────────────────┐  │
│                   │ revenue - cost             │  │
│                   └────────────────────────────┘  │
│                                                   │
│  Examples: revenue - cost, price * quantity       │
│                                                   │
│  ─── Preview ──────────────────────────────────   │
│  [mini table showing new column]                  │
│                                                   │
│                        [Cancel]  [Apply]          │
└───────────────────────────────────────────────────┘
```

### 13.6 Aggregate

```
┌─ Group & Aggregate ───────────────────────────────┐
│                                                   │
│  Group by:  ☑ region  ☐ year  ☐ category          │
│                                                   │
│  Aggregations:                                    │
│  ┌─────────┬──────────┬───────────────┐           │
│  │ Column  │ Operation│ Output Name   │           │
│  ├─────────┼──────────┼───────────────┤           │
│  │ sales ▼ │ sum   ▼  │ total_sales   │           │
│  │ profit▼ │ mean  ▼  │ avg_profit    │           │
│  └─────────┴──────────┴───────────────┘           │
│  [+ Add aggregation]                              │
│                                                   │
│  ─── Preview ──────────────────────────────────   │
│  [mini table showing aggregated result]           │
│                                                   │
│                        [Cancel]  [Apply]          │
└───────────────────────────────────────────────────┘
```

---

## 14. Responsive Behavior

### 14.1 Viewport Breakpoints

| Viewport Width  | Behavior                                                             |
| --------------- | -------------------------------------------------------------------- |
| ≥1280px         | Full layout, optimal experience                                      |
| 1024px - 1279px | Full layout, slightly cramped                                        |
| 768px - 1023px  | Show warning banner: "Chumak works best on larger screens (1280px+)" |
| <768px          | Block usage with message: "Please use a larger screen"               |

**Warning banner styling:**

- Background: Yellow
- Color: Dark Midnight Blue
- Padding: 8px 16px
- Font: Graphik Regular 14px
- Position: Fixed top, full width
- Dismissible: [×] close button

---

## 15. Accessibility

### 15.1 Keyboard Navigation

| Key        | Action                                        |
| ---------- | --------------------------------------------- |
| Tab        | Navigate focusable elements                   |
| Shift+Tab  | Navigate backwards                            |
| Enter      | Activate button, submit form                  |
| Escape     | Close modal/dialog                            |
| Space      | Toggle checkbox/radio                         |
| Arrow keys | Navigate table cells, select dropdown options |

### 15.2 Focus Indicators

All interactive elements have visible focus state:

- Outline: 2px solid Cyan
- Offset: 2px
- Border-radius: 4px (matches element)

### 15.3 ARIA Labels

- Modal: `role="dialog"`, `aria-labelledby`, `aria-describedby`
- Buttons: `aria-label` for icon-only buttons
- Table: `role="table"`, proper header associations
- Tree view: `role="tree"`, `aria-expanded` states

### 15.4 Color Contrast

All text meets WCAG AA standards:

- Primary text (Dark Midnight Blue on White): 8.12:1 ✓
- Secondary text (Dark Gray on White): 4.54:1 ✓
- Cyan links (on White): 3.18:1 (⚠️ use underline for clarity)

---

## 16. Loading & Progress States

### 16.1 Spinner

CSS-only spinner (no images):

```css
.spinner {
  border: 3px solid rgba(0, 187, 206, 0.1);
  border-top-color: #00bbce;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
```

### 16.2 Progress Bar

For file parsing or long operations:

```
┌──────────────────────────────────────┐
│ Parsing CSV...                       │
│ ████████████░░░░░░░░░░░░░░░░░ 45%    │
└──────────────────────────────────────┘
```

**Styling:**

- Height: 8px
- Background: Light Gray
- Fill: Cyan
- Border-radius: 4px

---

## 17. Animation & Transitions

### 17.1 Principles

From KSE guidelines: **Simple and rigorous, no decorative effects.**

For Chumak:

- Use transitions sparingly
- Fast durations (150-200ms)
- Ease-out easing for natural feel
- No bounces, no elasticity

### 17.2 Allowed Animations

| Element            | Animation                  | Duration | Easing           |
| ------------------ | -------------------------- | -------- | ---------------- |
| Button hover       | Background color           | 150ms    | ease-out         |
| Modal open         | Opacity + scale (1.05 → 1) | 200ms    | ease-out         |
| Toast notification | Slide in from top          | 200ms    | ease-out         |
| Tab switch         | Opacity                    | 150ms    | ease-out         |
| Spinner            | Rotation                   | 1s       | linear, infinite |

### 17.3 Disallowed

- ❌ Fade-ins for content (hurts performance perception)
- ❌ Slide animations for panels (jarring)
- ❌ Parallax effects
- ❌ Hover effects on table rows (too much visual noise)

---

## 18. CSS Architecture

### 18.1 File Structure

```
styles/
├── normalize.css           # Browser reset (CDN)
├── variables.css           # CSS custom properties
├── typography.css          # Font loading, type scale
├── layout.css              # Grid, panels, spacing
├── components/
│   ├── buttons.css
│   ├── forms.css
│   ├── table.css
│   ├── modals.css
│   ├── tree-view.css
│   └── toolbar.css
└── utilities.css           # Helper classes
```

### 18.2 CSS Custom Properties

Define design tokens as CSS variables:

```css
:root {
  /* Colors */
  --color-midnight-blue: #003964;
  --color-cyan: #00bbce;
  --color-green: #a7c539;
  --color-yellow: #e4e541;
  --color-red: #f15b43;
  --color-dark-red: #d33e2c;
  --color-white: #ffffff;
  --color-light-gray: #f5f5f5;
  --color-medium-gray: #c8c8c8;
  --color-dark-gray: #646464;

  /* Typography */
  --font-family: 'Graphik', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;

  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;

  --line-height-tight: 1.15;
  --line-height-normal: 1.3;
  --line-height-relaxed: 1.4;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Layout */
  --header-height: 48px;
  --toolbar-height: 56px;
  --left-panel-width: 300px;

  /* Borders */
  --border-width: 1px;
  --border-color: var(--color-medium-gray);
  --border-radius: 4px;
  --border-radius-lg: 8px;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
}
```

### 18.3 Naming Convention

Use BEM (Block Element Modifier):

```css
/* Block */
.button {
}

/* Element */
.button__icon {
}

/* Modifier */
.button--primary {
}
.button--disabled {
}
```

### 18.4 Utility Classes

Minimal utility classes for common patterns:

```css
/* Spacing */
.mt-md {
  margin-top: var(--space-md);
}
.p-lg {
  padding: var(--space-lg);
}

/* Typography */
.text-secondary {
  color: var(--color-dark-gray);
}
.text-center {
  text-align: center;
}

/* Flexbox */
.flex {
  display: flex;
}
.flex-between {
  justify-content: space-between;
}
.flex-center {
  align-items: center;
}

/* Visibility */
.hidden {
  display: none;
}
.sr-only {
  /* Screen reader only */
}
```

---

## 19. Browser Compatibility

### 19.1 Target Browsers

| Browser | Minimum Version                     |
| ------- | ----------------------------------- |
| Chrome  | Latest 2 versions                   |
| Safari  | Latest 2 versions                   |
| Firefox | Not officially supported (may work) |
| Edge    | Not officially supported (may work) |

### 19.2 Required Features

- CSS Grid
- CSS Custom Properties
- Flexbox
- ES6+ JavaScript
- IndexedDB
- File API

### 19.3 Polyfills

None required for target browsers. If expanding support:

- Use `@supports` queries for progressive enhancement
- Fallback to simpler layouts if Grid unavailable

---

## 20. Implementation Checklist

### 20.1 Phase 1 (MVP) — Visual Foundation

- [ ] Load normalize.css or modern-normalize
- [ ] Define CSS custom properties (variables.css)
- [ ] Load Graphik font (or fallback to Arial)
- [ ] Implement main grid layout
- [ ] Style header
- [ ] Style toolbar with buttons
- [ ] Style left panel (tree view)
- [ ] Style steps panel with tabs
- [ ] Style data preview table
- [ ] Style buttons (primary, secondary, danger)
- [ ] Style form elements (input, select, checkbox, radio)
- [ ] Style modals/dialogs
- [ ] Style all transform dialog forms
- [ ] Style error states
- [ ] Style loading states
- [ ] Style empty states / drop zone
- [ ] Implement focus indicators
- [ ] Test keyboard navigation
- [ ] Verify color contrast

### 20.2 Phase 2 — Polish

- [ ] Add hover animations
- [ ] Add modal open/close animations
- [ ] Implement toast notifications
- [ ] Add success states
- [ ] Optimize table rendering (virtual scrolling?)
- [ ] Test with real data (1000+ rows)
- [ ] Test all viewport sizes
- [ ] Cross-browser testing (Safari specific)

### 20.3 Phase 3 — Refinement

- [ ] Implement drag-to-reorder steps
- [ ] Add column resize handles
- [ ] Add column quick actions menu
- [ ] Consider dark mode (optional)
- [ ] Performance audit
- [ ] Accessibility audit

---

## 21. Design Token Reference

Quick reference for developers:

| Token                   | Value          | Usage                          |
| ----------------------- | -------------- | ------------------------------ |
| `--color-midnight-blue` | #003964        | Primary text, buttons, borders |
| `--color-cyan`          | #00BBCE        | Links, accents, active states  |
| `--color-green`         | #A7C539        | Success states                 |
| `--color-yellow`        | #E4E541        | Warnings                       |
| `--color-red`           | #F15B43        | Errors                         |
| `--color-dark-red`      | #D33E2C        | Delete actions                 |
| `--font-family`         | Graphik, Arial | All text                       |
| `--font-size-base`      | 14px           | Default text size              |
| `--space-md`            | 16px           | Default spacing                |
| `--border-radius`       | 4px            | Default corner radius          |
| `--transition-fast`     | 150ms ease-out | Hover effects                  |

---

## 22. Differences from Original 98.css Design

| Aspect              | 98.css Version                 | KSE-Inspired Version                |
| ------------------- | ------------------------------ | ----------------------------------- |
| **Framework**       | 98.css components              | Custom CSS                          |
| **Visual style**    | Retro Windows 98               | Clean, modern, rigorous             |
| **Colors**          | System grays, blue             | KSE palette (Dark Blue, Cyan, etc.) |
| **Typography**      | System fonts                   | Graphik font family                 |
| **Window chrome**   | 3D beveled frames              | Flat 1px borders                    |
| **Borders**         | Multiple shades (inset/outset) | Single 1px solid borders            |
| **Buttons**         | 3D raised/pressed              | Flat with subtle hover              |
| **Complexity**      | High visual weight             | Minimal, information-first          |
| **Customizability** | Limited (framework styles)     | Full control via CSS variables      |

---

## 23. Summary

This redesigned UX specification provides:

1. **Clean, rigorous visual design** inspired by KSE brand guidelines
2. **Information density** without visual clutter
3. **Custom CSS** with full control (no framework lock-in)
4. **Browser normalization** via normalize.css/modern-normalize
5. **Consistent design tokens** via CSS custom properties
6. **Accessibility-first** approach (keyboard nav, focus states, ARIA)
7. **Maintainable CSS architecture** (BEM naming, modular files)
8. **Simple interactions** (minimal animations, fast transitions)

The design maintains all functionality from the original 98.css version while providing a modern, professional appearance suitable for a KSE-affiliated product.

---

**End of UX Specification**
