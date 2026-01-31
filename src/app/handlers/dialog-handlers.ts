/**
 * Dialog Handlers - Legacy wrappers for backward compatibility
 *
 * This module provides backward-compatible wrappers around DialogCoordinator
 * functions for use with the SytoApp `.call(this, ...)` pattern.
 *
 * New code should use DialogCoordinator directly.
 */

import { html as aboutHtml } from '../../content/about.md';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import {
  isSlidePanel as registryIsSlidePanel,
  isCenteredModal as registryIsCenteredModal,
  getDialogTitle as registryGetDialogTitle,
  getDialogButtonText as registryGetDialogButtonText,
  isUrlNavigableDialog,
} from '../dialog-registry';
import * as DialogCoordinator from '../orchestration/DialogCoordinator';
import { syncDialogToUrl, clearDialogFromUrl } from '../orchestration/UrlStateSync';

// Re-export pure functions from DialogCoordinator
export {
  hasPreviewData,
  getPreviewTitle,
  getPreviewStats,
  getPreviewColumns,
  getPreviewRows,
  isNewPreviewColumn,
  formatPreviewCell,
  clearPreview as clearPreviewDirect,
} from '../orchestration/DialogCoordinator';

/**
 * Legacy SytoApp interface for backward compatibility
 */
interface LegacyApp {
  activeDialog: string | null;
  dialogSnapshot: string | null;
  columns: string[];
  selectedColumn: string | null;
  theme: string;
  uxSettings: any;
  _previewDebounceTimer: any;
  // Proxy state accessors (still using proxy pattern)
  sliceRowsDialogState: any;
  indexDialogState: any;
  aggregateDialogState: any;
  foldDialogState: any;
  pivotDialogState: any;
  replaceDialogState: any;
  splitDialogState: any;
  regexpMatchDialogState: any;
  regexpExtractDialogState: any;
  importDialogState: any;
  importUrlDialogState: any;
  dedupeDialogState: any;
  importFileData: any;
  // Methods
  getDialogState: (dialog: string) => any;
  initDialogState: (dialog: string, section?: string) => void;
  clearColumnSelection: () => void;
  confirm: (message: string) => Promise<boolean>;
  initializeJoinDialog: () => void;
  initializeAppendDialog: () => void;
  initializePivotDialog: () => void;
  detectDelimiter: (column: string) => any;
  debouncedUpdateSplitPreview?: () => void;
  updateDedupePreview?: () => void;
  updateImputePreview?: () => void;
  resetDialogStates: () => void;
  clearPreview: () => void;
  hasUnsavedChanges: () => boolean;
}

/**
 * Get serializable state for a dialog (used for change detection).
 * This version uses proxy state from SytoApp for some dialogs.
 */
export function getDialogState(this: LegacyApp | void, dialog: string): any {
  const legacyApp = this as LegacyApp | undefined;

  // For dialogs that don't use proxy state, delegate to DialogCoordinator
  const coordResult = DialogCoordinator.getDialogState(dialog);

  // Handle dialogs that still use proxy state from SytoApp
  if (legacyApp) {
    switch (dialog) {
      case 'sliceRows':
        return legacyApp.sliceRowsDialogState;
      case 'index':
        return legacyApp.indexDialogState;
      case 'aggregate':
        return legacyApp.aggregateDialogState;
      case 'fold':
        return legacyApp.foldDialogState;
      case 'pivot':
        return legacyApp.pivotDialogState;
      case 'replace':
        return legacyApp.replaceDialogState;
      case 'split':
        return legacyApp.splitDialogState;
      case 'regexpMatch':
        return legacyApp.regexpMatchDialogState;
      case 'regexpExtract':
        return legacyApp.regexpExtractDialogState;
      case 'import-csv':
        return legacyApp.importDialogState;
      case 'import-url':
        return { url: legacyApp.importUrlDialogState?.url };
      case 'dedupe':
        return legacyApp.dedupeDialogState;
      case 'settings':
        return {
          theme: legacyApp.theme,
          rowLimit: legacyApp.uxSettings?.preview?.rowLimit || 100,
          analyticsOptOut: legacyApp.uxSettings?.analyticsOptOut ?? false,
        };
    }
  }

  return coordResult;
}

/**
 * Take a snapshot of current dialog state
 */
export function reSnapshot(this: LegacyApp | void): void {
  const activeDialog = this ? (this as LegacyApp).activeDialog : AppStore.activeDialog.value;
  if (activeDialog) {
    const state = getDialogState.call(this, activeDialog);
    AppStore.dialogSnapshot.value = JSON.stringify(state);
  }
}

/**
 * Open a dialog
 */
export function openDialog(this: LegacyApp | void, dialogName: string, section?: string): void {
  const legacyApp = this as LegacyApp | undefined;

  AppStore.activeDialog.value = dialogName as any;
  initDialogState.call(this, dialogName, section);

  if (legacyApp?.clearColumnSelection) {
    legacyApp.clearColumnSelection();
  }

  reSnapshot.call(this);

  // Update URL for navigable pages
  syncDialogToUrl(dialogName, section);
}

