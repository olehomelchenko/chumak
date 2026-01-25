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
    leftModel: signal<string | null>(null), // ID of left source/model
    rightModel: signal<string | null>(null),
    joinType: signal<JoinType>('left'),
    keyPairs: signal<(string | null)[][]>([[null, null]]),
    suffixes: signal<string[]>(['_x', '_y']),
    targets: signal<JoinTarget[]>([]),
    leftColumns: signal<string[]>([]),
    rightColumns: signal<string[]>([]),
    selectedLeftColumns: signal<string[]>([]), // Columns to include from left
    selectedRightColumns: signal<string[]>([]), // Columns to include from right
    saveAsNewModel: signal(false),
    previewData: signal<any | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
    keyPairAnalysis: signal<
      Array<{
        leftCol: string | null;
        rightCol: string | null;
        leftUnique: number;
        rightUnique: number;
        leftHasDuplicates: boolean;
        rightHasDuplicates: boolean;
        leftOnly: number; // Values in left not in right
        rightOnly: number; // Values in right not in left
        matches: number; // Values that match
        leftTotalRows: number;
        rightTotalRows: number;
        leftNonNullRows: number;
        rightNonNullRows: number;
        leftMatchPercent: number; // Percentage of left rows that match
        rightMatchPercent: number; // Percentage of right rows that match
        leftOnlyPercent: number; // Percentage of left rows that don't match
        rightOnlyPercent: number; // Percentage of right rows that don't match
        leftOnlyValues: any[]; // Actual values in left not in right
        rightOnlyValues: any[]; // Actual values in right not in left
      }>
    >([]),
    previewTableId: signal<string | null>(null), // ID of table to preview in modal
    previewMismatchValues: signal<{
      values: any[];
      column: string;
      side: 'left' | 'right';
    } | null>(null), // Values to preview in mismatch modal
  };

  // Concat Dialog State
  static concatState = {
    targets: signal<JoinTarget[]>([]),
    targetModel: signal<string | null>(null),
    previewData: signal<any | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
  };

  // Union Dialog State
  static unionState = {
    targets: signal<JoinTarget[]>([]),
    targetModel: signal<string | null>(null),
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

  // Merge Dialog State
  static mergeState = {
    columns: signal<string[]>([]),
    separator: signal(' '),
    columnName: signal(''),
    removeOriginal: signal(false),
    error: signal<string | null>(null),
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

  // Text Dialog State
  static textState = {
    column: signal(''),
    operations: signal<string[]>([]),
    removeOrigin: signal(false),
    error: signal<string | null>(null),
    previewData: signal<Array<{ input: string; output: any }>>([]),
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
    mode: signal<'list' | 'text' | 'pattern'>('list'),
    textSubMode: signal<'rename' | 'reorder' | 'select'>('rename'),
    columns: signal<Array<{ original: string; renamed: string; selected: boolean }>>([]),
    textValue: signal(''),
    textError: signal<string | null>(null),
    patternText: signal(''),
    patternMode: signal<'include' | 'exclude'>('include'),
    patternMatchType: signal<'prefix' | 'suffix' | 'exact' | 'contains' | 'regex'>('prefix'),
    draggedIndex: signal<number | null>(null),
    // Pattern operation mode for unified pattern operations
    patternOperationMode: signal<'select' | 'remove' | 'rename'>('select'),
    // Pattern fields for rename operation
    patternFind: signal(''),
    patternReplace: signal(''),
    patternRegex: signal(false),
    patternError: signal<string | null>(null),
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
    isRegex: signal(false),
  };

  static sampleState = {
    count: signal(100),
    seed: signal<number | undefined>(undefined),
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
    theme: signal<'syto' | 'blues'>('syto'),
    rowLimit: signal(100),
    analyticsOptOut: signal(false),
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

  // Generate Data Dialog State
  static generateState = {
    sourceName: signal('generated_data'),
    rowCount: signal(100),
    generators: signal<
      Array<{
        id: string;
        name: string;
        type: string;
        config: any;
      }>
    >([
      {
        id: 'gen_1',
        name: 'id',
        type: 'integerSequence',
        config: { type: 'integerSequence', start: 1, step: 1 },
      },
    ]),
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
    this.replaceState.isRegex.value = false;

    this.sampleState.count.value = 100;
    this.sampleState.seed.value = undefined;

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

    this.textState.column.value = '';
    this.textState.operations.value = [];
    this.textState.removeOrigin.value = false;
    this.textState.error.value = null;
    this.textState.previewData.value = [];

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

    this.settingsState.theme.value = 'syto';
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

    this.generateState.sourceName.value = 'generated_data';
    this.generateState.rowCount.value = 100;
    this.generateState.generators.value = [
      {
        id: 'gen_1',
        name: 'id',
        type: 'integerSequence',
        config: { type: 'integerSequence', start: 1, step: 1 },
      },
    ];
    this.generateState.error.value = null;

    // Join Dialog State
    this.joinState.leftModel.value = null;
    this.joinState.rightModel.value = null;
    this.joinState.joinType.value = 'left';
    this.joinState.keyPairs.value = [[null, null]];
    this.joinState.suffixes.value = ['_x', '_y'];
    this.joinState.targets.value = [];
    this.joinState.leftColumns.value = [];
    this.joinState.rightColumns.value = [];
    this.joinState.selectedLeftColumns.value = [];
    this.joinState.selectedRightColumns.value = [];
    this.joinState.saveAsNewModel.value = false;
    this.joinState.previewData.value = null;
    this.joinState.previewError.value = null;
    this.joinState.isPreviewing.value = false;
    this.joinState.keyPairAnalysis.value = [];
    this.joinState.previewTableId.value = null;
    this.joinState.previewMismatchValues.value = null;
  }
}
