# Refactoring Plan: Split `chumak-app.ts` into Handler Mixins

## Overview

Split the monolithic 5,055-line `ChumakApp` class into focused handler modules using a mixin pattern. Each module exports methods that operate on `this` (the app instance) and get bound during initialization.

## Architecture

```
src/
├── chumak-app.ts                    (~600 lines) - State, init, method binding
├── app/
│   ├── types.ts                     (existing)
│   ├── decorators.ts                (existing)
│   ├── handlers/
│   │   ├── import-handlers.ts       - File/URL/paste import logic
│   │   ├── export-handlers.ts       - CSV/JSON/workflow export
│   │   ├── eda-handlers.ts          - EDA stats, charts, brush selection
│   │   ├── dialog-handlers.ts       - Dialog open/close/state management
│   │   ├── step-handlers.ts         - Step view/edit/remove/update
│   │   ├── pagination-handlers.ts   - Pagination logic
│   │   ├── notification-handlers.ts - Notifications, message box (alert/confirm/prompt)
│   │   ├── interaction-handlers.ts  - Toolbar positioning, type menu, cell/column selection
│   │   └── model-handlers.ts        - Source/model CRUD operations
│   └── transforms/
│       ├── filter-transform.ts      - Filter dialog logic
│       ├── derive-transform.ts      - Derive dialog logic
│       ├── aggregate-transform.ts   - Aggregate/Group By dialog
│       ├── join-transform.ts        - Join dialog logic
│       ├── pivot-transform.ts       - Pivot dialog logic
│       ├── fold-transform.ts        - Fold/Unpivot dialog logic
│       ├── split-transform.ts       - Split column dialog
│       ├── dedupe-transform.ts      - Dedupe dialog logic
│       ├── column-editor.ts         - Column editor (select/rename/reorder)
│       ├── date-transform.ts        - Date extract/truncate dialog
│       ├── regexp-transforms.ts     - Regexp match & extract dialogs
│       └── simple-transforms.ts     - Sort, slice rows, index, replace
```

## Implementation Pattern

Each handler module follows this pattern:

```typescript
// src/app/handlers/example-handlers.ts
import type { ChumakApp } from '../../chumak-app';

export function exampleMethod(this: ChumakApp, arg: string): void {
  // Access app state via `this`
  this.someState = arg;
}

export function anotherMethod(this: ChumakApp): Promise<void> {
  // Async methods work the same way
  await this.alert('Hello');
}
```

In `chumak-app.ts`, methods are assigned using delegating methods (not `.bind(this)`) to ensure the context remains the Alpine reactive proxy:

```typescript
import * as ExampleHandlers from './app/handlers/example-handlers';

export class ChumakApp {
  // ... state declarations ...

  // Bind handlers via delegation
  exampleMethod(arg: string) {
    return ExampleHandlers.exampleMethod.call(this, arg);
  }
  anotherMethod() {
    return ExampleHandlers.anotherMethod.call(this);
  }
}
```

> [!CAUTION]
> **Do not use `.bind(this)`** in property initializers. It binds to the raw class instance, bypassing the Alpine.js reactive proxy, which prevents UI updates.

## Phases

### Phase 1: Transform Dialogs (~2,000 lines)

Extract each transform's dialog logic (init, validate, preview, apply methods).

