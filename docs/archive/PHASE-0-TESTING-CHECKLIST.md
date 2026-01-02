# Phase 0 - Manual Testing Checklist

> **Purpose**: Comprehensive checklist to verify all Phase 0 functionality works correctly

**Status**: Phase 0 Complete

---

## 1. CSV Import

### 1.1 Basic Import

- [ ] Click "Import CSV" button
- [ ] Select a CSV file from disk
- [ ] Verify import dialog shows correct preview
- [ ] Verify "First row as headers" mode works (headers extracted from row 1)
- [ ] Verify "Auto-generate headers" mode works (Column1, Column2, etc.)
- [ ] Click "Import" and verify data appears in preview table
- [ ] Verify source appears in left panel

### 1.2 Drag-and-Drop Import

- [ ] Drag a CSV file onto the drop zone
- [ ] Verify import dialog appears with preview
- [ ] Complete import and verify data loads

### 1.3 Edge Cases

- [ ] Import CSV with special characters in headers
- [ ] Import CSV with quoted fields containing commas
- [ ] Import CSV with empty cells (nulls)
- [ ] Import CSV with numeric and string columns mixed

---

## 2. Data Persistence (IndexedDB)

### 2.1 Auto-Save

- [ ] Import a CSV file
- [ ] Verify data is visible in preview
- [ ] Refresh the page (hard reload: Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Verify data is still there after reload
- [ ] Verify source is still in left panel

### 2.2 Multiple Sessions

- [ ] Import CSV file A
- [ ] Refresh page
- [ ] Import CSV file B (without clearing data)
- [ ] Verify both sources are present
- [ ] Refresh page
- [ ] Verify both sources are still there

### 2.3 Clear Data

- [ ] Import some data
- [ ] Click "Clear All Data" button (red button in header)
- [ ] Confirm clearing in alert dialog
- [ ] Verify all data is removed
- [ ] Verify left panel is empty
- [ ] Refresh page
- [ ] Verify data stays cleared

---

## 3. Filter Transform

### 3.1 Simple Comparisons

- [ ] Import a CSV with numeric column (e.g., "sales")
- [ ] Click "Filter" button
- [ ] Enter expression: `sales > 1000`
- [ ] Verify preview updates (no error message)
- [ ] Click "Apply"
- [ ] Verify filtered data shows only rows where sales > 1000
- [ ] Verify step appears in Steps list on left

### 3.2 String Comparisons

- [ ] Use CSV with text column (e.g., "region")
- [ ] Enter filter: `region == "North"`
- [ ] Verify preview updates
- [ ] Click "Apply"
- [ ] Verify only "North" region rows remain

### 3.3 Compound Expressions (AND)

- [ ] Enter filter: `sales > 1000 && region == "North"`
- [ ] Verify preview updates
- [ ] Click "Apply"
- [ ] Verify both conditions are satisfied in results

### 3.4 Compound Expressions (OR)

- [ ] Enter filter: `region == "North" || region == "South"`
- [ ] Verify preview updates
- [ ] Click "Apply"
- [ ] Verify rows match either condition

### 3.5 Complex Nested Logic

- [ ] Enter: `(sales > 1000 && region == "North") || (sales > 5000 && region == "South")`
- [ ] Verify preview updates
- [ ] Click "Apply"
- [ ] Verify logic is correct

### 3.6 Arithmetic in Expressions

- [ ] Enter: `sales - cost > 500`
- [ ] Verify preview updates
- [ ] Click "Apply"
- [ ] Verify calculation is correct

### 3.7 Multiple Operators

- [ ] Enter: `sales >= 1000`
- [ ] Test `<=`, `<`, `>`, `==`, `!=`, `===`, `!==`
- [ ] Verify each operator works correctly

### 3.8 Unary Operators

- [ ] Enter: `!active` (if you have a boolean column)
- [ ] Enter: `-balance > 100` (negative values)
- [ ] Verify both work correctly

---

## 4. Filter Error Handling

### 4.1 Unknown Column

- [ ] Enter filter: `unknown_column > 100`
- [ ] Verify error message appears below input
- [ ] Verify error shows: "Column 'unknown_column' not found"
- [ ] Verify error shows position indicator (↑)
- [ ] Verify error lists available columns
- [ ] Verify "Apply" button is disabled

### 4.2 Syntax Errors

- [ ] Enter: `sales >` (incomplete expression)
- [ ] Verify error appears
- [ ] Enter: `sales > > 100` (double operator)
- [ ] Verify error appears
- [ ] Enter: `(sales > 100` (unclosed parenthesis)
- [ ] Verify error appears

### 4.3 Disallowed Operators

- [ ] Try entering function calls (Phase 1 feature): `Math.max(sales, 100)`
- [ ] Verify error: "Expression type 'CallExpression' is not allowed"

### 4.4 Live Validation

- [ ] Start typing a valid expression: `sales`
- [ ] Verify no error
- [ ] Add: `sales >` (incomplete)
- [ ] Verify error appears immediately
- [ ] Complete: `sales > 100`
- [ ] Verify error disappears

---

## 5. Select Transform

### 5.1 Basic Column Selection

- [ ] Import CSV with multiple columns (e.g., 5+ columns)
- [ ] Click "Select Columns" button
- [ ] Check 2-3 columns in the list
- [ ] Verify preview shows only selected columns
- [ ] Click "Apply"
- [ ] Verify data table shows only selected columns
- [ ] Verify step appears in Steps list

### 5.2 Select All / Deselect All

- [ ] Open Select dialog
- [ ] Uncheck all columns
- [ ] Verify no columns selected
- [ ] Check all columns
- [ ] Verify all columns selected

### 5.3 Chain Select After Filter

- [ ] Apply a filter (e.g., `sales > 1000`)
- [ ] Then apply a select (choose 2-3 columns)
- [ ] Verify both transforms are in Steps list
- [ ] Verify data is both filtered AND column-selected

---

## 6. CSV Export

### 6.1 Basic Export

- [ ] Import a CSV file
- [ ] Click "Export CSV" button
- [ ] Verify download starts
- [ ] Verify filename format: `chumak-export-YYYY-MM-DD-HHmmss.csv`
- [ ] Open downloaded CSV in text editor
- [ ] Verify data is correct
- [ ] Verify headers are present

### 6.2 Export After Transforms

- [ ] Import CSV
- [ ] Apply filter: `sales > 1000`
- [ ] Apply select (choose 2-3 columns)
- [ ] Click "Export CSV"
- [ ] Open downloaded file
- [ ] Verify only filtered rows are present
- [ ] Verify only selected columns are present

### 6.3 Export Empty Result

- [ ] Apply filter that matches no rows: `sales > 999999999`
- [ ] Click "Export CSV"
- [ ] Open downloaded file
- [ ] Verify only headers are present (no data rows)

---

## 7. Workflow JSON Export

### 7.1 Basic Workflow Export

- [ ] Import a CSV file
- [ ] Apply 2-3 transforms (filter, select)
- [ ] Click "Export Workflow JSON" button
- [ ] Verify download starts
- [ ] Verify filename format: `chumak-workflow-YYYY-MM-DD-HHmmss.json`
- [ ] Open downloaded JSON in text editor
- [ ] Verify structure contains:
  - `version: "1.0"`
  - `name: "<model-name>"`
  - `exportedAt: "<ISO timestamp>"`
  - `source: { name, columns, rowCount, ... }`
  - `model: { steps: [...] }`

### 7.2 Verify Transform Steps in JSON

- [ ] Check that each transform is represented:
  - Filter: `{ "filter": "sales > 1000" }`
  - Select: `{ "select": ["col1", "col2"] }`
- [ ] Verify steps array order matches visual Steps list

### 7.3 Export Without Transforms

- [ ] Import CSV but don't apply any transforms
- [ ] Click "Export Workflow JSON"
- [ ] Open JSON
- [ ] Verify `model.steps` is empty array: `[]`

---

## 8. Workflow JSON Import (Replay)

### 8.1 Re-import Exported Workflow

- [ ] Export a workflow JSON (with 2-3 transforms)
- [ ] Click "Clear All Data" to reset
- [ ] Use import dialog or drag-and-drop to import the JSON file
- [ ] Verify all transforms are replayed
- [ ] Verify final data matches pre-export state
- [ ] Verify Steps list shows all transforms

### 8.2 Cross-Session Workflow Replay

- [ ] Session 1: Import CSV, apply transforms, export workflow JSON
- [ ] Session 2 (new browser tab or after refresh + clear):
  - Import the workflow JSON
  - Verify data and transforms are identical to Session 1

---

## 9. Data Preview Table

### 9.1 Basic Display

- [ ] Import CSV with 10+ rows
- [ ] Verify table shows data with proper formatting
- [ ] Verify headers are displayed
- [ ] Verify column alignment (text left, numbers right if applicable)

### 9.2 Large Datasets

- [ ] Import CSV with 1000+ rows
- [ ] Verify only first 100 rows are shown in preview (performance)
- [ ] Verify preview is responsive (no lag)

### 9.3 Null Handling

- [ ] Import CSV with empty cells
- [ ] Verify nulls display as empty cells (not "null" string)

---

## 10. Steps List UI

### 10.1 Step Display

- [ ] Apply multiple transforms
- [ ] Verify each step appears in left panel under "Steps"
- [ ] Verify step descriptions are readable:
  - Filter: "Filter" (or with expression)
  - Select: "Select: N columns"

### 10.2 Step Order

- [ ] Apply: Filter → Select → Filter
- [ ] Verify Steps list shows them in order applied

---

## 11. Multi-Transform Workflows

### 11.1 Sequential Transforms

- [ ] Import CSV with columns: [name, region, sales, cost]
- [ ] Step 1: Filter: `sales > 1000`
- [ ] Verify row count decreases
- [ ] Step 2: Select columns: [name, sales]
- [ ] Verify only 2 columns remain
- [ ] Step 3: Filter: `sales > 2000`
- [ ] Verify further filtering works on remaining data
- [ ] Export CSV
- [ ] Verify final CSV has 2 columns and correct filtered rows

---

## 12. Edge Cases and Stress Tests

### 12.1 Empty Dataset

- [ ] Import CSV with only headers (0 data rows)
- [ ] Verify no errors
- [ ] Try applying filter
- [ ] Verify works without crashing
- [ ] Export CSV
- [ ] Verify only headers in export

### 12.2 Single Row

- [ ] Import CSV with 1 data row
- [ ] Apply filter that matches it
- [ ] Apply filter that doesn't match it
- [ ] Verify both work correctly

### 12.3 Single Column

- [ ] Import CSV with 1 column
- [ ] Apply filter on that column
- [ ] Apply select on that column
- [ ] Export
- [ ] Verify works correctly

### 12.4 Very Long Column Names

- [ ] Import CSV with 50+ character column name
- [ ] Use it in filter expression
- [ ] Verify works correctly

### 12.5 Special Characters in Data

- [ ] Import CSV with Unicode characters (émojis, accents: café, 😊)
- [ ] Filter by those values
- [ ] Export
- [ ] Verify characters preserved

### 12.6 Numeric Edge Cases

- [ ] Test division: `sales / 2 > 100`
- [ ] Test modulo: `sales % 100 == 0`
- [ ] Test with zeros: `cost == 0`
- [ ] Test with negative numbers: `balance < 0`

---

## 13. Browser Compatibility

### 13.1 Chrome

- [ ] Run all tests above in Chrome
- [ ] Verify no console errors
- [ ] Verify IndexedDB works

### 13.2 Safari

- [ ] Run all tests above in Safari
- [ ] Verify no console errors
- [ ] Verify IndexedDB works

### 13.3 Developer Console

- [ ] Open browser DevTools
- [ ] Check Console tab for errors during:
  - Import
  - Filter apply
  - Export
- [ ] Verify no red errors (warnings OK)

---

## 14. Error Recovery

### 14.1 Recover from Invalid Filter

- [ ] Enter invalid filter: `sales >`
- [ ] Verify error shows, Apply disabled
- [ ] Fix filter: `sales > 100`
- [ ] Verify error clears, Apply enabled
- [ ] Click Apply
- [ ] Verify transform works

### 14.2 Dismiss Modal Without Applying

- [ ] Open Filter dialog
- [ ] Enter valid expression
- [ ] Click outside modal or Cancel
- [ ] Verify no transform applied
- [ ] Verify Steps list unchanged

---

## Summary Checklist

**Core Functionality:**

- [ ] CSV import (file picker)
- [ ] CSV import (drag-and-drop)
- [ ] IndexedDB persistence across refreshes
- [ ] Clear All Data function
- [ ] Filter with simple expressions
- [ ] Filter with compound expressions (&&, ||)
- [ ] Filter with arithmetic
- [ ] Select columns
- [ ] CSV export
- [ ] Workflow JSON export
- [ ] Workflow JSON import/replay

**Error Handling:**

- [ ] Unknown column errors
- [ ] Syntax errors
- [ ] Live validation
- [ ] Position indicators
- [ ] Available columns suggestions

**Edge Cases:**

- [ ] Empty datasets
- [ ] Single row/column
- [ ] Null values
- [ ] Special characters
- [ ] Large datasets (1000+ rows)

**Expected Phase 0 Scope:**

- [ ] ✅ All above tests pass
- [ ] ❌ No predicate builder (Phase 1)
- [ ] ❌ No function calls in expressions (Phase 2)
- [ ] ❌ No automated tests yet (Phase 1)
- [ ] ❌ No bracket notation for column names (Phase 1)
- [ ] ❌ No derive/sort/rename transforms (Phase 1)

---

## Pass Criteria

**Phase 0 is successful if:**

1. All "Core Functionality" items work without errors
2. Error handling shows user-friendly messages
3. Data persists correctly across page refreshes
4. Export/import workflow preserves transforms
5. No browser console errors during normal operation
6. Architecture is proven ready for Phase 1 expansion

---

**Phase**: 0 (Walking Skeleton)
**Next**: Phase 1 (MVP) - Add remaining transforms and enhanced parser features
