/**
 * DialogCoordinator - Dialog lifecycle management
 *
 * Handles opening, closing, and state management for dialogs.
 * Coordinates with DialogStore and preview state.
 */

import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { DialogName } from '../types';
import { DIALOG_REGISTRY } from '../dialog-registry';
import { syncDialogToUrl, clearDialogFromUrl } from './UrlStateSync';
import * as DateHandlers from '../handlers/transform/date-handlers';
import * as ParseDateHandlers from '../handlers/transform/parse-date-handlers';

export type DialogCallbacks = {
  initializeJoinDialog?: () => void;
  initializeAppendDialog?: () => void;
  initializePivotDialog?: () => void;
  detectDelimiter?: (column: string) => { char: string; isRegex: boolean; name: string } | null;
  debouncedUpdateSplitPreview?: () => void;
  updateDedupePreview?: () => void;
  updateImputePreview?: () => void;
  clearColumnSelection?: () => void;
  confirm?: (message: string, confirmLabel?: string) => Promise<boolean>;
};

let callbacks: DialogCallbacks | null = null;

/**
 * Set callbacks for dialog coordination
 */
export function setDialogCallbacks(cb: DialogCallbacks): void {
  callbacks = cb;
}

/**
 * Get serializable state for a dialog (used for change detection).
 * Delegates to the dialog registry's getState function.
 */
export function getDialogState(dialog: string): any {
  return DIALOG_REGISTRY[dialog]?.getState?.() ?? null;
}

/**
 * Take a snapshot of current dialog state (for change detection)
 */
export function snapshotDialogState(): void {
  const dialog = AppStore.activeDialog.value;
  if (dialog) {
    AppStore.dialogSnapshot.value = JSON.stringify(getDialogState(dialog));
  }
}

/**
 * Check if dialog has unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  const dialog = AppStore.activeDialog.value;
  const snapshot = AppStore.dialogSnapshot.value;
  if (!dialog || snapshot === null) return false;

  const current = getDialogState(dialog);
  if (current === null) return false;

  return JSON.stringify(current) !== snapshot;
}

/**
 * Initialize state for a specific dialog
 */