/**
 * Initialize state for a specific dialog.
 * Delegates to DialogCoordinator but sets up callbacks from SytoApp.
 */
export function initDialogState(
  this: LegacyApp | void,
  dialogName: string,
  section?: string
): void {
  const legacyApp = this as LegacyApp | undefined;

  // Set up callbacks for DialogCoordinator if we have a legacy app
  if (legacyApp) {
    DialogCoordinator.setDialogCallbacks({
      initializeJoinDialog: () => legacyApp.initializeJoinDialog?.(),
      initializeAppendDialog: () => legacyApp.initializeAppendDialog?.(),
      initializePivotDialog: () => legacyApp.initializePivotDialog?.(),
      detectDelimiter: (col) => legacyApp.detectDelimiter?.(col),
      debouncedUpdateSplitPreview: () => legacyApp.debouncedUpdateSplitPreview?.(),
      updateDedupePreview: () => legacyApp.updateDedupePreview?.(),
      updateImputePreview: () => legacyApp.updateImputePreview?.(),
      clearColumnSelection: () => legacyApp.clearColumnSelection?.(),
      confirm: (msg) => legacyApp.confirm?.(msg) ?? Promise.resolve(false),
    });
  }

  // Delegate to DialogCoordinator for initialization
  DialogCoordinator.initDialogState(dialogName, section);

  // Handle import-csv special case (copies from proxy state)
  if (dialogName === 'import-csv' && legacyApp) {
    const state = DialogStore.importCsvState;
    const proxy = legacyApp.importDialogState;
    if (proxy) {
      state.sourceName.value = proxy.sourceName || '';
      state.isJson.value = !!proxy.isJson;
      state.jsonPath.value = proxy.jsonPath || '';
      state.jsonRawValuePreview.value = proxy.jsonRawValuePreview || '';
      state.suggestedJsonKeys.value = proxy.suggestedJsonKeys || [];
      state.flattenJson.value = !!proxy.flattenJson;
      state.serializeNested.value = !!proxy.serializeNested;
      state.jsonData.value = proxy.jsonData || null;
      state.delimiter.value = proxy.delimiter || ',';
      state.headerMode.value = proxy.headerMode || 'auto';
      state.customHeaders.value = [...(proxy.customHeaders || [])];
      state.duplicateWarning.value = proxy.duplicateWarning || '';
      state.previewHeaders.value = [...(proxy.previewHeaders || [])];
      state.previewDataRows.value = [...(proxy.previewDataRows || [])];
    }
  }

  // Handle pivot special case (copies from proxy state)
  if (dialogName === 'pivot' && legacyApp) {
    const state = DialogStore.pivotState;
    const proxy = legacyApp.pivotDialogState;
    if (proxy) {
      state.rowColumns.value = [...(proxy.rowColumns || [])];
      state.columnColumn.value = proxy.columnColumn || '';
      state.valueColumn.value = proxy.valueColumn || '';
      state.aggregation.value = proxy.aggregation || 'sum';
      state.uniqueValueCount.value = proxy.uniqueValueCount || 0;
      state.options.value = { ...(proxy.options || {}) };
      state.isPreviewing.value = proxy.isPreviewing || false;
    }
  }
}

/**
 * Check if a dialog is a slide panel
 */
export function isSlidePanel(this: LegacyApp | void, dialog: string | null): boolean {
  return registryIsSlidePanel(dialog as any);
}

/**
 * Check if a dialog is a centered modal
 */
export function isCenteredModal(this: LegacyApp | void, dialog: string | null): boolean {
  return registryIsCenteredModal(dialog as any);
}

/**
 * Get the title for the active dialog
 */
export function getDialogTitle(this: LegacyApp | void): string {
  const activeDialog = this ? (this as LegacyApp).activeDialog : AppStore.activeDialog.value;
  return registryGetDialogTitle(activeDialog as any, this as any);
}

/**
 * Get the button text for the active dialog
 */
export function getDialogButtonText(this: LegacyApp | void): string {
  const activeDialog = this ? (this as LegacyApp).activeDialog : AppStore.activeDialog.value;
  return registryGetDialogButtonText(activeDialog as any);
}

/**
 * Get the about page content
 */
export function getAboutContent(this: LegacyApp | void): string {
  return aboutHtml;
}

/**
 * Clear the preview state
 */
export function clearPreview(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;

  // Clear any pending debounce timer
  if (legacyApp?._previewDebounceTimer) {
    clearTimeout(legacyApp._previewDebounceTimer);
    legacyApp._previewDebounceTimer = null;
  }

  DialogCoordinator.clearPreview();
}

/**
 * Check if the active dialog has an error that should disable the apply button
 */
