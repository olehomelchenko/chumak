import { loadUXSettings, updateUXSetting, UXSettings } from './core/ux-settings';
import { loadInitialData } from './core/storage';
import { getUrlState, setUrlState } from './core/url-state';
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
import * as ImportHandlers from './app/handlers/import-handlers';
import * as StepHandlers from './app/handlers/step-handlers';
import * as DialogHandlers from './app/handlers/dialog-handlers';
import * as NotificationHandlers from './app/handlers/notification-handlers';
import * as EDAHandlers from './app/handlers/eda-handlers';
import * as InteractionHandlers from './app/handlers/interaction-handlers';
import * as PaginationHandlers from './app/handlers/pagination-handlers';
import * as HelperHandlers from './app/handlers/helper-handlers';
import * as JsonHandlers from './app/handlers/json-handlers';
import { SchemaEngine, ColumnSchema, TransformStep } from './core/schema-engine';
import { AppStore, ViewMode } from './app/stores/AppStore';
import { ModelService } from './app/services/ModelService';
import { ImportService } from './app/services/ImportService';
import { ExportService } from './app/services/ExportService';
import { EDAStats } from './core/eda-engine';
import {
  AppState,
  Source,
  Model,
  Notification,
  AggregateDialogState,
  PivotDialogState,
  SplitDialogState,
  RegexpMatchDialogState,
  RegexpExtractDialogState,
  DateDialogState,
} from './app/types';

export class ChumakApp implements AppState {
  // UI state
  activeStep: TransformStep | null = null;
  editingStepIndex: number | null = null;
  dialogSnapshot: string | null = null;
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
  edaStats: EDAStats | null = null;
  edaChartView: 'boxplot' | 'histogram' = 'boxplot';
  edaBrushSelection: { min: number; max: number } | null = null;
  edaDateTreatment: 'temporal' | 'categorical' = 'temporal';
  uxSettings: UXSettings = {
    pagination: { pageSize: 500 },
    preview: { rowLimit: 100 },
    theme: 'chumak',
  };

  // Type Menu State
  typeMenuOpen = false;
  typeMenuPos = { x: 0, y: 0 };
  typeMenuCol: string | null = null;

  // Pagination state
  currentPage = 1;
  pageSize = 500;
  totalPages = 1;

