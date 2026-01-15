import type { ChumakApp } from '../../chumak-app';
import { setUrlState, getUrlState, clearUrlHash } from '../../core/url-state';
import { html as aboutHtml } from '../../content/about.md';
import { html as expressionsHtml } from '../../content/expressions.md';
import { signal, effect } from '@preact/signals';
import { mountComponent, unmountComponent } from '../components/PreactBridge';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { SortDialog } from '../components/SortDialog';
import { IndexDialog } from '../components/IndexDialog';
import { ReplaceDialog } from '../components/ReplaceDialog';
import { SliceRowsDialog } from '../components/SliceRowsDialog';
import { UnpivotDialog } from '../components/UnpivotDialog';
import { FilterDialog } from '../components/FilterDialog';
import { PivotDialog } from '../components/PivotDialog';
import { DateDialog } from '../components/DateDialog';
import { SplitDialog } from '../components/SplitDialog';
import { DeriveDialog } from '../components/DeriveDialog';
import { JoinDialog } from '../components/JoinDialog';
import { AggregateDialog } from '../components/AggregateDialog';
import { ImportCsvDialog } from '../components/ImportCsvDialog';
import { ColumnEditorDialog } from '../components/ColumnEditorDialog';
import { SettingsDialog } from '../components/SettingsDialog';

// Local signals replaced by DialogStore