export function activeDialogError(this: LegacyApp | void): boolean {
  const legacyApp = this as LegacyApp | undefined;
  const activeDialog = legacyApp?.activeDialog ?? AppStore.activeDialog.value;

  // Handle dialogs that use proxy state
  if (legacyApp) {
    switch (activeDialog) {
      case 'sliceRows':
        return !legacyApp.sliceRowsDialogState?.count || legacyApp.sliceRowsDialogState?.count <= 0;
      case 'index':
        return (
          !legacyApp.indexDialogState?.columnName ||
          legacyApp.indexDialogState?.columnName.trim() === ''
        );
      case 'regexpMatch':
        return !!legacyApp.regexpMatchDialogState?.error;
      case 'regexpExtract':
        return !!legacyApp.regexpExtractDialogState?.error;
      case 'split':
        return !!legacyApp.splitDialogState?.error;
      case 'pivot':
        return (
          !legacyApp.pivotDialogState?.columnColumn || !legacyApp.pivotDialogState?.valueColumn
        );
      case 'dedupe':
        return (
          !legacyApp.dedupeDialogState?.useAllColumns &&
          !legacyApp.dedupeDialogState?.selectedColumns?.some((v: any) => v)
        );
      case 'import-url':
        return !legacyApp.importUrlDialogState?.url || legacyApp.importUrlDialogState?.isFetching;
    }
  }

  // Delegate to DialogCoordinator for other dialogs
  return DialogCoordinator.activeDialogHasError();
}

/**
 * Check if dialog has unsaved changes
 */
export function hasUnsavedChanges(this: LegacyApp | void): boolean {
  const legacyApp = this as LegacyApp | undefined;
  const activeDialog = legacyApp?.activeDialog ?? AppStore.activeDialog.value;
  const snapshot = AppStore.dialogSnapshot.value;

  if (!activeDialog || snapshot === null) return false;

  const current = getDialogState.call(this, activeDialog);
  if (current === null) return false;

  return JSON.stringify(current) !== snapshot;
}

/**
 * Close the current dialog
 */
export async function closeDialog(this: LegacyApp | void, force = false): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const activeDialog = legacyApp?.activeDialog ?? AppStore.activeDialog.value;

  if (!force && hasUnsavedChanges.call(this)) {
    const confirmed = legacyApp?.confirm
      ? await legacyApp.confirm('You have unsaved changes. Are you sure you want to discard them?')
      : await DialogCoordinator.closeDialog(false);
    if (!confirmed) return;
  }

  // Clear URL hash if closing a navigable page
  if (activeDialog && isUrlNavigableDialog(activeDialog as any)) {
    clearDialogFromUrl(activeDialog);
  }

  clearPreview.call(this);
  AppStore.activeDialog.value = null;
  AppStore.dialogSnapshot.value = null;
  resetDialogStates.call(this);
}

/**
 * Reset all dialog states
 */
export function resetDialogStates(this: LegacyApp | void): void {
  DialogStore.resetAll();
  AppStore.importFileData.value = null;
}

/**
 * Handle browser back/forward navigation.
 * This is a legacy wrapper that sets up callbacks and delegates to the URL state handler.
 */
export function handleHashChange(this: LegacyHashChangeApp | void): void {
  const legacyApp = this as LegacyHashChangeApp | undefined;
  if (!legacyApp) return;

  const { getUrlState } = require('../../core/url-state');
  const urlState = getUrlState();

  // Handle page routes (about, reference, expressions, settings)
  if (urlState.page) {
    if (legacyApp.activeDialog !== urlState.page) {
      legacyApp.openDialog(urlState.page, urlState.section);
    }
    return;
  }

  // Handle model/source routes
  if (urlState.modelId) {
    const model = legacyApp.models?.find((m: any) => m.id === urlState.modelId);
    if (model) {
      if (urlState.section === 'info') {
        // Show model info view
        if (legacyApp.activeModel?.id !== model.id || AppStore.viewMode.value !== 'model-info') {
          legacyApp.showModelInfo?.();
        }
      } else {
        // Switch to model view
        if (legacyApp.activeModel?.id !== model.id) {
          legacyApp.switchToModel?.(model);
        }
      }
    }
  } else if (urlState.sourceId) {
    const source = legacyApp.sources?.find((s: any) => s.id === urlState.sourceId);
    if (source) {
      if (urlState.section === 'info') {
        // Show dataset info view
        if (
          legacyApp.activeSource?.id !== source.id ||
          AppStore.viewMode.value !== 'dataset-info'
        ) {
          legacyApp.showDatasetInfo?.(source);
        }
      } else {
        // Switch to source view
        if (legacyApp.activeSource?.id !== source.id) {
          legacyApp.switchToSource?.(source);
        }
      }
    }
  }

  // Close dialog if hash changed to non-page route
  if (legacyApp.activeDialog && isUrlNavigableDialog(legacyApp.activeDialog as any)) {
    AppStore.activeDialog.value = null;
  }
}

/**
 * Extended legacy interface for handleHashChange
 */
interface LegacyHashChangeApp extends LegacyApp {
  models: any[];
  sources: any[];
  activeModel: any;
  activeSource: any;
  openDialog: (dialog: string, section?: string) => void;
  switchToModel: (model: any) => void;
  switchToSource: (source: any) => void;
  showModelInfo: () => void;
  showDatasetInfo: (source: any) => void;
}

// Re-export URL sync functions from UrlStateSync
export { syncDialogToUrl, clearDialogFromUrl } from '../orchestration/UrlStateSync';