| File                     | Methods to Extract                                                                                                                                                                                                                                                                            | ~Lines |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `filter-transform.ts`    | `validateFilterExpression`, `debouncedUpdateFilterPreview`, `updateFilterPreview`, `toggleFilterPreviewMode`, `applyFilterTransform`                                                                                                                                                          | 100    |
| `derive-transform.ts`    | `validateDeriveExpression`, `debouncedUpdateDerivePreview`, `updateDerivePreview`, `applyDeriveTransform`                                                                                                                                                                                     | 100    |
| `aggregate-transform.ts` | `addAggregation`, `removeAggregation`, `updateAggregateOutputName`, `constructAggregateStep`, `previewAggregate`, `applyAggregateTransform`                                                                                                                                                   | 150    |
| `join-transform.ts`      | `initializeJoinDialog`, `getColumnsForTarget`, `onJoinTargetChange`, `addJoinKeyPair`, `removeJoinKeyPair`, `previewJoin`, `applyJoinTransform`                                                                                                                                               | 200    |
| `pivot-transform.ts`     | `initializePivotDialog`, `onPivotConfigChange`, `constructPivotStep`, `previewPivot`, `applyPivotTransform`                                                                                                                                                                                   | 150    |
| `fold-transform.ts`      | `toggleColumnForFold`, `toggleFoldMode`, `getColumnsToFold`, `selectAllForFold`, `selectNoneForFold`, `updateFoldPreview`, `applyFoldTransform`                                                                                                                                               | 100    |
| `split-transform.ts`     | `detectDelimiter`, `debouncedUpdateSplitPreview`, `selectSplitColumn`, `updateSplitPreview`, `applySplitTransform`                                                                                                                                                                            | 200    |
| `dedupe-transform.ts`    | `toggleDedupeAllColumns`, `toggleDedupeColumn`, `selectAllForDedupe`, `selectNoneForDedupe`, `getDedupeColumns`, `findDuplicateRows`, `updateDedupePreview`, `findAllDuplicateRowCount`, `applyDedupeTransform`                                                                               | 150    |
| `column-editor.ts`       | `toggleColumnEditorColumn`, `selectAllColumnEditor`, `selectNoneColumnEditor`, `applyColumnEditorPattern`, `handleColumnEditorDrag*`, `switchColumnEditorToText`, `validateColumnEditorText`, `getColumnEditorChanges`, `applyColumnEditorTransform`                                          | 300    |
| `date-transform.ts`      | `getDateColumns`, `getExtractParts`, `getTruncateUnits`, `toggleDateSelection`, `getDateOutputPlaceholder`, `updateDatePreview`, `applyDateTransform`                                                                                                                                         | 150    |
| `regexp-transforms.ts`   | `validateRegexpPattern`, `validateRegexpMatchExpression`, `debouncedUpdateRegexpMatchPreview`, `updateRegexpMatchPreview`, `applyRegexpMatchTransform`, `validateRegexpExtractExpression`, `debouncedUpdateRegexpExtractPreview`, `updateRegexpExtractPreview`, `applyRegexpExtractTransform` | 150    |
| `simple-transforms.ts`   | `applySortTransform`, `applySliceRowsTransform`, `applyIndexTransform`, `applyReplaceTransform`                                                                                                                                                                                               | 80     |

### Phase 2: Import/Export Handlers (~350 lines)

| File                 | Methods to Extract                                                                                                                                                                                                                                                                                                                                                                                                                 | ~Lines |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `import-handlers.ts` | `handleFileSelect`, `handleFileDrop`, `handlePaste`, `promptPaste`, `showImportDialog`, `handleJsonPreview`, `updateJsonPath`, `resolvePath`, `getSuggestedKeys`, `selectJsonPathSegment`, `resetJsonPath`, `flattenData`, `serializeNestedData`, `handleCsvPreview`, `showImportUrlDialog`, `fetchAndImportFromUrl`, `confirmImport`, `createSource`, `updateImportPreview`, `updateHeadersForPreview`, `resolveDuplicateHeaders` | 250    |
| `export-handlers.ts` | `exportCSV`, `exportWorkflowJSON`, `exportDataJSON`, `copyCSVToClipboard`, `copyJSONToClipboard`                                                                                                                                                                                                                                                                                                                                   | 100    |

### Phase 3: Model & Source Management (~250 lines)

| File                | Methods to Extract                                                                                                                                                                                                                     | ~Lines |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `model-handlers.ts` | `switchToSource`, `switchToModel`, `createNewModel`, `createNewModelFromActive`, `copyCurrentModel`, `renameCurrentModel`, `deleteCurrentModel`, `renameSource`, `deleteSource`, `clearAllData`, `loadTemplates`, `getTemplateConfigs` | 250    |

### Phase 4: Step Management (~300 lines)

| File               | Methods to Extract                                                                                                                                                                                                       | ~Lines |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `step-handlers.ts` | `getActiveSchema`, `computeModelUpToStep`, `computeUpToStep`, `viewStep`, `viewFinalResult`, `editStep`, `cancelEdit`, `removeStep`, `showStepRemovalModal`, `closeStepRemovalModal`, `executeStepRemoval`, `updateStep` | 300    |

### Phase 5: Dialog Management (~250 lines)

