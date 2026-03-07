/**
 * AppController - Central action dispatcher
 *
 * This module exports all actions that UI components need.
 * It imports handlers directly and composes them, eliminating
 * the need for SytoApp proxy methods.
 *
 * Usage in components:
 *   import { AppController } from '../orchestration/AppController';
 *   <button onClick={() => AppController.openDialog('filter')}>Filter</button>
 */

import { setUrlState } from '../infrastructure/url-state';
import { updateUXSetting } from '../infrastructure/ux-settings';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { ModelService } from '../services/ModelService';
import { ImportService } from '../services/ImportService';
import { ExportService } from '../services/ExportService';
import i18n from '../../i18n';

// Handler imports - Transform
import * as FilterHandlers from '../handlers/transform/filter-handlers';
import * as DeriveHandlers from '../handlers/transform/derive-handlers';
import * as AggregateHandlers from '../handlers/transform/aggregate-handlers';
import * as WindowHandlers from '../handlers/transform/window-handlers';
import * as JoinHandlers from '../handlers/transform/join-handlers';
import * as AppendHandlers from '../handlers/transform/append-handlers';
import * as PivotHandlers from '../handlers/transform/pivot-handlers';
import * as FoldHandlers from '../handlers/transform/fold-handlers';
import * as SplitHandlers from '../handlers/transform/split-handlers';
import * as MergeHandlers from '../handlers/transform/merge-handlers';
import * as DedupeHandlers from '../handlers/transform/dedupe-handlers';
import * as RegexpHandlers from '../handlers/transform/regexp-handlers';
import * as ShortcutHandlers from '../handlers/transform/shortcut-handlers';
// Handler imports - Import
import * as ImportHandlers from '../handlers/import/import-handlers';
import * as GenerateHandlers from '../handlers/import/generate-handlers';
import * as JsonHandlers from '../handlers/import/json-handlers';
// Handler imports - Dialog
import * as DialogHandlers from '../handlers/dialog/dialog-handlers';
// Handler imports - Core
import * as StepHandlers from '../handlers/core/step-handlers';
import * as NotificationHandlers from '../handlers/core/notification-handlers';
import * as EDAHandlers from '../handlers/core/eda-handlers';
import * as InteractionHandlers from '../handlers/core/interaction-handlers';
import * as PaginationHandlers from '../handlers/core/pagination-handlers';
import * as HelperHandlers from '../handlers/core/helper-handlers';

import type { Source, Model, ColumnSchema } from '../types';

// ============================================================
// Internal utilities
// ============================================================

