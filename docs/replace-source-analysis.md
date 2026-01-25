# Replace Source Feature - Implementation Plan

## Overview

Implement a "Replace Source" feature that allows users to update data in an existing Source while validating schema compatibility. The design extends the existing import flow for maximum code reuse.

## Key Design Decisions

1. **Extend Existing Import Flow** - Add `isReplaceMode` flag to reuse ImportCsvDialog and all parsing logic
2. **Schema Validation During Preview** - Show inline diff panel comparing old vs new schema
3. **Explicit Confirmation for Missing Columns** - When missing columns detected, show confirmation dialog warning that models may break
4. **Mark Models as Stale** - Use existing dependency system; models auto-recompute when accessed
5. **UI Trigger** - "Replace Data" button in DatasetInfoView next to "Rename" and "Delete"

## User Flow

```
User clicks "Replace Data" button
    ↓
File picker opens (or paste/URL dialog)
    ↓
Import dialog shows with:
  - Banner: "Replace mode: updating [source name]"
  - Schema diff panel: missing/new columns, type changes
  - All normal import settings (delimiter, headers, etc.)
    ↓
User clicks "Import"
    ↓
If missing columns detected:
  - Show confirmation dialog: "⚠️ Warning: The new data is missing columns that exist in the current source. Dependent models may break when recomputed. Are you sure you want to proceed?"
  - User clicks "Cancel" → return to import dialog
  - User clicks "Proceed" → continue with replacement
    ↓
Source data updated, dependent models marked stale
    ↓
Toast notification: "Source replaced. 3 models will recompute when accessed."
```

## Implementation Steps

### 1. Schema Comparison Engine

**File**: `src/core/schema-engine.ts`

Add `compareSchemas()` function:

```typescript
export interface SchemaDiff {
  missingColumns: string[];
  newColumns: string[];
  typeChanges: Array<{
    column: string;
    oldType: ColumnType;
    newType: ColumnType;
  }>;
  compatibilityWarning: string | null;
}

export function compareSchemas(oldSchema: ColumnSchema[], newSchema: ColumnSchema[]): SchemaDiff {
  // Detect missing columns (in old but not new)
  // Detect new columns (in new but not old)
  // Detect type changes (same name, different type)
  // Generate warning if missing columns exist
}
```

**Tests**: `src/core/schema-engine.test.ts`

- Test missing columns detection
- Test new columns detection
- Test type changes detection
- Test compatibility warnings

### 2. Replace Source Service

**File**: `src/app/services/ReplaceSourceService.ts` (NEW)

```typescript
export class ReplaceSourceService {
  static replaceSource(
    sourceId: string,
    newData: DataRow[],
    newColumns: ColumnSchema[],
    metadata: {
      fileName?: string;
      headerMode: string;
      delimiter: string;
      // ... other import settings
    }
  ): void {
    // 1. Find source
    const source = AppStore.sources.value.find((s) => s.id === sourceId);
    if (!source) throw new Error('Source not found');

    // 2. Update source properties
    source.data = newData;
    source.columns = newColumns;
    source.fileName = metadata.fileName;
    source.headerMode = metadata.headerMode;
    source.delimiter = metadata.delimiter;
    source.rowCount = newData.length;

    // 3. Trigger reactivity
    AppStore.sources.value = [...AppStore.sources.value];

    // 4. Mark dependent models as stale
    const dependentModels = AppStore.models.value.filter((m) => m.sourceId === sourceId);
    dependentModels.forEach((m) => (m.isStale = true));
    AppStore.models.value = [...AppStore.models.value];

    // 5. Update active view if this source is displayed
    if (AppStore.activeSource.value?.id === sourceId) {
      AppStore.currentData.value = newData;
      AppStore.columns.value = newColumns.map((c) => c.name);
    }

    // 6. Persist changes
    await PersistenceService.autoSave();

    // 7. Show notification
    NotificationService.show(
      `Source replaced. ${dependentModels.length} model(s) will recompute when accessed.`,
      'success'
    );
  }
}
```

