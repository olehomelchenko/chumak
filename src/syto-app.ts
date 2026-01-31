import { loadUXSettings, updateUXSetting } from './core/ux-settings';
import { loadInitialData } from './core/storage';
import { getUrlState, setUrlState } from './core/url-state';
import { Transformation } from './app/decorators';
import * as FilterHandlers from './app/handlers/filter-handlers';
import * as DeriveHandlers from './app/handlers/derive-handlers';
import * as AggregateHandlers from './app/handlers/aggregate-handlers';
import * as JoinHandlers from './app/handlers/join-handlers';
import * as AppendHandlers from './app/handlers/append-handlers';
import * as PivotHandlers from './app/handlers/pivot-handlers';
import * as FoldHandlers from './app/handlers/fold-handlers';
import * as SplitHandlers from './app/handlers/split-handlers';
import * as MergeHandlers from './app/handlers/merge-handlers';
import * as DedupeHandlers from './app/handlers/dedupe-handlers';
import * as RegexpHandlers from './app/handlers/regexp-handlers';
import * as SimpleHandlers from './app/handlers/simple-handlers';
import * as ImportHandlers from './app/handlers/import-handlers';
import * as GenerateHandlers from './app/handlers/generate-handlers';
import * as SampleHandlers from './app/handlers/sample-handlers';
import * as SpreadHandlers from './app/handlers/spread-handlers';
import * as UnrollHandlers from './app/handlers/unroll-handlers';
import * as KeyboardHandlers from './app/handlers/keyboard-handlers';
import * as StepHandlers from './app/handlers/step-handlers';
import { setStepCallbacks } from './app/handlers/step-handlers';
import * as DialogHandlers from './app/handlers/dialog-handlers';
import { setDialogHandlerCallbacks } from './app/handlers/dialog-handlers';
import * as NotificationHandlers from './app/handlers/notification-handlers';
import * as EDAHandlers from './app/handlers/eda-handlers';
import { setEdaCallbacks } from './app/handlers/eda-handlers';
import * as InteractionHandlers from './app/handlers/interaction-handlers';
import * as PaginationHandlers from './app/handlers/pagination-handlers';
import * as HelperHandlers from './app/handlers/helper-handlers';
import { setTransformCallbacks } from './app/handlers/helper-handlers';
import * as JsonHandlers from './app/handlers/json-handlers';
import { setJsonEditCallbacks } from './app/handlers/json-handlers';
import { setImportCallbacks } from './app/handlers/import-handlers';
import { SchemaEngine, ColumnSchema } from './core/schema-engine';
import { AppStore, ViewMode } from './app/stores/AppStore';
import { DialogStore } from './app/stores/DialogStore';
import { ModelService } from './app/services/ModelService';
import { ImportService } from './app/services/ImportService';
import { ExportService } from './app/services/ExportService';

import {
  AppState,
  Source,
  Model,
  Notification,
  ImportDialogState,
  ImportUrlDialogState,
} from './app/types';

export class SytoApp implements AppState {
  // UI state (proxied to AppStore signals)
  get activeStep() {
    return AppStore.activeStep.value;
  }
  set activeStep(val) {
    AppStore.activeStep.value = val;
  }

  get editingStepIndex() {
    return AppStore.editingStepIndex.value;
  }
  set editingStepIndex(val) {
    AppStore.editingStepIndex.value = val;
  }

  get dialogSnapshot() {
    return AppStore.dialogSnapshot.value;
  }
  set dialogSnapshot(val) {
    AppStore.dialogSnapshot.value = val;
  }

  get columnToolbarPos() {
    return AppStore.columnToolbarPos.value;
  }
  set columnToolbarPos(val) {
    AppStore.columnToolbarPos.value = val;
  }

  get selectedCell() {
    return AppStore.selectedCell.value;
  }
  set selectedCell(val) {
    AppStore.selectedCell.value = val;
  }

  get cellToolbarPos() {
    return AppStore.cellToolbarPos.value;
  }
  set cellToolbarPos(val) {
    AppStore.cellToolbarPos.value = val;
  }

  get edaStats() {
    return AppStore.edaStats.value;
  }
  set edaStats(val) {
    AppStore.edaStats.value = val;
  }

  get edaChartView() {
    return AppStore.edaChartView.value;
  }
  set edaChartView(val) {
    AppStore.edaChartView.value = val;
  }

  get edaBrushSelection() {
    return AppStore.edaBrushSelection.value;
  }
  set edaBrushSelection(val) {
    AppStore.edaBrushSelection.value = val;
  }

  get edaDateTreatment() {
    return AppStore.edaDateTreatment.value;
  }
  set edaDateTreatment(val) {
    AppStore.edaDateTreatment.value = val;
  }
  get uxSettings() {
    return AppStore.uxSettings.value;
  }
  set uxSettings(val) {
    AppStore.uxSettings.value = val;
  }

  // Type Menu State
  get typeMenuOpen() {
    return AppStore.typeMenuOpen.value;
  }
  set typeMenuOpen(val) {
    AppStore.typeMenuOpen.value = val;
  }

  get typeMenuPos() {
    return AppStore.typeMenuPos.value;
  }
  set typeMenuPos(val) {
    AppStore.typeMenuPos.value = val;
  }

  get typeMenuCol() {
    return AppStore.typeMenuCol.value;
  }
  set typeMenuCol(val) {
    AppStore.typeMenuCol.value = val;
  }

  get currentPage() {
    return AppStore.currentPage.value;
  }
  set currentPage(val) {
    AppStore.currentPage.value = val;
  }

