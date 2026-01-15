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
import { SliceRowsDialog, SliceMode } from '../components/SliceRowsDialog';
import { UnpivotDialog, UnpivotMode } from '../components/UnpivotDialog';
import { FilterDialog } from '../components/FilterDialog';
import { PivotDialog, PivotAggregation } from '../components/PivotDialog';
import { DateDialog, DateOperation } from '../components/DateDialog';
import { SplitDialog, SplitMode } from '../components/SplitDialog';
import { DeriveDialog } from '../components/DeriveDialog';
import { JoinDialog } from '../components/JoinDialog';
import { AggregateDialog, Aggregation } from '../components/AggregateDialog';
import { ImportCsvDialog } from '../components/ImportCsvDialog';
import {
  ColumnEditorDialog,
  ColumnEditorItem,
  ColumnEditorChanges,
} from '../components/ColumnEditorDialog';
import { SettingsDialog } from '../components/SettingsDialog';

// Preact signals for Index Dialog
let indexColumnNameSignal = signal('row_index');
let indexStartFromSignal = signal(1);
let indexEffectCleanup: (() => void) | null = null;

// Preact signals for Replace Dialog
let replaceColumnSignal = signal('');
let replaceFindSignal = signal('');
let replaceWithSignal = signal('');
let replaceEffectCleanup: (() => void) | null = null;

// Preact signals for Slice Rows Dialog
let sliceCountSignal = signal(10);
let sliceModeSignal = signal<SliceMode>('first');
let sliceEffectCleanup: (() => void) | null = null;

// Preact signals for Unpivot (Fold) Dialog
let foldKeyNameSignal = signal('key');
let foldValueNameSignal = signal('value');
let foldModeSignal = signal<UnpivotMode>('keep');
let foldSelectedColumnsSignal = signal<boolean[]>([]);
let foldEffectCleanup: (() => void) | null = null;

// Preact signals for Pivot Dialog
let pivotRowColumnsSignal = signal<string[]>([]);
let pivotColumnColumnSignal = signal('');
let pivotValueColumnSignal = signal('');
let pivotAggregationSignal = signal<PivotAggregation>('sum');
let pivotUniqueValueCountSignal = signal(0);
let pivotSortSignal = signal(true);
let pivotLimitSignal = signal<number | null>(null);
let pivotIsPreviewingSignal = signal(false);
let pivotEffectCleanup: (() => void) | null = null;

// Preact signals for Date Dialog
let dateColumnSignal = signal('');
let dateOperationSignal = signal<DateOperation>('extract');
let dateExtractPartsSignal = signal<string[]>(['year']);
let dateTruncateUnitsSignal = signal<string[]>(['month']);
let dateOutputColumnSignal = signal('');
let dateErrorSignal = signal<string | null>(null);
let dateEffectCleanup: (() => void) | null = null;

// Preact signals for Split Dialog
let splitColumnSignal = signal('');
let splitDelimiterSignal = signal(',');
let splitAutoDetectedDelimiterSignal = signal<string | null>(null);
let splitIsRegexSignal = signal(false);
let splitModeSignal = signal<SplitMode>('spread');
let splitMaxColumnsSignal = signal(10);
let splitKeepOriginalSignal = signal(false);
let splitErrorSignal = signal<string | null>(null);
let splitEffectCleanup: (() => void) | null = null;

// Preact signals for Aggregate Dialog
let aggGroupBySignal = signal<string[]>([]);
let aggAggregationsSignal = signal<Aggregation[]>([{ col: '', func: 'count', output: 'count' }]);
let aggIsPreviewingSignal = signal(false);
let aggEffectCleanup: (() => void) | null = null;

// Preact signals for Import CSV Dialog
let importSourceNameSignal = signal('');
let importIsJsonSignal = signal(false);
let importJsonPathSignal = signal('');
let importJsonRawValuePreviewSignal = signal('');
let importSuggestedJsonKeysSignal = signal<string[]>([]);
let importFlattenJsonSignal = signal(false);
let importSerializeNestedSignal = signal(false);
let importJsonDataSignal = signal<any>(null);
let importDelimiterSignal = signal(',');
let importHeaderModeSignal = signal<'first-row' | 'auto-generate' | 'manual'>('first-row');
let importCustomHeadersSignal = signal<string[]>([]);
let importDuplicateWarningSignal = signal('');
let importPreviewHeadersSignal = signal<string[]>([]);
let importPreviewDataRowsSignal = signal<any[][]>([]);
let importEffectCleanup: (() => void) | null = null;

