# Chumak — UX Specification (MVP)

## 1. Design Foundation

### 1.1 Framework & Philosophy

| Aspect | Decision |
|--------|----------|
| **CSS Framework** | 98.css |
| **Philosophy** | Functional density, familiar patterns. No decorative nostalgia. |
| **Target** | Desktop, 13"+ screens |
| **Browser** | Chrome, Safari (latest 2 versions) |

### 1.2 Visual Principles

- Use 98.css components as-is (buttons, inputs, windows, tabs)
- Prioritize information density over whitespace
- Typography: system fonts per 98.css defaults
- No custom colors beyond 98.css palette unless necessary for data types

---

## 2. Layout

### 2.1 Main Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
│  Chumak                                        [Import] [Export ▼]  │
├─────────────────────────────────────────────────────────────────────┤
│ TRANSFORM TOOLBAR                                                   │
│  🔍Filter  📋Select  ✂️Remove  ✏️Rename  ↕️Sort  🧮Derive  ...      │
├───────────────────┬─────────────────────────────────────────────────┤
│ LEFT PANEL        │ DATA PREVIEW                                    │
│ (240px fixed)     │ (flexible, fills remaining space)               │
│                   │                                                 │
│ ┌───────────────┐ │ ┌─────────────────────────────────────────────┐ │
│ │ Sources &     │ │ │                                             │ │
│ │ Models        │ │ │  [Table with data]                          │ │
│ │               │ │ │                                             │ │
│ │ 📄 sales.csv  │ │ │  - Horizontal scroll                        │ │
│ │   └─ sales_   │ │ │  - Resizable columns                        │ │
│ │      cleaned  │ │ │  - Truncated values                         │ │
│ └───────────────┘ │ │                                             │ │
│                   │ │                                             │ │
│ ┌───────────────┐ │ │                                             │ │
│ │ [Steps][JSON] │ │ └─────────────────────────────────────────────┘ │
│ ├───────────────┤ │                                                 │
│ │ 1. Filter     │ │ Showing rows 1-100 of 5,432    [< Prev][Next >] │
│ │ 2. Derive     │ │                                                 │
│ │ 3. Select     │ │                                                 │
│ │               │ │                                                 │
│ └───────────────┘ │                                                 │
└───────────────────┴─────────────────────────────────────────────────┘
```

### 2.2 Panel Specifications

| Panel | Width/Height | Behavior |
|-------|--------------|----------|
| **Header** | 100% × 32px | Fixed |
| **Transform Toolbar** | 100% × 40px | Fixed, horizontal scroll if overflow |
| **Left Panel** | 240px fixed | Two sections stacked vertically |
| **Data Preview** | Remaining space | Scrollable both directions |

### 2.3 Left Panel Split

| Section | Height | Content |
|---------|--------|---------|
| **Sources & Models** | 30% (min 120px) | Tree view of data sources |
| **Steps / JSON** | 70% | Tabbed: step list or JSON view |

---

## 3. Components

### 3.1 Header

```
┌─────────────────────────────────────────────────────────────────┐
│ ☆ Chumak                                   [Import] [Export ▼]  │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Component | Behavior |
|---------|-----------|----------|
| **Logo/Name** | Text + icon | Static |
| **Import** | 98.css button | Opens file picker |
| **Export** | 98.css dropdown button | Options: "Export CSV", "Export Workflow" |

### 3.2 Transform Toolbar

Horizontal bar with icon+label buttons for each transform.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍     📋      ✂️      ✏️     ↕️     🧮     📝     🗑️    🔄     📊      │
│Filter Select Remove Rename Sort Derive  Fill  Drop  Replace Group  │
└─────────────────────────────────────────────────────────────────┘
```

| Transform | Emoji (MVP) | Status |
|-----------|-------------|--------|
| Filter | 🔍 | Active |
| Select | 📋 | Active |
| Remove | ✂️ | Active |
| Rename | ✏️ | Active |
| Sort | ↕️ | Active |
| Derive | 🧮 | Active |
| Fill Missing | 📝 | Active |
| Drop Missing | 🗑️ | Active |
| Replace | 🔄 | Active |
| Aggregate | 📊 | Active |
| Join | 🔗 | Greyed (Phase 2) |
| Pivot | 🔀 | Greyed (Phase 3) |
| Unpivot | 🔁 | Greyed (Phase 3) |
| Split | ✂️ | Greyed (Phase 3) |
| Merge | 🔗 | Greyed (Phase 3) |

**Button states:**
- Default: 98.css button style
- Hover: 98.css hover state
- Disabled: Greyed out, no pointer, tooltip "Coming soon"

### 3.3 Sources & Models Panel

98.css tree view component.

```
┌─ Sources & Models ──────────────────┐
│ 📄 sales.csv                        │
│    └─ 📊 sales_cleaned [active]     │
│ 📄 regions.csv                      │
│    └─ 📊 regions_lookup             │
└─────────────────────────────────────┘
```

| Interaction | Result |
|-------------|--------|
| Click source | Select source, show raw data preview |
| Click model | Select model, show transformed preview |
| Right-click | Context menu: Rename, Delete, Create Derived Model |

### 3.4 Steps Panel

Compact list with tab toggle to JSON view.

```
┌─ [Steps] [JSON] ────────────────────┐
│ 1. Filter: sales > 1000         [×] │
│ 2. Derive: profit = revenue-cost[×] │
│ 3. Select: 5 columns            [×] │
│    💬 "Removed PII columns"         │
│─────────────────────────────────────│
│ [+ Add Step]                        │
└─────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Step row** | Click → show data preview at this step |
| **[×] button** | Delete step + all subsequent (with confirmation) |
| **💬 Comment** | Shown inline if present, muted text |
| **[+ Add Step]** | Same as clicking toolbar button (opens selector) |
| **[JSON] tab** | Switches to read-only JSON view of transforms |

