# Syto App Refactoring Progress

## Overview

Split [syto-app.js](../src/syto-app.js) (2,866 lines) into focused modules to improve maintainability.

## Completed Modules (Phase 1 & 2)

### ✅ Phase 1 - Independent Modules

1. **[export-handlers.js](../src/app/export-handlers.js)** (~185 lines)
   - `exportCSV()` - Export data as CSV file
   - `exportWorkflowJSON()` - Export workflow definition
   - `exportDataJSON()` - Export data as JSON
   - `copyCSVToClipboard()` - Copy page data as CSV
   - `copyJSONToClipboard()` - Copy page data as JSON

2. **[import-handlers.js](../src/app/import-handlers.js)** (~470 lines)
   - `handleFileSelect()` - File input handler
   - `handleFileDrop()` - Drag-drop handler
   - `handlePaste()` - Global paste handler
   - `promptPaste()` - Manual clipboard read
   - `showImportDialog()` - Show CSV import dialog
   - `confirmImport()` - Parse and import CSV
   - `createSource()` - Create source and model
   - `updateImportPreview()` - Reparse on delimiter change
   - `updateHeadersForPreview()` - Update preview headers
   - `resolveDuplicateHeaders()` - Handle duplicate column names

3. **[eda-handlers.js](../src/app/eda-handlers.js)** (~175 lines)
   - `selectColumn()` - Column selection with stats/charts
   - `selectEdaStat()` - Select stat value from summary
   - `setEdaChartView()` - Switch between boxplot/histogram
   - `handleBrushSelection()` - Histogram brush selection
   - `applyBrushFilter()` - Filter from brush selection
   - `clearColumnSelection()` - Clear selection state

### ✅ Phase 2 - Core Infrastructure

4. **[dialog-manager.js](../src/app/dialog-manager.js)** (~175 lines)
   - `getDialogState()` - Serialize dialog state for dirty checking
   - `openDialog()` - Open dialog and initialize state
   - `hasUnsavedChanges()` - Check for unsaved changes
   - `closeDialog()` - Close with dirty check

5. **[interaction-handlers.js](../src/app/interaction-handlers.js)** (~290 lines)
   - `handleBodyClick()` - Close menus on outside click
   - `openTypeMenu()` - Open type change menu
   - `changeColumnType()` - Change column type
   - `autoDetectSchema()` - Auto-detect all column types
   - `updateToolbarPosition()` - Position floating toolbars
   - `selectCell()` - Cell selection
   - `applyQuickCellFilter()` - Quick keep/exclude filters
   - `quickSort()` - Quick sort from toolbar
   - `quickFilter()` - Quick filter from toolbar
   - `quickRename()` - Quick rename from toolbar
   - `quickRemove()` - Quick remove from toolbar

## Remaining Work (Phase 3)

### 🔲 Transform Dialogs Module (~600 lines)

Extract from lines ~1106-1800:

- `getModelMeta()` - Model metadata display
- `describeTransform()` - Transform description
- `selectAllColumns()`, `selectNoColumns()` - Column selection helpers
- `getSelectedColumnsList()` - Get selected columns
- `applyColumnPattern()` - Pattern matching logic
- `getPatternMatchInfo()` - Pattern match info
- `getColumnType()`, `getTypeIndicator()` - Type display helpers
- `validateFilterExpression()`, `applyFilterTransform()` - Filter transform
- `validateDeriveExpression()`, `applyDeriveTransform()` - Derive transform
- `applySortTransform()` - Sort transform
- `applySelectTransform()` - Select transform
- `applyRenameTransform()` - Rename transform
- `applyRemoveTransform()` - Remove transform
- `applyFoldTransform()` - Fold/unpivot transform
- `addAggregation()`, `removeAggregation()`, `updateAggregateOutputName()` - Aggregate dialog
- `constructAggregateStep()`, `previewAggregate()`, `applyAggregateTransform()` - Aggregate transform
- `initializeJoinDialog()`, `getColumnsForTarget()`, `onJoinTargetChange()` - Join dialog
- `addJoinKeyPair()`, `removeJoinKeyPair()` - Join key management
- `previewJoin()`, `applyJoinTransform()` - Join transform

### 🔲 Model Manager Module (~450 lines)

