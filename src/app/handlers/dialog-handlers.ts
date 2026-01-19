import type { SytoApp } from '../../syto-app';
import { setUrlState, getUrlState, clearUrlHash } from '../../core/url-state';
import { html as aboutHtml } from '../../content/about.md';
import { html as expressionsHtml } from '../../content/expressions.md';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as DateHandlers from './date-handlers';

// Local signals replaced by DialogStore

export function getDialogState(this: SytoApp, dialog: string) {
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
      return this.sliceRowsDialogState;
    case 'index':
      return this.indexDialogState;
    case 'aggregate':
      return this.aggregateDialogState;
    case 'join':
      return {
        rightModel: DialogStore.joinState.rightModel.value,
        joinType: DialogStore.joinState.joinType.value,
        keyPairs: DialogStore.joinState.keyPairs.value,
        suffixes: DialogStore.joinState.suffixes.value,
      };
    case 'fold':
      return this.foldDialogState;
    case 'pivot':
      return this.pivotDialogState;
    case 'sort':
      return {
        field: DialogStore.sortState.field.value,
        order: DialogStore.sortState.order.value,
      };
    case 'replace':
      return this.replaceDialogState;
    case 'split':
      return this.splitDialogState;
    case 'regexpMatch':
      return this.regexpMatchDialogState;
    case 'regexpExtract':
      return this.regexpExtractDialogState;
    case 'import-csv':
      return this.importDialogState;
    case 'import-url':
      return { url: this.importUrlDialogState.url };
    case 'dedupe':
      return this.dedupeDialogState;
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
        theme: this.theme,
        rowLimit: this.uxSettings.preview?.rowLimit || 100,
      };
    default:
      return null;
  }
}

export function reSnapshot(this: SytoApp) {
  if (this.activeDialog) {
    this.dialogSnapshot = JSON.stringify(this.getDialogState(this.activeDialog));
  }
}

export function openDialog(this: SytoApp, dialogName: string, section?: string) {
  this.activeDialog = dialogName;
  this.initDialogState(dialogName, section);
  this.clearColumnSelection();
  this.reSnapshot();

  // Update URL for navigable pages
  if (['about', 'reference', 'expressions', 'settings'].includes(dialogName)) {
    setUrlState({ page: dialogName, section });
  }
}

export function handleHashChange(this: SytoApp) {
  const urlState = getUrlState();
  if (urlState.page) {
    if (this.activeDialog !== urlState.page) {
      this.openDialog(urlState.page, urlState.section);
    }
  } else {
    // Handle model/source routes
    if (urlState.modelId) {
      const model = this.models.find((m) => m.id === urlState.modelId);
      if (model && this.activeModel?.id !== model.id) {
        this.switchToModel(model);
      }
    } else if (urlState.sourceId) {
      const source = this.sources.find((s) => s.id === urlState.sourceId);
      if (source && this.activeSource?.id !== source.id) {
        this.switchToSource(source);
      }
    }

    // Close dialog if hash changed to non-page route
    if (
      this.activeDialog &&
      ['about', 'reference', 'expressions', 'settings'].includes(this.activeDialog)
    ) {
      this.activeDialog = null;
    }
  }
}

