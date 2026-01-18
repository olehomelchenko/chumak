import { signal } from '@preact/signals';
import { FilterPreviewMode } from '../components/FilterDialog';
import { JoinType, JoinTarget } from '../components/JoinDialog';
import { PivotAggregation } from '../components/PivotDialog';
import {
  AggregateDialogState,
  PivotDialogState,
  SplitDialogState,
  DateDialogState,
  DataRow,
} from '../types';

/**
 * DialogStore
 *
 * Centralized state management for all dialogs in the application.
 */
export class DialogStore {
  // Sort Dialog State
  static sortState = {
    field: signal(''),
    order: signal<'asc' | 'desc'>('asc'),
  };

  // Join Dialog State
  static joinState = {
    rightModel: signal<string | null>(null),
    joinType: signal<JoinType>('left'),
    keyPairs: signal<(string | null)[][]>([[null, null]]),
    suffixes: signal<string[]>(['_x', '_y']),
    targets: signal<JoinTarget[]>([]),
    rightColumns: signal<string[]>([]),
    previewData: signal<any | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
  };

  // Filter Dialog State
  static filterState = {
    expression: signal(''),
    error: signal<string | null>(null),
    previewMode: signal<FilterPreviewMode>('all'),
  };

  // Derive Dialog State
  static deriveState = {
    columnName: signal(''),
    expression: signal(''),
    error: signal<string | null>(null),
  };

  // Aggregate Dialog State
  static aggregateState = {
    groupBy: signal<string[]>([]),
    aggregations: signal<AggregateDialogState['aggregations']>([]),
    previewData: signal<DataRow[] | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
  };

  // Pivot Dialog State
  static pivotState = {
    rowColumns: signal<string[]>([]),
    columnColumn: signal(''),
    valueColumn: signal(''),
    aggregation: signal<PivotAggregation>('sum'),
    options: signal<PivotDialogState['options']>({ sort: true, limit: null }),
    uniqueValueCount: signal(0),
    previewData: signal<DataRow[] | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
  };

  // Split Dialog State
  static splitState = {
    column: signal(''),
    delimiter: signal(','),
    isRegex: signal(false),
    mode: signal<SplitDialogState['mode']>('spread'),
    maxColumns: signal(10),
    keepOriginal: signal(false),
    error: signal<string | null>(null),
    previewData: signal<DataRow[]>([]),
    previewColumns: signal<string[]>([]),
    autoDetectedDelimiter: signal<string | null>(null),
    columnRenames: signal<Record<string, string>>({}),
  };

  // Regexp Match Dialog State
  static regexpMatchState = {
    sourceColumn: signal(''),
    pattern: signal(''),
    columnName: signal(''),
    error: signal<string | null>(null),
  };

  // Regexp Extract Dialog State
  static regexpExtractState = {
    sourceColumn: signal(''),
    pattern: signal(''),
    columnName: signal(''),
    group: signal(0),
    error: signal<string | null>(null),
  };

  // Date Dialog State
  static dateState = {
    column: signal(''),
    operation: signal<DateDialogState['operation']>('extract'),
    extractParts: signal<string[]>([]),
    truncateUnits: signal<string[]>([]),
    outputColumn: signal(''),
    removeOrigin: signal(false),
    error: signal<string | null>(null),
    previewData: signal<DateDialogState['previewData']>([]),
  };

  // Dedupe Dialog State
  static dedupeState = {
    selectedColumns: signal<boolean[]>([]),
    useAllColumns: signal(true),
    duplicateCount: signal(0),
    mode: signal<'remove' | 'keep'>('remove'),
  };

  // Column Editor State
  static columnEditorState = {
    mode: signal<'list' | 'text'>('list'),
    textSubMode: signal<'rename' | 'reorder' | 'select'>('rename'),
    columns: signal<Array<{ original: string; renamed: string; selected: boolean }>>([]),
    textValue: signal(''),
    textError: signal<string | null>(null),
    patternText: signal(''),
    patternMode: signal<'include' | 'exclude'>('include'),
    patternMatchType: signal<'prefix' | 'suffix' | 'exact'>('prefix'),
    draggedIndex: signal<number | null>(null),
  };