async function startTransformation(message: string): Promise<void> {
  AppStore.isTransforming.value = true;
  AppStore.transformMessage.value = message;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function endTransformation(): void {
  AppStore.isTransforming.value = false;
  AppStore.transformMessage.value = '';
}

function shortcutCallbacks() {
  return {
    onTransformStart: startTransformation,
    onTransformEnd: endTransformation,
    onError: NotificationHandlers.alert,
    updatePagination: () => PaginationHandlers.updatePagination(),
  };
}

// ============================================================
// AppController - All UI actions in one place
// ============================================================

export const AppController = {
  // ============================================================
  // Dialog & Navigation
  // ============================================================

  openDialog: DialogHandlers.openDialog,
  closeDialog: DialogHandlers.closeDialog,
  handleHashChange: DialogHandlers.handleHashChange,
  getDialogState: DialogHandlers.getDialogState,
  initDialogState: DialogHandlers.initDialogState,
  reSnapshot: DialogHandlers.reSnapshot,
  resetDialogStates: DialogHandlers.resetDialogStates,
  isSlidePanel: DialogHandlers.isSlidePanel,
  isCenteredModal: DialogHandlers.isCenteredModal,
  getDialogTitle: DialogHandlers.getDialogTitle,
  getDialogButtonText: DialogHandlers.getDialogButtonText,
  hasPreviewData: DialogHandlers.hasPreviewData,
  getPreviewTitle: DialogHandlers.getPreviewTitle,
  getPreviewStats: DialogHandlers.getPreviewStats,
  getPreviewColumns: DialogHandlers.getPreviewColumns,
  getPreviewRows: DialogHandlers.getPreviewRows,
  formatPreviewCell: DialogHandlers.formatPreviewCell,
  clearPreview: DialogHandlers.clearPreview,
  isNewPreviewColumn: DialogHandlers.isNewPreviewColumn,
  activeDialogError: DialogHandlers.activeDialogError,
  hasUnsavedChanges: DialogHandlers.hasUnsavedChanges,

  // ============================================================
  // Notifications & Dialogs
  // ============================================================

  showError: NotificationHandlers.showError,
  showWarning: NotificationHandlers.showWarning,
  showSuccess: NotificationHandlers.showSuccess,
  dismissNotification: NotificationHandlers.dismissNotification,
  getNotificationIcon: NotificationHandlers.getNotificationIcon,
  alert: NotificationHandlers.alert,
  confirm: NotificationHandlers.confirm,
  prompt: NotificationHandlers.prompt,
  closeMessageBox: NotificationHandlers.closeMessageBox,
  getMessageBoxIcon: NotificationHandlers.getMessageBoxIcon,

  // ============================================================
  // Step Management
  // ============================================================

  applyActiveTransform: StepHandlers.applyActiveTransform,
  computeModelUpToStep: StepHandlers.computeModelUpToStep,
  computeUpToStep: StepHandlers.computeUpToStep,
  viewStep: StepHandlers.viewStep,
  viewFinalResult: StepHandlers.viewFinalResult,
  editStep: StepHandlers.editStep,
  cancelEdit: StepHandlers.cancelEdit,
  removeStep: StepHandlers.removeStep,
  showStepRemovalModal: StepHandlers.showStepRemovalModal,
  closeStepRemovalModal: StepHandlers.closeStepRemovalModal,
  executeStepRemoval: StepHandlers.executeStepRemoval,
  updateStep: StepHandlers.updateStep,
  undo: StepHandlers.undo,
  redo: StepHandlers.redo,

  // ============================================================
  // Model & Source Management
  // ============================================================

  switchToSource(source: Source): void {
    ModelService.switchToSource(source, () => InteractionHandlers.clearColumnSelection());
    setUrlState({ sourceId: source.id });
  },

  switchToModel(model: Model): void {
    ModelService.switchToModel(
      model,
      () => InteractionHandlers.clearColumnSelection(),
      () => PaginationHandlers.updatePagination(),
      AppStore.ribbonTab.value,
      (tab) => {
        AppStore.ribbonTab.value = tab;
      }
    );
    setUrlState({ sourceId: model.sourceId, modelId: model.id });
  },

  showModelInfo(): void {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) return;
    ModelService.showModelInfo(activeModel, () => InteractionHandlers.clearColumnSelection());
    setUrlState({
      sourceId: activeModel.sourceId,
      modelId: activeModel.id,
      section: 'info',
    });
  },

  showDatasetInfo(source: Source): void {
    ModelService.showDatasetInfo(source, () => InteractionHandlers.clearColumnSelection());
    setUrlState({ sourceId: source.id, section: 'info' });
  },

  async createNewModel(source: Source): Promise<void> {
    return ModelService.createNewModel(
      source,
      NotificationHandlers.prompt,
      NotificationHandlers.alert,
      (model) => AppController.switchToModel(model)
    );
  },

  async createNewModelFromActive(): Promise<void> {
    const sources = AppStore.sources.value;
    const activeModel = AppStore.activeModel.value;
    const source = sources.find((s) => s.id === activeModel?.sourceId);
    if (!source) {
      await NotificationHandlers.alert('Source not found for current model');
      return;
    }
    return AppController.createNewModel(source);
  },

  async copyCurrentModel(): Promise<void> {
    return ModelService.copyCurrentModel(
      NotificationHandlers.prompt,
      NotificationHandlers.alert,
      (model) => AppController.switchToModel(model)
    );
  },

  async renameCurrentModel(): Promise<void> {
    return ModelService.renameCurrentModel(NotificationHandlers.prompt, NotificationHandlers.alert);
  },

  async deleteCurrentModel(): Promise<void> {
    return ModelService.deleteCurrentModel(
      NotificationHandlers.confirm,
      NotificationHandlers.alert,
      (model) => AppController.switchToModel(model)
    );
  },

  async renameSource(source: Source): Promise<void> {
    return ModelService.renameSource(source, NotificationHandlers.prompt);
  },

  async deleteSource(source: Source): Promise<void> {
    return ModelService.deleteSource(
      source,
      NotificationHandlers.confirm,
      NotificationHandlers.alert
    );
  },

  async clearAllData(): Promise<void> {
    return ModelService.clearAllData(NotificationHandlers.confirm, NotificationHandlers.alert);
  },

  // ============================================================
  // Import
  // ============================================================

  handleFileSelect: ImportHandlers.handleFileSelect,
  handleFileDrop: ImportHandlers.handleFileDrop,
  handlePaste: ImportHandlers.handlePaste,
  promptPaste: ImportHandlers.promptPaste,
  showImportDialog: ImportHandlers.showImportDialog,
  handleJsonPreview: ImportHandlers.handleJsonPreview,
  updateJsonPath: ImportHandlers.updateJsonPath,
  resolvePath: ImportHandlers.resolvePath,
  getSuggestedKeys: ImportHandlers.getSuggestedKeys,
  selectJsonPathSegment: ImportHandlers.selectJsonPathSegment,
  resetJsonPath: ImportHandlers.resetJsonPath,
  flattenData: ImportHandlers.flattenData,
  serializeNestedData: ImportHandlers.serializeNestedData,
  handleCsvPreview: ImportHandlers.handleCsvPreview,
  showImportUrlDialog: ImportHandlers.showImportUrlDialog,
  fetchAndImportFromUrl: ImportHandlers.fetchAndImportFromUrl,
  confirmImport: ImportHandlers.confirmImport,
  showReplaceSourceDialog: ImportHandlers.showReplaceSourceDialog,
  updateImportPreview: ImportHandlers.updateImportPreview,
  updateHeadersForPreview: ImportHandlers.updateHeadersForPreview,
  resolveDuplicateHeaders: ImportHandlers.resolveDuplicateHeaders,

  computeSchemaDiffForPreview(
    oldSchema: ColumnSchema[],
    previewColumns: string[],
    previewData: any[][]
  ) {
    return ImportHandlers.computeSchemaDiffForPreview(oldSchema, previewColumns, previewData);
  },

  async restoreSourceBackup(source: Source): Promise<void> {
    const { ReplaceSourceService } = await import('../services/ReplaceSourceService');
    await ReplaceSourceService.restoreBackup(source.id);
  },

  handleUploadClick(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  },

  handlePasteClick(): void {
    ImportHandlers.promptPaste();
  },

  async loadExampleData(): Promise<void> {
    const columns = ['Name', 'Region', 'Product', 'Sales', 'Date'];
    const data = [
      { Name: 'Alice', Region: 'North', Product: 'Widget', Sales: 1200, Date: '2024-01-15' },
      { Name: 'Bob', Region: 'South', Product: 'Gadget', Sales: 850, Date: '2024-01-20' },
      { Name: 'Carol', Region: 'North', Product: 'Gadget', Sales: 1500, Date: '2024-02-10' },
      { Name: 'Dave', Region: 'East', Product: 'Widget', Sales: 900, Date: '2024-02-14' },
      { Name: 'Eve', Region: 'South', Product: 'Widget', Sales: 1100, Date: '2024-03-01' },
      { Name: 'Frank', Region: 'East', Product: 'Gadget', Sales: 750, Date: '2024-03-15' },
      { Name: 'Grace', Region: 'North', Product: 'Doohickey', Sales: 2000, Date: '2024-04-01' },
      { Name: 'Hank', Region: 'South', Product: 'Doohickey', Sales: 600, Date: '2024-04-10' },
      { Name: 'Ivy', Region: 'East', Product: 'Widget', Sales: 1350, Date: '2024-05-05' },
      { Name: 'Jack', Region: 'North', Product: 'Gadget', Sales: 950, Date: '2024-05-20' },
    ];
    const file = new File([''], 'Example Sales Data.csv', { type: 'text/csv' });
    await this.createSource(
      file,
      'Example Sales Data',
      columns,
      data,
      'first-row',
      ',',
      columns,
      'example'
    );
  },

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
      () => PaginationHandlers.updatePagination(),
      (force) => DialogHandlers.closeDialog(force)
    );
  },

  // ============================================================
  // Export
  // ============================================================

  async exportCSV() {
    await ExportService.exportCSV(NotificationHandlers.alert);
  },

  async exportWorkflowJSON(): Promise<void> {
    return ExportService.exportWorkflowJSON(NotificationHandlers.alert);
  },

  async exportDataJSON(): Promise<void> {
    return ExportService.exportDataJSON(NotificationHandlers.alert);
  },

  async copyCSVToClipboard(): Promise<void> {
    return ExportService.copyCSVToClipboard(
      () => PaginationHandlers.getPaginatedData(),
      NotificationHandlers.alert
    );
  },

  async copyJSONToClipboard(): Promise<void> {
    return ExportService.copyJSONToClipboard(
      () => PaginationHandlers.getPaginatedData(),
      NotificationHandlers.alert
    );
  },

  // ============================================================
  // Generate
  // ============================================================

  generateData: GenerateHandlers.generateData,
  debouncedUpdateGeneratePreview: GenerateHandlers.debouncedUpdateGeneratePreview,

  // ============================================================
  // Pagination
  // ============================================================

  updatePagination: PaginationHandlers.updatePagination,
  getPaginatedData: PaginationHandlers.getPaginatedData,
  getPaginationInfo: PaginationHandlers.getPaginationInfo,
  previousPage: PaginationHandlers.previousPage,
  nextPage: PaginationHandlers.nextPage,
  goToFirstPage: PaginationHandlers.goToFirstPage,
  goToLastPage: PaginationHandlers.goToLastPage,
  updatePageSize: PaginationHandlers.updatePageSize,

  // ============================================================
  // Interaction & Selection
  // ============================================================

  selectColumn(col: string, modifiers?: { shift?: boolean; meta?: boolean }): void {
    EDAHandlers.selectColumn(col, modifiers);
  },

  selectRow(rowIndex: number, modifiers?: { shift?: boolean; meta?: boolean }): void {
    InteractionHandlers.selectRow(rowIndex, modifiers);
  },

  async removeSelectedRows() {
    await InteractionHandlers.removeSelectedRows({
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async keepSelectedRows() {
    await InteractionHandlers.keepSelectedRows({
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async extractSelectedRows() {
    await InteractionHandlers.extractSelectedRows((model) => AppController.switchToModel(model));
  },

  selectEdaStat: EDAHandlers.selectEdaStat,
  setEdaChartView: EDAHandlers.setEdaChartView,
  setEdaDateTreatment: EDAHandlers.setEdaDateTreatment,
  handleBrushSelection: EDAHandlers.handleBrushSelection,
  applyBrushFilter: EDAHandlers.applyBrushFilter,
  handleBodyClick: InteractionHandlers.handleBodyClick,
  openTypeMenu: InteractionHandlers.openTypeMenu,
  clearColumnSelection: InteractionHandlers.clearColumnSelection,
  calculateToolbarPosition: InteractionHandlers.calculateToolbarPosition,
  updateToolbarPosition: InteractionHandlers.updateToolbarPosition,
  selectCell: InteractionHandlers.selectCell,

  async changeColumnType(col: string, newType: string) {
    await InteractionHandlers.changeColumnType(col, newType, {
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async autoDetectSchema() {
    await InteractionHandlers.autoDetectSchema({
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async applyQuickCellFilter(op: string) {
    await InteractionHandlers.applyQuickCellFilter(op, {
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async quickSort(order: 'asc' | 'desc') {
    await InteractionHandlers.quickSort(order, {
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  quickFilter(): void {
    return InteractionHandlers.quickFilter((name) => DialogHandlers.openDialog(name));
  },

  async quickRename(): Promise<void> {
    return InteractionHandlers.quickRename(
      NotificationHandlers.prompt,
      NotificationHandlers.alert,
      {
        onTransformStart: startTransformation,
        onTransformEnd: endTransformation,
        onError: NotificationHandlers.alert,
        updatePagination: () => PaginationHandlers.updatePagination(),
      }
    );
  },

  async quickRemoveMultiple() {
    await InteractionHandlers.quickRemoveMultiple({
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async quickRemove() {
    await InteractionHandlers.quickRemove({
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  quickDate(): void {
    return InteractionHandlers.quickDate((name) => DialogHandlers.openDialog(name));
  },

  quickSplit(): void {
    return InteractionHandlers.quickSplit((name) => DialogHandlers.openDialog(name));
  },

  quickReplace(): void {
    return InteractionHandlers.quickReplace((name) => DialogHandlers.openDialog(name));
  },

  quickDedupe(): void {
    return InteractionHandlers.quickDedupe((name) => DialogHandlers.openDialog(name));
  },

  // ============================================================
  // Ribbon Popover & Shortcut Actions
  // ============================================================

  openRibbonPopover(category: string, rect: DOMRect) {
    AppStore.ribbonPopover.value = category;
    AppStore.ribbonPopoverRect.value = rect;
  },

  closeRibbonPopover() {
    AppStore.ribbonPopover.value = null;
    AppStore.ribbonPopoverRect.value = null;
  },

  // Shortcut actions (text, date, number, convert)
  quickUpper: () => ShortcutHandlers.quickUpper(shortcutCallbacks()),
  quickLower: () => ShortcutHandlers.quickLower(shortcutCallbacks()),
  quickTitlecase: () => ShortcutHandlers.quickTitlecase(shortcutCallbacks()),
  quickTrim: () => ShortcutHandlers.quickTrim(shortcutCallbacks()),
  quickLen: () => ShortcutHandlers.quickLen(shortcutCallbacks()),
  quickExtractYear: () => ShortcutHandlers.quickExtractYear(shortcutCallbacks()),
  quickExtractMonth: () => ShortcutHandlers.quickExtractMonth(shortcutCallbacks()),
  quickExtractDay: () => ShortcutHandlers.quickExtractDay(shortcutCallbacks()),
  quickExtractQuarter: () => ShortcutHandlers.quickExtractQuarter(shortcutCallbacks()),
  quickExtractWeekday: () => ShortcutHandlers.quickExtractWeekday(shortcutCallbacks()),
  quickExtractWeek: () => ShortcutHandlers.quickExtractWeek(shortcutCallbacks()),
  quickTruncYear: () => ShortcutHandlers.quickTruncYear(shortcutCallbacks()),
  quickTruncMonth: () => ShortcutHandlers.quickTruncMonth(shortcutCallbacks()),
  quickTruncWeek: () => ShortcutHandlers.quickTruncWeek(shortcutCallbacks()),
  quickTruncDay: () => ShortcutHandlers.quickTruncDay(shortcutCallbacks()),
  quickRound: () => ShortcutHandlers.quickRound(shortcutCallbacks()),
  quickFloor: () => ShortcutHandlers.quickFloor(shortcutCallbacks()),
  quickCeil: () => ShortcutHandlers.quickCeil(shortcutCallbacks()),
  quickTruncNum: () => ShortcutHandlers.quickTrunc(shortcutCallbacks()),
  quickAbs: () => ShortcutHandlers.quickAbs(shortcutCallbacks()),
  quickSign: () => ShortcutHandlers.quickSign(shortcutCallbacks()),
  quickConvertToString: () => ShortcutHandlers.quickConvertToString(shortcutCallbacks()),
  quickConvertToNumber: () => ShortcutHandlers.quickConvertToNumber(shortcutCallbacks()),
  quickConvertToInteger: () => ShortcutHandlers.quickConvertToInteger(shortcutCallbacks()),
  quickConvertToDate: () => ShortcutHandlers.quickConvertToDate(shortcutCallbacks()),

  // ============================================================
  // JSON Editor
  // ============================================================

  getStepsJson: JsonHandlers.getStepsJson,
  enterJsonEditMode: JsonHandlers.enterJsonEditMode,
  cancelJsonEdit: JsonHandlers.cancelJsonEdit,
  applyJsonEdit: JsonHandlers.applyJsonEdit,
  validateJsonEdit: JsonHandlers.validateJsonEdit,

  // ============================================================
  // Helper functions
  // ============================================================

  getModelMeta: HelperHandlers.getModelMeta,
  describeTransform: HelperHandlers.describeTransformWrapper,
  applyStepResult: HelperHandlers.applyStepResult,
  runTransform: HelperHandlers.runTransform,
  validateExpression: HelperHandlers.validateExpression,
  getColumnType: HelperHandlers.getColumnType,
  isComparable: HelperHandlers.isComparable,
  isDateType: HelperHandlers.isDateType,
  getTypeIcon: HelperHandlers.getTypeIcon,
  formatCellValue: HelperHandlers.formatCellValue,
  getTypeIndicator: HelperHandlers.getTypeIndicator,
  quoteColumnRef: HelperHandlers.quoteColumnRef,
  escapePattern: HelperHandlers.escapePattern,
  formatLiteral: HelperHandlers.formatLiteral,
  preparePreviewData: HelperHandlers.preparePreviewData,
  getActiveSchema: HelperHandlers.getActiveSchema,

  // ============================================================
  // Transform handlers
  // ============================================================

  // Filter
  validateFilterExpression: FilterHandlers.validateFilterExpression,
  debouncedUpdateFilterPreview: FilterHandlers.debouncedUpdateFilterPreview,
  updateFilterPreview: FilterHandlers.updateFilterPreview,
  toggleFilterPreviewMode: FilterHandlers.toggleFilterPreviewMode,

  // Derive
  validateDeriveExpression: DeriveHandlers.validateDeriveExpression,
  debouncedUpdateDerivePreview: DeriveHandlers.debouncedUpdateDerivePreview,
  updateDerivePreview: DeriveHandlers.updateDerivePreview,

  // Aggregate
  addAggregation: AggregateHandlers.addAggregation,
  removeAggregation: AggregateHandlers.removeAggregation,
  updateAggregateOutputName: AggregateHandlers.updateAggregateOutputName,
  constructAggregateStep: AggregateHandlers.constructAggregateStep,
  updateAggregatePreview: AggregateHandlers.updateAggregatePreview,

  // Window
  updateWindowPreview: WindowHandlers.updateWindowPreview,
  debouncedUpdateWindowPreview: WindowHandlers.debouncedUpdateWindowPreview,

  // Join
  initializeJoinDialog: JoinHandlers.initializeJoinDialog,
  getColumnsForTarget: JoinHandlers.getColumnsForTarget,
  onJoinTargetChange: JoinHandlers.onJoinTargetChange,
  addJoinKeyPair: JoinHandlers.addJoinKeyPair,
  removeJoinKeyPair: JoinHandlers.removeJoinKeyPair,
  previewJoin: JoinHandlers.previewJoin,

  // Append
  initializeAppendDialog: AppendHandlers.initializeAppendDialog,
  onAppendLeftModelChange: AppendHandlers.onAppendLeftModelChange,
  onAppendTargetChange: AppendHandlers.onAppendTargetChange,

  // Pivot
  initializePivotDialog(): void {
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
  },
  onPivotConfigChange: PivotHandlers.onPivotConfigChange,
  constructPivotStep: PivotHandlers.constructPivotStep,
  previewPivot: PivotHandlers.previewPivot,

  // Fold (Unpivot)
  toggleColumnForFold: FoldHandlers.toggleColumnForFold,
  toggleFoldMode: FoldHandlers.toggleFoldMode,
  getColumnsToFold: FoldHandlers.getColumnsToFold,
  selectAllForFold: FoldHandlers.selectAllForFold,
  selectNoneForFold: FoldHandlers.selectNoneForFold,
  updateFoldPreview: FoldHandlers.updateFoldPreview,

  // Split
  detectDelimiter: SplitHandlers.detectDelimiter,
  debouncedUpdateSplitPreview: SplitHandlers.debouncedUpdateSplitPreview,
  selectSplitColumn: SplitHandlers.selectSplitColumn,
  updateSplitPreview: SplitHandlers.updateSplitPreview,

  // Merge
  selectMergeColumns: MergeHandlers.selectMergeColumns,

  // Dedupe
  toggleDedupeAllColumns: DedupeHandlers.toggleDedupeAllColumns,
  toggleDedupeColumn: DedupeHandlers.toggleDedupeColumn,
  selectAllForDedupe: DedupeHandlers.selectAllForDedupe,
  selectNoneForDedupe: DedupeHandlers.selectNoneForDedupe,
  getDedupeColumns: DedupeHandlers.getDedupeColumns,
  findDuplicateRows: DedupeHandlers.findDuplicateRows,
  updateDedupePreview: DedupeHandlers.updateDedupePreview,
  findAllDuplicateRowCount: DedupeHandlers.findAllDuplicateRowCount,

  // Regexp
  validateRegexpPattern: RegexpHandlers.validateRegexpPattern,
  validateRegexpMatchExpression: RegexpHandlers.validateRegexpMatchExpression,
  debouncedUpdateRegexpMatchPreview: RegexpHandlers.debouncedUpdateRegexpMatchPreview,
  updateRegexpMatchPreview: RegexpHandlers.updateRegexpMatchPreview,
  validateRegexpExtractExpression: RegexpHandlers.validateRegexpExtractExpression,
  debouncedUpdateRegexpExtractPreview: RegexpHandlers.debouncedUpdateRegexpExtractPreview,
  updateRegexpExtractPreview: RegexpHandlers.updateRegexpExtractPreview,

  // ============================================================
  // Settings & Theme
  // ============================================================

  applyTheme(): void {
    document.documentElement.setAttribute('data-theme', AppStore.theme.value);
  },

  switchTheme(theme: 'blues' | 'syto'): void {
    AppStore.theme.value = theme;
    AppController.applyTheme();
    updateUXSetting('theme', '', theme);
  },

  updatePreviewRowLimit(value: string): void {
    const limit = Math.max(10, Math.min(10000, parseInt(value, 10) || 100));
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, preview: { rowLimit: limit } };
    updateUXSetting('preview', 'rowLimit', limit);
  },

  getPreviewRowLimit(): number {
    return AppStore.uxSettings.value.preview?.rowLimit || 100;
  },

  updateAnalyticsOptOut(optOut: boolean): void {
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, analyticsOptOut: optOut };
    updateUXSetting('analyticsOptOut', '', optOut);
    if (optOut) {
      const existingScript = document.querySelector('script[data-goatcounter]');
      if (existingScript) {
        existingScript.remove();
      }
      if (typeof (window as any).goatcounter !== 'undefined') {
        (window as any).goatcounter = { count: () => {} };
      }
    }
  },

  switchLanguage(language: 'en' | 'uk'): void {
    // Update i18n
    i18n.changeLanguage(language);

    // Update app state
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, language };

    // Persist to localStorage
    updateUXSetting('language', '', language);
  },

  // ============================================================
  // Transformation state
  // ============================================================

  startTransformation,
  endTransformation,
};

export type AppControllerType = typeof AppController;