  get pageSize() {
    return AppStore.pageSize.value;
  }
  set pageSize(val) {
    AppStore.pageSize.value = val;
  }

  get totalPages() {
    return AppStore.totalPages.value;
  }
  set totalPages(val) {
    AppStore.totalPages.value = val;
  }

  // Import dialog state (wired to DialogStore)
  get importDialogState(): ImportDialogState {
    return DialogStore.createSignalProxy(DialogStore.importCsvState);
  }
  set importDialogState(val: ImportDialogState) {
    Object.assign(this.importDialogState, val);
  }

  get importUrlDialogState(): ImportUrlDialogState {
    return DialogStore.createSignalProxy(DialogStore.importUrlState);
  }
  set importUrlDialogState(val: ImportUrlDialogState) {
    Object.assign(this.importUrlDialogState, val);
  }

  get importFileData() {
    return AppStore.importFileData.value;
  }
  set importFileData(val) {
    AppStore.importFileData.value = val;
  }
  _previewDebounceTimer: any = null;

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

  // Dialog states (wired to DialogStore)
  get aggregateDialogState() {
    return DialogStore.createSignalProxy(DialogStore.aggregateState);
  }
  set aggregateDialogState(val: any) {
    Object.assign(this.aggregateDialogState, val);
  }

  get sliceRowsDialogState() {
    return DialogStore.createSignalProxy(DialogStore.sliceRowsState);
  }
  set sliceRowsDialogState(val: any) {
    Object.assign(this.sliceRowsDialogState, val);
  }

  get indexDialogState() {
    return DialogStore.createSignalProxy(DialogStore.indexState);
  }
  set indexDialogState(val: any) {
    Object.assign(this.indexDialogState, val);
  }

  get foldDialogState() {
    return DialogStore.createSignalProxy(DialogStore.foldState);
  }
  set foldDialogState(val: any) {
    Object.assign(this.foldDialogState, val);
  }

  get pivotDialogState() {
    return DialogStore.createSignalProxy(DialogStore.pivotState);
  }
  set pivotDialogState(val: any) {
    Object.assign(this.pivotDialogState, val);
  }

  get appendDialogState() {
    return DialogStore.createSignalProxy(DialogStore.appendState);
  }
  set appendDialogState(val: any) {
    Object.assign(this.appendDialogState, val);
  }

  get replaceDialogState() {
    return DialogStore.createSignalProxy(DialogStore.replaceState);
  }
  set replaceDialogState(val: any) {
    Object.assign(this.replaceDialogState, val);
  }

  get splitDialogState() {
    return DialogStore.createSignalProxy(DialogStore.splitState);
  }
  set splitDialogState(val: any) {
    Object.assign(this.splitDialogState, val);
  }

  get regexpMatchDialogState() {
    return DialogStore.createSignalProxy(DialogStore.regexpMatchState);
  }
  set regexpMatchDialogState(val: any) {
    Object.assign(this.regexpMatchDialogState, val);
  }

  get regexpExtractDialogState() {
    return DialogStore.createSignalProxy(DialogStore.regexpExtractState);
  }
  set regexpExtractDialogState(val: any) {
    Object.assign(this.regexpExtractDialogState, val);
  }

  get dedupeDialogState() {
    return DialogStore.createSignalProxy(DialogStore.dedupeState);
  }
  set dedupeDialogState(val: any) {
    Object.assign(this.dedupeDialogState, val);
  }

  get jsonEditMode() {
    return AppStore.jsonEditMode.value;
  }
  set jsonEditMode(val) {
    AppStore.jsonEditMode.value = val;
  }

  get jsonEditContent() {
    return AppStore.jsonEditContent.value;
  }
  set jsonEditContent(val) {
    AppStore.jsonEditContent.value = val;
  }

  get jsonEditError() {
    return AppStore.jsonEditError.value;
  }
  set jsonEditError(val: string | null) {
    AppStore.jsonEditError.value = val;
  }

  get jsonEditBackup() {
    return AppStore.jsonEditBackup.value;
  }
  set jsonEditBackup(val: any | null) {
    AppStore.jsonEditBackup.value = val;
  }

  // Notifications
  get notifications(): Notification[] {
    return AppStore.notifications.value;
  }
  set notifications(val: Notification[]) {
    AppStore.notifications.value = val;
  }

  get notificationIdCounter() {
    return AppStore.notificationIdCounter.value;
  }
  set notificationIdCounter(val) {
    AppStore.notificationIdCounter.value = val;
  }

  // Custom Dialogs (Alert/Confirm/Prompt)
  get messageBox() {
    return AppStore.messageBox.value;
  }
  set messageBox(val) {
    AppStore.messageBox.value = val;
  }

  // Step removal modal
  get stepRemovalModal() {
    return AppStore.stepRemovalModal.value;
  }
  set stepRemovalModal(val) {
    AppStore.stepRemovalModal.value = val;
  }

  // Intermediate viewing state
  get viewingSchema() {
    return AppStore.viewingSchema.value;
  }
  set viewingSchema(val: ColumnSchema[] | null) {
    AppStore.viewingSchema.value = val;
  }