  // Simple dialog states (sliceRows, index, replace, fold)
  static sliceRowsState = {
    count: signal(10),
    mode: signal<'first' | 'last' | 'removeFirst' | 'removeLast'>('first'),
  };

  static indexState = {
    columnName: signal('row_index'),
    startFrom: signal(1),
  };

  static replaceState = {
    column: signal(''),
    findValue: signal(''),
    replaceValue: signal(''),
  };

  static foldState = {
    keyName: signal('key'),
    valueName: signal('value'),
    selectedColumns: signal<boolean[]>([]),
    mode: signal<'keep' | 'fold'>('keep'),
  };

  // Unified preview panel state
  static previewState = {
    title: signal(''),
    stats: signal(''),
    columns: signal<string[]>([]),
    newColumns: signal<string[]>([]),
    rows: signal<DataRow[]>([]),
    isLoading: signal(false),
  };

  // Type Conversion Dialog State
  static typeConversionState = {
    column: signal<string | null>(null),
    targetType: signal<string | null>(null),
  };

  // Import CSV Dialog State
  static importCsvState = {
    fileName: signal(''),
    sourceName: signal(''),
    isJson: signal(false),
    jsonPath: signal(''),
    jsonRawValuePreview: signal(''),
    suggestedJsonKeys: signal<string[]>([]),
    flattenJson: signal(false),
    serializeNested: signal(false),
    jsonData: signal<any>(null),
    fullJsonData: signal<any>(null),
    delimiter: signal(','),
    headerMode: signal<'first-row' | 'auto-generate' | 'manual'>('first-row'),
    originalHeaders: signal<string[]>([]),
    customHeaders: signal<string[]>([]),
    duplicateWarning: signal(''),
    rawPreviewData: signal<any[][]>([]),
    previewHeaders: signal<string[]>([]),
    previewDataRows: signal<any[][]>([]),
  };

  // Import URL Dialog State
  static importUrlState = {
    url: signal(''),
    isFetching: signal(false),
    error: signal<string | null>(null),
  };

  // Settings Dialog State
  static settingsState = {
    theme: signal<'chumak' | 'blues'>('chumak'),
    rowLimit: signal(100),
  };

  // Impute Dialog State
  static imputeState = {
    column: signal(''),
    strategy: signal<
      | 'constant'
      | 'mean'
      | 'median'
      | 'min'
      | 'max'
      | 'forwardFill'
      | 'backwardFill'
      | 'linearInterpolation'
    >('constant'),
    value: signal(''),
    includeEmptyString: signal(false),
    previewRows: signal<any[] | null>(null),
    error: signal<string | null>(null),
  };

  // Select Pattern Dialog State
  static selectPatternState = {
    pattern: signal(''),
    matchType: signal<'prefix' | 'suffix' | 'contains' | 'regex'>('prefix'),
    include: signal<string[]>([]),
    error: signal<string | null>(null),
  };

  // Remove Pattern Dialog State
  static removePatternState = {
    pattern: signal(''),
    matchType: signal<'prefix' | 'suffix' | 'contains' | 'regex'>('prefix'),
    error: signal<string | null>(null),
  };

  // Conditional Dialog State
  static conditionalState = {
    column: signal(''),
    conditions: signal<Array<{ when: string; then: string }>>([{ when: '', then: '' }]),
    else: signal(''),
    error: signal<string | null>(null),
  };

  // Rename Pattern Dialog State
  static renamePatternState = {
    find: signal(''),
    replace: signal(''),
    regex: signal(false),
    error: signal<string | null>(null),
  };

  /**
   * Creates a reactive proxy for a signal-based state object.
   * Allows direct property access and assignment to be transparently
   * mapped to Preact signals (e.g., `state.foo` instead of `state.foo.value`).
   */
  static createSignalProxy<T extends object>(state: T): any {
    return new Proxy(
      {},
      {
        get(_, prop) {
          const s = (state as any)[prop];
          return s && typeof s === 'object' && 'value' in s ? s.value : s;
        },
        set(_, prop, value) {
          const s = (state as any)[prop];
          if (s && typeof s === 'object' && 'value' in s) {
            s.value = value;
            return true;
          }
          return false;
        },
      }
    );
  }