**Tests**: `src/app/services/ReplaceSourceService.test.ts`

### 3. Dialog State Extension

**File**: `src/app/stores/DialogStore.ts`

Add to `importCsvState`:

```typescript
static importCsvState = {
  // ... existing fields ...

  // Replace mode
  isReplaceMode: signal(false),
  targetSourceId: signal<string | null>(null),

  // Schema comparison
  schemaDiff: signal<SchemaDiff | null>(null),
};
```

Update `resetAll()` to reset these new fields.

### 4. Import Handlers Extension

**File**: `src/app/handlers/import-handlers.ts`

**Add new handlers**:

```typescript
export function showReplaceSourceDialog(this: SytoApp, source: Source) {
  // Set replace mode flags
  DialogStore.importCsvState.isReplaceMode.value = true;
  DialogStore.importCsvState.targetSourceId.value = source.id;
  DialogStore.importCsvState.sourceName.value = source.name;

  // Open file picker
  const input = document.getElementById('file-input') as HTMLInputElement;
  input?.click();
}

export function computeSchemaDiffForPreview(
  oldSchema: ColumnSchema[],
  previewColumns: string[],
  previewData: any[][]
): void {
  // Infer schema from preview
  const newSchema = SchemaEngine.createPhysicalSchema(
    previewData.map((row) => Object.fromEntries(previewColumns.map((col, i) => [col, row[i]])))
  );

  // Compare schemas
  const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
  DialogStore.importCsvState.schemaDiff.value = diff;
}
```

**Modify existing handlers**:

In `handleCsvPreview()` and `handleJsonPreview()`:

```typescript
// After preview data is computed
if (DialogStore.importCsvState.isReplaceMode.value) {
  const sourceId = DialogStore.importCsvState.targetSourceId.value;
  const source = AppStore.sources.value.find((s) => s.id === sourceId);
  if (source) {
    computeSchemaDiffForPreview(source.columns, previewHeaders, previewData);
  }
}
```

In `confirmImport()`:

```typescript
if (DialogStore.importCsvState.isReplaceMode.value) {
  const sourceId = DialogStore.importCsvState.targetSourceId.value!;
  const schemaDiff = DialogStore.importCsvState.schemaDiff.value;

  // Check if there are missing columns
  if (schemaDiff && schemaDiff.missingColumns.length > 0) {
    // Show confirmation dialog
    DialogStore.confirmationDialog.value = {
      isOpen: true,
      title: 'Replace Source with Missing Columns',
      message: `⚠️ Warning: The new data is missing ${schemaDiff.missingColumns.length} column(s) that exist in the current source:\n\n${schemaDiff.missingColumns.join(', ')}\n\nDependent models may break when recomputed. Are you sure you want to proceed?`,
      confirmText: 'Proceed',
      cancelText: 'Cancel',
      onConfirm: () => {
        // User confirmed - proceed with replacement
        ReplaceSourceService.replaceSource(sourceId, data, columns, metadata);

        // Reset flags
        DialogStore.importCsvState.isReplaceMode.value = false;
        DialogStore.importCsvState.targetSourceId.value = null;
        DialogStore.importCsvState.schemaDiff.value = null;

        // Close import dialog
        DialogStore.importCsvState.isOpen.value = false;
      },
      onCancel: () => {
        // User cancelled - stay in import dialog
        DialogStore.confirmationDialog.value = null;
      }
    };
  } else {
    // No missing columns - proceed directly
    ReplaceSourceService.replaceSource(sourceId, data, columns, metadata);

    // Reset flags
    DialogStore.importCsvState.isReplaceMode.value = false;
    DialogStore.importCsvState.targetSourceId.value = null;
    DialogStore.importCsvState.schemaDiff.value = null;
  }
} else {
  // Normal import (existing code)
  ImportService.createSource(...);
}
```

### 5. Schema Diff Panel Component

**File**: `src/app/components/SchemaDiffPanel.tsx` (NEW)