export function initDialogState(this: SytoApp, dialogName: string, section?: string) {
  if (dialogName === 'filter') {
    // State initialized by DialogStore.openDialog call or explicit reset if needed
    // Logic moved to component or kept in store
  } else if (dialogName === 'join') {
    this.initializeJoinDialog(); // Updates DialogStore.joinState
  } else if (dialogName === 'derive') {
    // State initialized by DialogStore
  } else if (dialogName === 'sort') {
    DialogStore.sortState.field.value = this.columns[0] || '';
    DialogStore.sortState.order.value = 'asc';
    AppStore.activeDialog.value = 'sort';
  } else if (dialogName === 'sliceRows') {
    DialogStore.sliceRowsState.count.value = 10;
    DialogStore.sliceRowsState.mode.value = 'first';
  } else if (dialogName === 'index') {
    DialogStore.indexState.columnName.value = 'row_index';
    DialogStore.indexState.startFrom.value = 1;
  } else if (dialogName === 'aggregate') {
    DialogStore.aggregateState.groupBy.value = [];
    DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];
    DialogStore.aggregateState.isPreviewing.value = false;
  } else if (dialogName === 'import-csv') {
    const state = DialogStore.importCsvState;
    state.sourceName.value = this.importDialogState.sourceName;
    state.isJson.value = !!this.importDialogState.isJson;
    state.jsonPath.value = this.importDialogState.jsonPath || '';
    state.jsonRawValuePreview.value = this.importDialogState.jsonRawValuePreview || '';
    state.suggestedJsonKeys.value = this.importDialogState.suggestedJsonKeys || [];
    state.flattenJson.value = !!this.importDialogState.flattenJson;
    state.serializeNested.value = !!this.importDialogState.serializeNested;
    state.jsonData.value = this.importDialogState.jsonData || null;

    state.delimiter.value = this.importDialogState.delimiter;
    state.headerMode.value = this.importDialogState.headerMode;
    state.customHeaders.value = [...(this.importDialogState.customHeaders || [])];
    state.duplicateWarning.value = this.importDialogState.duplicateWarning || '';
    state.previewHeaders.value = [...(this.importDialogState.previewHeaders || [])];
    state.previewDataRows.value = [...(this.importDialogState.previewDataRows || [])];
  } else if (dialogName === 'column-editor') {
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.columns.value = this.columns.map((col) => ({
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
  } else if (dialogName === 'settings') {
    const state = DialogStore.settingsState;
    state.theme.value = this.theme as any;
    state.rowLimit.value = this.uxSettings.preview?.rowLimit || 100;
  } else if (dialogName === 'fold') {
    DialogStore.foldState.keyName.value = 'key';
    DialogStore.foldState.valueName.value = 'value';
    DialogStore.foldState.selectedColumns.value = this.columns.map(() => false);
    DialogStore.foldState.mode.value = 'keep';
  } else if (dialogName === 'pivot') {
    this.initializePivotDialog();
    const state = DialogStore.pivotState;
    state.rowColumns.value = [...this.pivotDialogState.rowColumns];
    state.columnColumn.value = this.pivotDialogState.columnColumn;
    state.valueColumn.value = this.pivotDialogState.valueColumn;
    state.aggregation.value = this.pivotDialogState.aggregation;
    state.uniqueValueCount.value = this.pivotDialogState.uniqueValueCount;
    state.options.value = { ...this.pivotDialogState.options };
    state.isPreviewing.value = this.pivotDialogState.isPreviewing;
  } else if (dialogName === 'replace') {
    const state = DialogStore.replaceState;
    // Only initialize if not already set by quickReplace
    if (!state.findValue.value) {
      state.column.value = this.columns[0] || '';
      state.findValue.value = '';
      state.replaceValue.value = '';
    } else if (!state.column.value) {
      // If findValue is set but column isn't, set column to first column
      state.column.value = this.columns[0] || '';
    }
  } else if (dialogName === 'split') {
    const initialColumn = this.columns[0] || '';
    const state = DialogStore.splitState;

    state.column.value = initialColumn;
    state.delimiter.value = ',';
    state.autoDetectedDelimiter.value = null;
    state.isRegex.value = false;
    state.mode.value = 'spread';
    state.maxColumns.value = 10;
    state.keepOriginal.value = false;
    state.error.value = null;

    if (initialColumn) {
      const detected = this.detectDelimiter(initialColumn);
      if (detected) {
        state.delimiter.value = detected.char;
        state.isRegex.value = detected.isRegex;
        state.autoDetectedDelimiter.value = detected.name;
      }
    }

    // We rely on component effects or explicit calls for updates
    if (typeof this.debouncedUpdateSplitPreview === 'function') {
      this.debouncedUpdateSplitPreview();
    }
  } else if (dialogName === 'regexpMatch') {
    const state = DialogStore.regexpMatchState;
    state.sourceColumn.value = this.columns[0] || '';
    state.pattern.value = '';
    state.columnName.value = '';
    state.error.value = null;
  } else if (dialogName === 'regexpExtract') {
    const state = DialogStore.regexpExtractState;
    state.sourceColumn.value = this.columns[0] || '';
    state.pattern.value = '';
    state.columnName.value = '';
    state.group.value = 0;
    state.error.value = null;
  } else if (dialogName === 'date') {
    const dateColumns = DateHandlers.getDateColumns();
    const initialColumn =
      this.selectedColumn && dateColumns.includes(this.selectedColumn)
        ? this.selectedColumn
        : dateColumns[0] || '';

    const state = DialogStore.dateState;
    state.column.value = initialColumn;
    state.operation.value = 'extract';
    state.extractParts.value = [];
    state.truncateUnits.value = [];
    state.outputColumn.value = '';
    state.error.value = null;

    // Don't update preview on init - wait for user to select parts
    DateHandlers.clearDatePreview();
  } else if (dialogName === 'dedupe') {
    const state = DialogStore.dedupeState;
    state.selectedColumns.value = this.columns.map(() => true);
    state.useAllColumns.value = true;
    state.duplicateCount.value = 0;
    state.mode.value = 'remove';

    if (typeof this.updateDedupePreview === 'function') {
      this.updateDedupePreview();
    }
  } else if (dialogName === 'impute') {
    const state = DialogStore.imputeState;
    state.column.value = this.selectedColumn || this.columns[0] || '';
    state.strategy.value = 'constant';
    state.value.value = '';
    state.includeEmptyString.value = false;
    state.previewRows.value = null;
    state.error.value = null;

    if (typeof (this as any).updateImputePreview === 'function') {
      (this as any).updateImputePreview();
    }
  }
}

export function isSlidePanel(this: SytoApp, dialog: string | null): boolean {
  if (!dialog) return false;
  const slidePanels = [
    'filter',
    'sort',
    'sliceRows',
    'selectPattern',
    'removePattern',
    'conditional',
    'renamePattern',
    'index',
    'select',
    'remove',
    'rename',
    'split',
    'derive',
    'regexpMatch',
    'regexpExtract',
    'date',
    'dedupe',
    'fold',
    'pivot',
    'aggregate',
    'join',
    'replace',
    'column-editor',
    'import-csv',
    'import-url',
    'impute',
  ];
  return slidePanels.includes(dialog);
}

export function isCenteredModal(this: SytoApp, dialog: string | null): boolean {
  if (!dialog) return false;
  const centeredModals = ['import-url', 'settings', 'download', 'about', 'expressions'];
  return centeredModals.includes(dialog);
}

export function getDialogTitle(this: SytoApp): string {
  switch (this.activeDialog) {
    case 'filter':
      return 'Filter Rows';
    case 'sort':
      return 'Sort Rows';
    case 'sliceRows':
      return 'Keep / Remove Rows';
    case 'index':
      return 'Add Index Column';
    case 'split':
      return 'Split Column';
    case 'derive':
      return 'Derive Column';
    case 'regexpMatch':
      return 'Regexp Match';
    case 'regexpExtract':
      return 'Regexp Extract';
    case 'date':
      return 'Date Operations';
    case 'dedupe':
      return 'Duplicates';
    case 'fold':
      return 'Unpivot Data (Fold)';
    case 'pivot':
      return 'Pivot Data (Wide)';
    case 'aggregate':
      return 'Group By';
    case 'join':
      return 'Join Data';
    case 'replace':
      return 'Replace Values';
    case 'import-csv':
      return this.importDialogState.isJson ? 'Import JSON' : 'Import CSV';
    case 'import-url':
      return 'Import from URL';
    case 'settings':
      return 'Settings';
    case 'download':
      return 'Download Data';
    case 'about':
      return 'About Syto';
    case 'expressions':
      return 'Expression Reference';
    case 'column-editor':
      return 'Edit Columns';
    case 'impute':
      return 'Impute Missing Values';
    case 'selectPattern':
      return 'Select Pattern';
    case 'removePattern':
      return 'Remove Pattern';
    case 'conditional':
      return 'Conditional Column';
    case 'renamePattern':
      return 'Rename Pattern';
    default:
      return '';
  }
}

export function getDialogButtonText(this: SytoApp): string {
  switch (this.activeDialog) {
    case 'import-csv':
      return 'Import';
    case 'import-url':
      return 'Fetch Data';
    case 'join':
      return 'Apply Join';
    case 'download':
      return 'Download';
    default:
      return 'Apply';
  }
}

export function getAboutContent(this: SytoApp): string {
  return aboutHtml;
}

export function getExpressionsContent(this: SytoApp): string {
  return expressionsHtml;
}

export function hasPreviewData(this: SytoApp): boolean {
  if (this.activeDialog === 'import-csv') {
    return DialogStore.importCsvState.previewDataRows.value.length > 0;
  }
  return DialogStore.previewState.rows.value.length > 0;
}

export function getPreviewTitle(this: SytoApp): string {
  if (this.activeDialog === 'import-csv') {
    return 'Import Preview';
  }
  return DialogStore.previewState.title.value;
}

export function getPreviewStats(this: SytoApp): string {
  if (this.activeDialog === 'import-csv') {
    const rows = DialogStore.importCsvState.previewDataRows.value.length;
    const cols = DialogStore.importCsvState.previewHeaders.value.length;
    const limit = AppStore.uxSettings.value.preview.rowLimit;
    return `${rows} rows, ${cols} columns (first ${Math.min(rows, limit)} rows shown)`;
  }
  return DialogStore.previewState.stats.value;
}

export function getPreviewColumns(this: SytoApp): string[] {
  if (this.activeDialog === 'import-csv') {
    return DialogStore.importCsvState.previewHeaders.value;
  }
  return DialogStore.previewState.columns.value;
}

export function getPreviewRows(this: SytoApp): any[] {
  if (this.activeDialog === 'import-csv') {
    const headers = DialogStore.importCsvState.previewHeaders.value;
    const rows = DialogStore.importCsvState.previewDataRows.value;
    // Convert array rows to object rows to match expected format
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

export function formatPreviewCell(this: SytoApp, row: any, col: string): string {
  const val = row[col];
  if (val == null || val === '') return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  // Handle conversion errors
  if (typeof val === 'object' && val !== null && 'type' in val && val.type === 'error') {
    return 'Error';
  }
  if (val instanceof Date) {
    // Format dates using local time to avoid timezone shifts
    // (toISOString() converts to UTC which shifts dates for non-UTC timezones)
    if (isNaN(val.getTime())) return 'Invalid Date';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function clearPreview(this: SytoApp): void {
  if (this._previewDebounceTimer) {
    clearTimeout(this._previewDebounceTimer);
    this._previewDebounceTimer = null;
  }
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

export function isNewPreviewColumn(this: SytoApp, col: string): boolean {
  return DialogStore.previewState.newColumns.value.includes(col);
}

export function activeDialogError(this: SytoApp): boolean {
  switch (this.activeDialog) {
    case 'filter':
      return !!DialogStore.filterState.error.value;
    case 'derive':
      const deriveState = DialogStore.deriveState;
      return (
        !!deriveState.error.value ||
        !deriveState.columnName.value?.trim() ||
        !deriveState.expression.value?.trim()
      );
    case 'sliceRows':
      return !this.sliceRowsDialogState.count || this.sliceRowsDialogState.count <= 0;
    case 'index':
      return !this.indexDialogState.columnName || this.indexDialogState.columnName.trim() === '';
    case 'regexpMatch':
      return !!this.regexpMatchDialogState.error;
    case 'regexpExtract':
      return !!this.regexpExtractDialogState.error;
    case 'split':
      return !!this.splitDialogState.error;
    case 'join':
      return !DialogStore.joinState.rightModel.value;
    case 'pivot':
      return !this.pivotDialogState.columnColumn || !this.pivotDialogState.valueColumn;
    case 'dedupe':
      return (
        !this.dedupeDialogState.useAllColumns &&
        !this.dedupeDialogState.selectedColumns.some((v: any) => v)
      );
    case 'import-url':
      return !this.importUrlDialogState.url || this.importUrlDialogState.isFetching;
    case 'impute':
      const imputeState = DialogStore.imputeState;
      return (
        !imputeState.column.value ||
        (imputeState.strategy.value === 'constant' && !imputeState.value.value?.trim())
      );
    default:
      return false;
  }
}

export function hasUnsavedChanges(this: SytoApp) {
  if (!this.activeDialog || this.dialogSnapshot === null) return false;
  const current = this.getDialogState(this.activeDialog);
  if (current === null) return false;
  return JSON.stringify(current) !== this.dialogSnapshot;
}

export async function closeDialog(this: SytoApp, force = false) {
  if (!force && this.hasUnsavedChanges()) {
    if (!(await this.confirm('You have unsaved changes. Are you sure you want to discard them?')))
      return;
  }

  // Clear URL hash if closing a navigable page
  if (
    this.activeDialog &&
    ['about', 'reference', 'expressions', 'settings'].includes(this.activeDialog)
  ) {
    clearUrlHash();
  }

  this.clearPreview();
  this.activeDialog = null;
  this.dialogSnapshot = null;
  this.resetDialogStates();
}

export function resetDialogStates(this: SytoApp) {
  DialogStore.resetAll();
  this.importFileData = null;
}