  /**
   * Resets all dialog states to their initial values.
   */
  static resetAll() {
    this.filterState.expression.value = '';
    this.filterState.previewMode.value = 'all';

    this.deriveState.columnName.value = '';
    this.deriveState.expression.value = '';

    this.sortState.field.value = '';
    this.sortState.order.value = 'asc';

    this.sliceRowsState.count.value = 10;
    this.sliceRowsState.mode.value = 'first';

    this.indexState.columnName.value = 'index';
    this.indexState.startFrom.value = 1;

    this.foldState.keyName.value = 'key';
    this.foldState.valueName.value = 'value';
    this.foldState.selectedColumns.value = [];
    this.foldState.mode.value = 'keep';

    this.pivotState.rowColumns.value = [];
    this.pivotState.columnColumn.value = '';
    this.pivotState.valueColumn.value = '';
    this.pivotState.aggregation.value = 'sum';
    this.pivotState.options.value = { sort: true, limit: null };
    this.pivotState.uniqueValueCount.value = 0;
    this.pivotState.isPreviewing.value = false;

    this.aggregateState.groupBy.value = [];
    this.aggregateState.aggregations.value = [];
    this.aggregateState.isPreviewing.value = false;

    this.replaceState.column.value = '';
    this.replaceState.findValue.value = '';
    this.replaceState.replaceValue.value = '';

    this.splitState.column.value = '';
    this.splitState.delimiter.value = ',';
    this.splitState.isRegex.value = false;
    this.splitState.mode.value = 'spread';
    this.splitState.maxColumns.value = 10;
    this.splitState.keepOriginal.value = false;

    this.regexpMatchState.columnName.value = '';
    this.regexpMatchState.sourceColumn.value = '';
    this.regexpMatchState.pattern.value = '';

    this.regexpExtractState.columnName.value = '';
    this.regexpExtractState.sourceColumn.value = '';
    this.regexpExtractState.pattern.value = '';
    this.regexpExtractState.group.value = 0;

    this.dateState.column.value = '';
    this.dateState.operation.value = 'extract';
    this.dateState.extractParts.value = ['year'];
    this.dateState.truncateUnits.value = ['month'];
    this.dateState.outputColumn.value = '';

    this.dedupeState.selectedColumns.value = [];
    this.dedupeState.useAllColumns.value = true;
    this.dedupeState.duplicateCount.value = 0;
    this.dedupeState.mode.value = 'remove';

    this.columnEditorState.mode.value = 'list';
    this.columnEditorState.columns.value = [];
    this.columnEditorState.textValue.value = '';

    this.importCsvState.fileName.value = '';
    this.importCsvState.sourceName.value = '';
    this.importCsvState.jsonData.value = null;

    this.importUrlState.url.value = '';
    this.importUrlState.isFetching.value = false;
    this.importUrlState.error.value = null;

    this.settingsState.theme.value = 'chumak';
    this.settingsState.rowLimit.value = 100;

    this.imputeState.column.value = '';
    this.imputeState.strategy.value = 'constant';
    this.imputeState.value.value = '';
    this.imputeState.includeEmptyString.value = false;
    this.imputeState.previewRows.value = null;
    this.imputeState.error.value = null;

    this.selectPatternState.pattern.value = '';
    this.selectPatternState.matchType.value = 'prefix';
    this.selectPatternState.include.value = [];
    this.selectPatternState.error.value = null;

    this.removePatternState.pattern.value = '';
    this.removePatternState.matchType.value = 'prefix';
    this.removePatternState.error.value = null;

    this.conditionalState.column.value = '';
    this.conditionalState.conditions.value = [{ when: '', then: '' }];
    this.conditionalState.else.value = '';
    this.conditionalState.error.value = null;

    this.renamePatternState.find.value = '';
    this.renamePatternState.replace.value = '';
    this.renamePatternState.regex.value = false;
    this.renamePatternState.error.value = null;
  }
}
