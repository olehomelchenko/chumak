import { signal } from '@preact/signals';
import { FilterPreviewMode } from '../components/FilterDialog';
import { JoinType, JoinTarget } from '../components/JoinDialog';
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
 * Replaces the fragmented state logic previously found in dialog-handlers.ts and Alpine models.
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
    aggregation: signal('sum'),
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
    extractParts: signal<string[]>(['year']),
    truncateUnits: signal<string[]>(['month']),
    outputColumn: signal(''),
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
  };

  // Import CSV Dialog State
  static importCsvState = {
    sourceName: signal(''),
    isJson: signal(false),
    jsonPath: signal(''),
    jsonRawValuePreview: signal(''),
    suggestedJsonKeys: signal<string[]>([]),
    flattenJson: signal(false),
    serializeNested: signal(false),
    jsonData: signal<any>(null),
    delimiter: signal(','),
    headerMode: signal<'first-row' | 'auto-generate' | 'manual'>('first-row'),
    customHeaders: signal<string[]>([]),
    duplicateWarning: signal(''),
    previewHeaders: signal<string[]>([]),
    previewDataRows: signal<any[][]>([]),
  };

  // Settings Dialog State
  static settingsState = {
    theme: signal<'chumak' | 'blues'>('chumak'),
    rowLimit: signal(100),
  };
}