```tsx
interface SchemaDiffPanelProps {
  diff: SchemaDiff;
}

export function SchemaDiffPanel({ diff }: SchemaDiffPanelProps) {
  const hasChanges =
    diff.missingColumns.length > 0 || diff.newColumns.length > 0 || diff.typeChanges.length > 0;

  return (
    <div class={styles.diffPanel}>
      {/* Warning banner */}
      {diff.compatibilityWarning && (
        <div class={styles.warningBanner}>⚠ {diff.compatibilityWarning}</div>
      )}

      {/* Success banner */}
      {!hasChanges && (
        <div class={styles.successBanner}>✓ Schema is compatible. All columns match.</div>
      )}

      {/* Missing columns */}
      {diff.missingColumns.length > 0 && (
        <div class={styles.section}>
          <h4>− Missing Columns ({diff.missingColumns.length})</h4>
          <p>These columns exist in current source but not in new data:</p>
          <div class={styles.columnList}>
            {diff.missingColumns.map((col) => (
              <span class={`${styles.columnChip} ${styles.missing}`}>{col}</span>
            ))}
          </div>
        </div>
      )}

      {/* New columns */}
      {diff.newColumns.length > 0 && (
        <div class={styles.section}>
          <h4>+ New Columns ({diff.newColumns.length})</h4>
          <p>These columns exist in new data but not in current source:</p>
          <div class={styles.columnList}>
            {diff.newColumns.map((col) => (
              <span class={`${styles.columnChip} ${styles.new}`}>{col}</span>
            ))}
          </div>
        </div>
      )}

      {/* Type changes */}
      {diff.typeChanges.length > 0 && (
        <div class={styles.section}>
          <h4>⚠ Type Changes ({diff.typeChanges.length})</h4>
          <table class={styles.typeTable}>
            <thead>
              <tr>
                <th>Column</th>
                <th>Current Type</th>
                <th></th>
                <th>New Type</th>
              </tr>
            </thead>
            <tbody>
              {diff.typeChanges.map((change) => (
                <tr>
                  <td>{change.column}</td>
                  <td>
                    <span class={styles.typeTag}>{change.oldType}</span>
                  </td>
                  <td>→</td>
                  <td>
                    <span class={styles.typeTag}>{change.newType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**File**: `src/app/components/SchemaDiffPanel.module.css` (NEW)

Styling for badges, tables, warning banners, etc.

### 6. Confirmation Dialog for Missing Columns

**File**: `src/app/stores/DialogStore.ts`

Add confirmation dialog state:

```typescript
static confirmationDialog = signal<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
} | null>(null);
```

**Note**: If a confirmation dialog component already exists in the codebase, reuse it. Otherwise, check existing dialog patterns and create a simple ConfirmationDialog component.

### 7. Import Dialog Modification

**File**: `src/app/components/ImportCsvDialog.tsx`

```tsx
import { SchemaDiffPanel } from './SchemaDiffPanel';

// In render method, after preview section:
{DialogStore.importCsvState.isReplaceMode.value && (
  <div class={styles.replaceModeBanner}>
    🔄 Replace mode: updating "{DialogStore.importCsvState.sourceName.value}"
  </div>
)}

{DialogStore.importCsvState.schemaDiff.value && (
  <SchemaDiffPanel diff={DialogStore.importCsvState.schemaDiff.value} />
)}

// Disable source name editing in replace mode
<input
  type="text"
  value={DialogStore.importCsvState.sourceName.value}
  disabled={DialogStore.importCsvState.isReplaceMode.value}
  onInput={...}
/>
```

### 8. UI Trigger - DatasetInfoView

**File**: `src/app/components/DatasetInfoView.tsx`

Add "Replace Data" button:

```tsx
interface DatasetInfoViewProps {
  // ... existing props ...
  onReplaceSource?: (source: Source) => void;
}

// In header actions section (near Rename/Delete buttons):
<button
  class={styles.actionButton}
  onClick={() => props.onReplaceSource?.(props.source)}
  title="Replace source data with new file/paste"
>
  Replace Data
