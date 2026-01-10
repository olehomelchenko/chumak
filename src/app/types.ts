import { TransformStep } from '../core/schema-engine';
import { EDAStats } from '../core/eda-engine';

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
  columnToolbarPos: { x: number; y: number };
  selectedCell: { col: string; value: any; type: string } | null;
  cellToolbarPos: { x: number; y: number };
  edaStats: EDAStats | null;
  edaChartView: 'boxplot' | 'histogram';
  edaBrushSelection: { min: number; max: number } | null;

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
    jsonData?: any[];
  };
  importFileData: any;
  importUrlDialogState: {
    url: string;
    isFetching: boolean;
    error: string | null;
  };

  // Data state
  sources: any[];
  models: any[];
  activeSource: any | null;
  activeModel: any | null;
  currentData: any[] | null;
  columns: string[];
  viewMode: 'empty' | 'dataset-info' | 'model';

  // Transform state
  selectedColumns: boolean[];
  selectPatternText: string;
  selectPatternMatchType: 'prefix' | 'suffix' | 'exact';
  selectPatternMode: 'include' | 'exclude';
  filterExpression: string;
  filterError: string | null;
  removedColumns: boolean[];

  // Dialog states
  aggregateDialogState: any;
  joinDialogState: any;
  deriveDialogState: {
    columnName: string;
    expression: string;
    error: string | null;
  };
  sortDialogState: {
    field: string;
    order: 'asc' | 'desc';
  };
  renameDialogState: {
    renames: Record<string, string>;
  };
  foldDialogState: {
    keyName: string;
    valueName: string;
    selectedColumns: boolean[];
  };
  replaceDialogState: {
    column: string;
    findValue: string;
    replaceValue: string;
  };
  splitDialogState: {
    column: string;
    delimiter: string;
    isRegex: boolean;
    mode: string;
    maxColumns: number;
    keepOriginal: boolean;
    error: string | null;
    previewData: any[];
    previewColumns: string[];
    autoDetectedDelimiter: string | null;
    columnRenames: Record<string, string>;
  };
  regexpMatchDialogState: any;
  regexpExtractDialogState: any;

  // JSON Editor
  jsonEditMode: boolean;
  jsonEditContent: string;
  jsonEditError: string | null;
  jsonEditBackup: any | null;

  // Notifications
  notifications: any[];
  notificationIdCounter: number;
}
