import { TransformStep, ColumnSchema } from '../core/schema-engine';
import { EDAStats } from '../core/eda-engine';

export type DataRow = Record<string, any>;

export interface Source {
  id: string;
  name: string;
  fileName?: string;
  columns: ColumnSchema[];
  data: DataRow[];
  headerMode: 'first-row' | 'auto-generate' | 'manual';
  delimiter: string;
  customHeaders: string[] | null;
  origin: string;
  schema?: ColumnSchema[];
  rawSize?: number;
  rowCount?: number;
  createdAt?: string;
}

export interface Model {
  id: string;
  name: string;
  sourceId: string;
  steps: TransformStep[];
  schema: ColumnSchema[];
  data: DataRow[];
  stats?: EDAStats | null;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  stepInfo: string | null;
  visible: boolean;
}

export interface AggregateDialogState {
  groupBy: string[];
  aggregations: Array<{
    col: string;
    func: string;
    output: string;
  }>;
  previewData: DataRow[] | null;
  previewError: string | null;
  isPreviewing: boolean;
}

export interface JoinDialogState {
  rightModel: string | null;
  availableTargets: Array<{
    id: string;
    name: string;
    type: string;
    sourceName: string;
  }>;
  joinType: 'inner' | 'left' | 'right' | 'full' | 'cross';
  keyPairs: Array<[string | null, string | null]>;
  leftColumns: string[];
  rightColumns: string[];
  suffixes: [string, string];
  isPreviewing: boolean;
  previewError: string | null;
  previewData: {
    rows: DataRow[];
    totalRows: number;
    columns: string[];
  } | null;
}

export interface PivotDialogState {
  rowColumns: string[];
  columnColumn: string;
  valueColumn: string;
  aggregation: string;
  options: {
    sort: boolean;
    limit: number | null;
  };
  uniqueValueCount: number;
  previewData: DataRow[] | null;
  previewError: string | null;
  isPreviewing: boolean;
}

export interface SplitDialogState {
  column: string;
  delimiter: string;
  isRegex: boolean;
  mode: 'left' | 'right' | 'firstN' | 'lastN' | 'spread';
  maxColumns: number;
  keepOriginal: boolean;
  error: string | null;
  previewData: DataRow[];
  previewColumns: string[];
  autoDetectedDelimiter: string | null;
  columnRenames: Record<string, string>;
  _previewDebounceTimer?: any;
}

export interface RegexpMatchDialogState {
  sourceColumn: string;
  pattern: string;
  columnName: string;
  error: string | null;
}

export interface RegexpExtractDialogState {
  sourceColumn: string;
  pattern: string;
  columnName: string;
  group: number;
  error: string | null;
}

export interface DateDialogState {
  column: string;
  operation: 'extract' | 'truncate';
  extractParts: string[];
  truncateUnits: string[];
  outputColumn: string;
  error: string | null;
  previewData: Array<{ input: string; output: any }>;
}

export interface AppState {
  // UI state
  ribbonTab: string;
  activeTab: string;
  activeStep: TransformStep | null;
  activeStepIndex: number | null;
  viewingIntermediate: boolean;
  editingStepIndex: number | null;
  activeDialog: string | null;
  dialogSnapshot: string | null;
  isDragging: boolean;
  selectedColumn: string | null;
  columnToolbarPos: { x: number; y: number; arrowOffset?: number };
  selectedCell: {
    col: string;
    value: any;
    type: string;
    rowIdx?: number;
    isEda?: boolean;
    edaLabel?: string;
  } | null;
  cellToolbarPos: { x: number; y: number; arrowOffset?: number };
  edaStats: EDAStats | null;
  edaChartView: 'boxplot' | 'histogram';
  edaBrushSelection: { min: number; max: number } | null;
  edaDateTreatment: 'temporal' | 'categorical';
  theme: 'chumak' | 'blues';

  // Transformation status
  isTransforming: boolean;
  transformMessage: string;

  // Type Menu State
  typeMenuOpen: boolean;
  typeMenuPos: { x: number; y: number };
  typeMenuCol: string | null;

  // Pagination state
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // Import dialog state
  importDialogState: {
    fileName: string;
    sourceName: string;
    rawPreviewData: any[][];
    previewHeaders: string[];
    previewDataRows: any[][];
    headerMode: 'first-row' | 'auto-generate' | 'manual';
    delimiter: string;
    originalHeaders: string[];
    customHeaders: string[];
    duplicateWarning: string;
    isJson?: boolean;
    jsonData?: any;
    fullJsonData?: any;
    jsonPath?: string;
    jsonRawValuePreview?: string;
    suggestedJsonKeys?: string[];
    flattenJson?: boolean;
    serializeNested?: boolean;
    previewError?: string | null;
  };
  importFileData: { file: File } | null;
  importUrlDialogState: {
    url: string;
    isFetching: boolean;
    error: string | null;
  };

  // Data state
  sources: Source[];
  models: Model[];
  activeSource: Source | null;
  activeModel: Model | null;
  currentData: DataRow[] | null;
  columns: string[];
  viewMode: 'empty' | 'dataset-info' | 'model';

  // Transform state
  filterExpression: string;
  filterError: string | null;
  filterPreviewMode: 'matching' | 'all';

  // Dialog states
  aggregateDialogState: AggregateDialogState;
  joinDialogState: JoinDialogState;
  deriveDialogState: {
    columnName: string;
    expression: string;
    error: string | null;
  };
  sortDialogState: {
    field: string;
    order: 'asc' | 'desc';
  };
  sliceRowsDialogState: {
    count: number;
    mode: 'first' | 'last' | 'removeFirst' | 'removeLast';
  };
  indexDialogState: {
    columnName: string;
    startFrom: number;
  };
  foldDialogState: {
    keyName: string;
    valueName: string;
    selectedColumns: boolean[];
    mode: 'keep' | 'fold';
  };
  replaceDialogState: {
    column: string;
    findValue: string;
    replaceValue: string;
  };
  splitDialogState: SplitDialogState;
  pivotDialogState: PivotDialogState;
  regexpMatchDialogState: RegexpMatchDialogState;
  regexpExtractDialogState: RegexpExtractDialogState;
  dateDialogState: DateDialogState;
  dedupeDialogState: {
    selectedColumns: boolean[];
    useAllColumns: boolean;
    duplicateCount: number;
    mode: 'remove' | 'keep';
  };
  columnEditorState: {
    mode: 'list' | 'text';
    textSubMode: 'rename' | 'reorder' | 'select';
    columns: Array<{
      original: string;
      renamed: string;
      selected: boolean;
    }>;
    textValue: string;
    textError: string | null;
    patternText: string;
    patternMode: 'include' | 'exclude';
    patternMatchType: 'prefix' | 'suffix' | 'exact';
    draggedIndex: number | null;
  };

  // Preview panel
  previewState: {
    title: string;
    stats: string;
    columns: string[];
    newColumns: string[];
    rows: DataRow[];
    _debounceTimer: any;
  };

  // JSON Editor
  jsonEditMode: boolean;
  jsonEditContent: string;
  jsonEditError: string | null;
  jsonEditBackup: any | null;

  // Notifications
  notifications: Notification[];
  notificationIdCounter: number;

  // Modals
  messageBox: {
    visible: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    inputValue: string;
    resolve: ((result: any) => void) | null;
  };
  stepRemovalModal: {
    visible: boolean;
    stepIndex: number;
    stepName: string;
    affectedSteps: string[];
    removeMode: 'single' | 'all';
    resolve: ((mode: 'single' | 'all' | null) => void) | null;
  };
}