**Step row format:**
```
{index}. {transform_type}: {summary}    [×]
```

Summary examples:
- Filter: `sales > 1000`
- Select: `5 columns`
- Rename: `region → area`
- Derive: `profit = revenue - cost`
- Sort: `sales ↓`

### 3.5 JSON View (Tab)

```
┌─ [Steps] [JSON] ────────────────────┐
│ {                                   │
│   "transforms": [                   │
│     { "filter": "sales > 1000" },   │
│     { "derive": { "profit": "..." }}│
│   ]                                 │
│ }                                   │
│─────────────────────────────────────│
│                          [📋 Copy]  │
└─────────────────────────────────────┘
```

| Feature | Decision |
|---------|----------|
| Syntax highlighting | No (plain monospace for MVP) |
| Editable | No (read-only) |
| Copy button | Yes, copies full JSON |

### 3.6 Data Preview Table

```
┌─────────────────────────────────────────────────────────────────┐
│ [region     ▼] │ [sales    #] │ [profit   #] │ [date      📅] │ ...
├─────────────────────────────────────────────────────────────────┤
│ North          │        1,500 │          320 │ 2025-01-15     │
│ South          │        2,100 │          450 │ 2025-01-16     │
│ [greyed row when filtering...]                                  │
│ East           │          800 │          120 │ 2025-01-17     │
├─────────────────────────────────────────────────────────────────┤
│ Showing 1-100 of 5,432 rows              [◀ Prev] [Next ▶]     │
└─────────────────────────────────────────────────────────────────┘
```

#### Column Headers

| Element | Appearance |
|---------|------------|
| Column name | Left-aligned text |
| Type icon | After name: `#` number, `Aa` string, `📅` date, `☑` boolean |
| Selected column | Highlighted background (98.css selection color) |

#### Cell Styling by Type

| Type | Alignment | Style |
|------|-----------|-------|
| String | Left | Normal |
| Number | Right | Normal |
| Date | Left | Normal |
| Boolean | Center | Normal |
| Null/Empty | Center | Italic, muted color, shows `(empty)` |

#### Interactions

| Action | Result |
|--------|--------|
| Click column header | Select column (highlight) |
| Cmd+Click header | Add to selection |
| Drag column border | Resize column width |
| Horizontal scroll | Free scroll, no frozen columns |
| Click truncated cell | Expand to show full value (tooltip or inline) |

#### Pagination

```
Showing 1-100 of 5,432 rows    [◀ Prev] [Next ▶]
```

- 100 rows per page
- Simple prev/next navigation

---

## 4. Interaction Flows

### 4.1 First Launch

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─ Welcome to Chumak ─────────────────────────────────────┐   │
│   │                                                         │   │
│   │  📺 [Video thumbnail / Play button]                     │   │
│   │                                                         │   │
│   │  Watch a quick tutorial (2 min)                         │   │
│   │                                                         │   │
│   │              [Watch Video]  [Skip]                      │   │
│   │  ☐ Don't show this again                                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  (Main interface visible but dimmed behind modal)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Modal popup on first visit (localStorage flag)
- Interface visible behind, not blocked
- "Don't show again" checkbox
- Video link (external URL) or embedded

### 4.2 No Data State (Drop Zone)

When no source is loaded, the data preview area shows:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                    ┌─────────────────────┐                      │
│                    │                     │                      │
│                    │   📄 Drop CSV here  │                      │
│                    │                     │                      │
│                    │   or click to       │                      │
│                    │   browse files      │                      │
│                    │                     │                      │
│                    └─────────────────────┘                      │
│                                                                 │
│                    Supports .csv and .tsv                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- 98.css window/fieldset styling for drop zone
- Entire area is clickable
- Drag-over state: highlighted border

