import { TransformStep, ColumnSchema } from '../core/schema-engine';
import { EDAStats } from '../core/eda-engine';

export type DataRow = Record<string, any>;

export type DialogName =
  | 'sort'
  | 'index'
  | 'replace'
  | 'sliceRows'
  | 'fold' // Unpivot
  | 'filter'
  | 'pivot'
  | 'date'
  | 'text'
  | 'derive'
  | 'split'
  | 'merge'
  | 'join'
  | 'concat'
  | 'union'
  | 'aggregate'
  | 'import-csv'
  | 'import-url'
  | 'generate'
  | 'column-editor'
  | 'settings'
  | 'download'
  | 'regexpMatch'
  | 'regexpExtract'
  | 'dedupe'
  | 'about'
  | 'expressions'
  | 'reference'
  | 'type-conversion'
  | 'impute'
  | 'selectPattern'
  | 'removePattern'
  | 'conditional'
  | 'renamePattern'
  | 'dependency-graph'
  | null;

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
  comment?: string;
  __v?: number; // Schema version for future migrations (defaults to 1)
}

export interface Model {
  id: string;
  name: string;
  sourceId: string;
  steps: TransformStep[];
  schema: ColumnSchema[];
  data: DataRow[];
  stats?: EDAStats | null;
  isStale?: boolean; // True if a dependency changed but model not yet recomputed
  comment?: string;
  __v?: number; // Schema version for future migrations (defaults to 1)
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
  removeOrigin: boolean;
  error: string | null;
  previewData: Array<{ input: string; output: any }>;
}

export interface TextDialogState {
  column: string;
  operations: string[]; // ['uppercase', 'lowercase', 'titlecase', 'trim']
  removeOrigin: boolean;
  error: string | null;
  previewData: Array<{ input: string; output: any }>;
}

export interface ImportDialogState {
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
}

export interface ImportUrlDialogState {
  url: string;
  isFetching: boolean;
  error: string | null;
}

export interface AppState {
  // UI state
  ribbonTab: string;
  activeTab: string;
  activeStep: TransformStep | null;
  activeStepIndex: number | null;
  viewingIntermediate: boolean;
  editingStepIndex: number | null;
  activeDialog: DialogName;
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
  theme: 'syto' | 'blues';

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

  // Data state
  sources: Source[];
  models: Model[];
  activeSource: Source | null;
  activeModel: Model | null;
  currentData: DataRow[] | null;
  columns: string[];
  viewMode: 'empty' | 'dataset-info' | 'model' | 'model-info';

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