Extract from lines ~1958-2400:

- `switchToSource()` - Switch to dataset info view
- `switchToModel()` - Switch to model view
- `createNewModel()` - Create model from source
- `renameSource()` - Rename source
- `renameModel()` - Rename model
- `deleteModel()` - Delete model
- `deleteSource()` - Delete source and models
- `loadTemplate()` - Load workflow template

### 🔲 Step Manager Module (~400 lines)

Extract from lines ~2400-2800:

- `applyStepResult()` - Apply transform and update state
- `viewStep()` - View intermediate step
- `viewFinalResult()` - View final result
- `removeStep()` - Remove transform step
- `editStep()` - Edit existing step
- `updateStep()` - Update step after editing
- `computeUpToStep()` - Recompute pipeline to step N

### 🔲 Pagination Module (~100 lines)

Extract from lines ~2760-2860:

- `updatePagination()` - Update pagination state
- `getPaginatedData()` - Get current page data
- `getPaginationInfo()` - Get pagination info text
- `goToPage()` - Navigate to page
- `nextPage()`, `prevPage()` - Page navigation
- `setPageSize()` - Change page size

## Integration Plan

### Update [syto-app.js](../src/syto-app.js)

```javascript
import { createExportHandlers } from './app/export-handlers.js';
import { createImportHandlers } from './app/import-handlers.js';
import { createEdaHandlers } from './app/eda-handlers.js';
import { createDialogManager } from './app/dialog-manager.js';
import { createInteractionHandlers } from './app/interaction-handlers.js';
// TODO: Add remaining imports

function sytoApp() {
  return {
    // State declarations (keep in main file)
    ribbonTab: 'prepare',
    activeTab: 'steps',
    // ... all state properties ...

    // Init method (keep in main file)
    init() {
      // ... initialization logic ...
    },

    // Mix in all handler modules
    ...createExportHandlers(),
    ...createImportHandlers(),
    ...createEdaHandlers(),
    ...createDialogManager(),
    ...createInteractionHandlers(),
    // TODO: Add remaining mixins
  };
}
```

### Update [index.html](../index.html)

Add module imports before syto-app.js:

```html
<!-- App modules -->
<script type="module" src="src/app/export-handlers.js"></script>
<script type="module" src="src/app/import-handlers.js"></script>
<script type="module" src="src/app/eda-handlers.js"></script>
<script type="module" src="src/app/dialog-manager.js"></script>
<script type="module" src="src/app/interaction-handlers.js"></script>
<!-- TODO: Add remaining module imports -->

<!-- Main app -->
<script type="module" src="src/syto-app.js"></script>
```

## Expected File Sizes After Completion

| File                    | Current | Target | Reduction |
| ----------------------- | ------- | ------ | --------- |
| syto-app.js             | 2,866   | ~350   | -88%      |
| export-handlers.js      | -       | 185    | +185      |
| import-handlers.js      | -       | 470    | +470      |
| eda-handlers.js         | -       | 175    | +175      |
| dialog-manager.js       | -       | 175    | +175      |
| interaction-handlers.js | -       | 290    | +290      |
| transform-dialogs.js    | -       | 600    | +600      |
| model-manager.js        | -       | 450    | +450      |
| step-manager.js         | -       | 400    | +400      |
| pagination.js           | -       | 100    | +100      |

**Total**: 2,866 lines → ~3,195 lines across 10 files (organizational overhead of ~11% is acceptable)

## Benefits

1. **Maintainability**: Each file has clear, focused responsibility
2. **Discoverability**: Easy to locate code by feature
3. **Testing**: Can test modules independently
4. **Collaboration**: Multiple devs can work on different modules
5. **Complexity**: Largest file becomes ~600 lines (vs 2,866)

## Next Steps

1. Extract transform-dialogs.js
2. Extract model-manager.js
3. Extract step-manager.js
4. Extract pagination.js
5. Update syto-app.js with imports and mixins
6. Update index.html with module imports
7. Test all functionality
8. Update CLAUDE.md with new structure

## Notes

- All modules use ES6 module syntax
- Modules export factory functions that return method objects
- Main app mixes in all modules using spread operator
- State remains centralized in main app component
- No build system required - native ES modules