### 4.3 Import CSV Flow

```
User drags file onto drop zone
         │
         ▼
   ┌─────────────┐
   │ Parsing...  │   (Loading indicator)
   └─────────────┘
         │
         ▼
   File parsed successfully
         │
         ├─── Source created (appears in left panel)
         ├─── Default Model created (e.g., "sales_cleaned")
         └─── Data preview shows first 100 rows
```

**Error case:**
```
   ┌─ Error ─────────────────────────┐
   │                                 │
   │  Could not parse file.          │
   │  Please check it's a valid CSV. │
   │                                 │
   │              [OK]               │
   └─────────────────────────────────┘
```

### 4.4 Add Transform Flow

```
User clicks toolbar button (e.g., "Filter")
         │
         ▼
┌─ Filter ────────────────────────────────────────────────────────┐
│                                                                 │
│  Expression:  [sales > 1000                               ]     │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│  │ region │ sales │ profit │                                    │
│  │ North  │ 1,500 │    320 │                                    │
│  │ South  │ 2,100 │    450 │                                    │
│  │ (showing 2 of 5,432 rows matching filter)                    │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

| State | Behavior |
|-------|----------|
| **Typing expression** | Preview updates after debounce (300ms) |
| **Parse error** | Error message shown inline, preview blank |
| **Valid expression** | Preview shows matching rows |
| **Apply** | Step added to list, popup closes, main preview updates |
| **Cancel** | Popup closes, no change |

### 4.5 Step Click Flow

```
User clicks Step 2 in step list
         │
         ▼
   Data preview updates to show
   snapshot at Step 2 (cached)
         │
         ▼
   Step 2 is highlighted in list
```

- Clicking a step does NOT revert — only shows preview at that point
- Main data remains at latest step
- Visual indicator: "Viewing step 2 of 5" in preview area

### 4.6 Delete Step Flow

```
User clicks [×] on Step 2
         │
         ▼
┌─ Confirm Delete ────────────────────┐
│                                     │
│  Delete "Filter: sales > 1000"?     │
│                                     │
│  This will also remove all steps    │
│  after this one (2 steps).          │
│                                     │
│          [Cancel]  [Delete]         │
└─────────────────────────────────────┘
         │
         ▼ (if confirmed)
   Steps 2, 3, 4, 5 removed
   Data preview updates
```

### 4.7 Export CSV Flow

```
User clicks Export → "Export CSV"
         │
         ▼
   Browser download starts immediately
   (filename: {model_name}.csv)
```

No preview dialog for MVP — direct download.

### 4.8 Export Workflow Flow

```
User clicks Export → "Export Workflow"
         │
         ▼
┌─ Export Workflow ───────────────────┐
│                                     │
│  Workflow name: [My Analysis    ]   │
│                                     │
│  ○ Include source data              │
│    (larger file, fully portable)    │
│                                     │
│  ● Reference only                   │
│    (smaller, requires re-upload)    │
│                                     │
│          [Cancel]  [Export]         │
└─────────────────────────────────────┘
         │
         ▼
   Downloads {name}.chumak.json
```

---

## 5. Transform Popup Forms

Each transform has a popup with specific fields.

### 5.1 Filter

```
┌─ Filter ────────────────────────────────────────────────────────┐
│                                                                 │
│  Keep rows where:                                               │
│  [sales > 1000                                             ]    │
│                                                                 │
│  Examples: sales > 1000, region == "North", price != 0          │
│                                                                 │
│  ─── Preview (47 rows match) ───────────────────────────────    │
│  [preview table]                                                │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Select

```
┌─ Select Columns ────────────────────────────────────────────────┐
│                                                                 │
│  Choose columns to keep:                                        │
│                                                                 │
│  ☑ region                                                       │
│  ☑ sales                                                        │
│  ☐ cost                                                         │
│  ☑ profit                                                       │
│  ☐ date                                                         │
│                                                                 │
│  [Select All]  [Select None]                                    │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│  [preview table with selected columns only]                     │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Remove

```
┌─ Remove Columns ────────────────────────────────────────────────┐
│                                                                 │
│  Choose columns to remove:                                      │
│                                                                 │
│  ☐ region                                                       │
│  ☐ sales                                                        │
│  ☑ cost        ← (checked = will be removed)                    │
│  ☐ profit                                                       │
│  ☑ date                                                         │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Rename

```
┌─ Rename Columns ────────────────────────────────────────────────┐
│                                                                 │
│  Column:   [region            ▼]                                │
│  New name: [area                ]                               │
│                                                                 │
│  [+ Add another rename]                                         │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Sort

```
┌─ Sort ──────────────────────────────────────────────────────────┐
│                                                                 │
│  Sort by:  [sales             ▼]   ○ Ascending  ● Descending    │
│                                                                 │
│  [+ Add secondary sort]                                         │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Derive

