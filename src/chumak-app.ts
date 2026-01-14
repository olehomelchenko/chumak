import * as aq from 'arquero';
import Papa from 'papaparse';
import { AppState } from './app/types';
import { ColumnSchema, TransformStep, SchemaEngine } from './core/schema-engine';
import { loadUXSettings, updateUXSetting, UXSettings } from './core/ux-settings';
import { loadInitialData, autoSave, clearAllData } from './core/storage';
import { getUrlState, setUrlState, clearUrlHash } from './core/url-state';
import { Transformation } from './app/decorators';
import * as FilterHandlers from './app/transforms/filter-transform';
import * as DeriveHandlers from './app/transforms/derive-transform';
import * as AggregateHandlers from './app/transforms/aggregate-transform';
import * as JoinHandlers from './app/transforms/join-transform';
import * as PivotHandlers from './app/transforms/pivot-transform';
import * as FoldHandlers from './app/transforms/fold-transform';
import * as SplitHandlers from './app/transforms/split-transform';
import * as DedupeHandlers from './app/transforms/dedupe-transform';
import * as ColumnEditorHandlers from './app/transforms/column-editor';
import * as DateHandlers from './app/transforms/date-transform';
import * as RegexpHandlers from './app/transforms/regexp-transforms';
import * as SimpleHandlers from './app/transforms/simple-transforms';
import { applyTransform, describeTransform } from './core/transforms';
import { TransformResult } from './core/transform-result';
import { perfLogger } from './core/performance-logger';
import { EDAEngine } from './core/eda-engine';
import { ChartsEngine } from './core/charts';
import { parseExpression } from './core/expression-parser';
import { validateAST } from './core/ast-validator';
import { formatError } from './core/error-formatter';
import { html as aboutHtml } from './content/about.md';
import { html as expressionsHtml } from './content/expressions.md';

export class ChumakApp implements AppState {
  // UI state
  ribbonTab = 'prepare';
  activeTab = 'steps';
  activeStep: TransformStep | null = null;
  activeStepIndex: number | null = null;
  viewingIntermediate = false;
  editingStepIndex: number | null = null;
  activeDialog: string | null = null;
  dialogSnapshot: string | null = null;
  isDragging = false;
  selectedColumn: string | null = null;
  columnToolbarPos = { x: 0, y: 0, arrowOffset: 0 };
  selectedCell: {
    col: string;
    value: any;
    type: string;
    rowIdx?: number;
    isEda?: boolean;
    edaLabel?: string;
  } | null = null;
  cellToolbarPos = { x: 0, y: 0, arrowOffset: 0 };
  edaStats: any = null;
  edaChartView: 'boxplot' | 'histogram' = 'boxplot';
  edaBrushSelection: any = null;
  edaDateTreatment: 'temporal' | 'categorical' = 'temporal';
  theme: 'chumak' | 'blues' = 'chumak';
  uxSettings: UXSettings = {
    pagination: { pageSize: 500 },
    preview: { rowLimit: 100 },
    theme: 'chumak',
  };

  // Transformation status
  isTransforming = false;
  transformMessage = '';

  // Type Menu State
  typeMenuOpen = false;
  typeMenuPos = { x: 0, y: 0 };
  typeMenuCol: string | null = null;

  // Pagination state
  currentPage = 1;
  pageSize = 500;
  totalPages = 1;

  // Import dialog state
  importDialogState: any = {
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
    isJson: false,
    jsonData: null,
    fullJsonData: null,
    jsonPath: '',
    jsonRawValuePreview: '',
    suggestedJsonKeys: [],
    flattenJson: false,
    serializeNested: true,
  };
  importFileData: { file: File } | null = null;
  importUrlDialogState: any = {
    url: '',
    isFetching: false,
    error: null,
  };

  // Data state
  sources: any[] = [];
  models: any[] = [];
  activeSource: any | null = null;
  activeModel: any | null = null;
  currentData: any[] | null = null;
  columns: string[] = [];
  viewMode: 'empty' | 'dataset-info' | 'model' = 'empty';

  // Transform state
  filterExpression = '';
  filterError: string | null = null;
  filterPreviewMode: 'matching' | 'all' = 'all'; // 'matching' = show only matching, 'all' = show all with removed marked