  // Import dialog state
  importDialogState: AppState['importDialogState'] = {
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
  importUrlDialogState: AppState['importUrlDialogState'] = {
    url: '',
    isFetching: false,
    error: null,
  };

  // Data state (wired to AppStore)
  get sources() {
    return AppStore.sources.value;
  }
  set sources(val) {
    AppStore.sources.value = val;
  }

  get models() {
    return AppStore.models.value;
  }
  set models(val) {
    AppStore.models.value = val;
  }

  get activeSource() {
    return AppStore.activeSource.value;
  }
  set activeSource(val) {
    AppStore.activeSource.value = val;
  }

  get activeModel() {
    return AppStore.activeModel.value;
  }
  set activeModel(val) {
    AppStore.activeModel.value = val;
  }

  get currentData() {
    return AppStore.currentData.value;
  }
  set currentData(val) {
    AppStore.currentData.value = val;
  }

  get columns() {
    return AppStore.columns.value;
  }
  set columns(val) {
    AppStore.columns.value = val;
  }

  get viewMode() {
    return AppStore.viewMode.value;
  }
  set viewMode(val) {
    AppStore.viewMode.value = val as ViewMode;
  }

  get activeStepIndex() {
    return AppStore.activeStepIndex.value;
  }
  set activeStepIndex(val) {
    AppStore.activeStepIndex.value = val;
  }

  get viewingIntermediate() {
    return AppStore.viewingIntermediate.value;
  }
  set viewingIntermediate(val) {
    AppStore.viewingIntermediate.value = val;
  }

  get ribbonTab() {
    return AppStore.ribbonTab.value;
  }
  set ribbonTab(val) {
    AppStore.ribbonTab.value = val;
  }

  get activeTab() {
    return AppStore.activeTab.value;
  }
  set activeTab(val) {
    AppStore.activeTab.value = val;
  }

  get activeDialog() {
    return AppStore.activeDialog.value as any;
  }
  set activeDialog(val) {
    AppStore.activeDialog.value = val as any;
  }

  get isDragging() {
    return AppStore.isDragging.value;
  }
  set isDragging(val) {
    AppStore.isDragging.value = val;
  }

  get selectedColumn() {
    return AppStore.selectedColumn.value;
  }
  set selectedColumn(val) {
    AppStore.selectedColumn.value = val;
  }

  get theme() {
    return AppStore.theme.value;
  }
  set theme(val) {
    AppStore.theme.value = val as any;
  }

  get isTransforming() {
    return AppStore.isTransforming.value;
  }
  set isTransforming(val) {
    AppStore.isTransforming.value = val;
  }

  get transformMessage() {
    return AppStore.transformMessage.value;
  }
  set transformMessage(val) {
    AppStore.transformMessage.value = val;
  }

  // Transform state

  // Dialog states
  aggregateDialogState: AggregateDialogState = {
    groupBy: [],
    aggregations: [],
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };

  sliceRowsDialogState = {
    count: 10,
    mode: 'first' as 'first' | 'last' | 'removeFirst' | 'removeLast',
  };
  indexDialogState = { columnName: 'row_index', startFrom: 1 };
  foldDialogState: AppState['foldDialogState'] = {
    keyName: 'key',
    valueName: 'value',
    selectedColumns: [],
    mode: 'keep',
  };
  pivotDialogState: PivotDialogState = {
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
  replaceDialogState = { column: '', findValue: '', replaceValue: '' };
  splitDialogState: SplitDialogState = {
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
  regexpMatchDialogState: RegexpMatchDialogState = {
    sourceColumn: '',
    pattern: '',
    columnName: '',
    error: null,
  };
  regexpExtractDialogState: RegexpExtractDialogState = {
    sourceColumn: '',
    pattern: '',
    columnName: '',
    group: 0,
    error: null,
  };
  dateDialogState: DateDialogState = {
    column: '',
    operation: 'extract',
    extractParts: ['year'],
    truncateUnits: ['month'],
    outputColumn: '',
    error: null,
    previewData: [],
  };
  dedupeDialogState: AppState['dedupeDialogState'] = {
    selectedColumns: [],
    useAllColumns: true,
    duplicateCount: 0,
    mode: 'remove',
  };
  columnEditorState: AppState['columnEditorState'] = {
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
  previewState: AppState['previewState'] = {
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
  notifications: Notification[] = [];
  notificationIdCounter = 0;

  // Custom Dialogs (Alert/Confirm/Prompt)
  messageBox: AppState['messageBox'] = {
    visible: false,
    title: '',
    message: '',
    type: 'alert',
    inputValue: '',
    resolve: null,
  };

  // Step removal modal
  stepRemovalModal: AppState['stepRemovalModal'] = {
    visible: false,
    stepIndex: -1,
    stepName: '',
    affectedSteps: [],
    removeMode: 'all',
    resolve: null,
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

  // Export handlers
  exportCSV() {
    return ExportService.exportCSV((msg) => this.alert(msg));
  }
  exportWorkflowJSON() {
    return ExportService.exportWorkflowJSON((msg) => this.alert(msg));
  }
  exportDataJSON() {
    return ExportService.exportDataJSON((msg) => this.alert(msg));
  }
  copyCSVToClipboard() {
    return ExportService.copyCSVToClipboard(
      () => this.getPaginatedData(),
      (msg) => this.alert(msg)
    );
  }
  copyJSONToClipboard() {
    return ExportService.copyJSONToClipboard(
      () => this.getPaginatedData(),
      (msg) => this.alert(msg)
    );
  }

  // Import handlers
  handleFileSelect(event: Event) {
    return ImportHandlers.handleFileSelect.call(this, event);
  }
  handleFileDrop(event: DragEvent) {
    return ImportHandlers.handleFileDrop.call(this, event);
  }
  handlePaste(event: ClipboardEvent) {
    return ImportHandlers.handlePaste.call(this, event);
  }
  promptPaste() {
    return ImportHandlers.promptPaste.call(this);
  }
  showImportDialog(file: File) {
    return ImportHandlers.showImportDialog.call(this, file);
  }
  handleJsonPreview(file: File, data: any, path = '') {
    return ImportHandlers.handleJsonPreview.call(this, file, data, path);
  }
  updateJsonPath() {
    return ImportHandlers.updateJsonPath.call(this);
  }
  resolvePath(obj: any, path: string) {
    return ImportHandlers.resolvePath.call(this, obj, path);
  }
  getSuggestedKeys(obj: any) {
    return ImportHandlers.getSuggestedKeys.call(this, obj);
  }
  selectJsonPathSegment(segment: string) {
    return ImportHandlers.selectJsonPathSegment.call(this, segment);
  }
  resetJsonPath() {
    return ImportHandlers.resetJsonPath.call(this);
  }
  flattenData(data: any[]) {
    return ImportHandlers.flattenData.call(this, data);
  }
  serializeNestedData(data: any[]) {
    return ImportHandlers.serializeNestedData.call(this, data);
  }
  handleCsvPreview(file: File) {
    return ImportHandlers.handleCsvPreview.call(this, file);
  }
  showImportUrlDialog() {
    return ImportHandlers.showImportUrlDialog.call(this);
  }
  fetchAndImportFromUrl() {
    return ImportHandlers.fetchAndImportFromUrl.call(this);
  }
  confirmImport() {
    return ImportHandlers.confirmImport.call(this);
  }
  createSource(
    file: File,
    sourceName: string,
    columns: string[],
    data: any[],
    headerMode: string,
    delimiter: string,
    customHeaders: string[] | null = null,
    origin = 'file'
  ) {
    return ImportService.createSource(
      file,
      sourceName,
      columns,
      data,
      headerMode,
      delimiter,
      customHeaders,
      origin,
      () => this.updatePagination(),
      (force) => this.closeDialog(force)
    );
  }
  updateImportPreview() {
    return ImportHandlers.updateImportPreview.call(this);
  }
  updateHeadersForPreview() {
    return ImportHandlers.updateHeadersForPreview.call(this);
  }
  resolveDuplicateHeaders(headers: string[]) {
    return ImportHandlers.resolveDuplicateHeaders.call(this, headers);
  }

  // Model & Source handlers
  getTemplateConfigs() {
    return ModelService.getTemplateConfigs();
  }
  loadTemplates() {
    return ModelService.loadTemplates(() => this.getTemplateConfigs());
  }
  switchToSource(source: Source) {
    return ModelService.switchToSource(source, () => this.clearColumnSelection());
  }
  switchToModel(model: Model) {
    return ModelService.switchToModel(
      model,
      () => this.clearColumnSelection(),
      () => this.updatePagination(),
      this.ribbonTab,
      (tab) => {
        this.ribbonTab = tab;
      }
    );
  }
  createNewModel(source: Source) {
    return ModelService.createNewModel(
      source,
      (msg, def) => this.prompt(msg, def),
      (msg) => this.alert(msg),
      (model) => this.switchToModel(model)
    );
  }
  createNewModelFromActive() {
    const source = this.sources.find((s) => s.id === this.activeModel?.sourceId);
    if (!source) {
      this.alert('Source not found for current model');
      return;
    }
    return this.createNewModel(source);
  }
  copyCurrentModel() {
    return ModelService.copyCurrentModel(
      (msg, def) => this.prompt(msg, def),
      (msg) => this.alert(msg),
      (model) => this.switchToModel(model)
    );
  }
  renameCurrentModel() {
    return ModelService.renameCurrentModel(
      (msg, def) => this.prompt(msg, def),
      (msg) => this.alert(msg)
    );
  }
  deleteCurrentModel() {
    return ModelService.deleteCurrentModel(
      (msg) => this.confirm(msg),
      (msg) => this.alert(msg),
      (model) => this.switchToModel(model)
    );
  }
  renameSource(source: Source) {
    return ModelService.renameSource(source, (msg, def) => this.prompt(msg, def));
  }
  deleteSource(source: Source) {
    return ModelService.deleteSource(
      source,
      (msg) => this.confirm(msg),
      (msg) => this.alert(msg)
    );
  }
  clearAllData() {
    return ModelService.clearAllData(
      (msg) => this.confirm(msg),
      (msg) => this.alert(msg)
    );
  }

  // Step handlers
  async applyActiveTransform() {
    return StepHandlers.applyActiveTransform.call(this);
  }
  computeModelUpToStep(model: Model, stepIndex: number) {
    return StepHandlers.computeModelUpToStep.call(this, model, stepIndex);
  }
  computeUpToStep(stepIndex: number) {
    return StepHandlers.computeUpToStep.call(this, stepIndex);
  }
  viewStep(stepIndex: number) {
    return StepHandlers.viewStep.call(this, stepIndex);
  }
  viewFinalResult() {
    return StepHandlers.viewFinalResult.call(this);
  }
  editStep(stepIndex: number) {
    return StepHandlers.editStep.call(this, stepIndex);
  }
  cancelEdit() {
    return StepHandlers.cancelEdit.call(this);
  }
  removeStep(stepIndex: number) {
    return StepHandlers.removeStep.call(this, stepIndex);
  }
  showStepRemovalModal(stepIndex: number) {
    return StepHandlers.showStepRemovalModal.call(this, stepIndex);
  }
  closeStepRemovalModal(confirmed: boolean) {
    return StepHandlers.closeStepRemovalModal.call(this, confirmed);
  }
  executeStepRemoval(stepIndex: number, mode: 'single' | 'all') {
    return StepHandlers.executeStepRemoval.call(this, stepIndex, mode);
  }
  updateStep(stepIndex: number, newTransform: any) {
    return StepHandlers.updateStep.call(this, stepIndex, newTransform);
  }

  // Dialog handlers
  getDialogState(dialog: string) {
    return DialogHandlers.getDialogState.call(this, dialog);
  }
  reSnapshot() {
    return DialogHandlers.reSnapshot.call(this);
  }
  openDialog(dialogName: string, section?: string) {
    return DialogHandlers.openDialog.call(this, dialogName, section);
  }
  handleHashChange() {
    return DialogHandlers.handleHashChange.call(this);
  }
  initDialogState(dialogName: string, section?: string) {
    return DialogHandlers.initDialogState.call(this, dialogName, section);
  }
  isSlidePanel(dialog: string | null) {
    return DialogHandlers.isSlidePanel.call(this, dialog);
  }
  isCenteredModal(dialog: string | null) {
    return DialogHandlers.isCenteredModal.call(this, dialog);
  }
  getAboutContent() {
    return DialogHandlers.getAboutContent.call(this);
  }
  getExpressionsContent() {
    return DialogHandlers.getExpressionsContent.call(this);
  }
  getDialogTitle() {
    return DialogHandlers.getDialogTitle.call(this);
  }
  getDialogButtonText() {
    return DialogHandlers.getDialogButtonText.call(this);
  }
  hasPreviewData() {
    return DialogHandlers.hasPreviewData.call(this);
  }
  getPreviewTitle() {
    return DialogHandlers.getPreviewTitle.call(this);
  }
  getPreviewStats() {
    return DialogHandlers.getPreviewStats.call(this);
  }
  getPreviewColumns() {
    return DialogHandlers.getPreviewColumns.call(this);
  }
  getPreviewRows() {
    return DialogHandlers.getPreviewRows.call(this);
  }
  formatPreviewCell(row: any, col: string) {
    return DialogHandlers.formatPreviewCell.call(this, row, col);
  }
  clearPreview() {
    return DialogHandlers.clearPreview.call(this);
  }
  isNewPreviewColumn(col: string) {
    return DialogHandlers.isNewPreviewColumn.call(this, col);
  }
  activeDialogError() {
    return DialogHandlers.activeDialogError.call(this);
  }
  hasUnsavedChanges() {
    return DialogHandlers.hasUnsavedChanges.call(this);
  }
  closeDialog(force = false) {
    return DialogHandlers.closeDialog.call(this, force);
  }
  resetDialogStates() {
    return DialogHandlers.resetDialogStates.call(this);
  }

  // Notification handlers
  showError(title: string, message: string, options: any = {}) {
    return NotificationHandlers.showError.call(this, title, message, options);
  }
  showWarning(title: string, message: string, options: any = {}) {
    return NotificationHandlers.showWarning.call(this, title, message, options);
  }
  showSuccess(message: string, options: any = {}) {
    return NotificationHandlers.showSuccess.call(this, message, options);
  }
  _addNotification(
    type: string,
    title: string,
    message: string,
    stepInfo: string | null,
    duration: number
  ) {
    return NotificationHandlers._addNotification.call(
      this,
      type,
      title,
      message,
      stepInfo,
      duration
    );
  }
  dismissNotification(id: number) {
    return NotificationHandlers.dismissNotification.call(this, id);
  }
  getNotificationIcon(type: string) {
    return NotificationHandlers.getNotificationIcon.call(this, type);
  }
  alert(message: string, title = 'Alert') {
    return NotificationHandlers.alert.call(this, message, title);
  }
  confirm(message: string, title = 'Confirm') {
    return NotificationHandlers.confirm.call(this, message, title);
  }
  prompt(message: string, defaultValue = '', title = 'Prompt') {
    return NotificationHandlers.prompt.call(this, message, defaultValue, title);
  }
  closeMessageBox(result: boolean) {
    return NotificationHandlers.closeMessageBox.call(this, result);
  }
  getMessageBoxIcon() {
    return NotificationHandlers.getMessageBoxIcon.call(this);
  }

  // EDA & Chart handlers
  selectColumn(col: string) {
    return EDAHandlers.selectColumn.call(this, col);
  }
  selectEdaStat(label: string, rawValue: any, event: any) {
    return EDAHandlers.selectEdaStat.call(this, label, rawValue, event);
  }
  setEdaChartView(view: 'boxplot' | 'histogram') {
    return EDAHandlers.setEdaChartView.call(this, view);
  }
  setEdaDateTreatment(treatment: 'temporal' | 'categorical') {
    return EDAHandlers.setEdaDateTreatment.call(this, treatment);
  }
  handleBrushSelection(selection: any) {
    return EDAHandlers.handleBrushSelection.call(this, selection);
  }
  applyBrushFilter() {
    return EDAHandlers.applyBrushFilter.call(this);
  }

  // Interaction handlers
  handleBodyClick(event: any) {
    return InteractionHandlers.handleBodyClick.call(this, event);
  }
  openTypeMenu(col: string, event: any) {
    return InteractionHandlers.openTypeMenu.call(this, col, event);
  }
  changeColumnType(col: string, newType: string) {
    return InteractionHandlers.changeColumnType.call(this, col, newType);
  }
  autoDetectSchema() {
    return InteractionHandlers.autoDetectSchema.call(this);
  }
  clearColumnSelection() {
    return InteractionHandlers.clearColumnSelection.call(this);
  }
  calculateToolbarPosition(rect: DOMRect, toolbarWidth: number) {
    return InteractionHandlers.calculateToolbarPosition.call(this, rect, toolbarWidth);
  }
  updateToolbarPosition() {
    return InteractionHandlers.updateToolbarPosition.call(this);
  }
  selectCell(col: string, value: any, rowIdx: number) {
    return InteractionHandlers.selectCell.call(this, col, value, rowIdx);
  }
  applyQuickCellFilter(op: string) {
    return InteractionHandlers.applyQuickCellFilter.call(this, op);
  }
  quickSort(order: 'asc' | 'desc') {
    return InteractionHandlers.quickSort.call(this, order);
  }
  quickFilter() {
    return InteractionHandlers.quickFilter.call(this);
  }
  quickRename() {
    return InteractionHandlers.quickRename.call(this);
  }
  quickRemove() {
    return InteractionHandlers.quickRemove.call(this);
  }
  quickDate() {
    return InteractionHandlers.quickDate.call(this);
  }
  quickSplit() {
    return InteractionHandlers.quickSplit.call(this);
  }
  quickReplace() {
    return InteractionHandlers.quickReplace.call(this);
  }
  quickDedupe() {
    return InteractionHandlers.quickDedupe.call(this);
  }

  // Pagination handlers
  updatePagination() {
    return PaginationHandlers.updatePagination.call(this);
  }
  getPaginatedData() {
    return PaginationHandlers.getPaginatedData.call(this);
  }
  getPaginationInfo() {
    return PaginationHandlers.getPaginationInfo.call(this);
  }
  previousPage() {
    return PaginationHandlers.previousPage.call(this);
  }
  nextPage() {
    return PaginationHandlers.nextPage.call(this);
  }
  goToFirstPage() {
    return PaginationHandlers.goToFirstPage.call(this);
  }
  goToLastPage() {
    return PaginationHandlers.goToLastPage.call(this);
  }
  updatePageSize(newSize: number | string) {
    return PaginationHandlers.updatePageSize.call(this, newSize);
  }

  // Helper handlers
  getModelMeta(model: any) {
    return HelperHandlers.getModelMeta.call(this, model);
  }
  describeTransform(transform: any) {
    return HelperHandlers.describeTransformWrapper.call(this, transform);
  }
  async applyStepResult(transform: any, resultTable: any, closeDialogAfter = true) {
    return HelperHandlers.applyStepResult.call(this, transform, resultTable, closeDialogAfter);
  }
  async runTransform(label: string, transform: any, closeDialog = true) {
    return HelperHandlers.runTransform.call(this, label, transform, closeDialog);
  }
  validateExpression(expr: string) {
    return HelperHandlers.validateExpression.call(this, expr);
  }
  getColumnType(colName: string) {
    return HelperHandlers.getColumnType.call(this, colName);
  }
  isComparable(type?: string) {
    return HelperHandlers.isComparable.call(this, type);
  }
  isDateType(type?: string) {
    return HelperHandlers.isDateType.call(this, type);
  }
  getTypeIcon(colName: string) {
    return HelperHandlers.getTypeIcon.call(this, colName);
  }
  getCellClass(value: any, column: string) {
    return HelperHandlers.getCellClass.call(this, value, column);
  }
  formatCellValue(value: any) {
    return HelperHandlers.formatCellValue.call(this, value);
  }
  getTypeIndicator(colName: string) {
    return HelperHandlers.getTypeIndicator.call(this, colName);
  }
  quoteColumnRef(colName: string) {
    return HelperHandlers.quoteColumnRef.call(this, colName);
  }
  escapePattern(pattern: string) {
    return HelperHandlers.escapePattern.call(this, pattern);
  }
  formatLiteral(value: any, type?: string) {
    return HelperHandlers.formatLiteral.call(this, value, type);
  }
  preparePreviewData(table: any, limit = 100) {
    return HelperHandlers.preparePreviewData.call(this, table, limit);
  }
  getActiveSchema() {
    return HelperHandlers.getActiveSchema.call(this);
  }

  // JSON handlers
  getStepsJson() {
    return JsonHandlers.getStepsJson.call(this);
  }
  enterJsonEditMode() {
    return JsonHandlers.enterJsonEditMode.call(this);
  }
  cancelJsonEdit() {
    return JsonHandlers.cancelJsonEdit.call(this);
  }
  async applyJsonChanges() {
    return JsonHandlers.applyJsonChanges.call(this);
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

  // ============================================================
  // Import Handlers
  // ============================================================

  // ============================================================
  // Export Handlers
  // ============================================================

  // ============================================================
}