```
┌─ Derive Column ─────────────────────────────────────────────────┐
│                                                                 │
│  New column name: [profit                ]                      │
│  Expression:      [revenue - cost        ]                      │
│                                                                 │
│  Examples: revenue - cost, price * quantity, [Total Sales] * 2  │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.7 Fill Missing

```
┌─ Fill Missing Values ───────────────────────────────────────────┐
│                                                                 │
│  Column:      [sales             ▼]                             │
│  Fill with:   [0                   ]                            │
│                                                                 │
│  ─── Preview (3 values will be filled) ─────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.8 Drop Missing

```
┌─ Drop Missing ──────────────────────────────────────────────────┐
│                                                                 │
│  Remove rows with empty values in:                              │
│                                                                 │
│  ○ Any column                                                   │
│  ● Selected columns:                                            │
│    ☑ sales                                                      │
│    ☐ region                                                     │
│    ☑ profit                                                     │
│                                                                 │
│  ─── Preview (12 rows will be removed) ─────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.9 Replace

```
┌─ Find and Replace ──────────────────────────────────────────────┐
│                                                                 │
│  Column:       [region           ▼]                             │
│  Find:         [North              ]                            │
│  Replace with: [Northern Region    ]                            │
│                                                                 │
│  ☐ Match case                                                   │
│                                                                 │
│  ─── Preview (23 values will change) ───────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.10 Aggregate

```
┌─ Group & Aggregate ─────────────────────────────────────────────┐
│                                                                 │
│  Group by:  ☑ region  ☐ year  ☐ category                        │
│                                                                 │
│  Aggregations:                                                  │
│  ┌─────────────┬───────────┬─────────────┐                      │
│  │ Column      │ Operation │ Output Name │                      │
│  ├─────────────┼───────────┼─────────────┤                      │
│  │ [sales   ▼] │ [sum   ▼] │ [total_sales│                      │
│  │ [profit  ▼] │ [mean  ▼] │ [avg_profit │                      │
│  └─────────────┴───────────┴─────────────┘                      │
│  [+ Add aggregation]                                            │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│                                                                 │
│                              [Cancel]  [Apply]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Error States

### 6.1 Expression Parse Error

Shown inline in transform popup:

```
┌─ Filter ────────────────────────────────────────────────────────┐
│                                                                 │
│  Keep rows where:                                               │
│  [sales > > 1000                                           ]    │
│                                                                 │
│  ⚠️ Unexpected token '>' at position 8                          │
│                                                                 │
│  ─── Preview ───────────────────────────────────────────────    │
│  (no preview available)                                         │
│                                                                 │
│                              [Cancel]  [Apply]  ← disabled      │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Unknown Column Error

```
│  [Slaes > 1000                                             ]    │
│                                                                 │
│  ⚠️ Column 'Slaes' not found. Did you mean 'Sales'?             │
```

### 6.3 Filter Returns No Rows

```
│  ─── Preview (0 rows match) ────────────────────────────────    │
│                                                                 │
│  No rows match this filter.                                     │
│                                                                 │
```

Apply button still enabled — user may want an empty result.

---

## 7. Component Inventory

Summary of all 98.css components used:

| Component | 98.css Element | Usage |
|-----------|----------------|-------|
| Buttons | `<button>` | Toolbar, dialogs, pagination |
| Dropdown button | `<button>` + menu | Export menu |
| Text input | `<input type="text">` | Expressions, names |
| Checkbox | `<input type="checkbox">` | Column selection |
| Radio | `<input type="radio">` | Sort order, export options |
| Select dropdown | `<select>` | Column pickers |
| Fieldset | `<fieldset>` | Form sections |
| Window | `<div class="window">` | Popups, drop zone |
| Title bar | `<div class="title-bar">` | Popup headers |
| Tree view | `<ul class="tree-view">` | Sources & Models |
| Tabs | `<menu role="tablist">` | Steps / JSON toggle |
| Table | `<table>` + styling | Data preview |
| Status bar | `<div class="status-bar">` | Row count, pagination |

---

## 8. Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| ≥1024px | Full layout as specified |
| <1024px | Show warning: "Chumak works best on larger screens" |
| <768px | Block usage with message |

---

## 9. State Summary

| State | What User Sees |
|-------|----------------|
| **First visit** | Welcome modal over ready interface |
| **No data** | Drop zone in preview area |
| **Data loaded** | Full interface, preview populated |
| **Transform editing** | Popup with preview |
| **Viewing past step** | Data preview shows snapshot, indicator text |
| **Loading (parsing)** | "Loading..." text or spinner in drop zone |
| **Error (parse/file)** | Error dialog or inline message |

