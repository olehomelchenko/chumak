import type { ChumakApp } from '../../chumak-app';
import { setUrlState, getUrlState, clearUrlHash } from '../../core/url-state';
import { html as aboutHtml } from '../../content/about.md';
import { html as expressionsHtml } from '../../content/expressions.md';
import { signal, effect } from '@preact/signals';
import { mountComponent, unmountComponent } from '../components/PreactBridge';
import { SortDialog } from '../components/SortDialog';
import { IndexDialog } from '../components/IndexDialog';

// Preact signals for Sort Dialog
let sortFieldSignal = signal('');
let sortOrderSignal = signal<'asc' | 'desc'>('asc');
let sortEffectCleanup: (() => void) | null = null;

// Preact signals for Index Dialog
let indexColumnNameSignal = signal('row_index');
let indexStartFromSignal = signal(1);
let indexEffectCleanup: (() => void) | null = null;

export function getDialogState(this: ChumakApp, dialog: string) {
  switch (dialog) {
    case 'filter':
      return this.filterExpression;
    case 'derive':
      return {
        columnName: this.deriveDialogState.columnName,
        expression: this.deriveDialogState.expression,
      };
    case 'sliceRows':
      return this.sliceRowsDialogState;
    case 'index':
      return this.indexDialogState;
    case 'aggregate':
      return {
        groupBy: this.aggregateDialogState.groupBy,
        aggregations: this.aggregateDialogState.aggregations,
      };
    case 'join':
      return {
        rightModel: this.joinDialogState.rightModel,
        joinType: this.joinDialogState.joinType,
        keyPairs: this.joinDialogState.keyPairs,
        suffixes: this.joinDialogState.suffixes,
      };
    case 'fold':
      return this.foldDialogState;
    case 'pivot':
      return {
        rowColumns: this.pivotDialogState.rowColumns,
        columnColumn: this.pivotDialogState.columnColumn,
        valueColumn: this.pivotDialogState.valueColumn,
        aggregation: this.pivotDialogState.aggregation,
        options: this.pivotDialogState.options,
      };
    case 'sort':
      return this.sortDialogState;
    case 'replace':
      return {
        column: this.replaceDialogState.column,
        findValue: this.replaceDialogState.findValue,
        replaceValue: this.replaceDialogState.replaceValue,
      };
    case 'split':
      return {
        column: this.splitDialogState.column,
        delimiter: this.splitDialogState.delimiter,
        isRegex: this.splitDialogState.isRegex,
        mode: this.splitDialogState.mode,
        maxColumns: this.splitDialogState.maxColumns,
        keepOriginal: this.splitDialogState.keepOriginal,
        columnRenames: this.splitDialogState.columnRenames,
      };
    case 'regexpMatch':
      return {
        sourceColumn: this.regexpMatchDialogState.sourceColumn,
        pattern: this.regexpMatchDialogState.pattern,
        columnName: this.regexpMatchDialogState.columnName,
      };
    case 'regexpExtract':
      return {
        sourceColumn: this.regexpExtractDialogState.sourceColumn,
        pattern: this.regexpExtractDialogState.pattern,
        columnName: this.regexpExtractDialogState.columnName,
        group: this.regexpExtractDialogState.group,
      };
    case 'import-csv':
      return {
        sourceName: this.importDialogState.sourceName,
        headerMode: this.importDialogState.headerMode,
        delimiter: this.importDialogState.delimiter,
        customHeaders: this.importDialogState.customHeaders,
        jsonPath: this.importDialogState.jsonPath,
        flattenJson: this.importDialogState.flattenJson,
        serializeNested: this.importDialogState.serializeNested,
      };
    case 'import-url':
      return { url: this.importUrlDialogState.url };
    case 'dedupe':
      return {
        selectedColumns: this.dedupeDialogState.selectedColumns,
        useAllColumns: this.dedupeDialogState.useAllColumns,
        mode: this.dedupeDialogState.mode,
      };
    case 'column-editor':
      return {
        mode: this.columnEditorState.mode,
        columns: this.columnEditorState.columns.map((c) => ({
          original: c.original,
          renamed: c.renamed,
          selected: c.selected,
        })),
        textValue: this.columnEditorState.textValue,
      };
    default:
      return null;
  }
}

