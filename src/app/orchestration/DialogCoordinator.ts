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
import { GeneratorService } from '../services/GeneratorService';

export type DialogCallbacks = {
  initializeJoinDialog?: () => void;
  initializeAppendDialog?: () => void;
  initializePivotDialog?: () => void;
  detectDelimiter?: (column: string) => { char: string; isRegex: boolean; name: string } | null;
  debouncedUpdateSplitPreview?: () => void;
  updateDedupePreview?: () => void;
  updateImputePreview?: () => void;
  clearColumnSelection?: () => void;
  confirm?: (message: string) => Promise<boolean>;
};

let callbacks: DialogCallbacks | null = null;

/**
 * Set callbacks for dialog coordination
 */
export function setDialogCallbacks(cb: DialogCallbacks): void {
  callbacks = cb;
}

/**
 * Get serializable state for a dialog (used for change detection)
 */
export function getDialogState(dialog: string): any {
  switch (dialog) {
    case 'filter':
      return {
        expression: DialogStore.filterState.expression.value,
        previewMode: DialogStore.filterState.previewMode.value,
      };
    case 'derive':
      return {
        columnName: DialogStore.deriveState.columnName.value,
        expression: DialogStore.deriveState.expression.value,
      };
    case 'sliceRows':
      return {
        count: DialogStore.sliceRowsState.count.value,
        mode: DialogStore.sliceRowsState.mode.value,
      };
    case 'index':
      return {
        columnName: DialogStore.indexState.columnName.value,
        startFrom: DialogStore.indexState.startFrom.value,
      };
    case 'aggregate':
      return {
        groupBy: DialogStore.aggregateState.groupBy.value,
        aggregations: DialogStore.aggregateState.aggregations.value,
      };
    case 'join':
      return {
        rightModel: DialogStore.joinState.rightModel.value,
        joinType: DialogStore.joinState.joinType.value,
        keyPairs: DialogStore.joinState.keyPairs.value,
        suffixes: DialogStore.joinState.suffixes.value,
      };
    case 'fold':
      return {
        keyName: DialogStore.foldState.keyName.value,
        valueName: DialogStore.foldState.valueName.value,
        selectedColumns: DialogStore.foldState.selectedColumns.value,
        mode: DialogStore.foldState.mode.value,
      };
    case 'pivot':
      return {
        rowColumns: DialogStore.pivotState.rowColumns.value,
        columnColumn: DialogStore.pivotState.columnColumn.value,
        valueColumn: DialogStore.pivotState.valueColumn.value,
        aggregation: DialogStore.pivotState.aggregation.value,
        options: DialogStore.pivotState.options.value,
      };
    case 'sort':
      return {
        field: DialogStore.sortState.field.value,
        order: DialogStore.sortState.order.value,
      };
    case 'sample':
      return {
        count: DialogStore.sampleState.count.value,
        seed: DialogStore.sampleState.seed.value,
      };
    case 'spread':
      return {
        column: DialogStore.spreadState.column.value,
        limit: DialogStore.spreadState.limit.value,
        keepOriginal: DialogStore.spreadState.keepOriginal.value,
      };
    case 'unroll':
      return {
        column: DialogStore.unrollState.column.value,
        indices: DialogStore.unrollState.indices.value,
        keepOriginal: DialogStore.unrollState.keepOriginal.value,
      };
    case 'replace':
      return {
        column: DialogStore.replaceState.column.value,
        findValue: DialogStore.replaceState.findValue.value,
        replaceValue: DialogStore.replaceState.replaceValue.value,
      };
    case 'split':
      return {
        column: DialogStore.splitState.column.value,
        delimiter: DialogStore.splitState.delimiter.value,
        isRegex: DialogStore.splitState.isRegex.value,
        mode: DialogStore.splitState.mode.value,
        maxColumns: DialogStore.splitState.maxColumns.value,
      };
    case 'merge':
      return {
        columns: DialogStore.mergeState.columns.value,
        separator: DialogStore.mergeState.separator.value,
        columnName: DialogStore.mergeState.columnName.value,
        removeOriginal: DialogStore.mergeState.removeOriginal.value,
      };
    case 'regexpMatch':
      return {
        sourceColumn: DialogStore.regexpMatchState.sourceColumn.value,
        pattern: DialogStore.regexpMatchState.pattern.value,
        columnName: DialogStore.regexpMatchState.columnName.value,
      };
    case 'regexpExtract':
      return {
        sourceColumn: DialogStore.regexpExtractState.sourceColumn.value,
        pattern: DialogStore.regexpExtractState.pattern.value,
        columnName: DialogStore.regexpExtractState.columnName.value,
        group: DialogStore.regexpExtractState.group.value,
      };
    case 'import-csv':
      return {
        sourceName: DialogStore.importCsvState.sourceName.value,
        headerMode: DialogStore.importCsvState.headerMode.value,
        delimiter: DialogStore.importCsvState.delimiter.value,
      };
    case 'import-url':
      return { url: DialogStore.importUrlState.url.value };
    case 'generate':
      return {
        sourceName: DialogStore.generateState.sourceName.value,
        rowCount: DialogStore.generateState.rowCount.value,
        columnName: DialogStore.generateState.columnName.value,
        type: DialogStore.generateState.type.value,
        config: DialogStore.generateState.config.value,
      };
    case 'dedupe':
      return {
        selectedColumns: DialogStore.dedupeState.selectedColumns.value,
        useAllColumns: DialogStore.dedupeState.useAllColumns.value,
        mode: DialogStore.dedupeState.mode.value,
      };
    case 'column-editor':
      return DialogStore.columnEditorState.columns.value;
    case 'impute':
      return {
        column: DialogStore.imputeState.column.value,
        strategy: DialogStore.imputeState.strategy.value,
        value: DialogStore.imputeState.value.value,
      };
    case 'settings':
      return {
        theme: AppStore.theme.value,
        rowLimit: AppStore.uxSettings.value.preview?.rowLimit || 100,
        analyticsOptOut: AppStore.uxSettings.value.analyticsOptOut ?? false,
      };
    case 'append':
      return {
        targetModel: DialogStore.appendState.targetModel.value,
        removeDuplicates: DialogStore.appendState.removeDuplicates.value,
      };
    default:
      return null;
  }
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

  switch (dialogName) {
    case 'filter':
      // State initialized by DialogStore or component
      break;

    case 'join':
      callbacks?.initializeJoinDialog?.();
      break;

    case 'append':
      callbacks?.initializeAppendDialog?.();
      break;

    case 'derive':
      // State initialized by DialogStore
      break;

    case 'sort':
      DialogStore.sortState.field.value = columns[0] || '';
      DialogStore.sortState.order.value = 'asc';
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
      DialogStore.spreadState.column.value = '';
      DialogStore.spreadState.limit.value = undefined;
      break;

    case 'unroll':
      DialogStore.unrollState.column.value = '';
      DialogStore.unrollState.indices.value = false;
      break;

    case 'index':
      DialogStore.indexState.columnName.value = 'row_index';
      DialogStore.indexState.startFrom.value = 1;
      break;

    case 'aggregate':
      DialogStore.aggregateState.groupBy.value = [];
      DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];
      DialogStore.aggregateState.isPreviewing.value = false;
      break;

    case 'import-csv':
      // Copy from importDialogState to signals (legacy pattern)
      // This will be simplified when proxy pattern is removed
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
      break;
    }

    case 'fold':
      DialogStore.foldState.keyName.value = 'key';
      DialogStore.foldState.valueName.value = 'value';
      DialogStore.foldState.selectedColumns.value = columns.map(() => false);
      DialogStore.foldState.mode.value = 'keep';
      break;

    case 'pivot':
      callbacks?.initializePivotDialog?.();
      break;

    case 'replace': {
      const state = DialogStore.replaceState;
      if (!state.findValue.value) {
        state.column.value = columns[0] || '';
        state.findValue.value = '';
        state.replaceValue.value = '';
      } else if (!state.column.value) {
        state.column.value = columns[0] || '';
      }
      break;
    }

    case 'split': {
      const state = DialogStore.splitState;
      if (!state.column.value) {
        const initialColumn = columns[0] || '';
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
      state.columns.value = [];
      state.separator.value = ' ';
      state.columnName.value = '';
      state.removeOriginal.value = false;
      state.error.value = null;
      break;
    }

    case 'regexpMatch': {
      const state = DialogStore.regexpMatchState;
      state.sourceColumn.value = columns[0] || '';
      state.pattern.value = '';
      state.columnName.value = '';
      state.error.value = null;
      break;
    }

    case 'regexpExtract': {
      const state = DialogStore.regexpExtractState;
      state.sourceColumn.value = columns[0] || '';
      state.pattern.value = '';
      state.columnName.value = '';
      state.group.value = 0;
      state.error.value = null;
      break;
    }

    case 'date': {
      const dateColumns = DateHandlers.getDateColumns();
      const initialColumn =
        selectedColumn && dateColumns.includes(selectedColumn)
          ? selectedColumn
          : dateColumns[0] || '';

      const state = DialogStore.dateState;
      state.column.value = initialColumn;
      state.operation.value = 'extract';
      state.extractParts.value = [];
      state.truncateUnits.value = [];
      state.outputColumn.value = '';
      state.error.value = null;
      DateHandlers.clearDatePreview();
      break;
    }

    case 'parseDate': {
      const stringColumns = ParseDateHandlers.getStringColumns();
      const initialCol =
        selectedColumn && stringColumns.includes(selectedColumn)
          ? selectedColumn
          : stringColumns[0] || '';

      const pdState = DialogStore.parseDateState;
      pdState.column.value = initialCol;
      pdState.format.value = '';
      pdState.error.value = null;
      ParseDateHandlers.clearParseDatePreview();
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
      state.column.value = selectedColumn || columns[0] || '';
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
 * Check if current dialog has an error that should disable the apply button
 */
export function activeDialogHasError(): boolean {
  const dialog = AppStore.activeDialog.value;

  switch (dialog) {
    case 'filter':
      return !!DialogStore.filterState.error.value;

    case 'derive': {
      const deriveState = DialogStore.deriveState;
      return (
        !!deriveState.error.value ||
        !deriveState.columnName.value?.trim() ||
        !deriveState.expression.value?.trim()
      );
    }

    case 'sliceRows':
      return !DialogStore.sliceRowsState.count.value || DialogStore.sliceRowsState.count.value <= 0;

    case 'index':
      return (
        !DialogStore.indexState.columnName.value ||
        DialogStore.indexState.columnName.value.trim() === ''
      );

    case 'sample':
      return !DialogStore.sampleState.count.value || DialogStore.sampleState.count.value <= 0;

    case 'spread':
      return (
        !DialogStore.spreadState.column.value || DialogStore.spreadState.column.value.trim() === ''
      );

    case 'unroll':
      return (
        !DialogStore.unrollState.column.value || DialogStore.unrollState.column.value.trim() === ''
      );

    case 'regexpMatch':
      return !!DialogStore.regexpMatchState.error.value;

    case 'regexpExtract':
      return !!DialogStore.regexpExtractState.error.value;

    case 'split':
      return !!DialogStore.splitState.error.value;

    case 'merge':
      return (
        !!DialogStore.mergeState.error.value ||
        DialogStore.mergeState.columns.value.length === 0 ||
        !DialogStore.mergeState.columnName.value?.trim()
      );

    case 'join': {
      const joinState = DialogStore.joinState;
      const hasRight = !!joinState.rightModel.value;
      const hasKeys =
        joinState.joinType.value === 'cross' || joinState.keyPairs.value.some((p) => p[0] && p[1]);
      const hasLookupValues =
        joinState.joinType.value !== 'lookup' || joinState.selectedRightColumns.value.length > 0;
      return !hasRight || !hasKeys || !hasLookupValues;
    }

    case 'append':
      return !DialogStore.appendState.targetModel.value;

    case 'pivot':
      return (
        !DialogStore.pivotState.columnColumn.value || !DialogStore.pivotState.valueColumn.value
      );

    case 'dedupe':
      return (
        !DialogStore.dedupeState.useAllColumns.value &&
        !DialogStore.dedupeState.selectedColumns.value.some((v) => v)
      );

    case 'import-url':
      return !DialogStore.importUrlState.url.value || DialogStore.importUrlState.isFetching.value;

    case 'generate': {
      const g = DialogStore.generateState;
      const generator = {
        name: g.columnName.value,
        type: g.type.value as any,
        config: g.config.value,
      };
      return (
        !g.sourceName.value?.trim() ||
        !g.columnName.value?.trim() ||
        g.rowCount.value <= 0 ||
        !!GeneratorService.validateGenerator(generator, g.isRowAuto.value)
      );
    }

    case 'impute': {
      const imputeState = DialogStore.imputeState;
      return (
        !imputeState.column.value ||
        (imputeState.strategy.value === 'constant' && !imputeState.value.value?.trim())
      );
    }

    default:
      return false;
  }
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

/**
 * Format a cell value for preview display
 */
export function formatPreviewCell(row: any, col: string): string {
  const val = row[col];
  if (val == null || val === '') return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';

  // Handle conversion errors
  if (typeof val === 'object' && val !== null && 'type' in val && val.type === 'error') {
    return 'Error';
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 'Invalid Date';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }

  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