export function getDialogState(this: ChumakApp, dialog: string) {
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
      return this.columnEditorState;
    case 'settings':
      return {
        theme: this.theme,
        rowLimit: this.uxSettings.preview?.rowLimit || 100,
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
  this.initDialogState(dialogName, section);
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

export function initDialogState(this: ChumakApp, dialogName: string, section?: string) {
  if (dialogName === 'filter') {
    // DialogStore.openDialog called from interaction/step handlers initializes the state

    // Mount Preact component
    const container = document.getElementById('filter-modal-container');
    if (container) {
      const { expression, error, previewMode } = DialogStore.filterState;

      mountComponent(container, FilterDialog, {
        expression: expression,
        error: error,
        previewMode: previewMode,
        onOpenReference: () => this.openDialog('expressions'),
      });

      // Reactive logic: When expression changes, validate and update preview
      effect(() => {
        // subscribe by reading
        void expression.value;
        void previewMode.value;

        // Use existing transform logic adjusted to read from store
        if (typeof this.validateFilterExpression === 'function') {
          this.validateFilterExpression();
        }
        if (typeof this.debouncedUpdateFilterPreview === 'function') {
          this.debouncedUpdateFilterPreview();
        }
      });
    }
  } else if (dialogName === 'join') {
    this.initializeJoinDialog(); // This now populates DialogStore

    // Mount Preact component
    const container = document.getElementById('join-modal-container');
    if (container) {
      const {
        rightModel,
        joinType,
        keyPairs,
        suffixes,
        targets,
        rightColumns,
        previewData,
        previewError,
        isPreviewing,
      } = DialogStore.joinState;

      mountComponent(container, JoinDialog, {
        targets: targets.value, // Pass initial value. For dynamic updates, component would need to accept Signal<JoinTarget[]>
        rightModel: rightModel,
        joinType: joinType,
        keyPairs: keyPairs,
        suffixes: suffixes,
        leftColumns: this.columns,
        rightColumns: rightColumns,
        previewData: previewData,
        previewError: previewError,
        isPreviewing: isPreviewing,
        onPreview: () => this.previewJoin(),
      });

      // Watch for model changes to update columns via legacy handler
      effect(() => {
        const modelId = rightModel.value;
        if (modelId && typeof this.onJoinTargetChange === 'function') {
          this.onJoinTargetChange();
        }
      });
    }
  } else if (dialogName === 'derive') {
    // DialogStore.openDialog called from interaction/step handlers initializes the state

    // Mount Preact component
    const container = document.getElementById('derive-modal-container');
    if (container) {
      const { columnName, expression, error } = DialogStore.deriveState;

      mountComponent(container, DeriveDialog, {
        columnName: columnName,
        expression: expression,
        error: error,
        onOpenReference: () => this.openDialog('expressions'),
      });

      // Reactive logic
      effect(() => {
        // subscribe
        void columnName.value;
        void expression.value;

        // Trigger validation and preview logic
        if (typeof this.validateDeriveExpression === 'function') {
          this.validateDeriveExpression();
        }

        if (typeof this.debouncedUpdateDerivePreview === 'function') {
          this.debouncedUpdateDerivePreview();
        }
      });
    }
  } else if (dialogName === 'sort') {
    // Initialize Store
    DialogStore.sortState.field.value = this.columns[0] || '';
    DialogStore.sortState.order.value = 'asc';
    AppStore.activeDialog.value = 'sort';

    // Mount Preact component
    const container = document.getElementById('sort-modal-container');
    if (container) {
      mountComponent(container, SortDialog, {
        columns: this.columns,
        field: DialogStore.sortState.field,
        order: DialogStore.sortState.order,
      });
    }
  } else if (dialogName === 'sliceRows') {
    // Initialize state
    DialogStore.sliceRowsState.count.value = 10;
    DialogStore.sliceRowsState.mode.value = 'first';

    const container = document.getElementById('slice-rows-modal-container');
    if (container) {
      mountComponent(container, SliceRowsDialog, {
        count: DialogStore.sliceRowsState.count,
        mode: DialogStore.sliceRowsState.mode,
        rowCount: this.currentData?.length || 0,
      });
    }
  } else if (dialogName === 'index') {
    // Initialize state
    DialogStore.indexState.columnName.value = 'row_index';
    DialogStore.indexState.startFrom.value = 1;

    const container = document.getElementById('index-modal-container');
    if (container) {
      mountComponent(container, IndexDialog, {
        columnName: DialogStore.indexState.columnName,
        startFrom: DialogStore.indexState.startFrom,
        rowCount: this.currentData?.length || 0,
      });
    }
  } else if (dialogName === 'aggregate') {
    DialogStore.aggregateState.groupBy.value = [];
    DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];
    DialogStore.aggregateState.isPreviewing.value = false;

    const container = document.getElementById('aggregate-modal-container');
    if (container) {
      mountComponent(container, AggregateDialog, {
        columns: this.columns,
        groupBy: DialogStore.aggregateState.groupBy,
        aggregations: DialogStore.aggregateState.aggregations,
        isPreviewing: DialogStore.aggregateState.isPreviewing,
        onPreview: async () => {
          if (typeof this.previewAggregate === 'function') {
            await this.previewAggregate();
          }
        },
      });
    }
  } else if (dialogName === 'import-csv') {
    const container = document.getElementById('import-csv-modal-container');
    if (container) {
      const state = DialogStore.importCsvState;
      // Initialize signals from current Alpine state (populated by library-based file loader)
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

      mountComponent(container, ImportCsvDialog, {
        sourceName: state.sourceName,
        isJson: state.isJson,
        jsonPath: state.jsonPath,
        jsonRawValuePreview: state.jsonRawValuePreview,
        suggestedJsonKeys: state.suggestedJsonKeys,
        flattenJson: state.flattenJson,
        serializeNested: state.serializeNested,
        jsonData: state.jsonData,
        delimiter: state.delimiter,
        headerMode: state.headerMode,
        customHeaders: state.customHeaders,
        duplicateWarning: state.duplicateWarning,
        previewHeaders: state.previewHeaders,
        previewDataRows: state.previewDataRows,

        onJsonPathUpdate: () => {
          if (typeof this.updateJsonPath === 'function') {
            this.updateJsonPath();
            state.jsonRawValuePreview.value = this.importDialogState.jsonRawValuePreview || '';
            state.suggestedJsonKeys.value = this.importDialogState.suggestedJsonKeys || [];
            state.jsonData.value = this.importDialogState.jsonData;
            state.previewHeaders.value = this.importDialogState.previewHeaders;
            state.previewDataRows.value = this.importDialogState.previewDataRows;
            state.customHeaders.value = this.importDialogState.customHeaders;
          }
        },
        onJsonPathReset: () => {
          if (typeof this.resetJsonPath === 'function') {
            this.resetJsonPath();
            state.jsonPath.value = this.importDialogState.jsonPath || '';
            state.jsonRawValuePreview.value = '';
            state.suggestedJsonKeys.value = this.importDialogState.suggestedJsonKeys || [];
          }
        },
        onJsonPathSegmentSelect: (key: string) => {
          if (typeof this.selectJsonPathSegment === 'function') {
            this.selectJsonPathSegment(key);
            state.jsonPath.value = this.importDialogState.jsonPath || '';
            if (typeof this.updateJsonPath === 'function') {
              this.updateJsonPath();
              state.jsonRawValuePreview.value = this.importDialogState.jsonRawValuePreview || '';
              state.suggestedJsonKeys.value = this.importDialogState.suggestedJsonKeys || [];
              state.jsonData.value = this.importDialogState.jsonData;
              state.previewHeaders.value = this.importDialogState.previewHeaders;
              state.previewDataRows.value = this.importDialogState.previewDataRows;
              state.customHeaders.value = this.importDialogState.customHeaders;
            }
          }
        },
        onParamChange: () => {
          if (state.isJson.value) {
            if (typeof this.updateHeadersForPreview === 'function') {
              this.updateHeadersForPreview();
            }
          } else {
            if (typeof this.updateImportPreview === 'function') {
              this.updateImportPreview();
            }
            if (typeof this.updateHeadersForPreview === 'function') {
              this.updateHeadersForPreview();
            }
          }
          state.previewHeaders.value = this.importDialogState.previewHeaders;
          state.previewDataRows.value = this.importDialogState.previewDataRows;
          state.duplicateWarning.value = this.importDialogState.duplicateWarning || '';
        },
      });
    }
  } else if (dialogName === 'column-editor') {
    this.columnEditorState = {
      mode: 'list',
      textSubMode: section === 'select' || section === 'reorder' ? section : 'rename',
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

    const container = document.getElementById('column-editor-modal-container');
    if (container) {
      const state = DialogStore.columnEditorState;
      state.mode.value = 'list';
      state.columns.value = this.columnEditorState.columns.map((c: any) => ({ ...c }));
      state.patternText.value = '';
      state.patternMode.value = 'include';
      state.patternMatchType.value = 'prefix';
      state.draggedIndex.value = null;
      state.textSubMode.value = (
        section === 'select' || section === 'reorder' ? section : 'rename'
      ) as any;
      state.textValue.value = '';
      state.textError.value = null;

      const changesSignal = signal<any>({
        removed: [],
        renamed: [],
        reordered: false,
        hasChanges: false,
      });

      effect(() => {
        this.columnEditorState.mode = state.mode.value;
        this.columnEditorState.columns = state.columns.value.map((c) => ({ ...c }));
        this.columnEditorState.patternText = state.patternText.value;
        this.columnEditorState.patternMode = state.patternMode.value;
        this.columnEditorState.patternMatchType = state.patternMatchType.value;
        this.columnEditorState.draggedIndex = state.draggedIndex.value;
        this.columnEditorState.textSubMode = state.textSubMode.value;
        this.columnEditorState.textValue = state.textValue.value;
        this.columnEditorState.textError = state.textError.value;

        if (typeof this.getColumnEditorChanges === 'function') {
          const changes = this.getColumnEditorChanges();
          changesSignal.value = changes;
        }
      });

      mountComponent(container, ColumnEditorDialog, {
        mode: state.mode,
        columns: state.columns,
        patternText: state.patternText,
        patternMode: state.patternMode,
        patternMatchType: state.patternMatchType,
        draggedIndex: state.draggedIndex,
        textSubMode: state.textSubMode as any,
        textValue: state.textValue,
        textError: state.textError,
        changes: changesSignal,

        onApplyPattern: () => {
          if (typeof this.applyColumnEditorPattern === 'function') {
            this.applyColumnEditorPattern();
            state.columns.value = this.columnEditorState.columns.map((c: any) => ({ ...c }));
          }
        },
        onSwitchToText: () => {
          if (typeof this.switchColumnEditorToText === 'function') {
            this.switchColumnEditorToText();
            state.textValue.value = this.columnEditorState.textValue;
          }
        },
        onValidateText: () => {
          if (typeof this.validateColumnEditorText === 'function') {
            this.validateColumnEditorText();
            state.textError.value = this.columnEditorState.textError;
          }
        },
      });
    }
  } else if (dialogName === 'settings') {
    const container = document.getElementById('settings-modal-container');
    if (container) {
      const state = DialogStore.settingsState;
      state.theme.value = this.theme as any;
      state.rowLimit.value = this.uxSettings.preview?.rowLimit || 100;

      mountComponent(container, SettingsDialog, {
        theme: state.theme,
        rowLimit: state.rowLimit,
        onThemeChange: (theme) => {
          state.theme.value = theme;
          if (typeof this.switchTheme === 'function') {
            this.switchTheme(theme);
          }
        },
        onRowLimitChange: (limit) => {
          state.rowLimit.value = limit;
          if (typeof this.updatePreviewRowLimit === 'function') {
            this.updatePreviewRowLimit(String(limit));
          }
        },
      });
    }
  } else if (dialogName === 'fold') {
    DialogStore.foldState.keyName.value = 'key';
    DialogStore.foldState.valueName.value = 'value';
    DialogStore.foldState.selectedColumns.value = this.columns.map(() => false);
    DialogStore.foldState.mode.value = 'keep';

    const container = document.getElementById('unpivot-modal-container');
    if (container) {
      mountComponent(container, UnpivotDialog, {
        columns: this.columns,
        keyName: DialogStore.foldState.keyName,
        valueName: DialogStore.foldState.valueName,
        mode: DialogStore.foldState.mode,
        selectedColumns: DialogStore.foldState.selectedColumns,
      });
    }
  } else if (dialogName === 'pivot') {
    this.initializePivotDialog();

    // Mount Preact component
    const container = document.getElementById('pivot-modal-container');
    if (container) {
      const state = DialogStore.pivotState;
      // Initialize signals from Alpine state which was just initialized
      state.rowColumns.value = [...this.pivotDialogState.rowColumns];
      state.columnColumn.value = this.pivotDialogState.columnColumn;
      state.valueColumn.value = this.pivotDialogState.valueColumn;
      state.aggregation.value = this.pivotDialogState.aggregation;
      state.uniqueValueCount.value = this.pivotDialogState.uniqueValueCount;
      state.options.value = { ...this.pivotDialogState.options };
      state.isPreviewing.value = this.pivotDialogState.isPreviewing;

      effect(() => {
        // Trigger calculation in Alpine
        if (typeof this.onPivotConfigChange === 'function') {
          Promise.resolve(this.onPivotConfigChange()).then(() => {
            if (state.uniqueValueCount.peek() !== this.pivotDialogState.uniqueValueCount) {
              state.uniqueValueCount.value = this.pivotDialogState.uniqueValueCount;
            }
          });
        }
      });

      mountComponent(container, PivotDialog, {
        columns: this.columns,
        rowColumns: state.rowColumns,
        columnColumn: state.columnColumn,
        valueColumn: state.valueColumn,
        aggregation: state.aggregation as any,
        uniqueValueCount: state.uniqueValueCount,
        sort: signal(state.options.value.sort), // Local signal for component compatibility if needed, else wrap in computed
        limit: signal(state.options.value.limit),
        isPreviewing: state.isPreviewing,
        onPreview: async () => {
          state.isPreviewing.value = true;
          try {
            if (typeof this.previewPivot === 'function') {
              await this.previewPivot();
            }
          } finally {
            state.isPreviewing.value = false;
          }
        },
      });
    }
  } else if (dialogName === 'replace') {
    // Initialize state
    const state = DialogStore.replaceState;
    state.column.value = this.columns[0] || '';
    state.findValue.value = '';
    state.replaceValue.value = '';

    const container = document.getElementById('replace-modal-container');
    if (container) {
      // No sync effect needed as signals are proxied

      mountComponent(container, ReplaceDialog, {
        columns: this.columns,
        column: state.column,
        findValue: state.findValue,
        replaceValue: state.replaceValue,
      });
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

    // Mount Preact component
    const container = document.getElementById('split-modal-container');
    if (container) {
      // Initial detection
      if (initialColumn) {
        const detected = this.detectDelimiter(initialColumn);
        if (detected) {
          state.delimiter.value = detected.char;
          state.isRegex.value = detected.isRegex;
          state.autoDetectedDelimiter.value = detected.name;
        }
      }

      let lastSplitCol = initialColumn;

      effect(() => {
        // Detect logic if column changed
        if (state.column.value !== lastSplitCol) {
          lastSplitCol = state.column.value;
          const detected = this.detectDelimiter(lastSplitCol);
          if (detected) {
            state.delimiter.value = detected.char;
            state.isRegex.value = detected.isRegex;
            state.autoDetectedDelimiter.value = detected.name;
          } else {
            state.autoDetectedDelimiter.value = null;
          }
        }

        // Trigger preview
        if (typeof this.debouncedUpdateSplitPreview === 'function') {
          this.debouncedUpdateSplitPreview();
        }
      });

      mountComponent(container, SplitDialog, {
        columns: this.columns,
        column: state.column,
        delimiter: state.delimiter,
        autoDetectedDelimiter: state.autoDetectedDelimiter,
        isRegex: state.isRegex,
        mode: state.mode,
        maxColumns: state.maxColumns,
        keepOriginal: state.keepOriginal,
        error: state.error,
      });
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
    const dateColumns = this.getDateColumns ? this.getDateColumns() : [];
    const initialColumn =
      this.selectedColumn && dateColumns.includes(this.selectedColumn)
        ? this.selectedColumn
        : dateColumns[0] || '';

    const state = DialogStore.dateState;
    state.column.value = initialColumn;
    state.operation.value = 'extract';
    state.extractParts.value = ['year'];
    state.truncateUnits.value = ['month'];
    state.outputColumn.value = '';
    state.error.value = null;

    // Mount Preact component
    const container = document.getElementById('date-modal-container');
    if (container) {
      effect(() => {
        if (typeof this.updateDatePreview === 'function') {
          this.updateDatePreview();
        }
      });

      mountComponent(container, DateDialog, {
        dateColumns: dateColumns,
        column: state.column,
        operation: state.operation,
        extractParts: state.extractParts,
        truncateUnits: state.truncateUnits,
        outputColumn: state.outputColumn,
        error: state.error,
      });
    }
  } else if (dialogName === 'dedupe') {
    const state = DialogStore.dedupeState;
    state.selectedColumns.value = this.columns.map(() => true);
    state.useAllColumns.value = true;
    state.duplicateCount.value = 0;
    state.mode.value = 'remove';

    this.$nextTick(() => {
      if (typeof this.updateDedupePreview === 'function') {
        this.updateDedupePreview();
      }
    });
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
  return DialogStore.previewState.rows.value.length > 0;
}

export function getPreviewTitle(this: ChumakApp): string {
  return DialogStore.previewState.title.value;
}

export function getPreviewStats(this: ChumakApp): string {
  return DialogStore.previewState.stats.value;
}

export function getPreviewColumns(this: ChumakApp): string[] {
  return DialogStore.previewState.columns.value;
}

export function getPreviewRows(this: ChumakApp): any[] {
  return DialogStore.previewState.rows.value;
}

export function formatPreviewCell(this: ChumakApp, row: any, col: string): string {
  const val = row[col];
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  return String(val);
}

export function clearPreview(this: ChumakApp): void {
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

export function isNewPreviewColumn(this: ChumakApp, col: string): boolean {
  return DialogStore.previewState.newColumns.value.includes(col);
}

export function activeDialogError(this: ChumakApp): boolean {
  switch (this.activeDialog) {
    case 'filter':
      return !!DialogStore.filterState.error.value;
    case 'derive':
      return !!DialogStore.deriveState.error.value;
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
  const containers = [
    'sort',
    'index',
    'replace',
    'slice-rows',
    'unpivot',
    'filter',
    'pivot',
    'aggregate',
    'import-csv',
    'import-url',
    'column-editor',
    'settings',
    'date',
    'split',
    'derive',
    'join',
    'regexp-match',
    'regexp-extract',
    'dedupe',
    'download',
    'about',
    'expressions',
  ];

  for (const name of containers) {
    const container = document.getElementById(`${name}-modal-container`);
    if (container) unmountComponent(container);
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
  DialogStore.resetAll();
  this.importFileData = null;
}
