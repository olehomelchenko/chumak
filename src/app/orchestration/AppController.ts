/**
 * AppController - Orchestration methods only
 *
 * Contains methods that compose multiple handler/service calls or inject callbacks.
 * Pure pass-throughs have been removed — consumers import handler functions directly.
 *
 * Usage in components:
 *   import { AppController } from '../orchestration/AppController';
 *   // For orchestration methods (compose multiple handlers):
 *   AppController.switchToModel(model)
 *   // For direct handler calls, import from handler module:
 *   import { openDialog } from '../handlers/dialog/dialog-handlers';
 */

import { setUrlState, clearUrlHash } from '../infrastructure/url-state';
import { updateUXSetting } from '../infrastructure/ux-settings';
import { AppStore } from '../stores/AppStore';
import { ModelService } from '../services/ModelService';
import { ImportService } from '../services/ImportService';
import { ExportService } from '../services/ExportService';
import i18n from '../../i18n';

// Handler imports — only those used by orchestration methods
import * as DialogHandlers from '../handlers/dialog/dialog-handlers';
import * as NotificationHandlers from '../handlers/core/notification-handlers';
import * as EDAHandlers from '../handlers/core/eda-handlers';
import * as InteractionHandlers from '../handlers/core/interaction-handlers';
import * as PaginationHandlers from '../handlers/core/pagination-handlers';
import * as ShortcutHandlers from '../handlers/transform/shortcut-handlers';

import type { Source, Model } from '../types';

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
// AppController - Orchestration methods only
// ============================================================

export const AppController = {
  // ============================================================
  // Dialog & Navigation
  // ============================================================

  goHome(): void {
    AppStore.activeModel.value = null;
    AppStore.currentData.value = null;
    AppStore.viewMode.value = 'empty';
    clearUrlHash();
  },

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
  // Interaction & Selection (inject callbacks)
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

  async promoteSelectedRowToHeader() {
    await InteractionHandlers.promoteSelectedRowToHeader({
      onTransformStart: startTransformation,
      onTransformEnd: endTransformation,
      onError: NotificationHandlers.alert,
      updatePagination: () => PaginationHandlers.updatePagination(),
    });
  },

  async extractSelectedRows() {
    await InteractionHandlers.extractSelectedRows((model) => AppController.switchToModel(model));
  },

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

  executeShortcut: (id: string) => ShortcutHandlers.executeShortcut(id, shortcutCallbacks()),

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
    i18n.changeLanguage(language);
    AppStore.uxSettings.value = { ...AppStore.uxSettings.value, language };
    updateUXSetting('language', '', language);
  },

  // ============================================================
  // Transformation state
  // ============================================================

  startTransformation,
  endTransformation,
};

export type AppControllerType = typeof AppController;