export function reSnapshot(this: ChumakApp) {
  if (this.activeDialog) {
    this.dialogSnapshot = JSON.stringify(this.getDialogState(this.activeDialog));
  }
}

export function openDialog(this: ChumakApp, dialogName: string, section?: string) {
  this.activeDialog = dialogName;
  (this as any).initDialogState(dialogName, section);
  this.clearColumnSelection();
  this.reSnapshot();

  // Update URL for navigable pages
  if (['about', 'reference', 'expressions', 'settings'].includes(dialogName)) {
    setUrlState({ page: dialogName, section });
  }
}

export function handleHashChange(this: ChumakApp) {
  const urlState = getUrlState();
  if (urlState.page) {
    if (this.activeDialog !== urlState.page) {
      this.openDialog(urlState.page, urlState.section);
    }
  } else if (
    this.activeDialog &&
    ['about', 'reference', 'expressions', 'settings'].includes(this.activeDialog)
  ) {
    // Hash cleared or changed to non-page route, close dialog
    this.activeDialog = null;
  }
}

export function initDialogState(this: ChumakApp, dialogName: string, _section?: string) {
  if (dialogName === 'filter') {
    this.filterExpression = '';
    this.filterError = null;
  } else if (dialogName === 'join') {
    (this as any).initializeJoinDialog();
  } else if (dialogName === 'derive') {
    this.deriveDialogState = { columnName: '', expression: '', error: null };
  } else if (dialogName === 'sort') {
    // Initialize Alpine state
    this.sortDialogState = { field: this.columns[0] || '', order: 'asc' };

    // Mount Preact component
    const container = document.getElementById('sort-modal-container');
    if (container) {
      // Reset signals to match Alpine state
      sortFieldSignal.value = this.sortDialogState.field;
      sortOrderSignal.value = this.sortDialogState.order;

      // Set up effect to sync signal changes back to Alpine state
      sortEffectCleanup = effect(() => {
        this.sortDialogState.field = sortFieldSignal.value;
        this.sortDialogState.order = sortOrderSignal.value;
      });

      // Mount the Preact component
      mountComponent(container, SortDialog, {
        columns: this.columns,
        field: sortFieldSignal,
        order: sortOrderSignal,
      });
    }
  } else if (dialogName === 'sliceRows') {
    this.sliceRowsDialogState = { count: 10, mode: 'first' };
  } else if (dialogName === 'index') {
    // Initialize Alpine state
    this.indexDialogState = { columnName: 'row_index', startFrom: 1 };

    // Mount Preact component
    const container = document.getElementById('index-modal-container');
    if (container) {
      indexColumnNameSignal.value = this.indexDialogState.columnName;
      indexStartFromSignal.value = this.indexDialogState.startFrom;

      indexEffectCleanup = effect(() => {
        this.indexDialogState.columnName = indexColumnNameSignal.value;
        this.indexDialogState.startFrom = indexStartFromSignal.value;
      });

      mountComponent(container, IndexDialog, {
        columnName: indexColumnNameSignal,
        startFrom: indexStartFromSignal,
        rowCount: this.currentData?.length || 0,
      });
    }
  } else if (dialogName === 'aggregate') {
    this.aggregateDialogState = {
      groupBy: [],
      aggregations: [{ output: 'count', func: 'count', col: '' }],
      previewData: null,
      previewError: null,
      isPreviewing: false,
    };
  } else if (dialogName === 'fold') {
    this.foldDialogState = {
      keyName: 'key',
      valueName: 'value',
      selectedColumns: this.columns.map(() => false),
      mode: 'keep',
    };
  } else if (dialogName === 'pivot') {
    (this as any).initializePivotDialog();
  } else if (dialogName === 'replace') {
    this.replaceDialogState = { column: this.columns[0] || '', findValue: '', replaceValue: '' };
  } else if (dialogName === 'split') {
    this.splitDialogState = {
      column: this.columns[0] || '',
      delimiter: ',',
      isRegex: false,
      mode: 'spread',
      maxColumns: 10,
      keepOriginal: false,
      error: null,
      previewData: [],
      previewColumns: [],
      autoDetectedDelimiter: null,
      columnRenames: {},
    };
    if (this.columns.length > 0) {
      this.$nextTick(() => {
        const detected = (this as any).detectDelimiter(this.splitDialogState.column);
        if (detected) {
          this.splitDialogState.delimiter = detected.char;
          this.splitDialogState.isRegex = detected.isRegex;
          this.splitDialogState.autoDetectedDelimiter = detected.name;
        }
        (this as any).updateSplitPreview();
      });
    }
  } else if (dialogName === 'regexpMatch') {
    this.regexpMatchDialogState = {
      columnName: '',
      sourceColumn: this.columns[0] || '',
      pattern: '',
      error: null,
    };
  } else if (dialogName === 'regexpExtract') {
    this.regexpExtractDialogState = {
      columnName: '',
      sourceColumn: this.columns[0] || '',
      pattern: '',
      group: 0,
      error: null,
    };
  } else if (dialogName === 'date') {
    const dateColumns = (this as any).getDateColumns();
    const initialColumn =
      this.selectedColumn && dateColumns.includes(this.selectedColumn)
        ? this.selectedColumn
        : dateColumns[0] || '';
    this.dateDialogState = {
      column: initialColumn,
      operation: 'extract',
      extractParts: ['year'],
      truncateUnits: ['month'],
      outputColumn: '',
      error: null,
      previewData: [],
    };
    this.$nextTick(() => (this as any).updateDatePreview());
  } else if (dialogName === 'dedupe') {
    this.dedupeDialogState = {
      selectedColumns: this.columns.map(() => true),
      useAllColumns: true,
      duplicateCount: 0,
      mode: 'remove',
    };
    this.$nextTick(() => (this as any).updateDedupePreview());
  } else if (dialogName === 'column-editor') {
    this.columnEditorState = {
      mode: 'list',
      textSubMode: 'rename',
      columns: this.columns.map((col) => ({
        original: col,
        renamed: col,
        selected: true,
      })),
      textValue: '',
      textError: null,
      patternText: '',
      patternMode: 'include',
      patternMatchType: 'prefix',
      draggedIndex: null,
    };
  }
}

