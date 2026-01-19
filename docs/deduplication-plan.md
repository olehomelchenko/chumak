# Deduplication Feature Implementation Plan

## Overview

Add a comprehensive deduplication feature to Syto that allows users to detect and remove duplicate rows based on table-level or column-level criteria.

## Features

1. **Detect duplicates**: Highlight duplicate rows in the data table
2. **Remove duplicates**: Remove duplicate rows (keep first occurrence)
3. **Multi-column selection**: Dedupe by all columns or specific columns as composite key
4. **Context-aware**: Pre-select column when opened from column tooltip
5. **Accessible from**: Ribbon button "Dedupe" AND column floating toolbar

---

## Files to Modify

### 1. Transform Engine (`src/core/transforms.ts`)

**Add dedupe transform** (after line ~330, before `describeTransform`):

```typescript
if (transform.dedupe) {
  const { columns } = transform.dedupe;
  if (!columns || columns.length === 0) {
    return table.dedupe(); // All columns
  }
  return table.dedupe(...columns);
}
```

**Add to `describeTransform()`**:

```typescript
if (transform.dedupe) {
  const cols = transform.dedupe.columns;
  const colInfo =
    !cols || cols.length === 0
      ? 'all columns'
      : cols.length === 1
        ? `"${cols[0]}"`
        : `${cols.length} columns`;
  return `Remove duplicates: by ${colInfo}`;
}
```

---

### 2. Main Application (`src/syto-app.ts`)

**Add state property** (around line 160, near other dialog states):

```typescript
dedupeDialogState: {
  selectedColumns: boolean[];
  useAllColumns: boolean;
  duplicateCount: number;
  duplicateIndices: Set<number>;
} = {
  selectedColumns: [],
  useAllColumns: true,
  duplicateCount: 0,
  duplicateIndices: new Set(),
};

highlightedDuplicates: Set<number> = new Set();
```

**Add methods**:

- `initDedupeDialog()` - Initialize state, pre-select column from toolbar
- `selectAllForDedupe()` / `selectNoneForDedupe()` - Bulk selection helpers
- `toggleDedupeColumn(index)` - Toggle individual column selection
- `getDedupeColumns(): string[]` - Get selected columns array
- `findDuplicateRows(data, columns): Set<number>` - Core detection algorithm
- `updateDedupePreview()` - Update preview panel with duplicate stats
- `applyDedupeTransform()` - Execute the dedupe transform
- `quickDedupe()` - Entry point from column toolbar

**Update existing methods**:

- `initDialogState()` - Add 'dedupe' case
- `applyActiveTransform()` - Add 'dedupe' case
- `activeDialogError()` - Return error if no columns selected in specific mode
- `getDialogTitle()` - Return 'Remove Duplicates'
- `getDialogState()` - For snapshot comparison
- `resetDialogStates()` - Reset dedupe state
- `editStep()` - Support editing existing dedupe steps
- `isSlidePanel()` - Add 'dedupe' to slide panel list

**Duplicate detection algorithm**:

```typescript
findDuplicateRows(data: any[], columns: string[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  const keys = columns.length > 0 ? columns : Object.keys(data[0] || {});

  data.forEach((row, i) => {
    const key = keys.map(c => {
      const v = row[c];
      return v == null ? '\0null\0' : String(v);
    }).join('\0');

    if (seen.has(key)) {
      duplicates.add(i);
    } else {
      seen.set(key, i);
    }
  });
  return duplicates;
}
```

---

### 3. Modal Template (create `public/templates/dedupe-modal.html`)

Structure:

1. **Column Scope Toggle**: "All Columns" / "Specific Columns" buttons
2. **Column Selection Chips** (shown when "Specific Columns" selected):
   - Select All / Select None buttons
   - Chip grid with checkmark icons (reuse pattern from remove-modal.html)
3. **Stats Summary**: Show duplicate count with warning/success styling
4. **Form Help**: Explain that first occurrence is kept

---

### 4. Main HTML (`index.html`)

**Enable ribbon button** (lines 115-122):
Replace disabled button with:

```html
<button class="ribbon__button" @click="openDialog('dedupe')" title="Remove duplicate rows">
  <span class="iconify" data-icon="carbon:checkbox-checked"></span>
  <span>Dedupe</span>
</button>
```

**Add column toolbar button** (after line 1341, after quickSplit):

```html
<button class="floating-toolbar__button" @click="quickDedupe()" title="Dedupe by this column">
  <span class="iconify" data-icon="carbon:checkbox-checked"></span>
</button>
```

**Add modal container** (around line 1235, in slide panel content):

```html
<div id="dedupe-modal-container" x-show="activeDialog === 'dedupe'"></div>
```

**Add duplicate row highlighting** (in table row template):
Update `<tr>` to include duplicate class when highlighted.

---

### 5. Template Config (`src/syto-app.ts`)

**Add to `getTemplateConfigs()`**:

```typescript
{ id: 'dedupe-modal-container', url: 'templates/dedupe-modal.html' },
```

---

### 6. Styles (`styles/table.css`)

**Add duplicate row highlighting**:

```css
.data-table__row--duplicate {
  background-color: rgba(var(--color-yellow-rgb), 0.15) !important;
}
.data-table__row--duplicate:hover {
  background-color: rgba(var(--color-yellow-rgb), 0.25) !important;
}
```

---

## Implementation Order

1. **Transform logic**: Add `dedupe` handling in `transforms.ts`
2. **App state**: Add `dedupeDialogState` and methods in `syto-app.ts`
3. **Modal template**: Create `dedupe-modal.html`
4. **UI integration**: Enable ribbon button, add toolbar button, add modal container
5. **Styling**: Add duplicate row CSS classes
6. **Testing**: Test with various data scenarios

---

## Verification

1. **From Ribbon**: Click Dedupe button, select columns, verify preview shows correct count, apply and verify rows removed
2. **From Column Toolbar**: Select a column header, click dedupe icon, verify column is pre-selected
3. **All Columns Mode**: Toggle to "All Columns", verify detection uses all columns
4. **Multi-Column**: Select multiple columns, verify composite key deduplication
5. **Preview Stats**: Verify duplicate count updates as columns change
6. **Step Editing**: Add dedupe step, click to edit, verify state is restored
7. **Edge Cases**: Empty table, no duplicates, all duplicates