  // Dialog states
  aggregateDialogState: any = {
    groupBy: [],
    aggregations: [],
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
  joinDialogState: any = {
    rightModel: null,
    availableTargets: [],
    joinType: 'inner',
    keyPairs: [[null, null]],
    leftColumns: [],
    rightColumns: [],
    suffixes: ['_x', '_y'],
    isPreviewing: false,
    previewError: null,
    previewData: null,
  };
  deriveDialogState = { columnName: '', expression: '', error: null as string | null };
  sortDialogState = { field: '', order: 'asc' as 'asc' | 'desc' };
  sliceRowsDialogState = {
    count: 10,
    mode: 'first' as 'first' | 'last' | 'removeFirst' | 'removeLast',
  };
  indexDialogState = { columnName: 'row_index', startFrom: 1 };
  foldDialogState = {
    keyName: 'key',
    valueName: 'value',
    selectedColumns: [] as boolean[],
    mode: 'keep' as 'keep' | 'fold', // 'keep' = select columns to keep as index, 'fold' = select columns to fold
  };
  pivotDialogState: any = {
    rowColumns: [] as string[],
    columnColumn: '',
    valueColumn: '',
    aggregation: 'sum',
    options: { sort: true, limit: null as number | null },
    uniqueValueCount: 0,
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
  replaceDialogState = { column: '', findValue: '', replaceValue: '' };
  splitDialogState: any = {
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
  regexpMatchDialogState: any = {
    sourceColumn: '',
    pattern: '',
    columnName: '',
    error: null,
  };
  regexpExtractDialogState: any = {
    sourceColumn: '',
    pattern: '',
    columnName: '',
    group: 0,
    error: null,
  };
  dateDialogState: any = {
    column: '',
    operation: 'extract' as 'extract' | 'truncate',
    extractParts: ['year'] as string[],
    truncateUnits: ['month'] as string[],
    outputColumn: '',
    error: null as string | null,
    previewData: [] as { input: string; output: any }[],
  };
  dedupeDialogState: {
    selectedColumns: boolean[];
    useAllColumns: boolean;
    duplicateCount: number;
    mode: 'remove' | 'keep';
  } = {
    selectedColumns: [],
    useAllColumns: true,
    duplicateCount: 0,
    mode: 'remove',
  };
  columnEditorState: {
    mode: 'list' | 'text';
    textSubMode: 'rename' | 'reorder' | 'select';
    columns: Array<{ original: string; renamed: string; selected: boolean }>;
    textValue: string;
    textError: string | null;
    patternText: string;
    patternMode: 'include' | 'exclude';
    patternMatchType: 'prefix' | 'suffix' | 'exact';
    draggedIndex: number | null;
  } = {
    mode: 'list',
    textSubMode: 'rename',
    columns: [],
    textValue: '',
    textError: null,
    patternText: '',
    patternMode: 'include',
    patternMatchType: 'prefix',
    draggedIndex: null,
  };

  // Unified preview panel state (shared across all dialogs with previews)
  previewState: {
    title: string;
    stats: string;
    columns: string[];
    newColumns: string[];
    rows: any[];
    _debounceTimer: ReturnType<typeof setTimeout> | null;
  } = {
    title: '',
    stats: '',
    columns: [],
    newColumns: [],
    rows: [],
    _debounceTimer: null,
  };

  // JSON Editor
  jsonEditMode = false;
  jsonEditContent = '';
  jsonEditError: string | null = null;
  jsonEditBackup: any | null = null;

  // Notifications
  notifications: any[] = [];
  notificationIdCounter = 0;

  // Custom Dialogs (Alert/Confirm/Prompt)
  messageBox = {
    visible: false,
    title: '',
    message: '',
    type: 'alert' as 'alert' | 'confirm' | 'prompt',
    inputValue: '',
    resolve: null as ((value: any) => void) | null,
  };

  // Step removal modal
  stepRemovalModal = {
    visible: false,
    stepIndex: -1,
    stepName: '',
    affectedSteps: [] as string[],
    removeMode: 'all' as 'single' | 'all',
    resolve: null as ((value: 'single' | 'all' | null) => void) | null,
  };

  // Alpine's injected properties
  $nextTick: any;
  $watch: any;
  $dispatch: any;

  // Intermediate viewing state
  viewingSchema: ColumnSchema[] | null = null;

  // Bind handlers
  validateFilterExpression() {
    return FilterHandlers.validateFilterExpression.call(this);
  }
  debouncedUpdateFilterPreview() {
    return FilterHandlers.debouncedUpdateFilterPreview.call(this);
  }
  updateFilterPreview() {
    return FilterHandlers.updateFilterPreview.call(this);
  }
  toggleFilterPreviewMode() {
    return FilterHandlers.toggleFilterPreviewMode.call(this);
  }
  applyFilterTransform() {
    return FilterHandlers.applyFilterTransform.call(this);
  }

  // Derive handlers
  validateDeriveExpression() {
    return DeriveHandlers.validateDeriveExpression.call(this);
  }
  debouncedUpdateDerivePreview() {
    return DeriveHandlers.debouncedUpdateDerivePreview.call(this);
  }
  updateDerivePreview() {
    return DeriveHandlers.updateDerivePreview.call(this);
  }
  applyDeriveTransform() {
    return DeriveHandlers.applyDeriveTransform.call(this);
  }

  // Aggregate handlers
  addAggregation() {
    return AggregateHandlers.addAggregation.call(this);
  }
  removeAggregation(index: number) {
    return AggregateHandlers.removeAggregation.call(this, index);
  }
  updateAggregateOutputName(index: number) {
    return AggregateHandlers.updateAggregateOutputName.call(this, index);
  }
  constructAggregateStep() {
    return AggregateHandlers.constructAggregateStep.call(this);
  }
  previewAggregate() {
    return AggregateHandlers.previewAggregate.call(this);
  }
  applyAggregateTransform() {
    return AggregateHandlers.applyAggregateTransform.call(this);
  }

  // Join handlers
  initializeJoinDialog() {
    return JoinHandlers.initializeJoinDialog.call(this);
  }
  getColumnsForTarget(targetId: string) {
    return JoinHandlers.getColumnsForTarget.call(this, targetId);
  }
  onJoinTargetChange() {
    return JoinHandlers.onJoinTargetChange.call(this);
  }
  addJoinKeyPair() {
    return JoinHandlers.addJoinKeyPair.call(this);
  }
  removeJoinKeyPair(index: number) {
    return JoinHandlers.removeJoinKeyPair.call(this, index);
  }
  previewJoin() {
    return JoinHandlers.previewJoin.call(this);
  }
  applyJoinTransform() {
    return JoinHandlers.applyJoinTransform.call(this);
  }

  // Pivot handlers
  initializePivotDialog() {
    return PivotHandlers.initializePivotDialog.call(this);
  }
  onPivotConfigChange() {
    return PivotHandlers.onPivotConfigChange.call(this);
  }
  constructPivotStep() {
    return PivotHandlers.constructPivotStep.call(this);
  }
  previewPivot() {
    return PivotHandlers.previewPivot.call(this);
  }
  applyPivotTransform() {
    return PivotHandlers.applyPivotTransform.call(this);
  }

  // Fold handlers
  toggleColumnForFold(index: number) {
    return FoldHandlers.toggleColumnForFold.call(this, index);
  }
  toggleFoldMode() {
    return FoldHandlers.toggleFoldMode.call(this);
  }
  getColumnsToFold() {
    return FoldHandlers.getColumnsToFold.call(this);
  }
  selectAllForFold() {
    return FoldHandlers.selectAllForFold.call(this);
  }
  selectNoneForFold() {
    return FoldHandlers.selectNoneForFold.call(this);
  }
  updateFoldPreview() {
    return FoldHandlers.updateFoldPreview.call(this);
  }
  applyFoldTransform() {
    return FoldHandlers.applyFoldTransform.call(this);
  }

  // Split handlers
  detectDelimiter(column: string) {
    return SplitHandlers.detectDelimiter.call(this, column);
  }
  debouncedUpdateSplitPreview() {
    return SplitHandlers.debouncedUpdateSplitPreview.call(this);
  }
  selectSplitColumn(col: string) {
    return SplitHandlers.selectSplitColumn.call(this, col);
  }
  updateSplitPreview() {
    return SplitHandlers.updateSplitPreview.call(this);
  }
  applySplitTransform() {
    return SplitHandlers.applySplitTransform.call(this);
  }

  // Dedupe handlers
  toggleDedupeAllColumns(useAll: boolean) {
    return DedupeHandlers.toggleDedupeAllColumns.call(this, useAll);
  }
  toggleDedupeColumn(index: number) {
    return DedupeHandlers.toggleDedupeColumn.call(this, index);
  }
  selectAllForDedupe() {
    return DedupeHandlers.selectAllForDedupe.call(this);
  }
  selectNoneForDedupe() {
    return DedupeHandlers.selectNoneForDedupe.call(this);
  }
  getDedupeColumns() {
    return DedupeHandlers.getDedupeColumns.call(this);
  }
  findDuplicateRows(data: any[], columns: string[]) {
    return DedupeHandlers.findDuplicateRows.call(this, data, columns);
  }
  updateDedupePreview() {
    return DedupeHandlers.updateDedupePreview.call(this);
  }
  findAllDuplicateRowCount(data: any[], columns: string[]) {
    return DedupeHandlers.findAllDuplicateRowCount.call(this, data, columns);
  }
  @Transformation('Duplicates')
  applyDedupeTransform() {
    return DedupeHandlers.applyDedupeTransform.call(this);
  }

  // Column Editor handlers
  toggleColumnEditorColumn(index: number) {
    return ColumnEditorHandlers.toggleColumnEditorColumn.call(this, index);
  }
  selectAllColumnEditor() {
    return ColumnEditorHandlers.selectAllColumnEditor.call(this);
  }
  selectNoneColumnEditor() {
    return ColumnEditorHandlers.selectNoneColumnEditor.call(this);
  }
  applyColumnEditorPattern() {
    return ColumnEditorHandlers.applyColumnEditorPattern.call(this);
  }
  handleColumnEditorDragStart(index: number, event: DragEvent) {
    return ColumnEditorHandlers.handleColumnEditorDragStart.call(this, index, event);
  }
  handleColumnEditorDragOver(event: DragEvent) {
    return ColumnEditorHandlers.handleColumnEditorDragOver.call(this, event);
  }
  handleColumnEditorDrop(dropIndex: number) {
    return ColumnEditorHandlers.handleColumnEditorDrop.call(this, dropIndex);
  }
  handleColumnEditorDragEnd() {
    return ColumnEditorHandlers.handleColumnEditorDragEnd.call(this);
  }
  switchColumnEditorToText() {
    return ColumnEditorHandlers.switchColumnEditorToText.call(this);
  }
  validateColumnEditorText() {
    return ColumnEditorHandlers.validateColumnEditorText.call(this);
  }
  getColumnEditorChanges() {
    return ColumnEditorHandlers.getColumnEditorChanges.call(this);
  }
  applyColumnEditorTransform() {
    return ColumnEditorHandlers.applyColumnEditorTransform.call(this);
  }

  // Date handlers
  getDateColumns() {
    return DateHandlers.getDateColumns.call(this);
  }
  getExtractParts() {
    return DateHandlers.getExtractParts.call(this);
  }
  getTruncateUnits() {
    return DateHandlers.getTruncateUnits.call(this);
  }
  toggleDateSelection(value: string, event?: MouseEvent) {
    return DateHandlers.toggleDateSelection.call(this, value, event);
  }
  getDateOutputPlaceholder() {
    return DateHandlers.getDateOutputPlaceholder.call(this);
  }
  updateDatePreview() {
    return DateHandlers.updateDatePreview.call(this);
  }
  applyDateTransform() {
    return DateHandlers.applyDateTransform.call(this);
  }

  // Regexp handlers
  validateRegexpPattern(pattern: string) {
    return RegexpHandlers.validateRegexpPattern.call(this, pattern);
  }
  validateRegexpMatchExpression() {
    return RegexpHandlers.validateRegexpMatchExpression.call(this);
  }
  debouncedUpdateRegexpMatchPreview() {
    return RegexpHandlers.debouncedUpdateRegexpMatchPreview.call(this);
  }
  updateRegexpMatchPreview() {
    return RegexpHandlers.updateRegexpMatchPreview.call(this);
  }
  applyRegexpMatchTransform() {
    return RegexpHandlers.applyRegexpMatchTransform.call(this);
  }
  validateRegexpExtractExpression() {
    return RegexpHandlers.validateRegexpExtractExpression.call(this);
  }
  debouncedUpdateRegexpExtractPreview() {
    return RegexpHandlers.debouncedUpdateRegexpExtractPreview.call(this);
  }
  updateRegexpExtractPreview() {
    return RegexpHandlers.updateRegexpExtractPreview.call(this);
  }
  applyRegexpExtractTransform() {
    return RegexpHandlers.applyRegexpExtractTransform.call(this);
  }

  // Simple handlers
  applyReplaceTransform() {
    return SimpleHandlers.applyReplaceTransform.call(this);
  }
  applySortTransform() {
    return SimpleHandlers.applySortTransform.call(this);
  }
  applySliceRowsTransform() {
    return SimpleHandlers.applySliceRowsTransform.call(this);
  }
  applyIndexTransform() {
    return SimpleHandlers.applyIndexTransform.call(this);
  }

  constructor() {
    // All handlers integrated into the class
  }

  async init() {
    console.log('Initializing Chumak App Class...');

    this.uxSettings = loadUXSettings();
    this.pageSize = this.uxSettings.pagination.pageSize;
    this.theme = this.uxSettings.theme;
    this.applyTheme();

    const { sources, models } = await loadInitialData();
    this.sources = sources;
    this.models = models;

    const urlState = getUrlState();
    let restored = false;

    // Handle page routes (about, reference, expressions, settings)
    if (urlState.page) {
      this.openDialog(urlState.page, urlState.section);
      restored = true;
    } else if (urlState.modelId) {
      const model = models.find((m) => m.id === urlState.modelId);
      if (model) {
        this.activeModel = model;
        this.currentData = model.data;
        this.viewMode = 'model';
        restored = true;
      }
    } else if (urlState.sourceId) {
      const source = sources.find((s) => s.id === urlState.sourceId);
      if (source) {
        this.activeSource = source;
        this.currentData = source.data;
        this.viewMode = 'dataset-info';
        restored = true;
      }
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => this.handleHashChange());

    if (!restored && models.length > 0) {
      this.activeModel = models[0];
      this.currentData = models[0].data;
      this.viewMode = 'model';
    }

    if (this.activeModel) {
      this.activeStepIndex =
        this.activeModel.steps?.length > 0 ? this.activeModel.steps.length - 1 : null;
      this.viewingIntermediate = false;
    }

    if (this.currentData && this.currentData.length > 0) {
      if (this.activeModel && (!this.activeModel.schema || this.activeModel.schema.length === 0)) {
        this.activeModel.schema = SchemaEngine.createInitialSchema(this.activeModel.data);
      }

      if (this.activeModel?.schema) {
        this.columns = this.activeModel.schema.map((c: any) => c.name);
      } else if (this.activeSource?.columns) {
        this.columns = this.activeSource.columns.map((c: any) => c.name);
      } else {
        this.columns = Object.keys(this.currentData[0]);
      }
    }

    this.updatePagination();

    this.$nextTick(() => {
      this.$watch('activeModel', () => this.syncUrlState());
      this.$watch('activeSource', () => this.syncUrlState());
      this.syncUrlState();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.messageBox.visible) {
          this.closeMessageBox(false);
          return;
        }
        if (this.activeDialog) {
          this.closeDialog();
          return;
        }
        if (this.typeMenuOpen) {
          this.typeMenuOpen = false;
          return;
        }
        if (this.selectedColumn || this.selectedCell) {
          this.clearColumnSelection();
          return;
        }
      }
    });

    window.addEventListener('paste', (e) => this.handlePaste(e));

    await this.loadTemplates();
  }

  syncUrlState() {
    setUrlState({
      modelId: this.activeModel?.id,
      sourceId: this.activeSource?.id || this.activeModel?.sourceId,
    });
  }

  async startTransformation(message: string) {
    this.isTransforming = true;
    this.transformMessage = message;
    await this.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  endTransformation() {
    this.isTransforming = false;
    this.transformMessage = '';
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  switchTheme(theme: 'blues' | 'chumak') {
    this.theme = theme;
    this.applyTheme();
    updateUXSetting('theme', '', theme); // updateUXSetting in current impl takes category, key, value. Category is 'theme'? No, category is main property.
  }

  updatePreviewRowLimit(value: string) {
    const limit = Math.max(10, Math.min(10000, parseInt(value, 10) || 100));
    this.uxSettings.preview = { rowLimit: limit };
    updateUXSetting('preview', 'rowLimit', limit);
  }

  getPreviewRowLimit(): number {
    return this.uxSettings.preview?.rowLimit || 100;
  }

  // ============================================================
  // Model & Source Management
  // ============================================================

  private getTemplateConfigs() {
    return [
      { id: 'join-modal-container', url: 'templates/join-modal.html' },
      { id: 'aggregate-modal-container', url: 'templates/aggregate-modal.html' },
      { id: 'import-csv-modal-container', url: 'templates/import-csv-modal.html' },
      { id: 'split-modal-container', url: 'templates/split-column-modal.html' },
      { id: 'unpivot-modal-container', url: 'templates/unpivot-modal.html' },
      { id: 'pivot-modal-container', url: 'templates/pivot-modal.html' },
      { id: 'replace-modal-container', url: 'templates/replace-modal.html' },
      { id: 'sort-modal-container', url: 'templates/sort-modal.html' },
      { id: 'slice-rows-modal-container', url: 'templates/slice-rows-modal.html' },
      { id: 'index-modal-container', url: 'templates/index-modal.html' },
      { id: 'derive-modal-container', url: 'templates/derive-modal.html' },
      { id: 'filter-modal-container', url: 'templates/filter-modal.html' },
      { id: 'regexp-match-modal-container', url: 'templates/regexp-match-modal.html' },
      { id: 'regexp-extract-modal-container', url: 'templates/regexp-extract-modal.html' },
      { id: 'date-modal-container', url: 'templates/date-modal.html' },
      { id: 'dedupe-modal-container', url: 'templates/dedupe-modal.html' },
      { id: 'column-editor-modal-container', url: 'templates/column-editor-modal.html' },
      { id: 'download-modal-container', url: 'templates/download-modal.html' },
      { id: 'import-url-modal-container', url: 'templates/import-url-modal.html' },
      { id: 'settings-modal-container', url: 'templates/settings-modal.html' },
    ];
  }

  async loadTemplates() {
    const templates = this.getTemplateConfigs();
    const baseUrl = import.meta.env.BASE_URL || '/';

    for (const template of templates) {
      try {
        // Construct the full URL using the base path
        const url = `${baseUrl}${template.url}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.error(
            `Failed to load template from ${url}: ${response.status} ${response.statusText}`
          );
          continue;
        }
        const html = await response.text();
        const container = document.getElementById(template.id);
        if (container) container.innerHTML = html;
      } catch (error) {
        console.error(`Error loading template ${template.url}:`, error);
      }
    }
  }

  switchToSource(source: any) {
    this.activeSource = source;
    this.activeModel = null;
    this.currentData = source.data;
    this.columns = source.columns.map((c: any) => c.name);
    this.viewMode = 'dataset-info';
    this.activeStepIndex = null;
    this.viewingIntermediate = false;
    this.clearColumnSelection();
  }

  switchToModel(model: any) {
    this.activeSource = null;
    this.activeModel = model;
    if (model.data && model.data.length > 0 && (!model.schema || model.schema.length === 0)) {
      model.schema = SchemaEngine.createInitialSchema(model.data);
    }
    this.currentData = model.data;
    this.viewMode = 'model';
    this.activeStepIndex = model.steps?.length > 0 ? model.steps.length - 1 : null;
    this.viewingIntermediate = false;
    this.clearColumnSelection();
    if (this.ribbonTab === 'data' || !this.ribbonTab) {
      this.ribbonTab = 'prepare';
    }
    if (this.currentData && this.currentData.length > 0) {
      this.columns = model.schema
        ? model.schema.map((c: any) => c.name)
        : Object.keys(this.currentData[0]);
    } else {
      this.columns = [];
    }
    this.updatePagination();
  }

  async createNewModel(source: any) {
    const modelName = await this.prompt(
      'Enter name for new model:',
      `model_${this.models.filter((m) => m.sourceId === source.id).length + 1}`
    );
    if (!modelName || modelName.trim() === '') return;
    const existingModel = this.models.find(
      (m) => m.sourceId === source.id && m.name.toLowerCase() === modelName.trim().toLowerCase()
    );
    if (existingModel) {
      await this.alert(
        'A model with this name already exists for this source. Please choose a different name.'
      );
      return;
    }
    const newModel = {
      id: `mdl_${Date.now()}`,
      name: modelName.trim(),
      sourceId: source.id,
      steps: [] as any[],
      schema: JSON.parse(JSON.stringify(source.columns)),
      data: JSON.parse(JSON.stringify(source.data)),
    };
    const importStep = {
      import: {
        source: source.name,
        fileName: source.fileName,
        delimiter: source.delimiter,
        headerMode: source.headerMode,
      },
    } as any;
    if (source.customHeaders) importStep.import.customHeaders = source.customHeaders;
    newModel.steps.push(importStep);
    const typesStep = { types: {} as any };
    source.columns.forEach((col: any) => {
      typesStep.types[col.name] = col.type;
    });
    newModel.steps.push(typesStep);
    this.models.push(newModel);
    this.switchToModel(newModel);
    await autoSave(this.sources, this.models);
  }

  async createNewModelFromActive() {
    if (!this.activeModel) {
      await this.alert('No active model selected');
      return;
    }
    const source = this.sources.find((s) => s.id === this.activeModel.sourceId);
    if (!source) {
      await this.alert('Source not found for current model');
      return;
    }
    await this.createNewModel(source);
  }

  async copyCurrentModel() {
    if (!this.activeModel) {
      await this.alert('No active model selected');
      return;
    }
    const newName = await this.prompt(
      'Enter name for copied model:',
      `${this.activeModel.name}_copy`
    );
    if (!newName || newName.trim() === '') return;
    const existingModel = this.models.find(
      (m) =>
        m.sourceId === this.activeModel.sourceId &&
        m.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (existingModel) {
      await this.alert(
        'A model with this name already exists for this source. Please choose a different name.'
      );
      return;
    }
    const copiedModel = {
      id: `mdl_${Date.now()}`,
      name: newName.trim(),
      sourceId: this.activeModel.sourceId,
      steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
      schema: this.activeModel.schema ? JSON.parse(JSON.stringify(this.activeModel.schema)) : null,
      data: JSON.parse(JSON.stringify(this.activeModel.data)),
    };
    this.models.push(copiedModel);
    this.switchToModel(copiedModel);
    await autoSave(this.sources, this.models);
  }

  async renameCurrentModel() {
    if (!this.activeModel) {
      await this.alert('No active model selected');
      return;
    }
    const newName = await this.prompt('Enter new name for model:', this.activeModel.name);
    if (!newName || newName.trim() === '') return;
    if (newName.trim() === this.activeModel.name) return;
    const existingModel = this.models.find(
      (m) =>
        m.sourceId === this.activeModel.sourceId &&
        m.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (existingModel) {
      await this.alert(
        'A model with this name already exists for this source. Please choose a different name.'
      );
      return;
    }
    this.activeModel.name = newName.trim();
    await autoSave(this.sources, this.models);
  }

  async deleteCurrentModel() {
    if (!this.activeModel) {
      await this.alert('No active model selected');
      return;
    }
    const sourceModels = this.models.filter((m) => m.sourceId === this.activeModel.sourceId);
    if (sourceModels.length === 1) {
      await this.alert('Cannot delete the last model for this source.');
      return;
    }
    if (!(await this.confirm(`Delete model "${this.activeModel.name}"?\n\nThis cannot be undone.`)))
      return;
    const deletedModelId = this.activeModel.id;
    const sourceId = this.activeModel.sourceId;
    this.models = this.models.filter((m) => m.id !== deletedModelId);
    const remainingModels = this.models.filter((m) => m.sourceId === sourceId);
    if (remainingModels.length > 0) {
      this.switchToModel(remainingModels[0]);
    } else {
      this.activeModel = null;
      this.currentData = null;
      this.columns = [];
      this.viewMode = 'empty';
    }
    await autoSave(this.sources, this.models);
  }

  async renameSource(source: any) {
    const newName = await this.prompt('Enter new name for source:', source.name);
    if (!newName || newName.trim() === '') return;
    if (newName.trim() === source.name) return;
    source.name = newName.trim();
    await autoSave(this.sources, this.models);
  }

  async deleteSource(source: any) {
    const modelCount = this.models.filter((m) => m.sourceId === source.id).length;
    const message =
      modelCount > 0
        ? `Delete source "${source.name}" and its ${modelCount} model${modelCount > 1 ? 's' : ''}?\n\nThis cannot be undone.`
        : `Delete source "${source.name}"?\n\nThis cannot be undone.`;
    if (!(await this.confirm(message))) return;
    try {
      this.models = this.models.filter((m) => m.sourceId !== source.id);
      this.sources = this.sources.filter((s) => s.id !== source.id);
      if (
        this.activeSource?.id === source.id ||
        this.models.find((m) => m.id === this.activeModel?.id && m.sourceId === source.id)
      ) {
        this.activeSource = null;
        this.activeModel = null;
        this.currentData = null;
        this.columns = [];
        this.viewMode = 'empty';
      }
      await autoSave(this.sources, this.models);
    } catch (error: any) {
      console.error('Error deleting source:', error);
      await this.alert('Failed to delete source: ' + error.message);
    }
  }

  async clearAllData() {
    if (!(await this.confirm('Clear all data from IndexedDB? This cannot be undone.'))) return;
    try {
      await clearAllData();
      this.sources = [];
      this.models = [];
      this.activeModel = null;
      this.currentData = null;
      this.columns = [];
      await this.alert('All data cleared successfully');
    } catch (error: any) {
      console.error('Error clearing data:', error);
      await this.alert('Failed to clear data: ' + error.message);
    }
  }

  // ============================================================
  // Import Handlers
  // ============================================================

  handleFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.showImportDialog(file);
    event.target.value = '';
  }

  async handleFileDrop(event: any) {
    this.isDragging = false;
    const files = event.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
      await this.alert('Please drop a CSV or JSON file');
      return;
    }
    this.showImportDialog(file);
  }

  async handlePaste(event: any) {
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    )
      return;
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    if (!clipboardData) return;
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      const fn = file.name.toLowerCase();
      if (
        fn.endsWith('.csv') ||
        fn.endsWith('.json') ||
        file.type === 'text/csv' ||
        file.type === 'application/json' ||
        file.type === 'text/plain'
      ) {
        this.showImportDialog(file);
        return;
      }
    }
    const pastedText = clipboardData.getData('text');
    if (pastedText && pastedText.trim().length > 0) {
      const trimmed = pastedText.trim();
      const isLikelyJson =
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'));
      const file = new File([pastedText], isLikelyJson ? 'Pasted Data.json' : 'Pasted Data.csv', {
        type: isLikelyJson ? 'application/json' : 'text/csv',
      });
      this.showImportDialog(file);
    }
  }

  async promptPaste() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          const trimmed = text.trim();
          const isLikelyJson =
            (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
            (trimmed.startsWith('{') && trimmed.endsWith('}'));
          const file = new File([text], isLikelyJson ? 'Pasted Data.json' : 'Pasted Data.csv', {
            type: isLikelyJson ? 'application/json' : 'text/csv',
          });
          this.showImportDialog(file);
        } else {
          await this.alert(
            'Clipboard is empty or does not contain text. Try copying some CSV or JSON data first.'
          );
        }
      } else {
        await this.alert(
          'Your browser does not support direct clipboard access. Please use Ctrl+V to paste data.'
        );
      }
    } catch (err) {
      console.warn('Clipboard access denied:', err);
      await this.alert('Please press Ctrl+V to paste your data directly.');
    }
  }

  showImportDialog(file: File) {
    this.importFileData = { file };
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          this.handleJsonPreview(file, data);
        } catch (err) {
          this.handleCsvPreview(file);
        }
      };
      reader.readAsText(file);
    } else {
      this.handleCsvPreview(file);
    }
  }

  handleJsonPreview(file: File, data: any, path = '') {
    const defaultName = file.name.replace(/\.json$/i, '');
    let resolvedData = data;

    if (path) {
      resolvedData = this.resolvePath(data, path);
    }

    const isValidArray =
      Array.isArray(resolvedData) &&
      resolvedData.length > 0 &&
      typeof resolvedData[0] === 'object' &&
      resolvedData[0] !== null;

    const previewData = isValidArray ? resolvedData.slice(0, 5) : [];
    const headers = isValidArray ? Object.keys(previewData[0]) : [];

    this.importDialogState = {
      fileName: file.name,
      sourceName: defaultName,
      rawPreviewData: [],
      previewHeaders: headers,
      previewDataRows: previewData.map((row: any) => headers.map((h) => row[h])),
      headerMode: 'first-row',
      delimiter: ',',
      originalHeaders: headers,
      customHeaders: [...headers],
      isJson: true,
      jsonData: isValidArray ? resolvedData : null,
      fullJsonData: data,
      jsonPath: path,
      jsonRawValuePreview: resolvedData ? JSON.stringify(resolvedData, null, 2).slice(0, 1000) : '',
      suggestedJsonKeys: this.getSuggestedKeys(resolvedData),
      flattenJson: this.importDialogState.flattenJson ?? false,
      serializeNested: this.importDialogState.serializeNested ?? true,
    };
    this.activeDialog = 'import-csv';
    this.reSnapshot();
  }

  updateJsonPath() {
    const { fullJsonData, jsonPath, fileName } = this.importDialogState;
    if (!fullJsonData) return;

    // We reuse handleJsonPreview but with the new path
    const fileMock = { name: fileName } as any;
    this.handleJsonPreview(fileMock, fullJsonData, jsonPath);
  }

  resolvePath(obj: any, path: string) {
    if (!path) return obj;
    try {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        // Handle array indices
        if (Array.isArray(current) && /^\d+$/.test(part)) {
          current = current[parseInt(part, 10)];
        } else {
          current = current[part];
        }
      }
      return current;
    } catch (e) {
      return undefined;
    }
  }

  getSuggestedKeys(obj: any): string[] {
    if (obj === null || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) {
      // If it's an array, we could suggest indices or keys of the first element
      // But usually user wants to import the array itself.
      // However, we'll allow digging into the first element for deeper nesting
      if (obj.length > 0) {
        return ['0', ...Object.keys(obj[0] || {})];
      }
      return [];
    }
    return Object.keys(obj);
  }

  selectJsonPathSegment(segment: string) {
    const currentPath = this.importDialogState.jsonPath;
    const newPath = currentPath ? `${currentPath}.${segment}` : segment;
    this.importDialogState.jsonPath = newPath;
    this.updateJsonPath();
  }

  resetJsonPath() {
    this.importDialogState.jsonPath = '';
    this.updateJsonPath();
  }

  flattenData(data: any[]): any[] {
    return data.map((item) => {
      const flattened: any = {};
      const flatten = (obj: any, prefix = '') => {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
          const key = prefix.slice(0, -1);
          if (key) flattened[key] = obj;
          return;
        }
        Object.keys(obj).forEach((k) => {
          flatten(obj[k], `${prefix}${k}_`);
        });
      };
      flatten(item);
      return flattened;
    });
  }

  serializeNestedData(data: any[]): any[] {
    return data.map((item) => {
      const newItem: any = {};
      Object.keys(item).forEach((key) => {
        const val = item[key];
        if (val !== null && typeof val === 'object') {
          newItem[key] = JSON.stringify(val);
        } else {
          newItem[key] = val;
        }
      });
      return newItem;
    });
  }

  handleCsvPreview(file: File) {
    Papa.parse(file, {
      preview: 5,
      header: false,
      skipEmptyLines: true,
      complete: (previewResult: any) => {
        const firstRow = previewResult.data[0] || [];
        const defaultName = file.name.replace(/\.csv$/i, '');
        const initialHeaders = firstRow.map((cell: any, i: number) => cell || `Column ${i + 1}`);
        this.importDialogState = {
          fileName: file.name,
          sourceName: defaultName,
          rawPreviewData: previewResult.data,
          previewHeaders: [],
          previewDataRows: [],
          headerMode: 'first-row',
          delimiter: previewResult.meta.delimiter || ',',
          originalHeaders: initialHeaders,
          customHeaders: initialHeaders,
          isJson: false,
          jsonData: null,
        };
        this.updateHeadersForPreview();
        this.activeDialog = 'import-csv';
      },
      error: async (error: any) => {
        console.error('CSV preview error:', error);
        await this.alert('Error reading CSV: ' + error.message);
      },
    });
  }

  showImportUrlDialog() {
    this.importUrlDialogState = {
      url: '',
      isFetching: false,
      error: null,
    };
    this.activeDialog = 'import-url';
    this.reSnapshot();
  }

  async fetchAndImportFromUrl() {
    const { url } = this.importUrlDialogState;
    if (!url || url.trim() === '') {
      this.importUrlDialogState.error = 'Please enter a valid URL';
      return;
    }

    this.importUrlDialogState.isFetching = true;
    this.importUrlDialogState.error = null;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('The URL returned an empty response');
      }

      // Extract filename from URL or use a default
      let fileName = 'Imported Data.csv';
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          if (lastPart.toLowerCase().endsWith('.json')) {
            fileName = lastPart;
          } else if (
            lastPart.toLowerCase().endsWith('.csv') ||
            lastPart.toLowerCase().endsWith('.tsv') ||
            lastPart.toLowerCase().endsWith('.txt')
          ) {
            fileName = lastPart;
          }
        }
      } catch (e) {
        // Fallback to default filename
      }

      const file = new File([text], fileName, { type: 'text/csv' });

      // Close URL dialog and show the standard import dialog with the fetched data
      this.closeDialog(true);
      this.showImportDialog(file);
    } catch (error: any) {
      console.error('URL import error:', error);
      this.importUrlDialogState.error = error.message || 'An error occurred while fetching data';
    } finally {
      this.importUrlDialogState.isFetching = false;
    }
  }

  async confirmImport() {
    const {
      headerMode,
      delimiter,
      customHeaders,
      sourceName,
      isJson,
      jsonData,
      flattenJson,
      serializeNested,
    } = this.importDialogState;
    if (!this.importFileData) return;
    const file = this.importFileData.file;
    if (!sourceName || sourceName.trim() === '') {
      await this.alert('Please enter a source name');
      return;
    }

    if (isJson && jsonData) {
      let processedData = jsonData;

      if (flattenJson) {
        processedData = this.flattenData(processedData);
      }

      if (serializeNested) {
        processedData = this.serializeNestedData(processedData);
      }

      const columns = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;

      this.createSource(
        file,
        sourceName.trim(),
        columns,
        processedData,
        'first-row',
        ',',
        columns,
        'json'
      );
      return;
    }

    Papa.parse(file, {
      header: false,
      delimiter: delimiter === '\t' ? '\t' : delimiter,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async (results: any) => {
        if (!results.data || results.data.length === 0) {
          await this.alert('Error: CSV file is empty');
          return;
        }
        let columns: string[], data: any[];
        const rawData = results.data;
        if (headerMode === 'first-row') {
          columns = customHeaders;
          const dataRows = rawData.slice(1);
          data = dataRows.map((row: any) => {
            const obj: any = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });
          await this.createSource(
            file,
            sourceName.trim(),
            columns,
            data,
            headerMode,
            delimiter,
            customHeaders
          );
        } else if (headerMode === 'auto-generate') {
          columns = rawData[0]?.map((_: any, i: number) => `Column ${i + 1}`) || [];
          data = rawData.map((row: any) => {
            const obj: any = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });
          await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter);
        } else if (headerMode === 'manual') {
          columns = customHeaders;
          data = rawData.map((row: any) => {
            const obj: any = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });
          await this.createSource(
            file,
            sourceName.trim(),
            columns,
            data,
            headerMode,
            delimiter,
            customHeaders
          );
        }
      },
      error: async (error: any) => {
        console.error('CSV parsing error:', error);
        await this.alert('Error parsing CSV: ' + error.message);
      },
    });
  }

  async createSource(
    file: File,
    sourceName: string,
    columns: string[],
    data: any[],
    headerMode: string,
    delimiter: string,
    customHeaders: string[] | null = null,
    origin = 'file'
  ) {
    const start = performance.now();
    if (columns.some((c) => !c || c.trim() === '')) {
      await this.alert('Error: Column names cannot be empty.');
      return;
    }
    const cleanData = JSON.parse(JSON.stringify(data));
    const source = {
      id: `src_${Date.now()}`,
      name: sourceName,
      fileName: file.name,
      origin: origin,
      delimiter: delimiter,
      headerMode: headerMode,
      customHeaders: customHeaders || null,
      rawSize: file.size,
      rowCount: cleanData.length,
      columns: SchemaEngine.createInitialSchema(cleanData),
      createdAt: new Date().toISOString(),
      data: cleanData,
    };
    this.sources.push(source);
    const mainModel = {
      id: `mdl_${Date.now()}`,
      name: 'main',
      sourceId: source.id,
      steps: [] as any[],
      schema: JSON.parse(JSON.stringify(source.columns)),
      data: cleanData,
    };
    const importStep = {
      import: {
        source: sourceName,
        fileName: file.name,
        delimiter: delimiter,
        headerMode: headerMode,
      },
    } as any;
    if (headerMode === 'manual' && customHeaders) importStep.import.customHeaders = customHeaders;
    mainModel.steps.push(importStep);
    const typesStep = { types: {} as any };
    source.columns.forEach((col: any) => {
      typesStep.types[col.name] = col.type;
    });
    mainModel.steps.push(typesStep);
    this.models.push(mainModel);
    this.activeModel = mainModel;
    this.currentData = cleanData;
    this.columns = columns;
    this.viewMode = 'model';
    this.activeStepIndex = mainModel.steps.length - 1;
    this.viewingIntermediate = false;
    this.updatePagination();
    await autoSave(this.sources, this.models);
    console.log(
      `⚡ Import ${origin.toUpperCase()} — ${(performance.now() - start).toFixed(1)}ms — ${
        file.name
      } (${(file.size / 1024).toFixed(1)} KB)`
    );
    this.closeDialog(true);
  }

  // ============================================================
  // Export Handlers
  // ============================================================

  async exportCSV() {
    if (!this.currentData || this.currentData.length === 0) {
      await this.alert('No data to export');
      return;
    }

    const start = performance.now();
    try {
      const csv = Papa.unparse(this.currentData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${this.activeModel.name}_${timestamp}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`⚡ Export CSV — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
    } catch (error: any) {
      console.error('CSV export error:', error);
      await this.alert('Failed to export CSV: ' + error.message);
    }
  }

  async exportWorkflowJSON() {
    if (!this.activeModel) {
      await this.alert('No workflow to export');
      return;
    }

    try {
      const source = this.sources.find((s) => s.id === this.activeModel.sourceId);
      const workflow = {
        version: '1.0',
        name: this.activeModel.name,
        exportedAt: new Date().toISOString(),
        source: {
          id: source?.id,
          name: source?.name,
          columns: source?.columns,
        },
        model: {
          id: this.activeModel.id,
          name: this.activeModel.name,
          steps: this.activeModel.steps,
        },
      };

      const json = JSON.stringify(workflow, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${this.activeModel.name}_workflow_${timestamp}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Exported workflow JSON:', filename);
    } catch (error: any) {
      console.error('Workflow export error:', error);
      await this.alert('Failed to export workflow: ' + error.message);
    }
  }

  async exportDataJSON() {
    if (!this.currentData || this.currentData.length === 0) {
      await this.alert('No data to export');
      return;
    }

    const start = performance.now();
    try {
      const json = JSON.stringify(this.currentData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${this.activeModel.name}_data_${timestamp}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`⚡ Export JSON — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
    } catch (error: any) {
      console.error('JSON export error:', error);
      await this.alert('Failed to export JSON: ' + error.message);
    }
  }

  async copyCSVToClipboard() {
    const pageData = this.getPaginatedData();
    if (!pageData || pageData.length === 0) {
      await this.alert('No data to copy on this page');
      return;
    }

    try {
      const csv = Papa.unparse(pageData);
      await navigator.clipboard.writeText(csv);
      await this.alert('Current page data copied to clipboard (CSV)!');
    } catch (error: any) {
      console.error('Copy to clipboard error:', error);
      await this.alert('Failed to copy to clipboard: ' + error.message);
    }
  }

  async copyJSONToClipboard() {
    const pageData = this.getPaginatedData();
    if (!pageData || pageData.length === 0) {
      await this.alert('No data to copy on this page');
      return;
    }

    try {
      const json = JSON.stringify(pageData, null, 2);
      await navigator.clipboard.writeText(json);
      await this.alert('Current page data copied to clipboard (JSON)!');
    } catch (error: any) {
      console.error('Copy to clipboard error:', error);
      await this.alert('Failed to copy to clipboard: ' + error.message);
    }
  }

  updateImportPreview() {
    if (!this.importFileData) return;
    const file = this.importFileData.file;
    const delimiter = this.importDialogState.delimiter;
    Papa.parse(file, {
      preview: 5,
      header: false,
      skipEmptyLines: true,
      delimiter: delimiter === '\t' ? '\t' : delimiter,
      complete: (previewResult: any) => {
        const firstRow = previewResult.data[0] || [];
        this.importDialogState.rawPreviewData = previewResult.data;
        const newHeaders = firstRow.map((cell: any, i: number) => cell || `Column ${i + 1}`);
        this.importDialogState.originalHeaders = newHeaders;
        this.importDialogState.customHeaders = newHeaders;
        this.updateHeadersForPreview();
      },
      error: async (error: any) => {
        console.error('CSV preview error:', error);
        await this.alert('Error parsing CSV with selected delimiter: ' + error.message);
      },
    });
  }

  updateHeadersForPreview() {
    const {
      rawPreviewData,
      headerMode,
      originalHeaders,
      customHeaders,
      isJson,
      jsonData,
      flattenJson,
      serializeNested,
    } = this.importDialogState;

    if (isJson && jsonData) {
      let processedData = jsonData.slice(0, 5);

      if (flattenJson) {
        processedData = this.flattenData(processedData);
      }

      if (serializeNested) {
        processedData = this.serializeNestedData(processedData);
      }

      const headers = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;
      const { resolvedHeaders, warning } = this.resolveDuplicateHeaders(headers);

      this.importDialogState.previewHeaders = resolvedHeaders;
      this.importDialogState.previewDataRows = processedData.map((row: any) =>
        resolvedHeaders.map((h) => row[h])
      );
      this.importDialogState.duplicateWarning = warning;
      this.importDialogState.customHeaders = resolvedHeaders;
      return;
    }

    if (rawPreviewData.length === 0) {
      this.importDialogState.previewHeaders = [];
      this.importDialogState.previewDataRows = [];
      return;
    }
    let headers;
    if (headerMode === 'first-row') {
      headers = originalHeaders;
      this.importDialogState.previewDataRows = rawPreviewData.slice(1);
    } else if (headerMode === 'auto-generate') {
      const numCols = rawPreviewData[0]?.length || 0;
      headers = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
      this.importDialogState.previewDataRows = rawPreviewData;
    } else if (headerMode === 'manual') {
      headers = customHeaders;
      this.importDialogState.previewDataRows = rawPreviewData;
    }
    const { resolvedHeaders, warning } = this.resolveDuplicateHeaders(headers);
    this.importDialogState.previewHeaders = resolvedHeaders;
    this.importDialogState.duplicateWarning = warning;
    if (headerMode === 'first-row' || headerMode === 'manual') {
      this.importDialogState.customHeaders = resolvedHeaders;
    }
  }

  resolveDuplicateHeaders(headers: string[]) {
    const seen: Record<string, number> = {};
    const duplicates: { name: string; positions: number[] }[] = [];
    const resolvedHeaders: string[] = [];
    headers.forEach((header, index) => {
      let finalHeader = header;
      if (seen[header] !== undefined) {
        if (!duplicates.some((d) => d.name === header)) {
          duplicates.push({ name: header, positions: [seen[header] + 1] });
        }
        const dupEntry = duplicates.find((d) => d.name === header)!;
        dupEntry.positions.push(index + 1);
        let suffix = 2;
        while (seen[`${header}_${suffix}`] !== undefined) suffix++;
        finalHeader = `${header}_${suffix}`;
      }
      seen[finalHeader] = index;
      resolvedHeaders.push(finalHeader);
    });
    let warning = '';
    if (duplicates.length > 0) {
      const dupList = duplicates
        .map((d) => `"${d.name}" at positions ${d.positions.join(', ')}`)
        .join('; ');
      warning = `Found ${duplicates.length} duplicate column name${duplicates.length > 1 ? 's' : ''}: ${dupList}`;
    }
    return { resolvedHeaders, warning };
  }

  // ============================================================
  // EDA & Charts
  // ============================================================

  selectColumn(col: string) {
    this.selectedCell = null;
    this.typeMenuOpen = false;

    if (this.selectedColumn === col) {
      this.selectedColumn = null;
      return;
    }
    this.selectedColumn = col;
    this.$nextTick(() => this.updateToolbarPosition());
    if (this.selectedColumn && this.currentData) {
      let colSchema = null;
      if (this.activeModel?.schema)
        colSchema = this.activeModel.schema.find((c: any) => c.name === this.selectedColumn);
      else if (this.activeSource?.columns)
        colSchema = this.activeSource.columns.find((c: any) => c.name === this.selectedColumn);
      const type = colSchema
        ? colSchema.type
        : SchemaEngine.inferType(
            this.currentData.slice(0, 20).map((r: any) => r[this.selectedColumn!])
          );
      this.edaStats = EDAEngine.calculateStats(this.currentData, this.selectedColumn, type);
      this.edaBrushSelection = null;
      if (['integer', 'float', 'number'].includes(type)) {
        this.$nextTick(() => {
          if (this.edaChartView === 'boxplot')
            ChartsEngine.renderBoxPlot(
              '#eda-boxplot',
              this.currentData!,
              this.selectedColumn!,
              this.theme
            );
          else
            ChartsEngine.renderHistogram(
              '#eda-histogram',
              this.currentData!,
              this.selectedColumn!,
              this.theme,
              (sel: any) => this.handleBrushSelection(sel)
            );
        });
      } else if (['date', 'datetime'].includes(type) && this.edaDateTreatment === 'temporal') {
        this.$nextTick(() =>
          ChartsEngine.renderTemporalChart(
            '#eda-temporal-chart',
            this.currentData!,
            this.selectedColumn!,
            this.theme
          )
        );
      } else {
        this.$nextTick(() =>
          ChartsEngine.renderCategoricalBar(
            '#eda-categorical-bar',
            this.edaStats.topValues,
            this.theme
          )
        );
      }
    } else {
      this.edaStats = null;
      this.edaBrushSelection = null;
    }
  }

  selectEdaStat(label: string, rawValue: any, event: any) {
    const el = event.currentTarget;
    this.selectedCell = null;
    this.selectedCell = {
      col: this.selectedColumn!,
      value: rawValue,
      type: 'number',
      isEda: true,
      edaLabel: label,
    };
    this.$nextTick(() => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const toolbarWidth = 220;
      const windowWidth = window.innerWidth;
      const margin = 12;
      let x = Math.max(
        toolbarWidth / 2 + margin,
        Math.min(windowWidth - toolbarWidth / 2 - margin, center)
      );
      this.cellToolbarPos = { x: x, y: rect.top - 8, arrowOffset: center - x };
    });
  }

  setEdaChartView(view: 'boxplot' | 'histogram') {
    this.edaChartView = view;
    this.edaBrushSelection = null;
    if (this.selectedColumn && this.edaStats) {
      const type = this.edaStats.type;
      if (['integer', 'float', 'number'].includes(type)) {
        this.$nextTick(() => {
          if (view === 'boxplot')
            ChartsEngine.renderBoxPlot(
              '#eda-boxplot',
              this.currentData!,
              this.selectedColumn!,
              this.theme
            );
          else
            ChartsEngine.renderHistogram(
              '#eda-histogram',
              this.currentData!,
              this.selectedColumn!,
              this.theme,
              (sel: any) => this.handleBrushSelection(sel)
            );
        });
      }
    }
  }

  setEdaDateTreatment(treatment: 'temporal' | 'categorical') {
    this.edaDateTreatment = treatment;
    if (this.selectedColumn && this.edaStats && ['date', 'datetime'].includes(this.edaStats.type)) {
      this.$nextTick(() => {
        if (treatment === 'temporal') {
          ChartsEngine.renderTemporalChart(
            '#eda-temporal-chart',
            this.currentData!,
            this.selectedColumn!,
            this.theme
          );
        } else {
          ChartsEngine.renderCategoricalBar(
            '#eda-categorical-bar',
            this.edaStats.topValues,
            this.theme
          );
        }
      });
    }
  }

  handleBrushSelection(selection: any) {
    this.edaBrushSelection = selection;
  }

  async applyBrushFilter() {
    if (!this.edaBrushSelection || !this.selectedColumn) return;
    const { min, max } = this.edaBrushSelection;
    const col = this.selectedColumn;
    const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
    const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);
    const expr = `[${col}] >= ${fmtMin} && [${col}] <= ${fmtMax}`;
    this.filterExpression = expr;
    this.filterError = null;
    await this.applyFilterTransform();
    this.clearColumnSelection();
  }

  // ============================================================
  // Transform Dialog Handlers & Application
  // ============================================================

  getModelMeta(model: any) {
    if (!model) return '';
    const rowCount = model.data ? model.data.length : 0;
    const colCount = model.schema
      ? model.schema.length
      : model.data && model.data.length > 0
        ? Object.keys(model.data[0]).length
        : 0;
    const stepsCount = Math.max(0, (model.steps ? model.steps.length : 0) - 1);
    const stepsText = stepsCount === 1 ? '1 step' : `${stepsCount} steps`;

    return `${rowCount.toLocaleString()} x ${colCount} • ${stepsText}`;
  }

  describeTransform(transform: any) {
    return describeTransform(transform);
  }

  async applyStepResult(transform: any, resultTable: any, closeDialogAfter = true) {
    if (this.editingStepIndex !== null) {
      await this.updateStep(this.editingStepIndex, transform);
      this.closeDialog(true);
      return;
    }

    this.activeModel.steps.push(transform);

    let result;
    if (Array.isArray(resultTable)) {
      result = TransformResult.createFromData(resultTable, this.activeModel.schema, transform);
    } else {
      result = TransformResult.create(resultTable, this.activeModel.schema, transform);
    }

    this.currentData = result.data;
    this.activeModel.schema = result.schema;
    this.columns = result.columns;
    this.activeModel.data = JSON.parse(JSON.stringify(result.data));

    const validation = TransformResult.validate(result);
    if (!validation.valid) {
      console.warn('applyStepResult: Result validation warnings', validation.errors);
    }

    this.activeStepIndex = this.activeModel.steps.length - 1;
    this.viewingIntermediate = false;
    this.viewingSchema = null;

    this.updatePagination();
    await autoSave(this.sources, this.models);

    if (closeDialogAfter) {
      this.closeDialog(true);
    }
  }

  async runTransform(label: string, transform: any, closeDialog = true) {
    await this.startTransformation(label);
    try {
      const table = aq.from(this.currentData!);
      const context = { sources: this.sources, models: this.models };
      const result = applyTransform(table, transform, this.columns, context);
      await this.applyStepResult(transform, result, closeDialog);
      return true;
    } catch (error: any) {
      console.error(`${label} error:`, error);
      await this.alert(`Error applying ${label.toLowerCase()}: ${error.message}`);
      return false;
    } finally {
      this.endTransformation();
    }
  }

  validateExpression(expr: string): string | null {
    const trimmed = expr.trim();
    if (!trimmed) return null;
    try {
      const ast = parseExpression(trimmed);
      const validation = validateAST(ast, this.columns);
      return validation.error ? formatError(validation.error, trimmed) : null;
    } catch (error: any) {
      return formatError(error, trimmed);
    }
  }

  getColumnType(colName: string) {
    const schema = this.getActiveSchema();
    if (schema) {
      const col = schema.find((c) => c.name === colName);
      if (col) return col.type;
    }
    if (this.activeSource?.columns) {
      const col = this.activeSource.columns.find((c: any) => c.name === colName);
      if (col) return col.type || col.inferredType;
    }
    return 'string';
  }

  isComparable(type?: string) {
    return ['number', 'integer', 'float', 'date', 'datetime'].includes(type || '');
  }

  isDateType(type?: string) {
    return ['date', 'datetime'].includes(type || '');
  }

  getTypeIcon(colName: string) {
    const type = this.getColumnType(colName);
    switch (type) {
      case 'date':
        return 'ix:calendar';
      case 'datetime':
        return 'ix:calendar';
      case 'time':
        return 'carbon:time';
      case 'float':
      case 'number':
        return 'ix:data-type-double';
      case 'string':
        return 'ix:data-type-string';
      case 'boolean':
        return 'ix:data-type-boolean';
      case 'integer':
        return 'ix:data-type-integer';
      default:
        return 'ix:data-type-string';
    }
  }

  getCellClass(value: any, column: string) {
    const type = this.getColumnType(column);
    const classes: string[] = ['data-table__cell'];

    if (['number', 'integer', 'float'].includes(type)) {
      classes.push('data-table__cell--number');
    }

    if (value === null || value === undefined || value === '') {
      classes.push('data-table__cell--empty');
    } else if (value === 0 || value === '0') {
      classes.push('data-table__cell--zero');
    }

    return classes.join(' ');
  }

  formatCellValue(value: any) {
    if (value === null || value === undefined || value === '') return 'null';
    return value;
  }

  getTypeIndicator(colName: string) {
    const type = this.getColumnType(colName);
    switch (type) {
      case 'string':
        return 'Abc';
      case 'integer':
        return '#';
      case 'float':
        return '1.1';
      case 'boolean':
        return '✓';
      case 'date':
        return '📅';
      case 'datetime':
        return '🕒';
      default:
        return 'Abc';
    }
  }

  quoteColumnRef(colName: string) {
    if (/[\s\-+*/()[\]{}]/.test(colName)) {
      return `[${colName}]`;
    }
    return colName;
  }

  escapePattern(pattern: string) {
    return pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  formatLiteral(value: any, type?: string) {
    if (value === null || value === undefined) return 'null';
    if (type === 'number' || type === 'integer' || type === 'float' || typeof value === 'number')
      return String(value);
    if (
      value instanceof Date ||
      ((type === 'date' || type === 'datetime') && typeof value === 'string')
    ) {
      const d = value instanceof Date ? value : new Date(value);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        // If it's specifically a date type OR it has no time components, just return the date
        if (
          type === 'date' ||
          (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0)
        ) {
          return `"${dateStr}"`;
        }
        return `"${dateStr}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}"`;
      }
    }
    return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  preparePreviewData(table: any, limit = 100) {
    return {
      rows: table.slice(0, limit).objects(),
      columns: table.columnNames(),
      totalRows: table.numRows(),
    };
  }

  // Date Operations

  // ============================================================
  // Dedupe Dialog Methods
  // ============================================================

  // ============================================================
  // Column Editor Methods
  // ============================================================

  // ============================================================
  // Pivot Transform
  // ============================================================

  // ============================================================
  // Dialog Management
  // ============================================================

  getDialogState(dialog: string) {
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
          rightModel: this.joinDialogState.rightModel?.id,
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

  reSnapshot() {
    if (this.activeDialog) {
      this.dialogSnapshot = JSON.stringify(this.getDialogState(this.activeDialog));
    }
  }

  openDialog(dialogName: string, section?: string) {
    this.activeDialog = dialogName;
    this.initDialogState(dialogName, section);
    this.clearColumnSelection();
    this.reSnapshot();

    // Update URL for navigable pages
    if (['about', 'reference', 'expressions', 'settings'].includes(dialogName)) {
      setUrlState({ page: dialogName, section });
    }
  }

  handleHashChange() {
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

  private initDialogState(dialogName: string, _section?: string) {
    // _section can be used for deep-linking within reference pages in the future
    if (dialogName === 'filter') {
      this.filterExpression = '';
      this.filterError = null;
    } else if (dialogName === 'join') {
      // @ts-ignore
      this.initializeJoinDialog();
    } else if (dialogName === 'derive') {
      this.deriveDialogState = { columnName: '', expression: '', error: null };
    } else if (dialogName === 'sort') {
      this.sortDialogState = { field: this.columns[0] || '', order: 'asc' };
    } else if (dialogName === 'sliceRows') {
      this.sliceRowsDialogState = { count: 10, mode: 'first' };
    } else if (dialogName === 'index') {
      this.indexDialogState = { columnName: 'row_index', startFrom: 1 };
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
      this.initializePivotDialog();
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
          // @ts-ignore
          const detected = this.detectDelimiter(this.splitDialogState.column);
          if (detected) {
            this.splitDialogState.delimiter = detected.char;
            this.splitDialogState.isRegex = detected.isRegex;
            this.splitDialogState.autoDetectedDelimiter = detected.name;
          }
          // @ts-ignore
          this.updateSplitPreview();
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
      const dateColumns = this.getDateColumns();
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
      this.$nextTick(() => this.updateDatePreview());
    } else if (dialogName === 'dedupe') {
      this.dedupeDialogState = {
        selectedColumns: this.columns.map(() => true),
        useAllColumns: true,
        duplicateCount: 0,
        mode: 'remove',
      };
      this.$nextTick(() => this.updateDedupePreview());
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

  isSlidePanel(dialog: string | null): boolean {
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

  isCenteredModal(dialog: string | null): boolean {
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

  getDialogTitle(): string {
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

  getDialogButtonText(): string {
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

  getAboutContent(): string {
    return aboutHtml;
  }

  getExpressionsContent(): string {
    return expressionsHtml;
  }

  // Preview panel helper methods
  hasPreviewData(): boolean {
    return this.previewState.rows.length > 0;
  }

  getPreviewTitle(): string {
    return this.previewState.title;
  }

  getPreviewStats(): string {
    return this.previewState.stats;
  }

  getPreviewColumns(): string[] {
    return this.previewState.columns;
  }

  getPreviewRows(): any[] {
    return this.previewState.rows;
  }

  formatPreviewCell(row: any, col: string): string {
    const val = row[col];
    if (val == null) return '—';
    if (typeof val === 'boolean') return val ? '✓' : '✗';
    return String(val);
  }

  clearPreview(): void {
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

  isNewPreviewColumn(col: string): boolean {
    return this.previewState.newColumns.includes(col);
  }

  activeDialogError(): boolean {
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

  async applyActiveTransform() {
    switch (this.activeDialog) {
      case 'filter':
        await this.applyFilterTransform();
        break;
      case 'sort':
        await this.applySortTransform();
        break;
      case 'sliceRows':
        await this.applySliceRowsTransform();
        break;
      case 'index':
        await this.applyIndexTransform();
        break;
      case 'split':
        await this.applySplitTransform();
        break;
      case 'derive':
        await this.applyDeriveTransform();
        break;
      case 'regexpMatch':
        await this.applyRegexpMatchTransform();
        break;
      case 'regexpExtract':
        await this.applyRegexpExtractTransform();
        break;
      case 'date':
        await this.applyDateTransform();
        break;
      case 'fold':
        await this.applyFoldTransform();
        break;
      case 'pivot':
        await this.applyPivotTransform();
        break;
      case 'aggregate':
        await this.applyAggregateTransform();
        break;
      case 'join':
        await this.applyJoinTransform();
        break;
      case 'replace':
        await this.applyReplaceTransform();
        break;
      case 'dedupe':
        await this.applyDedupeTransform();
        break;
      case 'column-editor':
        await this.applyColumnEditorTransform();
        break;
      case 'import-csv':
        this.confirmImport();
        break;
      case 'import-url':
        await this.fetchAndImportFromUrl();
        break;
    }
  }

  hasUnsavedChanges() {
    if (!this.activeDialog || this.dialogSnapshot === null) return false;
    const current = this.getDialogState(this.activeDialog);
    if (current === null) return false;
    return JSON.stringify(current) !== this.dialogSnapshot;
  }

  async closeDialog(force = false) {
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

  resetDialogStates() {
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

  // ============================================================
  // Interaction Handlers
  // ============================================================

  handleBodyClick(event: any) {
    if (
      this.selectedColumn &&
      !event.target.closest('.data-table__header') &&
      !event.target.closest('.floating-toolbar') &&
      !event.target.closest('.modal')
    ) {
      this.selectedColumn = null;
    }
    if (
      this.typeMenuOpen &&
      !event.target.closest('.type-menu') &&
      !event.target.closest('.type-indicator')
    ) {
      this.typeMenuOpen = false;
      this.typeMenuCol = null;
    }
  }

  openTypeMenu(col: string, event: any) {
    this.typeMenuCol = col;
    this.typeMenuOpen = true;
    this.selectedColumn = null;
    this.selectedCell = null;
    const rect = event.target.getBoundingClientRect();
    const menuWidth = 140; // Approximate width of type menu
    const margin = 8;
    const windowWidth = window.innerWidth;
    // Clamp x position to keep menu within viewport
    const x = Math.min(rect.left, windowWidth - menuWidth - margin);
    this.typeMenuPos = { x, y: rect.bottom + 4 };
  }

  async changeColumnType(col: string, newType: string) {
    this.typeMenuOpen = false;
    let typeToSet = newType;
    if (newType === 'auto' && this.currentData) {
      const sample = this.currentData.slice(0, 50).map((row) => row[col]);
      typeToSet = SchemaEngine.inferType(sample);
    }
    const typeStep = { types: { [col]: typeToSet } };
    // @ts-ignore
    await this.applyStepResult(typeStep, this.currentData);
  }

  async autoDetectSchema() {
    if (!this.currentData || !this.columns) return;
    const types: Record<string, string> = {};
    this.columns.forEach((col) => {
      const sample = this.currentData!.slice(0, 50).map((row) => row[col]);
      types[col] = SchemaEngine.inferType(sample);
    });
    const typeStep = { types };
    // @ts-ignore
    await this.applyStepResult(typeStep, this.currentData);
  }

  clearColumnSelection() {
    this.selectedColumn = null;
    this.selectedCell = null;
    this.edaStats = null;
    this.edaBrushSelection = null;
  }

  private calculateToolbarPosition(rect: DOMRect, toolbarWidth: number) {
    const center = rect.left + rect.width / 2;
    const windowWidth = window.innerWidth;
    const margin = 12;
    let x = Math.max(
      toolbarWidth / 2 + margin,
      Math.min(windowWidth - toolbarWidth / 2 - margin, center)
    );
    return { x: x, y: rect.top - 8, arrowOffset: center - x };
  }

  updateToolbarPosition() {
    if (this.selectedColumn) {
      const header = document.querySelector(
        `.data-table__header[data-col="${this.selectedColumn}"]`
      );
      if (header) {
        const rect = header.getBoundingClientRect();
        this.columnToolbarPos = this.calculateToolbarPosition(rect, 200);
      }
    }
    if (this.selectedCell) {
      if (this.selectedCell.isEda) return;
      const cell = document.querySelector(
        `.data-table__cell[data-col="${this.selectedCell.col}"][data-row="${this.selectedCell.rowIdx}"]`
      );
      if (cell) {
        const rect = cell.getBoundingClientRect();
        const toolbarWidth = ['number', 'integer', 'float'].includes(this.selectedCell.type)
          ? 220
          : 80;
        this.cellToolbarPos = this.calculateToolbarPosition(rect, toolbarWidth);
      }
    }
  }

  selectCell(col: string, value: any, rowIdx: number) {
    this.selectedColumn = null;
    this.typeMenuOpen = false;
    let type = 'string';
    if (this.activeModel?.schema) {
      const colInfo = this.activeModel.schema.find((c: any) => c.name === col);
      if (colInfo) type = colInfo.type;
    } else if (this.activeSource) {
      const colInfo = this.activeSource.columns.find((c: any) => c.name === col);
      if (colInfo) type = colInfo.type || colInfo.inferredType;
    } else {
      type = typeof value === 'number' ? 'number' : 'string';
    }
    this.selectedCell = { col, value, type, rowIdx };
    this.$nextTick(() => this.updateToolbarPosition());
  }

  async applyQuickCellFilter(op: string) {
    if (!this.selectedCell) return;
    const { col, value, type } = this.selectedCell;
    let expr = '';
    const formattedValue = this.formatLiteral(value, type);
    if (op === 'exact') expr = `[${col}] == ${formattedValue}`;
    else if (op === 'not') expr = `[${col}] != ${formattedValue}`;
    else if (op === 'gt') expr = `[${col}] > ${formattedValue}`;
    else if (op === 'gte') expr = `[${col}] >= ${formattedValue}`;
    else if (op === 'lt') expr = `[${col}] < ${formattedValue}`;
    else if (op === 'lte') expr = `[${col}] <= ${formattedValue}`;
    if (expr) {
      this.filterExpression = expr;
      this.filterError = null;
      // @ts-ignore
      await this.applyFilterTransform();
    }
    this.selectedCell = null;
  }

  async quickSort(order: 'asc' | 'desc') {
    if (!this.selectedColumn) return;
    this.sortDialogState.field = this.selectedColumn;
    this.sortDialogState.order = order;
    // @ts-ignore
    await this.applySortTransform();
    this.selectedColumn = null;
  }

  quickFilter() {
    if (!this.selectedColumn) return;
    this.openDialog('filter');
    this.filterExpression = `${this.selectedColumn} == `;
    this.reSnapshot();
    setTimeout(() => {
      const input = document.querySelector(
        '.modal input[x-model="filterExpression"]'
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 50);
  }

  quickRename() {
    if (!this.selectedColumn) return;
    const col = this.selectedColumn;
    this.openDialog('rename');
    setTimeout(() => {
      const input = document.querySelector(`.modal input[data-col="${col}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  async quickRemove() {
    if (!this.selectedColumn) return;
    const col = this.selectedColumn;
    if (await this.confirm(`Are you sure you want to remove column "${col}"?`)) {
      await this.runTransform('Remove Column', { remove: [col] });
      this.selectedColumn = null;
    }
  }

  quickDate() {
    if (!this.selectedColumn) return;
    this.openDialog('date');
    this.selectedColumn = null;
  }

  quickSplit() {
    if (!this.selectedColumn) return;
    const col = this.selectedColumn;
    this.openDialog('split');
    this.splitDialogState.column = col;
    this.reSnapshot();
    // @ts-ignore
    const detected = this.detectDelimiter(col);
    if (detected) {
      this.splitDialogState.delimiter = detected.char;
      this.splitDialogState.isRegex = detected.isRegex;
      this.splitDialogState.autoDetectedDelimiter = detected.name;
    } else {
      this.splitDialogState.autoDetectedDelimiter = null;
    }
    setTimeout(() => {
      // @ts-ignore
      this.updateSplitPreview();
    }, 50);
  }

  quickReplace() {
    if (!this.selectedCell) return;
    const { col, value } = this.selectedCell;
    this.openDialog('replace');
    this.replaceDialogState = { column: col, findValue: value, replaceValue: '' };
    this.reSnapshot();
    setTimeout(() => {
      const input = document.querySelector(
        '.slide-panel input[x-model="replaceDialogState.replaceValue"]'
      ) as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  quickDedupe() {
    if (!this.selectedColumn) return;
    const col = this.selectedColumn;
    this.openDialog('dedupe');
    // Pre-select only this column, switch to specific mode
    this.dedupeDialogState.useAllColumns = false;
    this.dedupeDialogState.selectedColumns = this.columns.map((c) => c === col);
    this.reSnapshot();
    this.updateDedupePreview();
  }

  // ============================================================
  // Pagination
  // ============================================================

  updatePagination() {
    if (!this.currentData) {
      this.totalPages = 1;
      this.currentPage = 1;
      return;
    }
    const totalRows = this.currentData.length;
    this.totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getPaginatedData(): any[] {
    if (!this.currentData || this.currentData.length === 0) return [];
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.currentData.slice(start, end);
  }

  getPaginationInfo(): string {
    if (!this.currentData || this.currentData.length === 0) return 'No data';
    const totalRows = this.currentData.length;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, totalRows);
    return `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}`;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.clearColumnSelection();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.clearColumnSelection();
    }
  }

  goToFirstPage() {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      this.clearColumnSelection();
    }
  }

  goToLastPage() {
    if (this.currentPage !== this.totalPages) {
      this.currentPage = this.totalPages;
      this.clearColumnSelection();
    }
  }

  updatePageSize(newSize: number | string) {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    if (isNaN(size) || size < 1) return;
    this.pageSize = size;
    this.clearColumnSelection();
    this.updatePagination();
    updateUXSetting('pagination', 'pageSize', size);
    this.currentPage = 1;
    this.updatePagination();
  }

  // ============================================================
  // JSON Editor
  // ============================================================

  getStepsJson(): string {
    if (!this.activeModel?.steps) return '';
    return JSON.stringify({ transforms: this.activeModel.steps }, null, 2);
  }

  enterJsonEditMode() {
    if (!this.activeModel?.steps) return;
    this.jsonEditBackup = JSON.parse(JSON.stringify(this.activeModel.steps));
    this.jsonEditContent = this.getStepsJson();
    this.jsonEditError = null;
    this.jsonEditMode = true;
  }

  cancelJsonEdit() {
    this.jsonEditMode = false;
    this.jsonEditContent = '';
    this.jsonEditError = null;
    this.jsonEditBackup = null;
  }

  validateJsonEdit(): boolean {
    try {
      const parsed = JSON.parse(this.jsonEditContent);
      if (!parsed.transforms || !Array.isArray(parsed.transforms)) {
        this.jsonEditError = 'Invalid structure: Expected { "transforms": [...] }';
        return false;
      }
      if (parsed.transforms.length === 0) {
        this.jsonEditError = 'At least one step (import) is required';
        return false;
      }
      if (!parsed.transforms[0].import) {
        this.jsonEditError = 'First step must be an import step';
        return false;
      }
      this.jsonEditError = null;
      return true;
    } catch (error: any) {
      this.jsonEditError = `JSON syntax error: ${error.message}`;
      return false;
    }
  }

  async applyJsonEdit(): Promise<boolean> {
    if (!this.validateJsonEdit()) return false;

    const parsed = JSON.parse(this.jsonEditContent);
    const newSteps = parsed.transforms;

    const backup = {
      steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
      data: JSON.parse(JSON.stringify(this.activeModel.data)),
      schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
    };

    try {
      this.activeModel.steps = newSteps;
      this.activeModel.steps = [...this.activeModel.steps];

      const lastStepIndex = this.activeModel.steps.length - 1;
      const result = this.computeUpToStep(lastStepIndex);

      this.activeModel.data = JSON.parse(JSON.stringify(result.data));
      this.activeModel.schema = result.schema;
      this.currentData = this.activeModel.data;
      this.columns = result.columns;

      this.viewFinalResult();
      await autoSave(this.sources, this.models);

      this.jsonEditMode = false;
      this.jsonEditContent = '';
      this.jsonEditError = null;
      this.jsonEditBackup = null;
      this.showSuccess('JSON changes applied successfully');
      return true;
    } catch (error: any) {
      console.error('Error applying JSON edit:', error);
      this.activeModel.steps = backup.steps;
      this.activeModel.data = backup.data;
      this.activeModel.schema = backup.schema;
      this.currentData = this.activeModel.data;
      this.columns = this.activeModel.schema.map((c: any) => c.name);

      const errorMatch = error.message.match(/step (\d+)/i);
      let stepIdx = null;
      let stepDesc = null;
      if (errorMatch) {
        stepIdx = parseInt(errorMatch[1], 10);
        if (newSteps[stepIdx]) {
          stepDesc = describeTransform(newSteps[stepIdx]);
        }
      }
      this.showError('Failed to apply JSON changes', `${error.message}`, {
        stepIndex: stepIdx,
        stepDescription: stepDesc,
      });
      this.jsonEditError = error.message;
      return false;
    }
  }

  // ============================================================
  // Notifications
  // ============================================================

  showError(title: string, message: string, options: any = {}) {
    const { stepIndex, stepDescription, duration = 0 } = options;
    let stepInfo = null;
    if (stepIndex !== undefined && stepDescription) {
      stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
    }
    this._addNotification('error', title, message, stepInfo, duration);
  }

  showWarning(title: string, message: string, options: any = {}) {
    const { duration = 6000 } = options;
    this._addNotification('warning', title, message, null, duration);
  }

  showSuccess(message: string, options: any = {}) {
    const { duration = 3000 } = options;
    this._addNotification('success', 'Success', message, null, duration);
  }

  _addNotification(
    type: string,
    title: string,
    message: string,
    stepInfo: string | null,
    duration: number
  ) {
    const id = ++this.notificationIdCounter;
    const notification = {
      id,
      type,
      title,
      message,
      stepInfo,
      visible: false,
    };
    this.notifications.push(notification);

    setTimeout(() => {
      const n = this.notifications.find((n) => n.id === id);
      if (n) n.visible = true;
    }, 10);

    if (duration > 0) {
      setTimeout(() => this.dismissNotification(id), duration);
    }
  }

  dismissNotification(id: number) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.visible = false;
      setTimeout(() => {
        this.notifications = this.notifications.filter((n) => n.id !== id);
      }, 200);
    }
  }

  getNotificationIcon(type: string) {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'success':
        return '✓';
      default:
        return 'ℹ️';
    }
  }

  // ============================================================
  // Message Box (Custom Alert/Confirm/Prompt)
  // ============================================================

  alert(message: string, title = 'Alert'): Promise<boolean> {
    return new Promise((resolve) => {
      this.messageBox = {
        visible: true,
        title,
        message,
        type: 'alert',
        inputValue: '',
        resolve,
      };
    });
  }

  confirm(message: string, title = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      this.messageBox = {
        visible: true,
        title,
        message,
        type: 'confirm',
        inputValue: '',
        resolve,
      };
    });
  }

  prompt(message: string, defaultValue = '', title = 'Prompt'): Promise<string | null> {
    return new Promise((resolve) => {
      this.messageBox = {
        visible: true,
        title,
        message,
        type: 'prompt',
        inputValue: defaultValue,
        resolve,
      };
    });
  }

  closeMessageBox(result: boolean) {
    const { resolve, type, inputValue } = this.messageBox;
    this.messageBox.visible = false;

    if (resolve) {
      if (type === 'prompt') {
        resolve(result ? inputValue : null);
      } else if (type === 'confirm') {
        resolve(result);
      } else {
        resolve(true); // alert always resolves to true
      }
    }
  }

  getMessageBoxIcon() {
    switch (this.messageBox.type) {
      case 'alert':
        return 'carbon:information-filled';
      case 'confirm':
        return 'carbon:help-filled';
      case 'prompt':
        return 'carbon:edit';
      default:
        return 'carbon:information-filled';
    }
  }

  // ============================================================
  // Step Management
  // ============================================================

  /**
   * Get the currently active schema (intermediate or final)
   */
  getActiveSchema(): ColumnSchema[] {
    if (this.viewingIntermediate && this.viewingSchema) {
      return this.viewingSchema;
    }
    return this.activeModel?.schema || [];
  }

  /**
   * Compute data state for a model up to a specific step index
   */
  computeModelUpToStep(model: any, stepIndex: number) {
    const start = performance.now();

    const source = this.sources.find((s) => s.id === model.sourceId);
    if (!source) throw new Error('Source not found for model');

    let table = (aq as any).from(source.data);
    let schema = JSON.parse(JSON.stringify(source.columns));
    let columns = schema.map((c: any) => c.name);

    for (let i = 0; i <= stepIndex; i++) {
      const step = model.steps[i];
      if (step.import) continue;

      try {
        const context = { sources: this.sources, models: this.models };
        table = applyTransform(table, step, columns, context);

        const stepResult = TransformResult.create(table, schema, step);
        schema = stepResult.schema;
        columns = stepResult.columns;
      } catch (error: any) {
        console.error(`Error applying step ${i}:`, error);
        const stepDescription = describeTransform(step);
        const enhancedError = new Error(
          `Step ${i + 1} failed: ${stepDescription}\n\n${error.message}`
        ) as any;
        enhancedError.stepIndex = i;
        enhancedError.stepDescription = stepDescription;
        throw enhancedError;
      }
    }

    const result = {
      data: table.objects(),
      schema: schema,
      columns: columns,
    };

    const validation = TransformResult.validate(result);
    if (!validation.valid) {
      console.warn('computeModelUpToStep: Result validation warnings', validation.errors);
    }

    perfLogger.log(
      `Compute model '${model.name}' to step ${stepIndex + 1}`,
      source.data,
      result.data,
      performance.now() - start
    );
    return result;
  }

  computeUpToStep(stepIndex: number) {
    return this.computeModelUpToStep(this.activeModel, stepIndex);
  }

  viewStep(stepIndex: number) {
    try {
      const result = this.computeUpToStep(stepIndex);
      this.currentData = result.data;
      this.columns = result.columns;
      this.viewingSchema = result.schema;
      this.activeStepIndex = stepIndex;
      this.viewingIntermediate = stepIndex < this.activeModel.steps.length - 1;
      this.updatePagination();
    } catch (error: any) {
      console.error('Error computing step:', error);
      this.showError('Error viewing step', `Step ${stepIndex + 1}: ${error.message}`, {
        stepIndex: error.stepIndex ?? stepIndex,
        stepDescription: error.stepDescription,
      });
    }
  }

  viewFinalResult() {
    if (!this.activeModel) return;
    this.currentData = this.activeModel.data;
    if (this.activeModel.schema && this.activeModel.schema.length > 0) {
      this.columns = this.activeModel.schema.map((c: any) => c.name);
    } else if (this.currentData && this.currentData.length > 0) {
      this.columns = Object.keys(this.currentData[0]);
    } else {
      this.columns = [];
    }
    this.activeStepIndex =
      this.activeModel.steps?.length > 0 ? this.activeModel.steps.length - 1 : null;
    this.viewingIntermediate = false;
    this.viewingSchema = null;
    this.updatePagination();
  }

  editStep(stepIndex: number) {
    const step = this.activeModel.steps[stepIndex];
    if (!step || step.import || step.types) return;

    this.editingStepIndex = stepIndex;

    if (step.filter) {
      this.openDialog('filter');
      this.filterExpression = step.filter;
    } else if (step.derive) {
      const [colName, expr] = Object.entries(step.derive)[0];
      this.openDialog('derive');
      this.deriveDialogState = {
        columnName: colName,
        expression: expr as string,
        error: null,
      };
    } else if (step.select) {
      // Migrate to column-editor: select defines order and which columns to keep
      this.openDialog('column-editor');
      const selectedSet = new Set(step.select);
      this.columnEditorState = {
        mode: 'list',
        textSubMode: 'rename',
        columns: step.select
          .map((col: string) => ({
            original: col,
            renamed: col,
            selected: true,
          }))
          .concat(
            this.columns
              .filter((c) => !selectedSet.has(c))
              .map((col) => ({
                original: col,
                renamed: col,
                selected: false,
              }))
          ),
        textValue: '',
        textError: null,
        patternText: '',
        patternMode: 'include',
        patternMatchType: 'prefix',
        draggedIndex: null,
      };
    } else if (step.rename) {
      // Migrate to column-editor: rename shows current columns with edited names
      this.openDialog('column-editor');
      this.columnEditorState = {
        mode: 'list',
        textSubMode: 'rename',
        columns: this.columns.map((col) => ({
          original: col,
          renamed: step.rename[col] || col,
          selected: true,
        })),
        textValue: '',
        textError: null,
        patternText: '',
        patternMode: 'include',
        patternMatchType: 'prefix',
        draggedIndex: null,
      };
    } else if (step.remove) {
      // Migrate to column-editor: remove shows columns with removed ones deselected
      this.openDialog('column-editor');
      const removedSet = new Set(step.remove);
      this.columnEditorState = {
        mode: 'list',
        textSubMode: 'rename',
        columns: this.columns.map((col) => ({
          original: col,
          renamed: col,
          selected: !removedSet.has(col),
        })),
        textValue: '',
        textError: null,
        patternText: '',
        patternMode: 'include',
        patternMatchType: 'prefix',
        draggedIndex: null,
      };
    } else if (step.sort) {
      this.openDialog('sort');
      this.sortDialogState = { field: step.sort.field, order: step.sort.order };
    } else if (step.aggregate) {
      this.openDialog('aggregate');
      const aggregations = Object.entries(step.aggregate.rollup).map(([output, opStr]) => {
        const match = (opStr as string).match(/op\.(\w+)\('([^']+)'\)/);
        if (match) {
          return { output, func: match[1], col: match[2] };
        }
        if ((opStr as string) === 'op.count()') {
          return { output, func: 'count', col: '' };
        }
        return { output, func: 'custom', col: '' };
      });
      this.aggregateDialogState = {
        groupBy: [...step.aggregate.groupby],
        aggregations,
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };
    } else if (step.join) {
      this.openDialog('join');
      this.joinDialogState.rightModel = step.join.right;
      this.joinDialogState.joinType = step.join.how;
      this.joinDialogState.keyPairs = step.join.on;
      this.joinDialogState.suffixes = step.join.suffixes || ['_x', '_y'];
      this.onJoinTargetChange();
    } else if (step.fold) {
      this.openDialog('fold');
      // When editing, we use 'fold' mode since we're storing the columns to fold
      this.foldDialogState = {
        keyName: step.fold.as[0],
        valueName: step.fold.as[1],
        selectedColumns: this.columns.map((c) => step.fold.columns.includes(c)),
        mode: 'fold',
      };
    } else if (step.pivot) {
      this.openDialog('pivot');
      this.pivotDialogState = {
        rowColumns: step.pivot.rows || [],
        columnColumn: step.pivot.keys,
        valueColumn: step.pivot.values,
        aggregation: step.pivot.aggregation || 'sum',
        options: {
          sort: step.pivot.options?.sort ?? true,
          limit: step.pivot.options?.limit || null,
        },
        uniqueValueCount: 0,
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };
      this.onPivotConfigChange();
    } else if (step.replace) {
      this.openDialog('replace');
      this.replaceDialogState = {
        column: step.replace.column,
        findValue: step.replace.find,
        replaceValue: step.replace.replace,
      };
    } else if (step.split) {
      this.openDialog('split');
      this.splitDialogState = {
        column: step.split.column,
        delimiter: step.split.delimiter,
        isRegex: !!step.split.isRegex,
        mode: step.split.mode || 'spread',
        maxColumns: step.split.maxColumns || 10,
        keepOriginal: !!step.split.keepOriginal,
        error: null,
        previewData: [],
        previewColumns: [],
        autoDetectedDelimiter: null,
        columnRenames: {},
      };
      this.updateSplitPreview();
    } else if (step.dedupe) {
      this.openDialog('dedupe');
      const dedupeColumns = step.dedupe.columns || [];
      this.dedupeDialogState = {
        useAllColumns: dedupeColumns.length === 0,
        selectedColumns: this.columns.map((c) => dedupeColumns.includes(c)),
        duplicateCount: 0,
        mode: step.dedupe.mode || 'remove',
      };
      this.updateDedupePreview();
    }
  }

  cancelEdit() {
    this.editingStepIndex = null;
    this.closeDialog(true);
  }

  @Transformation('Removing step...')
  async removeStep(stepIndex: number) {
    if (this.activeModel.steps[stepIndex].import) {
      this.showWarning('Cannot remove import step', 'The import step is required.');
      return;
    }

    const step = this.activeModel.steps[stepIndex];
    const isLastStep = stepIndex === this.activeModel.steps.length - 1;

    // If it's the last step, use simple confirm
    if (isLastStep) {
      if (!(await this.confirm(`Remove step "${describeTransform(step)}"?`))) return;
      await this.executeStepRemoval(stepIndex, 'single');
    } else {
      // For non-last steps, show the step removal modal
      const removeMode = await this.showStepRemovalModal(stepIndex);
      if (!removeMode) return;
      await this.executeStepRemoval(stepIndex, removeMode);
    }
  }

  showStepRemovalModal(stepIndex: number): Promise<'single' | 'all' | null> {
    const step = this.activeModel.steps[stepIndex];
    const affectedSteps = this.activeModel.steps
      .slice(stepIndex + 1)
      .map((s: any) => describeTransform(s));

    return new Promise((resolve) => {
      this.stepRemovalModal = {
        visible: true,
        stepIndex,
        stepName: describeTransform(step),
        affectedSteps,
        removeMode: 'all',
        resolve,
      };
    });
  }

  closeStepRemovalModal(confirmed: boolean) {
    if (this.stepRemovalModal.resolve) {
      this.stepRemovalModal.resolve(confirmed ? this.stepRemovalModal.removeMode : null);
    }
    this.stepRemovalModal.visible = false;
  }

  async executeStepRemoval(stepIndex: number, mode: 'single' | 'all') {
    try {
      if (mode === 'all') {
        // Remove this step and all following steps
        this.activeModel.steps.splice(stepIndex);
      } else {
        // Remove just this step
        this.activeModel.steps.splice(stepIndex, 1);
      }
      this.activeModel.steps = [...this.activeModel.steps];

      const result = this.computeUpToStep(this.activeModel.steps.length - 1);
      this.activeModel.data = JSON.parse(JSON.stringify(result.data));
      this.activeModel.schema = result.schema;
      this.currentData = this.activeModel.data;
      this.columns = result.columns;

      this.viewFinalResult();
      await autoSave(this.sources, this.models);
    } catch (error: any) {
      this.showError('Error recomputing after removal', error.message);
    }
  }

  @Transformation('Updating step...')
  async updateStep(stepIndex: number, newTransform: any) {
    const backup = {
      steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
      data: JSON.parse(JSON.stringify(this.activeModel.data)),
      schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
    };

    try {
      this.activeModel.steps[stepIndex] = newTransform;
      this.activeModel.steps = [...this.activeModel.steps];

      const result = this.computeUpToStep(this.activeModel.steps.length - 1);
      this.activeModel.data = JSON.parse(JSON.stringify(result.data));
      this.activeModel.schema = result.schema;
      this.currentData = this.activeModel.data;
      this.columns = result.columns;

      this.viewFinalResult();
      await autoSave(this.sources, this.models);
      this.editingStepIndex = null;
    } catch (error: any) {
      this.activeModel.steps = backup.steps;
      this.activeModel.data = backup.data;
      this.activeModel.schema = backup.schema;
      this.currentData = this.activeModel.data;
      this.columns = this.activeModel.schema.map((c: any) => c.name);
      this.editingStepIndex = null;
      this.showError('Error updating step', error.message);
    }
  }
}