// Preact signals for Column Editor Dialog
let colEditModeSignal = signal<'list' | 'text'>('list');
let colEditColumnsSignal = signal<ColumnEditorItem[]>([]);
let colEditPatternTextSignal = signal('');
let colEditPatternModeSignal = signal<'include' | 'exclude'>('include');
let colEditPatternMatchTypeSignal = signal<'prefix' | 'suffix' | 'exact'>('prefix');
let colEditDraggedIndexSignal = signal<number | null>(null);
let colEditTextSubModeSignal = signal<'rename' | 'reorder' | 'select'>('rename');
let colEditTextValueSignal = signal('');
let colEditTextErrorSignal = signal<string | null>(null);
let colEditChangesSignal = signal<ColumnEditorChanges>({
  removed: [],
  renamed: [],
  reordered: false,
  hasChanges: false,
});
let colEditEffectCleanup: (() => void) | null = null;

// Preact signals for Settings Dialog
let settingsThemeSignal = signal<'chumak' | 'blues'>('chumak');
let settingsRowLimitSignal = signal(100);
let settingsEffectCleanup: (() => void) | null = null;

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
      return {
        groupBy: this.aggregateDialogState.groupBy,
        aggregations: this.aggregateDialogState.aggregations,
      };
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
      return {
        rowColumns: this.pivotDialogState.rowColumns,
        columnColumn: this.pivotDialogState.columnColumn,
        valueColumn: this.pivotDialogState.valueColumn,
        aggregation: this.pivotDialogState.aggregation,
        options: this.pivotDialogState.options,
      };
    case 'sort':
      return {
        field: DialogStore.sortState.field.value,
        order: DialogStore.sortState.order.value,
      };
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
    // Initialize Alpine state
    this.sliceRowsDialogState = { count: 10, mode: 'first' };

    // Mount Preact component
    const container = document.getElementById('slice-rows-modal-container');
    if (container) {
      sliceCountSignal.value = this.sliceRowsDialogState.count;
      sliceModeSignal.value = this.sliceRowsDialogState.mode as SliceMode;

      sliceEffectCleanup = effect(() => {
        this.sliceRowsDialogState.count = sliceCountSignal.value;
        this.sliceRowsDialogState.mode = sliceModeSignal.value;
      });

      mountComponent(container, SliceRowsDialog, {
        count: sliceCountSignal,
        mode: sliceModeSignal,
        rowCount: this.currentData?.length || 0,
      });
    }
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

    // Mount Preact component
    const container = document.getElementById('aggregate-modal-container');
    if (container) {
      aggGroupBySignal.value = [...this.aggregateDialogState.groupBy];
      // Map Alpine aggregations to our typed objects
      aggAggregationsSignal.value = this.aggregateDialogState.aggregations.map((a) => ({ ...a }));
      aggIsPreviewingSignal.value = this.aggregateDialogState.isPreviewing;

      aggEffectCleanup = effect(() => {
        this.aggregateDialogState.groupBy = [...aggGroupBySignal.value];
        this.aggregateDialogState.aggregations = aggAggregationsSignal.value.map((a) => ({ ...a }));
        // isPreviewing is updated manually during async operation
      });

      mountComponent(container, AggregateDialog, {
        columns: this.columns,
        groupBy: aggGroupBySignal,
        aggregations: aggAggregationsSignal,
        isPreviewing: aggIsPreviewingSignal,
        onPreview: async () => {
          aggIsPreviewingSignal.value = true;
          try {
            if (typeof this.previewAggregate === 'function') {
              await this.previewAggregate();
            }
          } finally {
            aggIsPreviewingSignal.value = false;
          }
        },
      });
    }
  } else if (dialogName === 'import-csv') {
    const container = document.getElementById('import-csv-modal-container');
    if (container) {
      // Initialize signals from current Alpine state (populated by file loader)
      // Note: isJson and other optional props might be undefined in fresh state, verify types.ts
      importSourceNameSignal.value = this.importDialogState.sourceName;
      importIsJsonSignal.value = !!this.importDialogState.isJson;
      importJsonPathSignal.value = this.importDialogState.jsonPath || '';
      importJsonRawValuePreviewSignal.value = this.importDialogState.jsonRawValuePreview || '';
      importSuggestedJsonKeysSignal.value = this.importDialogState.suggestedJsonKeys || [];
      importFlattenJsonSignal.value = !!this.importDialogState.flattenJson;
      importSerializeNestedSignal.value = !!this.importDialogState.serializeNested;
      importJsonDataSignal.value = this.importDialogState.jsonData || null;

      importDelimiterSignal.value = this.importDialogState.delimiter;
      importHeaderModeSignal.value = this.importDialogState.headerMode;
      importCustomHeadersSignal.value = [...(this.importDialogState.customHeaders || [])];
      importDuplicateWarningSignal.value = this.importDialogState.duplicateWarning || '';
      importPreviewHeadersSignal.value = [...(this.importDialogState.previewHeaders || [])];
      importPreviewDataRowsSignal.value = [...(this.importDialogState.previewDataRows || [])];

      importEffectCleanup = effect(() => {
        // Sync Signals -> Alpine
        this.importDialogState.sourceName = importSourceNameSignal.value;
        this.importDialogState.isJson = importIsJsonSignal.value;
        this.importDialogState.jsonPath = importJsonPathSignal.value;
        // suggestedJsonKeys is usually output from Alpine
        this.importDialogState.flattenJson = importFlattenJsonSignal.value;
        this.importDialogState.serializeNested = importSerializeNestedSignal.value;
        // jsonData is output

        this.importDialogState.delimiter = importDelimiterSignal.value;
        this.importDialogState.headerMode = importHeaderModeSignal.value;
        this.importDialogState.customHeaders = importCustomHeadersSignal.value;
        // duplicateWarning is output
      });

      mountComponent(container, ImportCsvDialog, {
        sourceName: importSourceNameSignal,
        isJson: importIsJsonSignal,
        jsonPath: importJsonPathSignal,
        jsonRawValuePreview: importJsonRawValuePreviewSignal,
        suggestedJsonKeys: importSuggestedJsonKeysSignal,
        flattenJson: importFlattenJsonSignal,
        serializeNested: importSerializeNestedSignal,
        jsonData: importJsonDataSignal,
        delimiter: importDelimiterSignal,
        headerMode: importHeaderModeSignal,
        customHeaders: importCustomHeadersSignal,
        duplicateWarning: importDuplicateWarningSignal,
        previewHeaders: importPreviewHeadersSignal,
        previewDataRows: importPreviewDataRowsSignal,

        onJsonPathUpdate: () => {
          // Logic handled in Alpine: updateJsonPath()
          // It uses the state we synced in effect
          if (typeof this.updateJsonPath === 'function') {
            this.updateJsonPath();
            // Sync outputs
            importJsonRawValuePreviewSignal.value =
              this.importDialogState.jsonRawValuePreview || '';
            importSuggestedJsonKeysSignal.value = this.importDialogState.suggestedJsonKeys || [];
            importJsonDataSignal.value = this.importDialogState.jsonData;
            importPreviewHeadersSignal.value = this.importDialogState.previewHeaders;
            importPreviewDataRowsSignal.value = this.importDialogState.previewDataRows;
            importCustomHeadersSignal.value = this.importDialogState.customHeaders; // headers might update
          }
        },
        onJsonPathReset: () => {
          if (typeof this.resetJsonPath === 'function') {
            this.resetJsonPath();
            // Update signals reflecting reset state
            importJsonPathSignal.value = this.importDialogState.jsonPath || '';
            importJsonRawValuePreviewSignal.value = '';
            importSuggestedJsonKeysSignal.value = this.importDialogState.suggestedJsonKeys || [];
            // ... sync other potential changes
          }
        },
        onJsonPathSegmentSelect: (key: string) => {
          if (typeof this.selectJsonPathSegment === 'function') {
            this.selectJsonPathSegment(key);
            importJsonPathSignal.value = this.importDialogState.jsonPath || '';
            // Trigger update flow
            if (typeof this.updateJsonPath === 'function') {
              this.updateJsonPath();
              importJsonRawValuePreviewSignal.value =
                this.importDialogState.jsonRawValuePreview || '';
              importSuggestedJsonKeysSignal.value = this.importDialogState.suggestedJsonKeys || [];
              importJsonDataSignal.value = this.importDialogState.jsonData;
              importPreviewHeadersSignal.value = this.importDialogState.previewHeaders;
              importPreviewDataRowsSignal.value = this.importDialogState.previewDataRows;
              importCustomHeadersSignal.value = this.importDialogState.customHeaders;
            }
          }
        },
        onParamChange: () => {
          // For delimiter, headerMode, etc.
          // Triggers updateImportPreview() or updateHeadersForPreview()
          // In template: @change="updateHeadersForPreview()" for headers/options
          // @change="updateImportPreview()" for delimiter

          // Simplification: call updateImportPreview() which usually covers everything or chains them?
          // Actually template calls updateHeadersForPreview() for JSON options and header mode.
          // updateImportPreview() for delimiter.

          // Let's call both or check based on what changed?
          // Or better, just call updateImportPreview() if it refreshes data,
          // and updateHeadersForPreview() if only headers change.

          // A safe bet is calling updateImportPreview() for everything if it covers distinct cases,
          // but checking existing logic would be best.
          // Assuming updateImportPreview re-parses everything.

          if (importIsJsonSignal.value) {
            if (typeof this.updateHeadersForPreview === 'function') {
              this.updateHeadersForPreview();
            }
          } else {
            if (typeof this.updateImportPreview === 'function') {
              this.updateImportPreview();
            }
            // Headers might need updateHeadersForPreview too if mode changed
            if (typeof this.updateHeadersForPreview === 'function') {
              this.updateHeadersForPreview();
            }
          }

          // Sync outputs
          importPreviewHeadersSignal.value = this.importDialogState.previewHeaders;
          importPreviewDataRowsSignal.value = this.importDialogState.previewDataRows;
          importDuplicateWarningSignal.value = this.importDialogState.duplicateWarning || '';
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
      colEditModeSignal.value = 'list';
      colEditColumnsSignal.value = this.columnEditorState.columns.map((c) => ({ ...c }));
      colEditPatternTextSignal.value = '';
      colEditPatternModeSignal.value = 'include';
      colEditPatternMatchTypeSignal.value = 'prefix';
      colEditDraggedIndexSignal.value = null;
      colEditTextSubModeSignal.value =
        section === 'select' || section === 'reorder' ? section : 'rename';
      colEditTextValueSignal.value = '';
      colEditTextErrorSignal.value = null;
      colEditChangesSignal.value = {
        removed: [],
        renamed: [],
        reordered: false,
        hasChanges: false,
      };

      colEditEffectCleanup = effect(() => {
        this.columnEditorState.mode = colEditModeSignal.value;
        this.columnEditorState.columns = colEditColumnsSignal.value.map((c) => ({ ...c }));
        this.columnEditorState.patternText = colEditPatternTextSignal.value;
        this.columnEditorState.patternMode = colEditPatternModeSignal.value;
        this.columnEditorState.patternMatchType = colEditPatternMatchTypeSignal.value;
        this.columnEditorState.draggedIndex = colEditDraggedIndexSignal.value;
        this.columnEditorState.textSubMode = colEditTextSubModeSignal.value;
        this.columnEditorState.textValue = colEditTextValueSignal.value;
        this.columnEditorState.textError = colEditTextErrorSignal.value;

        // Calculate Changes (for preview) - Logic replicated from Alpine or synced properly?
        // Alpine had getColumnEditorChanges() method. We should probably reuse it or replicate logic.
        // It uses `this.columnEditorState` so by syncing signals TO state, we can just call it.
        // However, we want to update the SIGNAL `colEditChangesSignal` so the Preact component can see it.
        if (typeof this.getColumnEditorChanges === 'function') {
          const changes = this.getColumnEditorChanges();
          colEditChangesSignal.value = changes;
        }
      });

      mountComponent(container, ColumnEditorDialog, {
        mode: colEditModeSignal,
        columns: colEditColumnsSignal,
        patternText: colEditPatternTextSignal,
        patternMode: colEditPatternModeSignal,
        patternMatchType: colEditPatternMatchTypeSignal,
        draggedIndex: colEditDraggedIndexSignal,
        textSubMode: colEditTextSubModeSignal,
        textValue: colEditTextValueSignal,
        textError: colEditTextErrorSignal,
        changes: colEditChangesSignal,

        onApplyPattern: () => {
          if (typeof this.applyColumnEditorPattern === 'function') {
            this.applyColumnEditorPattern();
            // Sync back columns as they are modified by pattern
            colEditColumnsSignal.value = this.columnEditorState.columns.map((c) => ({ ...c }));
          }
        },
        onSwitchToText: () => {
          if (typeof this.switchColumnEditorToText === 'function') {
            this.switchColumnEditorToText();
            // Sync back textValue as it is generated from columns
            colEditTextValueSignal.value = this.columnEditorState.textValue;
          }
        },
        onValidateText: () => {
          if (typeof this.validateColumnEditorText === 'function') {
            this.validateColumnEditorText();
            // Sync back error state
            colEditTextErrorSignal.value = this.columnEditorState.textError;
            // Sync back columns if valid? No, only on Apply.
            // But changes preview uses columns for List mode. Text mode logic is different.
            // Actually validate function also updates columns? Verify Alpine logic.
            // Checking validate logic: it updates this.columnEditorState.columns if valid?
            // No, usually it just checks validity.
            // But wait, if we are in text mode, `getColumnEditorChanges` needs to know what the NEW state is.
            // Standard Alpine implementation of `getColumnEditorChanges` looks at `mode`.
            // If text, it parses textValue.
            // If list, it looks at `columns` array.

            // If validateColumnEditorText() ran, it might update some internal state or we rely on getColumnEditorChanges().
          }
        },
      });
    }
  } else if (dialogName === 'settings') {
    const container = document.getElementById('settings-modal-container');
    if (container) {
      settingsThemeSignal.value = this.theme;
      settingsRowLimitSignal.value = this.uxSettings.preview?.rowLimit || 100;

      settingsEffectCleanup = effect(() => {
        // In this case, we don't necessarily want two-way binding loop.
        // But if `this.theme` changes from elsewhere, signal should update?
        // Not critical as settings modal is ephemeral.
      });

      mountComponent(container, SettingsDialog, {
        theme: settingsThemeSignal,
        rowLimit: settingsRowLimitSignal,
        onThemeChange: (theme) => {
          settingsThemeSignal.value = theme;
          if (typeof this.switchTheme === 'function') {
            this.switchTheme(theme);
          }
        },
        onRowLimitChange: (limit) => {
          settingsRowLimitSignal.value = limit;
          if (typeof this.updatePreviewRowLimit === 'function') {
            // updatePreviewRowLimit expects string in template, but accepts string and parses int.
            // The signature in chumak-app.ts is (value: string).
            // But let's check if we can pass string or if we should convert.
            // Method implementation: const limit = Math.max(..., parseInt(value, 10)...)
            // So we should pass string.
            this.updatePreviewRowLimit(String(limit));
          }
        },
      });
    }
  } else if (dialogName === 'fold') {
    // Initialize Alpine state
    this.foldDialogState = {
      keyName: 'key',
      valueName: 'value',
      selectedColumns: this.columns.map(() => false),
      mode: 'keep',
    };

    // Mount Preact component
    // Note: handler says 'fold', but container ID is 'unpivot-modal-container'
    const container = document.getElementById('unpivot-modal-container');
    if (container) {
      foldKeyNameSignal.value = this.foldDialogState.keyName;
      foldValueNameSignal.value = this.foldDialogState.valueName;
      foldModeSignal.value = this.foldDialogState.mode as UnpivotMode;
      foldSelectedColumnsSignal.value = [...this.foldDialogState.selectedColumns];

      foldEffectCleanup = effect(() => {
        this.foldDialogState.keyName = foldKeyNameSignal.value;
        this.foldDialogState.valueName = foldValueNameSignal.value;
        this.foldDialogState.mode = foldModeSignal.value;
        // Deep compare/copy to trigger reactivity if changed
        // For array, we just assign a new reference
        this.foldDialogState.selectedColumns = [...foldSelectedColumnsSignal.value];

        // Also trigger the preview update which exists in Alpine
        // this.updateFoldPreview();
        // Since we can't easily call local methods from here if they rely on `this` context
        // in a specific way, we rely on the fact that `this.foldDialogState` assignment
        // might trigger watchers if Alpine is watching deep.
        // However, the template logic used @click="updateFoldPreview()".
        // The effect runs primarily on signal change.
        // Let's explicitly call the update method if it exists on the app instance
        if (typeof this.updateFoldPreview === 'function') {
          this.updateFoldPreview();
        }
      });

      mountComponent(container, UnpivotDialog, {
        columns: this.columns,
        keyName: foldKeyNameSignal,
        valueName: foldValueNameSignal,
        mode: foldModeSignal,
        selectedColumns: foldSelectedColumnsSignal,
      });
    }
  } else if (dialogName === 'pivot') {
    this.initializePivotDialog();

    // Mount Preact component
    const container = document.getElementById('pivot-modal-container');
    if (container) {
      // Initialize signals from Alpine state which was just initialized
      pivotRowColumnsSignal.value = [...this.pivotDialogState.rowColumns];
      pivotColumnColumnSignal.value = this.pivotDialogState.columnColumn;
      pivotValueColumnSignal.value = this.pivotDialogState.valueColumn;
      pivotAggregationSignal.value = this.pivotDialogState.aggregation as PivotAggregation;
      pivotUniqueValueCountSignal.value = this.pivotDialogState.uniqueValueCount;
      pivotSortSignal.value = this.pivotDialogState.options.sort;
      pivotLimitSignal.value = this.pivotDialogState.options.limit;
      pivotIsPreviewingSignal.value = this.pivotDialogState.isPreviewing;

      pivotEffectCleanup = effect(() => {
        // Sync Signals -> Alpine
        this.pivotDialogState.rowColumns = [...pivotRowColumnsSignal.value];
        this.pivotDialogState.columnColumn = pivotColumnColumnSignal.value;
        this.pivotDialogState.valueColumn = pivotValueColumnSignal.value;
        this.pivotDialogState.aggregation = pivotAggregationSignal.value;
        this.pivotDialogState.options.sort = pivotSortSignal.value;
        this.pivotDialogState.options.limit = pivotLimitSignal.value;
        // isPreviewing and uniqueValueCount are read-only (controlled by Alpine logic) or local

        // Trigger calculation in Alpine
        if (typeof this.onPivotConfigChange === 'function') {
          // We might want to avoid triggering if nothing meaningful changed, but simple is better
          // This function calculates unique values and updates uniqueValueCount
          Promise.resolve(this.onPivotConfigChange()).then(() => {
            // Read back calculated values
            // Use peek() to avoid cycles if we were writing to signals that this effect reads,
            // but here we write to signals that this effect does NOT read (unique count)
            // actually this effect reads everything.
            // But since we are inside an effect, updating a signal will queue another run.
            // We only want to update if changed.
            if (pivotUniqueValueCountSignal.peek() !== this.pivotDialogState.uniqueValueCount) {
              pivotUniqueValueCountSignal.value = this.pivotDialogState.uniqueValueCount;
            }
          });
        }
      });

      // Also need to sync isPreviewing which might change during preview execution
      // Since isPreviewing is updated by previewPivot() which is async,
      // and effect() is synchronous reaction to signals, we might miss updates unless we poll or hook.
      // However, the button in Preact triggers previewPivot.
      // We can wrap the call.

      mountComponent(container, PivotDialog, {
        columns: this.columns,
        rowColumns: pivotRowColumnsSignal,
        columnColumn: pivotColumnColumnSignal,
        valueColumn: pivotValueColumnSignal,
        aggregation: pivotAggregationSignal,
        uniqueValueCount: pivotUniqueValueCountSignal,
        sort: pivotSortSignal,
        limit: pivotLimitSignal,
        isPreviewing: pivotIsPreviewingSignal,
        onPreview: async () => {
          pivotIsPreviewingSignal.value = true;
          try {
            if (typeof this.previewPivot === 'function') {
              await this.previewPivot();
            }
          } finally {
            pivotIsPreviewingSignal.value = false;
          }
        },
      });
    }
  } else if (dialogName === 'replace') {
    // Initialize Alpine state
    this.replaceDialogState = { column: this.columns[0] || '', findValue: '', replaceValue: '' };

    // Mount Preact component
    const container = document.getElementById('replace-modal-container');
    if (container) {
      replaceColumnSignal.value = this.replaceDialogState.column;
      replaceFindSignal.value = this.replaceDialogState.findValue;
      replaceWithSignal.value = this.replaceDialogState.replaceValue;

      replaceEffectCleanup = effect(() => {
        this.replaceDialogState.column = replaceColumnSignal.value;
        this.replaceDialogState.findValue = replaceFindSignal.value;
        this.replaceDialogState.replaceValue = replaceWithSignal.value;
      });

      mountComponent(container, ReplaceDialog, {
        columns: this.columns,
        column: replaceColumnSignal,
        findValue: replaceFindSignal,
        replaceValue: replaceWithSignal,
      });
    }
  } else if (dialogName === 'split') {
    const initialColumn = this.columns[0] || '';

    this.splitDialogState = {
      column: initialColumn,
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

    // Mount Preact component
    const container = document.getElementById('split-modal-container');
    if (container) {
      splitColumnSignal.value = initialColumn;
      splitDelimiterSignal.value = ',';
      splitAutoDetectedDelimiterSignal.value = null;
      splitIsRegexSignal.value = false;
      splitModeSignal.value = 'spread';
      splitMaxColumnsSignal.value = 10;
      splitKeepOriginalSignal.value = false;
      splitErrorSignal.value = null;

      // Initial detection
      if (initialColumn) {
        const detected = this.detectDelimiter(initialColumn);
        if (detected) {
          splitDelimiterSignal.value = detected.char;
          splitIsRegexSignal.value = detected.isRegex;
          splitAutoDetectedDelimiterSignal.value = detected.name;
        }
      }

      let lastSplitCol = initialColumn;

      splitEffectCleanup = effect(() => {
        // Detect logic if column changed
        if (splitColumnSignal.value !== lastSplitCol) {
          lastSplitCol = splitColumnSignal.value;
          const detected = this.detectDelimiter(lastSplitCol);
          if (detected) {
            splitDelimiterSignal.value = detected.char;
            splitIsRegexSignal.value = detected.isRegex;
            splitAutoDetectedDelimiterSignal.value = detected.name;
          } else {
            splitAutoDetectedDelimiterSignal.value = null;
          }
        }

        // Sync Signals -> Alpine
        this.splitDialogState.column = splitColumnSignal.value;
        this.splitDialogState.delimiter = splitDelimiterSignal.value;
        this.splitDialogState.isRegex = splitIsRegexSignal.value;
        this.splitDialogState.mode = splitModeSignal.value;
        this.splitDialogState.maxColumns = splitMaxColumnsSignal.value;
        this.splitDialogState.keepOriginal = splitKeepOriginalSignal.value;
        this.splitDialogState.autoDetectedDelimiter = splitAutoDetectedDelimiterSignal.value;

        // Trigger preview
        if (typeof this.debouncedUpdateSplitPreview === 'function') {
          this.debouncedUpdateSplitPreview();
        }

        if (splitErrorSignal.peek() !== this.splitDialogState.error) {
          splitErrorSignal.value = this.splitDialogState.error;
        }
      });

      mountComponent(container, SplitDialog, {
        columns: this.columns,
        column: splitColumnSignal,
        delimiter: splitDelimiterSignal,
        autoDetectedDelimiter: splitAutoDetectedDelimiterSignal,
        isRegex: splitIsRegexSignal,
        mode: splitModeSignal,
        maxColumns: splitMaxColumnsSignal,
        keepOriginal: splitKeepOriginalSignal,
        error: splitErrorSignal,
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
    const dateColumns = this.getDateColumns ? this.getDateColumns() : [];
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

    // Mount Preact component
    const container = document.getElementById('date-modal-container');
    if (container) {
      dateColumnSignal.value = initialColumn;
      dateOperationSignal.value = 'extract';
      dateExtractPartsSignal.value = ['year'];
      dateTruncateUnitsSignal.value = ['month'];
      dateOutputColumnSignal.value = '';
      dateErrorSignal.value = null;

      dateEffectCleanup = effect(() => {
        this.dateDialogState.column = dateColumnSignal.value;
        this.dateDialogState.operation = dateOperationSignal.value;
        this.dateDialogState.extractParts = [...dateExtractPartsSignal.value];
        this.dateDialogState.truncateUnits = [...dateTruncateUnitsSignal.value];
        this.dateDialogState.outputColumn = dateOutputColumnSignal.value;

        if (typeof this.updateDatePreview === 'function') {
          this.updateDatePreview();
        }

        if (dateErrorSignal.peek() !== this.dateDialogState.error) {
          dateErrorSignal.value = this.dateDialogState.error;
        }
      });

      mountComponent(container, DateDialog, {
        dateColumns: dateColumns,
        column: dateColumnSignal,
        operation: dateOperationSignal,
        extractParts: dateExtractPartsSignal,
        truncateUnits: dateTruncateUnitsSignal,
        outputColumn: dateOutputColumnSignal,
        error: dateErrorSignal,
      });
    }
  } else if (dialogName === 'dedupe') {
    this.dedupeDialogState = {
      selectedColumns: this.columns.map(() => true),
      useAllColumns: true,
      duplicateCount: 0,
      mode: 'remove',
    };
    this.$nextTick(() => this.updateDedupePreview());
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
    // No effect cleanup needed as we use global store signals
  }

  if (this.activeDialog === 'index') {
    const container = document.getElementById('index-modal-container');
    if (container) unmountComponent(container);
    indexEffectCleanup?.();
    indexEffectCleanup = null;
  }

  if (this.activeDialog === 'replace') {
    const container = document.getElementById('replace-modal-container');
    if (container) unmountComponent(container);
    replaceEffectCleanup?.();
    replaceEffectCleanup = null;
  }

  if (this.activeDialog === 'sliceRows') {
    const container = document.getElementById('slice-rows-modal-container');
    if (container) unmountComponent(container);
    sliceEffectCleanup?.();
    sliceEffectCleanup = null;
  }

  if (this.activeDialog === 'fold') {
    const container = document.getElementById('unpivot-modal-container');
    if (container) unmountComponent(container);
    foldEffectCleanup?.();
    foldEffectCleanup = null;
  }

  if (this.activeDialog === 'filter') {
    const container = document.getElementById('filter-modal-container');
    if (container) unmountComponent(container);
    // Cleanup not required for store signals
  }

  if (this.activeDialog === 'pivot') {
    const container = document.getElementById('pivot-modal-container');
    if (container) unmountComponent(container);
    pivotEffectCleanup?.();
    pivotEffectCleanup = null;
  }

  if (this.activeDialog === 'aggregate') {
    const container = document.getElementById('aggregate-modal-container');
    if (container) unmountComponent(container);
    aggEffectCleanup?.();
    aggEffectCleanup = null;
  }

  if (this.activeDialog === 'import-csv') {
    const container = document.getElementById('import-csv-modal-container');
    if (container) unmountComponent(container);
    importEffectCleanup?.();
    importEffectCleanup = null;
  }

  if (this.activeDialog === 'column-editor') {
    const container = document.getElementById('column-editor-modal-container');
    if (container) unmountComponent(container);
    colEditEffectCleanup?.();
    colEditEffectCleanup = null;
  }

  if (this.activeDialog === 'settings') {
    const container = document.getElementById('settings-modal-container');
    if (container) unmountComponent(container);
    settingsEffectCleanup?.();
    settingsEffectCleanup = null;
  }

  if (this.activeDialog === 'date') {
    const container = document.getElementById('date-modal-container');
    if (container) unmountComponent(container);
    dateEffectCleanup?.();
    dateEffectCleanup = null;
  }

  if (this.activeDialog === 'split') {
    const container = document.getElementById('split-modal-container');
    if (container) unmountComponent(container);
    splitEffectCleanup?.();
    splitEffectCleanup = null;
  }

  if (this.activeDialog === 'derive') {
    const container = document.getElementById('derive-modal-container');
    if (container) unmountComponent(container);
    // Cleanup not required for store signals
  }

  if (this.activeDialog === 'join') {
    const container = document.getElementById('join-modal-container');
    if (container) unmountComponent(container);
    // Cleanup not required for store signals
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