export function initDialogState(dialogName: string, section?: string): void {
  const columns = AppStore.columns.value;
  const selectedColumn = AppStore.selectedColumn.value;
  const selectedColumns = AppStore.selectedColumns.value;
  const effectiveColumn = selectedColumn || columns[0] || '';

  switch (dialogName) {
    case 'filter':
    case 'derive':
      break;

    case 'join':
      callbacks?.initializeJoinDialog?.();
      break;

    case 'append':
      callbacks?.initializeAppendDialog?.();
      break;

    case 'sort':
      DialogStore.sortState.fields.value =
        selectedColumns.length > 0
          ? selectedColumns.map((col) => ({ field: col, order: 'asc' as const }))
          : [{ field: columns[0] || '', order: 'asc' as const }];
      break;

    case 'sliceRows':
      DialogStore.sliceRowsState.count.value = 10;
      DialogStore.sliceRowsState.mode.value = 'first';
      break;

    case 'sample':
      DialogStore.sampleState.count.value = 100;
      DialogStore.sampleState.seed.value = undefined;
      break;

    case 'spread':
      if (!DialogStore.spreadState.column.value) {
        DialogStore.spreadState.column.value = selectedColumn || '';
      }
      DialogStore.spreadState.limit.value = undefined;
      break;

    case 'unroll':
      if (!DialogStore.unrollState.column.value) {
        DialogStore.unrollState.column.value = selectedColumn || '';
      }
      DialogStore.unrollState.indices.value = false;
      break;

    case 'index':
      DialogStore.indexState.columnName.value = 'row_index';
      DialogStore.indexState.startFrom.value = 1;
      break;

    case 'aggregate':
      DialogStore.aggregateState.groupBy.value =
        selectedColumns.length > 0 ? [...selectedColumns] : [];
      DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];
      DialogStore.aggregateState.isPreviewing.value = false;
      break;

    case 'import-csv':
      break;

    case 'column-editor': {
      const state = DialogStore.columnEditorState;
      state.mode.value = 'list';
      state.columns.value = columns.map((col) => ({
        original: col,
        renamed: col,
        selected: true,
      }));
      state.patternText.value = '';
      state.patternMode.value = 'include';
      state.patternMatchType.value = 'prefix';
      state.draggedIndex.value = null;
      state.textSubMode.value = (
        section === 'select' || section === 'reorder' ? section : 'rename'
      ) as any;
      state.textValue.value = '';
      state.textError.value = null;
      state.patternOperationMode.value = 'select';
      state.patternFind.value = '';
      state.patternReplace.value = '';
      state.patternRegex.value = false;
      state.patternError.value = null;
      break;
    }

    case 'settings': {
      const state = DialogStore.settingsState;
      state.theme.value = AppStore.theme.value as any;
      state.rowLimit.value = AppStore.uxSettings.value.preview?.rowLimit || 100;
      state.analyticsOptOut.value = AppStore.uxSettings.value.analyticsOptOut ?? false;
      state.language.value = AppStore.uxSettings.value.language || 'en';
      state.engine.value = AppStore.uxSettings.value.experimental?.engine || 'arquero';
      break;
    }

    case 'fold':
      DialogStore.foldState.keyName.value = 'key';
      DialogStore.foldState.valueName.value = 'value';
      DialogStore.foldState.selectedColumns.value =
        selectedColumns.length > 0
          ? columns.map((col) => selectedColumns.includes(col))
          : columns.map(() => false);
      DialogStore.foldState.mode.value = 'keep';
      break;

    case 'pivot':
      callbacks?.initializePivotDialog?.();
      break;

    case 'replace': {
      const state = DialogStore.replaceState;
      if (!state.column.value) {
        state.column.value = effectiveColumn;
      }
      break;
    }

    case 'split': {
      const state = DialogStore.splitState;
      if (!state.column.value) {
        const initialColumn = effectiveColumn;
        state.column.value = initialColumn;
        state.delimiter.value = ',';
        state.autoDetectedDelimiter.value = null;
        state.isRegex.value = false;

        if (initialColumn && callbacks?.detectDelimiter) {
          const detected = callbacks.detectDelimiter(initialColumn);
          if (detected) {
            state.delimiter.value = detected.char;
            state.isRegex.value = detected.isRegex;
            state.autoDetectedDelimiter.value = detected.name;
          }
        }
      }
      state.mode.value = 'spread';
      state.maxColumns.value = 10;
      state.keepOriginal.value = false;
      state.error.value = null;
      callbacks?.debouncedUpdateSplitPreview?.();
      break;
    }

    case 'merge': {
      const state = DialogStore.mergeState;
      state.columns.value = selectedColumns.length > 0 ? [...selectedColumns] : [];
      state.separator.value = ' ';
      state.columnName.value = '';
      state.removeOriginal.value = false;
      state.error.value = null;
      break;
    }

    case 'regexpMatch': {
      const state = DialogStore.regexpMatchState;
      if (!state.sourceColumn.value) {
        state.sourceColumn.value = effectiveColumn;
      }
      state.pattern.value = '';
      state.columnName.value = '';
      state.error.value = null;
      break;
    }

    case 'regexpExtract': {
      const state = DialogStore.regexpExtractState;
      if (!state.sourceColumn.value) {
        state.sourceColumn.value = effectiveColumn;
      }
      state.pattern.value = '';
      state.columnName.value = '';
      state.group.value = 0;
      state.error.value = null;
      break;
    }

    case 'date': {
      const state = DialogStore.dateState;
      if (!state.column.value) {
        const dateColumns = DateHandlers.getDateColumns();
        state.column.value =
          selectedColumn && dateColumns.includes(selectedColumn)
            ? selectedColumn
            : dateColumns[0] || '';
      }
      state.operation.value = 'extract';
      state.extractParts.value = [];
      state.truncateUnits.value = [];
      state.outputColumn.value = '';
      state.error.value = null;
      DateHandlers.clearDatePreview();
      break;
    }

    case 'parseDate': {
      const pdState = DialogStore.parseDateState;
      if (!pdState.column.value) {
        const stringColumns = ParseDateHandlers.getStringColumns();
        pdState.column.value =
          selectedColumn && stringColumns.includes(selectedColumn)
            ? selectedColumn
            : stringColumns[0] || '';
      }
      pdState.format.value = '';
      pdState.error.value = null;
      ParseDateHandlers.clearParseDatePreview();
      break;
    }

    case 'text': {
      const state = DialogStore.textState;
      if (!state.column.value) {
        state.column.value = selectedColumn || '';
      }
      state.operations.value = [];
      state.removeOrigin.value = false;
      state.error.value = null;
      state.previewData.value = [];
      break;
    }

    case 'dedupe': {
      const state = DialogStore.dedupeState;
      const hasSelection = state.selectedColumns.value.some((selected) => selected);
      if (!hasSelection || state.selectedColumns.value.length !== columns.length) {
        state.selectedColumns.value = columns.map(() => true);
        state.useAllColumns.value = true;
      }
      state.duplicateCount.value = 0;
      state.mode.value = 'remove';
      callbacks?.updateDedupePreview?.();
      break;
    }

    case 'impute': {
      const state = DialogStore.imputeState;
      if (!state.column.value) {
        state.column.value = effectiveColumn;
      }
      state.strategy.value = 'constant';
      state.value.value = '';
      state.includeEmptyString.value = false;
      state.previewRows.value = null;
      state.error.value = null;
      callbacks?.updateImputePreview?.();
      break;
    }

    default: {
      // Delegate to registry initState for dialogs not handled above
      const config = DIALOG_REGISTRY[dialogName];
      config?.initState?.(section);
      break;
    }
  }
}