</button>;
```

### 9. Wire Up UI Trigger

**File**: `src/app/components/MainContent.tsx`

- Add `onReplaceSource` to props interface
- Pass through to `<DatasetInfoView>`

**File**: `src/app/components/App.tsx`

- Add `onReplaceSource: (s) => app.showReplaceSourceDialog(s)` to `mainContentProps`

**File**: `src/syto-app.ts`

- Add `showReplaceSourceDialog()` method
- Bind in constructor

### 10. Dialog Close Cleanup

**File**: `src/app/handlers/dialog-handlers.ts`

In `closeDialog()`:

```typescript
// Reset replace mode flags
DialogStore.importCsvState.isReplaceMode.value = false;
DialogStore.importCsvState.targetSourceId.value = null;
DialogStore.importCsvState.schemaDiff.value = null;
```

## Critical Files

- **[src/core/schema-engine.ts](src/core/schema-engine.ts)** - Add `compareSchemas()` function
- **[src/app/services/ReplaceSourceService.ts](src/app/services/ReplaceSourceService.ts)** - New service for replace logic
- **[src/app/handlers/import-handlers.ts](src/app/handlers/import-handlers.ts)** - Extend with replace mode logic
- **[src/app/components/SchemaDiffPanel.tsx](src/app/components/SchemaDiffPanel.tsx)** - New UI component for schema comparison
- **[src/app/components/DatasetInfoView.tsx](src/app/components/DatasetInfoView.tsx)** - Add "Replace Data" button

## Edge Cases & Error Handling

| Scenario                           | Handling                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| User cancels file picker           | Reset flags in dialog close handler                                               |
| Source deleted during replace      | `ReplaceSourceService` throws error, shows notification                           |
| Missing columns detected           | Show confirmation dialog with explicit warning, require user to confirm or cancel |
| User cancels confirmation          | Return to import dialog, preserve settings                                        |
| All columns missing                | Confirmation dialog shows all missing columns, user must confirm                  |
| Invalid CSV/JSON                   | Existing preview error handlers catch and show alerts                             |
| Active model using replaced source | Model marked stale, view unchanged until re-accessed                              |

## Testing Strategy

### Unit Tests

1. **schema-engine.test.ts** - Test `compareSchemas()` function
   - Detect missing columns
   - Detect new columns
   - Detect type changes
   - Generate compatibility warnings
   - Handle identical schemas

2. **ReplaceSourceService.test.ts** - Test replace logic
   - Update source data and schema
   - Mark dependent models as stale
   - Throw error if source not found
   - Update active view if source currently displayed

### Manual Integration Tests

1. Replace with compatible schema → no warnings, no confirmation, models marked stale
2. Replace with missing columns → confirmation dialog shown with explicit warning
   - User clicks "Cancel" → stays in import dialog, can adjust settings
   - User clicks "Proceed" → source replaced, models marked stale
3. Replace with type changes (no missing columns) → type changes shown in diff, no confirmation, proceeds directly
4. Replace with new columns only → green badges shown, no confirmation, proceeds directly
5. Replace with missing + new columns → confirmation dialog triggered (missing columns take precedence)
6. Cancel file picker → flags reset, dialog closes cleanly
7. Replace via paste/URL → same schema validation and confirmation flow
8. Multiple dependent models → all marked stale, toast shows count

## Verification

After implementation:

1. **Run tests**: `npm test`
2. **Manual test flow**:
   - Import a CSV file with columns: name, age, email
   - Create a model with transforms (filter on age, derive from email)
   - Click "Replace Data" on the source
   - Upload new CSV with columns: name, phone (missing: age, email)
   - Verify schema diff panel shows missing columns in red
   - Click "Import" button
   - Verify confirmation dialog appears with warning about missing columns
   - Click "Proceed"
   - Verify source replaced, model marked as stale
   - Switch to model, verify it attempts to recompute and fails with clear error about missing columns
3. **Check persistence**: Refresh browser, verify replaced data persists
4. **Test all import types**: File upload, paste, URL

## Future Enhancements (Out of Scope)

- Automatic column mapping for renamed columns
- Dry-run validation of transforms before replacing
- Version history with rollback capability
- Batch replace for multiple sources