export function isSlidePanel(this: ChumakApp, dialog: string | null): boolean {
  if (!dialog) return false;
  const slidePanels = [
    'filter',
    'sort',
    'sliceRows',
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
  ];
  return slidePanels.includes(dialog);
}

export function isCenteredModal(this: ChumakApp, dialog: string | null): boolean {
  if (!dialog) return false;
  const centeredModals = [
    'import-csv',
    'import-url',
    'settings',
    'download',
    'about',
    'expressions',
  ];
  return centeredModals.includes(dialog);
}

export function getDialogTitle(this: ChumakApp): string {
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
      return 'About Chumak';
    case 'expressions':
      return 'Expression Reference';
    case 'column-editor':
      return 'Edit Columns';
    default:
      return '';
  }
}

export function getDialogButtonText(this: ChumakApp): string {
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

export function getAboutContent(this: ChumakApp): string {
  return aboutHtml;
}

export function getExpressionsContent(this: ChumakApp): string {
  return expressionsHtml;
}

export function hasPreviewData(this: ChumakApp): boolean {
  return this.previewState.rows.length > 0;
}

export function getPreviewTitle(this: ChumakApp): string {
  return this.previewState.title;
}

export function getPreviewStats(this: ChumakApp): string {
  return this.previewState.stats;
}

export function getPreviewColumns(this: ChumakApp): string[] {
  return this.previewState.columns;
}

export function getPreviewRows(this: ChumakApp): any[] {
  return this.previewState.rows;
}

export function formatPreviewCell(this: ChumakApp, row: any, col: string): string {
  const val = row[col];
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  return String(val);
}

export function clearPreview(this: ChumakApp): void {
  if (this.previewState._debounceTimer) {
    clearTimeout(this.previewState._debounceTimer);
  }
  this.previewState = {
    title: '',
    stats: '',
    columns: [],
    newColumns: [],
    rows: [],
    _debounceTimer: null,
  };
}

export function isNewPreviewColumn(this: ChumakApp, col: string): boolean {
  return this.previewState.newColumns.includes(col);
}

export function activeDialogError(this: ChumakApp): boolean {
  switch (this.activeDialog) {
    case 'filter':
      return !!this.filterError;
    case 'derive':
      return !!this.deriveDialogState.error;
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
      return !this.joinDialogState.rightModel;
    case 'pivot':
      return !this.pivotDialogState.columnColumn || !this.pivotDialogState.valueColumn;
    case 'dedupe':
      return (
        !this.dedupeDialogState.useAllColumns &&
        !this.dedupeDialogState.selectedColumns.some((v) => v)
      );
    case 'import-url':
      return !this.importUrlDialogState.url || this.importUrlDialogState.isFetching;
    default:
      return false;
  }
}

export function hasUnsavedChanges(this: ChumakApp) {
  if (!this.activeDialog || this.dialogSnapshot === null) return false;
  const current = this.getDialogState(this.activeDialog);
  if (current === null) return false;
  return JSON.stringify(current) !== this.dialogSnapshot;
}

export async function closeDialog(this: ChumakApp, force = false) {
  if (!force && this.hasUnsavedChanges()) {
    if (!(await this.confirm('You have unsaved changes. Are you sure you want to discard them?')))
      return;
  }

  // Unmount Preact components if they were mounted
  if (this.activeDialog === 'sort') {
    const container = document.getElementById('sort-modal-container');
    if (container) unmountComponent(container);
    sortEffectCleanup?.();
    sortEffectCleanup = null;
  }

  if (this.activeDialog === 'index') {
    const container = document.getElementById('index-modal-container');
    if (container) unmountComponent(container);
    indexEffectCleanup?.();
    indexEffectCleanup = null;
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

export function resetDialogStates(this: ChumakApp) {
  this.aggregateDialogState = {
    groupBy: [],
    aggregations: [],
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
  this.joinDialogState = {
    rightModel: null,
    joinType: 'left',
    keyPairs: [[null, null]],
    suffixes: ['_x', '_y'],
    availableTargets: [],
    leftColumns: [],
    rightColumns: [],
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
  this.importDialogState = {
    fileName: '',
    sourceName: '',
    rawPreviewData: [],
    previewHeaders: [],
    previewDataRows: [],
    headerMode: 'first-row',
    delimiter: ',',
    originalHeaders: [],
    customHeaders: [],
    duplicateWarning: '',
  };
  this.importFileData = null;
  this.foldDialogState = {
    keyName: 'key',
    valueName: 'value',
    selectedColumns: this.columns ? this.columns.map(() => false) : [],
    mode: 'keep',
  };
  this.pivotDialogState = {
    rowColumns: [],
    columnColumn: '',
    valueColumn: '',
    aggregation: 'sum',
    options: { sort: true, limit: null },
    uniqueValueCount: 0,
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
  this.splitDialogState = {
    column: '',
    delimiter: ',',
    isRegex: false,
    mode: 'spread',
    maxColumns: 10,
    keepOriginal: false,
    error: null,
    previewData: [],
    previewColumns: [],
    autoDetectedDelimiter: null,
    columnRenames: {},
  };
  this.regexpMatchDialogState = { columnName: '', sourceColumn: '', pattern: '', error: null };
  this.regexpExtractDialogState = {
    columnName: '',
    sourceColumn: '',
    pattern: '',
    group: 0,
    error: null,
  };
  this.dateDialogState = {
    column: '',
    operation: 'extract',
    extractParts: ['year'],
    truncateUnits: ['month'],
    outputColumn: '',
    error: null,
    previewData: [],
  };
  this.dedupeDialogState = {
    selectedColumns: [],
    useAllColumns: true,
    duplicateCount: 0,
    mode: 'remove',
  };
}