| File                 | Methods to Extract                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ~Lines |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `dialog-handlers.ts` | `getDialogState`, `reSnapshot`, `openDialog`, `handleHashChange`, `initDialogState`, `isSlidePanel`, `isCenteredModal`, `getDialogTitle`, `getDialogButtonText`, `getAboutContent`, `getExpressionsContent`, `hasPreviewData`, `getPreviewTitle`, `getPreviewStats`, `getPreviewColumns`, `getPreviewRows`, `formatPreviewCell`, `clearPreview`, `isNewPreviewColumn`, `activeDialogError`, `applyActiveTransform`, `hasUnsavedChanges`, `closeDialog`, `resetDialogStates` | 250    |

### Phase 6: Notifications & Message Box (~150 lines)

| File                       | Methods to Extract                                                                                                                                                                | ~Lines |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `notification-handlers.ts` | `showError`, `showWarning`, `showSuccess`, `_addNotification`, `dismissNotification`, `getNotificationIcon`, `alert`, `confirm`, `prompt`, `closeMessageBox`, `getMessageBoxIcon` | 150    |

### Phase 7: EDA & Charts (~150 lines)

| File              | Methods to Extract                                                                                                    | ~Lines |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| `eda-handlers.ts` | `selectColumn`, `selectEdaStat`, `setEdaChartView`, `setEdaDateTreatment`, `handleBrushSelection`, `applyBrushFilter` | 150    |

### Phase 8: Interaction & Pagination (~200 lines)

| File                      | Methods to Extract                                                                                                                                                                                                                                                                                               | ~Lines |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `interaction-handlers.ts` | `handleBodyClick`, `openTypeMenu`, `changeColumnType`, `autoDetectSchema`, `clearColumnSelection`, `calculateToolbarPosition`, `updateToolbarPosition`, `selectCell`, `applyQuickCellFilter`, `quickSort`, `quickFilter`, `quickRename`, `quickRemove`, `quickDate`, `quickSplit`, `quickReplace`, `quickDedupe` | 150    |
| `pagination-handlers.ts`  | `updatePagination`, `getPaginatedData`, `getPaginationInfo`, `previousPage`, `nextPage`, `goToFirstPage`, `goToLastPage`, `updatePageSize`                                                                                                                                                                       | 80     |

### Phase 9: JSON Editor (~100 lines)

| File                      | Methods to Extract                                                                         | ~Lines |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| `json-editor-handlers.ts` | `getStepsJson`, `enterJsonEditMode`, `cancelJsonEdit`, `validateJsonEdit`, `applyJsonEdit` | 100    |

## What Remains in `chumak-app.ts` (~600 lines)

1. **State declarations** (~250 lines) - All the properties/state
2. **Constructor** - Empty, just for initialization
3. **`init()` method** (~80 lines) - App initialization
4. **Core transform methods** (~100 lines):
   - `runTransform()`
   - `applyStepResult()`
   - `startTransformation()` / `endTransformation()`
5. **Utility methods** (~50 lines):
   - `validateExpression()`
   - `getColumnType()`
   - `getTypeIcon()`
   - `getCellClass()`
   - `formatCellValue()`
   - `formatLiteral()`
   - `quoteColumnRef()`
   - `escapePattern()`
   - `preparePreviewData()`
   - `getModelMeta()`
   - `describeTransform()`
6. **Method bindings** (~100 lines) - Importing and binding all handlers
7. **Alpine injected properties** - `$nextTick`, `$watch`, `$dispatch`

## Testing Strategy

1. Each handler module can be tested independently by creating a mock app context
2. Integration tests remain in `src/core/*.test.ts`
3. New unit tests can be added per handler file

## Migration Steps (per phase)

1. Create the new handler file
2. Move methods to the new file, adding proper `this: ChumakApp` typing
3. Import and bind methods in `chumak-app.ts`
4. Run tests to verify functionality
5. Commit

## Risks & Mitigations

| Risk                       | Mitigation                                             |
| -------------------------- | ------------------------------------------------------ |
| Breaking Alpine reactivity | Methods are bound at class definition, not dynamically |
| Circular imports           | Handler files only import types, not the class itself  |
| Lost `this` context        | Explicit `.bind(this)` in class property initializers  |
| Large diff in one commit   | Commit each phase separately                           |

## Success Criteria

- [ ] `chumak-app.ts` reduced to ~600 lines
- [ ] All existing tests pass
- [ ] No runtime errors in dev server
- [ ] Each handler file is < 300 lines
- [ ] Clear separation of concerns