  // Filter handlers
  validateFilterExpression() {
    return FilterHandlers.validateFilterExpression();
  }
  debouncedUpdateFilterPreview() {
    return FilterHandlers.debouncedUpdateFilterPreview();
  }
  updateFilterPreview() {
    return FilterHandlers.updateFilterPreview();
  }
  toggleFilterPreviewMode() {
    return FilterHandlers.toggleFilterPreviewMode();
  }
  applyFilterTransform() {
    return FilterHandlers.applyFilterTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Derive handlers
  validateDeriveExpression() {
    return DeriveHandlers.validateDeriveExpression();
  }
  debouncedUpdateDerivePreview() {
    return DeriveHandlers.debouncedUpdateDerivePreview();
  }
  updateDerivePreview() {
    return DeriveHandlers.updateDerivePreview();
  }
  applyDeriveTransform() {
    return DeriveHandlers.applyDeriveTransform(HelperHandlers.createExecutionCallbacks(this), this);
  }

  // Aggregate handlers
  addAggregation() {
    return AggregateHandlers.addAggregation();
  }
  removeAggregation(index: number) {
    return AggregateHandlers.removeAggregation(index);
  }
  updateAggregateOutputName(index: number) {
    return AggregateHandlers.updateAggregateOutputName(index);
  }
  constructAggregateStep() {
    return AggregateHandlers.constructAggregateStep();
  }
  updateAggregatePreview() {
    return AggregateHandlers.updateAggregatePreview();
  }
  applyAggregateTransform() {
    return AggregateHandlers.applyAggregateTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Join handlers
  initializeJoinDialog() {
    return JoinHandlers.initializeJoinDialog();
  }
  getColumnsForTarget(targetId: string) {
    return JoinHandlers.getColumnsForTarget(targetId);
  }
  onJoinTargetChange() {
    return JoinHandlers.onJoinTargetChange();
  }
  addJoinKeyPair() {
    return JoinHandlers.addJoinKeyPair();
  }
  removeJoinKeyPair(index: number) {
    return JoinHandlers.removeJoinKeyPair(index);
  }
  previewJoin() {
    return JoinHandlers.previewJoin();
  }
  applyJoinTransform() {
    return JoinHandlers.applyJoinTransform(HelperHandlers.createExecutionCallbacks(this), this);
  }

  // Append handlers
  initializeAppendDialog() {
    return AppendHandlers.initializeAppendDialog();
  }
  onAppendLeftModelChange() {
    return AppendHandlers.onAppendLeftModelChange();
  }
  onAppendTargetChange() {
    return AppendHandlers.onAppendTargetChange();
  }
  applyAppendTransform() {
    return AppendHandlers.applyAppendTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Pivot handlers
  initializePivotDialog() {
    // This is a reset - can just set signals or call a handler
    const state = DialogStore.pivotState;
    state.rowColumns.value = [];
    state.columnColumn.value = '';
    state.valueColumn.value = '';
    state.aggregation.value = 'sum';
    state.options.value = { sort: true, limit: null };
    state.uniqueValueCount.value = 0;
    state.previewData.value = null;
    state.previewError.value = null;
    state.isPreviewing.value = false;
  }
  onPivotConfigChange() {
    return PivotHandlers.onPivotConfigChange();
  }
  constructPivotStep() {
    return PivotHandlers.constructPivotStep();
  }
  previewPivot() {
    return PivotHandlers.previewPivot();
  }
  applyPivotTransform() {
    return PivotHandlers.applyPivotTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Fold handlers
  toggleColumnForFold(index: number) {
    return FoldHandlers.toggleColumnForFold(index);
  }
  toggleFoldMode() {
    return FoldHandlers.toggleFoldMode();
  }
  getColumnsToFold() {
    return FoldHandlers.getColumnsToFold();
  }
  selectAllForFold() {
    return FoldHandlers.selectAllForFold();
  }
  selectNoneForFold() {
    return FoldHandlers.selectNoneForFold();
  }
  updateFoldPreview() {
    return FoldHandlers.updateFoldPreview();
  }
  applyFoldTransform() {
    return FoldHandlers.applyFoldTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Split handlers
  detectDelimiter(column: string) {
    return SplitHandlers.detectDelimiter(column);
  }
  debouncedUpdateSplitPreview() {
    return SplitHandlers.debouncedUpdateSplitPreview();
  }
  selectSplitColumn(col: string) {
    return SplitHandlers.selectSplitColumn(col);
  }
  updateSplitPreview() {
    return SplitHandlers.updateSplitPreview();
  }
  applySplitTransform() {
    return SplitHandlers.applySplitTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Merge handlers
  selectMergeColumns(columns: string[]) {
    return MergeHandlers.selectMergeColumns(columns);
  }
  applyMergeTransform() {
    return MergeHandlers.applyMergeTransform(HelperHandlers.createExecutionCallbacks(this), this);
  }

  // Dedupe handlers
  toggleDedupeAllColumns(useAll: boolean) {
    return DedupeHandlers.toggleDedupeAllColumns(useAll);
  }
  toggleDedupeColumn(index: number) {
    return DedupeHandlers.toggleDedupeColumn(index);
  }
  selectAllForDedupe() {
    return DedupeHandlers.selectAllForDedupe();
  }
  selectNoneForDedupe() {
    return DedupeHandlers.selectNoneForDedupe();
  }
  getDedupeColumns() {
    return DedupeHandlers.getDedupeColumns();
  }
  findDuplicateRows(data: any[], columns: string[]) {
    return DedupeHandlers.findDuplicateRows(data, columns);
  }
  updateDedupePreview() {
    return DedupeHandlers.updateDedupePreview();
  }
  findAllDuplicateRowCount(data: any[], columns: string[]) {
    return DedupeHandlers.findAllDuplicateRowCount(data, columns);
  }
  @Transformation('Duplicates')
  applyDedupeTransform() {
    return DedupeHandlers.applyDedupeTransform(HelperHandlers.createExecutionCallbacks(this));
  }

  // Column Editor handlers

  // Regexp handlers
  validateRegexpPattern(pattern: string) {
    return RegexpHandlers.validateRegexpPattern(pattern);
  }
  validateRegexpMatchExpression() {
    return RegexpHandlers.validateRegexpMatchExpression();
  }
  debouncedUpdateRegexpMatchPreview() {
    return RegexpHandlers.debouncedUpdateRegexpMatchPreview();
  }
  updateRegexpMatchPreview() {
    return RegexpHandlers.updateRegexpMatchPreview();
  }
  applyRegexpMatchTransform() {
    return RegexpHandlers.applyRegexpMatchTransform(
      HelperHandlers.createExecutionCallbacks(this),
      this
    );
  }
  validateRegexpExtractExpression() {
    return RegexpHandlers.validateRegexpExtractExpression();
  }
  debouncedUpdateRegexpExtractPreview() {
    return RegexpHandlers.debouncedUpdateRegexpExtractPreview();
  }
  updateRegexpExtractPreview() {
    return RegexpHandlers.updateRegexpExtractPreview();
  }
  applyRegexpExtractTransform() {
    return RegexpHandlers.applyRegexpExtractTransform(
      HelperHandlers.createExecutionCallbacks(this),
      this
    );
  }

  // Simple handlers
  applyReplaceTransform() {
    return SimpleHandlers.applyReplaceTransform(
      HelperHandlers.createExecutionCallbacks(this),
      this
    );
  }
  applySortTransform() {
    return SimpleHandlers.applySortTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applySliceRowsTransform() {
    return SimpleHandlers.applySliceRowsTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applyIndexTransform() {
    return SimpleHandlers.applyIndexTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applyImputeTransform() {
    return SimpleHandlers.applyImputeTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applySampleTransform() {
    return SampleHandlers.applySampleTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applySpreadTransform() {
    return SpreadHandlers.applySpreadTransform(HelperHandlers.createExecutionCallbacks(this));
  }
  applyUnrollTransform() {
    return UnrollHandlers.applyUnrollTransform(HelperHandlers.createExecutionCallbacks(this));
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

  // Import handlers (now use stores directly, no 'this' context needed)
  handleFileSelect(event: Event) {
    return ImportHandlers.handleFileSelect(event);
  }
  handleFileDrop(event: DragEvent) {
    return ImportHandlers.handleFileDrop(event);
  }
  handlePaste(event: ClipboardEvent) {
    return ImportHandlers.handlePaste(event);
  }
  promptPaste() {
    return ImportHandlers.promptPaste();
  }
  handleUploadClick() {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  handlePasteClick() {
    return this.promptPaste();
  }
  showImportDialog(file: File) {
    return ImportHandlers.showImportDialog(file);
  }
  handleJsonPreview(file: File, data: any, path = '') {
    return ImportHandlers.handleJsonPreview(file, data, path);
  }
  updateJsonPath() {
    return ImportHandlers.updateJsonPath();
  }
  resolvePath(obj: any, path: string) {
    return ImportHandlers.resolvePath(obj, path);
  }
  getSuggestedKeys(obj: any) {
    return ImportHandlers.getSuggestedKeys(obj);
  }
  selectJsonPathSegment(segment: string) {
    return ImportHandlers.selectJsonPathSegment(segment);
  }
  resetJsonPath() {
    return ImportHandlers.resetJsonPath();
  }
  flattenData(data: any[]) {
    return ImportHandlers.flattenData(data);
  }
  serializeNestedData(data: any[]) {
    return ImportHandlers.serializeNestedData(data);
  }
  handleCsvPreview(file: File) {
    return ImportHandlers.handleCsvPreview(file);
  }
  showImportUrlDialog() {
    return ImportHandlers.showImportUrlDialog();
  }
  fetchAndImportFromUrl() {
    return ImportHandlers.fetchAndImportFromUrl();
  }
  confirmImport() {
    return ImportHandlers.confirmImport();
  }
  showReplaceSourceDialog(source: Source) {
    return ImportHandlers.showReplaceSourceDialog(source);
  }
  async restoreSourceBackup(source: Source) {
    const { ReplaceSourceService } = await import('./app/services/ReplaceSourceService');
    await ReplaceSourceService.restoreBackup(source.id);
  }
  computeSchemaDiffForPreview(
    oldSchema: ColumnSchema[],
    previewColumns: string[],
    previewData: any[][]
  ) {
    return ImportHandlers.computeSchemaDiffForPreview(oldSchema, previewColumns, previewData);
  }
  generateData() {
    return GenerateHandlers.generateData.call(this);
  }
  debouncedUpdateGeneratePreview() {
    return GenerateHandlers.debouncedUpdateGeneratePreview();
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
    return ImportHandlers.updateImportPreview();
  }
  updateHeadersForPreview() {
    return ImportHandlers.updateHeadersForPreview();
  }
  resolveDuplicateHeaders(headers: string[]) {
    return ImportHandlers.resolveDuplicateHeaders(headers);
  }

  // Model & Source handlers

  switchToSource(source: Source) {
    ModelService.switchToSource(source, () => this.clearColumnSelection());
    // Update URL when switching to a source
    setUrlState({ sourceId: source.id });
  }
  switchToModel(model: Model) {
    ModelService.switchToModel(
      model,
      () => this.clearColumnSelection(),
      () => this.updatePagination(),
      AppStore.ribbonTab.value,
      (tab) => {
        AppStore.ribbonTab.value = tab;
      }
    );
    // Update URL when switching to a model
    setUrlState({ sourceId: model.sourceId, modelId: model.id });
  }
  showModelInfo() {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) return;
    ModelService.showModelInfo(activeModel, () => this.clearColumnSelection());
    // Update URL when showing model info
    setUrlState({
      sourceId: activeModel.sourceId,
      modelId: activeModel.id,
      section: 'info',
    });
  }
  showDatasetInfo(source: Source) {
    ModelService.showDatasetInfo(source, () => this.clearColumnSelection());
    // Update URL when showing dataset info
    setUrlState({ sourceId: source.id, section: 'info' });
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
    const sources = AppStore.sources.value;
    const activeModel = AppStore.activeModel.value;
    const source = sources.find((s) => s.id === activeModel?.sourceId);
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

  // Step handlers (now use stores directly, no 'this' context needed)
  async applyActiveTransform() {
    return StepHandlers.applyActiveTransform();
  }
  computeModelUpToStep(model: Model, stepIndex: number) {
    return StepHandlers.computeModelUpToStep(model, stepIndex);
  }
  computeUpToStep(stepIndex: number) {
    return StepHandlers.computeUpToStep(stepIndex);
  }
  viewStep(stepIndex: number) {
    return StepHandlers.viewStep(stepIndex);
  }
  viewFinalResult() {
    return StepHandlers.viewFinalResult();
  }
  editStep(stepIndex: number) {
    return StepHandlers.editStep(stepIndex);
  }
  cancelEdit() {
    return StepHandlers.cancelEdit();
  }
  removeStep(stepIndex: number) {
    return StepHandlers.removeStep(stepIndex);
  }
  showStepRemovalModal(stepIndex: number) {
    return StepHandlers.showStepRemovalModal(stepIndex);
  }
  closeStepRemovalModal(confirmed: boolean) {
    return StepHandlers.closeStepRemovalModal(confirmed);
  }
  executeStepRemoval(stepIndex: number, mode: 'single' | 'all') {
    return StepHandlers.executeStepRemoval(stepIndex, mode);
  }
  updateStep(stepIndex: number, newTransform: any) {
    return StepHandlers.updateStep(stepIndex, newTransform);
  }

  // Dialog handlers (now use stores directly, no 'this' context needed)
  getDialogState(dialog: string) {
    return DialogHandlers.getDialogState(dialog);
  }
  reSnapshot() {
    return DialogHandlers.reSnapshot();
  }
  openDialog(dialogName: string, section?: string) {
    return DialogHandlers.openDialog(dialogName, section);
  }
  handleHashChange() {
    return DialogHandlers.handleHashChange();
  }
  initDialogState(dialogName: string, section?: string) {
    return DialogHandlers.initDialogState(dialogName, section);
  }
  isSlidePanel(dialog: string | null) {
    return DialogHandlers.isSlidePanel(dialog);
  }
  isCenteredModal(dialog: string | null) {
    return DialogHandlers.isCenteredModal(dialog);
  }
  getAboutContent() {
    return DialogHandlers.getAboutContent();
  }
  getDialogTitle() {
    return DialogHandlers.getDialogTitle();
  }
  getDialogButtonText() {
    return DialogHandlers.getDialogButtonText();
  }
  hasPreviewData() {
    return DialogHandlers.hasPreviewData();
  }
  getPreviewTitle() {
    return DialogHandlers.getPreviewTitle();
  }
  getPreviewStats() {
    return DialogHandlers.getPreviewStats();
  }
  getPreviewColumns() {
    return DialogHandlers.getPreviewColumns();
  }
  getPreviewRows() {
    return DialogHandlers.getPreviewRows();
  }
  formatPreviewCell(row: any, col: string) {
    return DialogHandlers.formatPreviewCell(row, col);
  }
  clearPreview() {
    return DialogHandlers.clearPreview();
  }
  isNewPreviewColumn(col: string) {
    return DialogHandlers.isNewPreviewColumn(col);
  }
  activeDialogError() {
    return DialogHandlers.activeDialogError();
  }
  hasUnsavedChanges() {
    return DialogHandlers.hasUnsavedChanges();
  }
  closeDialog(force = false) {
    return DialogHandlers.closeDialog(force);
  }
  resetDialogStates() {
    return DialogHandlers.resetDialogStates();
  }

  // Notification handlers (now use stores directly, no 'this' context needed)
  showError(title: string, message: string, options: any = {}) {
    return NotificationHandlers.showError(title, message, options);
  }
  showWarning(title: string, message: string, options: any = {}) {
    return NotificationHandlers.showWarning(title, message, options);
  }
  showSuccess(message: string, options: any = {}) {
    return NotificationHandlers.showSuccess(message, options);
  }
  _addNotification(
    type: string,
    title: string,
    message: string,
    stepInfo: string | null,
    duration: number
  ) {
    return NotificationHandlers._addNotification(type, title, message, stepInfo, duration);
  }
  dismissNotification(id: number) {
    return NotificationHandlers.dismissNotification(id);
  }
  getNotificationIcon(type: string) {
    return NotificationHandlers.getNotificationIcon(type);
  }
  alert(message: string, title = 'Alert') {
    return NotificationHandlers.alert(message, title);
  }
  confirm(message: string, title = 'Confirm') {
    return NotificationHandlers.confirm(message, title);
  }
  prompt(message: string, defaultValue = '', title = 'Prompt') {
    return NotificationHandlers.prompt(message, defaultValue, title);
  }
  closeMessageBox(result: boolean) {
    return NotificationHandlers.closeMessageBox(result);
  }
  getMessageBoxIcon() {
    return NotificationHandlers.getMessageBoxIcon();
  }

  // EDA & Chart handlers (now use stores directly, no 'this' context needed)
  selectColumn(col: string) {
    return EDAHandlers.selectColumn(col);
  }
  selectEdaStat(label: string, rawValue: any, event: any) {
    return EDAHandlers.selectEdaStat(label, rawValue, event);
  }
  setEdaChartView(view: 'boxplot' | 'histogram') {
    return EDAHandlers.setEdaChartView(view);
  }
  setEdaDateTreatment(treatment: 'temporal' | 'categorical') {
    return EDAHandlers.setEdaDateTreatment(treatment);
  }
  handleBrushSelection(selection: any) {
    return EDAHandlers.handleBrushSelection(selection);
  }
  applyBrushFilter() {
    return EDAHandlers.applyBrushFilter();
  }
  handleBodyClick(event: any) {
    return InteractionHandlers.handleBodyClick(event);
  }
  openTypeMenu(col: string, event: any) {
    return InteractionHandlers.openTypeMenu(col, event);
  }
  changeColumnType(col: string, newType: string) {
    return InteractionHandlers.changeColumnType(col, newType, {
      updatePagination: () => this.updatePagination(),
    });
  }
  autoDetectSchema() {
    return InteractionHandlers.autoDetectSchema({
      updatePagination: () => this.updatePagination(),
    });
  }
  clearColumnSelection() {
    return InteractionHandlers.clearColumnSelection();
  }
  calculateToolbarPosition(rect: DOMRect, toolbarWidth: number) {
    return InteractionHandlers.calculateToolbarPosition(rect, toolbarWidth);
  }
  updateToolbarPosition() {
    return InteractionHandlers.updateToolbarPosition();
  }

  // Interaction handlers
  selectCell(col: string, value: any, rowIdx: number) {
    return InteractionHandlers.selectCell(col, value, rowIdx);
  }
  applyQuickCellFilter(op: string) {
    return InteractionHandlers.applyQuickCellFilter(op, {
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  quickSort(order: 'asc' | 'desc') {
    return InteractionHandlers.quickSort(order, {
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  quickFilter() {
    return InteractionHandlers.quickFilter((name) => this.openDialog(name));
  }
  quickRename() {
    return InteractionHandlers.quickRename(
      (msg, def) => this.prompt(msg, def),
      (msg) => this.alert(msg),
      {
        onTransformStart: (label: string) => this.startTransformation(label),
        onTransformEnd: () => this.endTransformation(),
        onError: (msg: string) => this.alert(msg),
        updatePagination: () => this.updatePagination(),
      }
    );
  }
  quickRemove() {
    return InteractionHandlers.quickRemove({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  quickDate() {
    return InteractionHandlers.quickDate((name) => this.openDialog(name));
  }
  quickSplit() {
    return InteractionHandlers.quickSplit((name) => this.openDialog(name));
  }
  quickReplace() {
    return InteractionHandlers.quickReplace((name) => this.openDialog(name));
  }
  quickDedupe() {
    return InteractionHandlers.quickDedupe((name) => this.openDialog(name));
  }

  // Pagination handlers (now use stores directly, no 'this' context needed)
  updatePagination() {
    return PaginationHandlers.updatePagination();
  }
  getPaginatedData() {
    return PaginationHandlers.getPaginatedData();
  }
  getPaginationInfo() {
    return PaginationHandlers.getPaginationInfo();
  }
  previousPage() {
    return PaginationHandlers.previousPage();
  }
  nextPage() {
    return PaginationHandlers.nextPage();
  }
  goToFirstPage() {
    return PaginationHandlers.goToFirstPage();
  }
  goToLastPage() {
    return PaginationHandlers.goToLastPage();
  }
  updatePageSize(newSize: number | string) {
    return PaginationHandlers.updatePageSize(newSize);
  }

  // Helper handlers (now use stores directly, no 'this' context needed)
  getModelMeta(model: any) {
    return HelperHandlers.getModelMeta(model);
  }
  describeTransform(transform: any) {
    return HelperHandlers.describeTransformWrapper(transform);
  }
  async applyStepResult(transform: any, resultTable: any, closeDialogAfter = true) {
    return HelperHandlers.applyStepResult(transform, resultTable, closeDialogAfter);
  }
  async runTransform(label: string, transform: any, closeDialog = true) {
    return HelperHandlers.runTransform(label, transform, closeDialog);
  }
  validateExpression(expr: string) {
    return HelperHandlers.validateExpression(expr);
  }
  getColumnType(colName: string) {
    return HelperHandlers.getColumnType(colName);
  }
  isComparable(type?: string) {
    return HelperHandlers.isComparable(type);
  }
  isDateType(type?: string) {
    return HelperHandlers.isDateType(type);
  }
  getTypeIcon(colName: string) {
    return HelperHandlers.getTypeIcon(colName);
  }
  formatCellValue(value: any) {
    return HelperHandlers.formatCellValue(value);
  }
  getTypeIndicator(colName: string) {
    return HelperHandlers.getTypeIndicator(colName);
  }
  quoteColumnRef(colName: string) {
    return HelperHandlers.quoteColumnRef(colName);
  }
  escapePattern(pattern: string) {
    return HelperHandlers.escapePattern(pattern);
  }
  formatLiteral(value: any, type?: string) {
    return HelperHandlers.formatLiteral(value, type);
  }
  preparePreviewData(table: any, limit = 100) {
    return HelperHandlers.preparePreviewData(table, limit);
  }
  getActiveSchema() {
    return HelperHandlers.getActiveSchema();
  }

  // JSON handlers (now use stores directly, no 'this' context needed)
  getStepsJson() {
    return JsonHandlers.getStepsJson();
  }
  enterJsonEditMode() {
    return JsonHandlers.enterJsonEditMode();
  }
  cancelJsonEdit() {
    return JsonHandlers.cancelJsonEdit();
  }
  async applyJsonEdit() {
    return JsonHandlers.applyJsonEdit();
  }
  validateJsonEdit() {
    return JsonHandlers.validateJsonEdit();
  }

  constructor() {
    // All handlers integrated into the class
  }

  async init() {
    console.log('Initializing Syto App...');

    // Set up dialog handler callbacks
    setDialogHandlerCallbacks({
      confirm: (msg) => this.confirm(msg),
      clearColumnSelection: () => this.clearColumnSelection(),
      openDialog: (dialog, section) => this.openDialog(dialog, section),
      switchToModel: (model) => this.switchToModel(model),
      switchToSource: (source) => this.switchToSource(source),
      showModelInfo: () => this.showModelInfo(),
      showDatasetInfo: (source) => this.showDatasetInfo(source),
      initializeJoinDialog: () => this.initializeJoinDialog(),
      initializeAppendDialog: () => this.initializeAppendDialog(),
      initializePivotDialog: () => this.initializePivotDialog(),
      detectDelimiter: (col) => this.detectDelimiter(col),
      debouncedUpdateSplitPreview: () => this.debouncedUpdateSplitPreview(),
      updateDedupePreview: () => this.updateDedupePreview(),
      updateImputePreview: () => SimpleHandlers.updateImputePreview(),
    });

    // Set up step handler callbacks
    setStepCallbacks({
      updatePagination: () => this.updatePagination(),
      openDialog: (name, section) => this.openDialog(name, section),
      closeDialog: (force) => this.closeDialog(force),
      onJoinTargetChange: () => this.onJoinTargetChange(),
      onAppendTargetChange: () => this.onAppendTargetChange(),
      onPivotConfigChange: () => this.onPivotConfigChange(),
      updateSplitPreview: () => this.updateSplitPreview(),
      updateDedupePreview: () => this.updateDedupePreview(),
      applyFilterTransform: () => this.applyFilterTransform(),
      applySortTransform: () => this.applySortTransform(),
      applySliceRowsTransform: () => this.applySliceRowsTransform(),
      applySampleTransform: () => this.applySampleTransform(),
      applySpreadTransform: () => this.applySpreadTransform(),
      applyUnrollTransform: () => this.applyUnrollTransform(),
      applyIndexTransform: () => this.applyIndexTransform(),
      applySplitTransform: () => this.applySplitTransform(),
      applyMergeTransform: () => this.applyMergeTransform(),
      applyDeriveTransform: () => this.applyDeriveTransform(),
      applyRegexpMatchTransform: () => this.applyRegexpMatchTransform(),
      applyRegexpExtractTransform: () => this.applyRegexpExtractTransform(),
      applyFoldTransform: () => this.applyFoldTransform(),
      applyPivotTransform: () => this.applyPivotTransform(),
      applyAggregateTransform: () => this.applyAggregateTransform(),
      applyJoinTransform: () => this.applyJoinTransform(),
      applyAppendTransform: () => this.applyAppendTransform(),
      applyReplaceTransform: () => this.applyReplaceTransform(),
      applyDedupeTransform: () => this.applyDedupeTransform(),
      applyImputeTransform: () => this.applyImputeTransform(),
      confirmImport: () => this.confirmImport(),
      fetchAndImportFromUrl: () => this.fetchAndImportFromUrl(),
      generateData: () => this.generateData(),
      runTransform: (name, config, close) => this.runTransform(name, config, close),
    });

    // Set up EDA handler callbacks
    setEdaCallbacks({
      updateToolbarPosition: () => this.updateToolbarPosition(),
      applyFilterTransform: () => this.applyFilterTransform(),
      clearColumnSelection: () => this.clearColumnSelection(),
    });

    // Set up transform callbacks (for helper-handlers)
    setTransformCallbacks({
      startTransformation: (label) => this.startTransformation(label),
      endTransformation: () => this.endTransformation(),
      alert: (msg) => this.alert(msg),
      closeDialog: (clearPreview) => this.closeDialog(clearPreview),
      updatePagination: () => this.updatePagination(),
    });

    // Set up JSON edit callbacks
    setJsonEditCallbacks({
      computeModelUpToStep: (model, stepIndex) => this.computeModelUpToStep(model, stepIndex),
      updatePagination: () => this.updatePagination(),
    });

    // Set up import callbacks
    setImportCallbacks({
      openDialog: (name, section) => this.openDialog(name, section),
      closeDialog: (force) => this.closeDialog(force),
      createSource: (file, name, columns, data, headerMode, delimiter, customHeaders, format) =>
        this.createSource(file, name, columns, data, headerMode, delimiter, customHeaders, format),
    });

    const uxSettings = loadUXSettings();
    AppStore.uxSettings.value = uxSettings;
    AppStore.pageSize.value = uxSettings.pagination.pageSize;
    AppStore.theme.value = uxSettings.theme;
    this.applyTheme();

    const { sources, models } = await loadInitialData();
    AppStore.sources.value = sources;
    AppStore.models.value = models;

    const urlState = getUrlState();
    let restored = false;

    // Handle page routes (about, reference, expressions, settings)
    if (urlState.page) {
      this.openDialog(urlState.page, urlState.section);
      // Ensure URL is set after restoration (in case it was cleared)
      setUrlState({ page: urlState.page, section: urlState.section });
      restored = true;
    } else if (urlState.modelId) {
      const model = models.find((m) => m.id === urlState.modelId);
      if (model) {
        if (urlState.section === 'info') {
          // Show model info view
          ModelService.showModelInfo(model, () => this.clearColumnSelection());
          setUrlState({ sourceId: model.sourceId, modelId: model.id, section: 'info' });
        } else {
          // Show model view
          AppStore.activeModel.value = model;
          AppStore.currentData.value = model.data;
          AppStore.viewMode.value = 'model';
          setUrlState({ sourceId: model.sourceId, modelId: model.id });
        }
        restored = true;
      }
    } else if (urlState.sourceId) {
      const source = sources.find((s) => s.id === urlState.sourceId);
      if (source) {
        if (urlState.section === 'info') {
          // Show dataset info view
          ModelService.showDatasetInfo(source, () => this.clearColumnSelection());
          setUrlState({ sourceId: source.id, section: 'info' });
        } else {
          // Show dataset info view (default for source)
          AppStore.activeSource.value = source;
          AppStore.currentData.value = source.data;
          AppStore.viewMode.value = 'dataset-info';
          setUrlState({ sourceId: source.id });
        }
        restored = true;
      }
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => this.handleHashChange());

    if (!restored && models.length > 0) {
      AppStore.activeModel.value = models[0];
      AppStore.currentData.value = models[0].data;
      AppStore.viewMode.value = 'model';
      // Set URL for default model
      setUrlState({ sourceId: models[0].sourceId, modelId: models[0].id });
    }

    const activeModel = AppStore.activeModel.value;
    if (activeModel) {
      AppStore.activeStepIndex.value =
        activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;
      AppStore.viewingIntermediate.value = false;
    }

    const currentData = AppStore.currentData.value;
    const activeSource = AppStore.activeSource.value;
    if (currentData && currentData.length > 0) {
      if (activeModel && (!activeModel.schema || activeModel.schema.length === 0)) {
        // Fallback: infer logical types for model (models use logical types, not physical)
        activeModel.schema = SchemaEngine.createLogicalSchema(activeModel.data);
      }

      if (activeModel?.schema) {
        AppStore.columns.value = activeModel.schema.map((c: any) => c.name);
      } else if (activeSource?.columns) {
        AppStore.columns.value = activeSource.columns.map((c: any) => c.name);
      } else {
        AppStore.columns.value = Object.keys(currentData[0]);
      }
    }

    this.updatePagination();

    // Sync URL state after initial render
    setTimeout(() => this.syncUrlState(), 0);

    window.addEventListener('keydown', (e) => {
      // Handle Escape key first (highest priority)
      if (e.key === 'Escape') {
        if (AppStore.messageBox.value.visible) {
          this.closeMessageBox(false);
          return;
        }
        if (AppStore.activeDialog.value) {
          this.closeDialog();
          return;
        }
        if (AppStore.typeMenuOpen.value) {
          AppStore.typeMenuOpen.value = false;
          return;
        }
        if (AppStore.selectedColumn.value || AppStore.selectedCell.value) {
          this.clearColumnSelection();
          return;
        }
      }

      // Handle other keyboard shortcuts
      KeyboardHandlers.handleKeyDown(this, e);
    });

    window.addEventListener('paste', (e) => this.handlePaste(e));
    window.addEventListener('click', (e) => this.handleBodyClick(e));

    // await this.loadTemplates(); // Templates are gone
  }

  syncUrlState() {
    const activeModel = AppStore.activeModel.value;
    const activeSource = AppStore.activeSource.value;
    setUrlState({
      modelId: activeModel?.id,
      sourceId: activeSource?.id || activeModel?.sourceId,
    });
  }

  async startTransformation(message: string) {
    AppStore.isTransforming.value = true;
    AppStore.transformMessage.value = message;
    // Allow UI to update before continuing
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  endTransformation() {
    AppStore.isTransforming.value = false;
    AppStore.transformMessage.value = '';
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', AppStore.theme.value);
  }

  switchTheme(theme: 'blues' | 'syto') {
    AppStore.theme.value = theme;
    this.applyTheme();
    updateUXSetting('theme', '', theme);
  }

  updatePreviewRowLimit(value: string) {
    const limit = Math.max(10, Math.min(10000, parseInt(value, 10) || 100));
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, preview: { rowLimit: limit } };
    updateUXSetting('preview', 'rowLimit', limit);
  }

  getPreviewRowLimit(): number {
    return AppStore.uxSettings.value.preview?.rowLimit || 100;
  }

  updateAnalyticsOptOut(optOut: boolean) {
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, analyticsOptOut: optOut };
    updateUXSetting('analyticsOptOut', '', optOut);
    // If opting out, remove any existing GoatCounter script and stop tracking
    if (optOut) {
      const existingScript = document.querySelector('script[data-goatcounter]');
      if (existingScript) {
        existingScript.remove();
      }
      // Also disable GoatCounter if it's already loaded (stops any pending requests)
      if (typeof (window as any).goatcounter !== 'undefined') {
        (window as any).goatcounter = { count: () => {} }; // Replace with no-op function
      }
    }
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