/**
 * Open a dialog
 */
export function openDialog(dialogName: string, section?: string): void {
  AppStore.activeDialog.value = dialogName as DialogName;
  initDialogState(dialogName, section);
  callbacks?.clearColumnSelection?.();
  snapshotDialogState();

  // Update URL for navigable pages
  syncDialogToUrl(dialogName, section);
}

/**
 * Close the current dialog
 */
export async function closeDialog(force = false): Promise<void> {
  const dialog = AppStore.activeDialog.value;

  if (!force && hasUnsavedChanges()) {
    const confirmed = await callbacks?.confirm?.(
      'You have unsaved changes. Are you sure you want to discard them?'
    );
    if (!confirmed) return;
  }

  // Clear preview state
  clearPreview();

  // Clear URL if closing a navigable dialog
  if (dialog) {
    clearDialogFromUrl(dialog);
  }

  AppStore.activeDialog.value = null;
  AppStore.dialogSnapshot.value = null;
  DialogStore.resetAll();
  AppStore.importFileData.value = null;
}

/**
 * Clear preview state
 */
export function clearPreview(): void {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

/**
 * Check if current dialog has an error that should disable the apply button.
 * Delegates to the dialog registry's hasError function.
 */
export function activeDialogHasError(): boolean {
  const dialog = AppStore.activeDialog.value;
  if (!dialog) return false;
  return DIALOG_REGISTRY[dialog]?.hasError?.() ?? false;
}

/**
 * Get the error message for the current dialog's disabled Apply button.
 * Returns null if no error or if the dialog doesn't expose error messages.
 */
export function getActiveDialogError(): string | null {
  const dialog = AppStore.activeDialog.value;
  if (!dialog) return null;
  return DIALOG_REGISTRY[dialog]?.getError?.() ?? null;
}

/**
 * Check if current dialog has preview data
 */
export function hasPreviewData(): boolean {
  const dialog = AppStore.activeDialog.value;

  if (dialog === 'import-csv') {
    return DialogStore.importCsvState.previewDataRows.value.length > 0;
  }

  return DialogStore.previewState.rows.value.length > 0;
}

/**
 * Get preview title for current dialog
 */
export function getPreviewTitle(): string {
  const dialog = AppStore.activeDialog.value;

  if (dialog === 'import-csv') {
    return 'Import Preview';
  }

  return DialogStore.previewState.title.value;
}

/**
 * Get preview stats for current dialog
 */
export function getPreviewStats(): string {
  const dialog = AppStore.activeDialog.value;

  if (dialog === 'import-csv') {
    const rows = DialogStore.importCsvState.previewDataRows.value.length;
    const cols = DialogStore.importCsvState.previewHeaders.value.length;
    const limit = AppStore.uxSettings.value.preview.rowLimit;
    return `${rows} rows, ${cols} columns (first ${Math.min(rows, limit)} rows shown)`;
  }

  return DialogStore.previewState.stats.value;
}

/**
 * Get preview columns for current dialog
 */
export function getPreviewColumns(): string[] {
  const dialog = AppStore.activeDialog.value;

  if (dialog === 'import-csv') {
    return DialogStore.importCsvState.previewHeaders.value;
  }

  return DialogStore.previewState.columns.value;
}

/**
 * Get preview rows for current dialog
 */
export function getPreviewRows(): any[] {
  const dialog = AppStore.activeDialog.value;

  if (dialog === 'import-csv') {
    const headers = DialogStore.importCsvState.previewHeaders.value;
    const rows = DialogStore.importCsvState.previewDataRows.value;
    return rows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
  }

  return DialogStore.previewState.rows.value;
}

/**
 * Check if a column is new in the preview
 */
export function isNewPreviewColumn(col: string): boolean {
  return DialogStore.previewState.newColumns.value.includes(col);
}
