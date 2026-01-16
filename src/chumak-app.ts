import { loadUXSettings, updateUXSetting } from './core/ux-settings';
import { loadInitialData } from './core/storage';
import { getUrlState, setUrlState } from './core/url-state';
import { Transformation } from './app/decorators';
import * as FilterHandlers from './app/handlers/filter-handlers';
import * as DeriveHandlers from './app/handlers/derive-handlers';
import * as AggregateHandlers from './app/handlers/aggregate-handlers';
import * as JoinHandlers from './app/handlers/join-handlers';
import * as PivotHandlers from './app/handlers/pivot-handlers';
import * as FoldHandlers from './app/handlers/fold-handlers';
import * as SplitHandlers from './app/handlers/split-handlers';
import * as DedupeHandlers from './app/handlers/dedupe-handlers';
import * as RegexpHandlers from './app/handlers/regexp-handlers';
import * as SimpleHandlers from './app/handlers/simple-handlers';
import * as ImportHandlers from './app/handlers/import-handlers';
import * as StepHandlers from './app/handlers/step-handlers';
import * as DialogHandlers from './app/handlers/dialog-handlers';
import * as NotificationHandlers from './app/handlers/notification-handlers';
import * as EDAHandlers from './app/handlers/eda-handlers';
import * as InteractionHandlers from './app/handlers/interaction-handlers';
import * as PaginationHandlers from './app/handlers/pagination-handlers';
import * as HelperHandlers from './app/handlers/helper-handlers';
import * as JsonHandlers from './app/handlers/json-handlers';
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

export class ChumakApp implements AppState {
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
    return FilterHandlers.applyFilterTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return DeriveHandlers.applyDeriveTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
  previewAggregate() {
    return AggregateHandlers.previewAggregate();
  }
  applyAggregateTransform() {
    return AggregateHandlers.applyAggregateTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return JoinHandlers.applyJoinTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return PivotHandlers.applyPivotTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return FoldHandlers.applyFoldTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return SplitHandlers.applySplitTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return DedupeHandlers.applyDedupeTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return RegexpHandlers.applyRegexpMatchTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
    return RegexpHandlers.applyRegexpExtractTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }

  // Simple handlers
  applyReplaceTransform() {
    return SimpleHandlers.applyReplaceTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  applySortTransform() {
    return SimpleHandlers.applySortTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  applySliceRowsTransform() {
    return SimpleHandlers.applySliceRowsTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
  }
  applyIndexTransform() {
    return SimpleHandlers.applyIndexTransform({
      onTransformStart: (label: string) => this.startTransformation(label),
      onTransformEnd: () => this.endTransformation(),
      onError: (msg: string) => this.alert(msg),
      updatePagination: () => this.updatePagination(),
    });
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
      this.ribbonTab,
      (tab) => {
        this.ribbonTab = tab;
      }
    );
    // Update URL when switching to a model
    setUrlState({ sourceId: model.sourceId, modelId: model.id });
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
    return InteractionHandlers.quickRename((name, sec) => this.openDialog(name, sec));
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
    console.log('Initializing Chumak App...');

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
      // Ensure URL is set after restoration (in case it was cleared)
      setUrlState({ page: urlState.page, section: urlState.section });
      restored = true;
    } else if (urlState.modelId) {
      const model = models.find((m) => m.id === urlState.modelId);
      if (model) {
        this.activeModel = model;
        this.currentData = model.data;
        this.viewMode = 'model';
        // Ensure URL is set after restoration
        setUrlState({ sourceId: model.sourceId, modelId: model.id });
        restored = true;
      }
    } else if (urlState.sourceId) {
      const source = sources.find((s) => s.id === urlState.sourceId);
      if (source) {
        this.activeSource = source;
        this.currentData = source.data;
        this.viewMode = 'dataset-info';
        // Ensure URL is set after restoration
        setUrlState({ sourceId: source.id });
        restored = true;
      }
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => this.handleHashChange());

    if (!restored && models.length > 0) {
      this.activeModel = models[0];
      this.currentData = models[0].data;
      this.viewMode = 'model';
      // Set URL for default model
      setUrlState({ sourceId: models[0].sourceId, modelId: models[0].id });
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

    // Sync URL state after initial render
    setTimeout(() => this.syncUrlState(), 0);

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
    window.addEventListener('click', (e) => this.handleBodyClick(e));

    // await this.loadTemplates(); // Templates are gone
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
    // Allow UI to update before continuing
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
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
