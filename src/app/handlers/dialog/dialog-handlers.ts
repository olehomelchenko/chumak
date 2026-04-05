/**
 * Dialog Handlers - Store-based dialog operations
 *
 * This module provides dialog lifecycle functions that use stores directly.
 * Functions are pure (no 'this' context needed).
 */

import i18n from '../../../i18n/core';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';
import {
  isSlidePanel as registryIsSlidePanel,
  isCenteredModal as registryIsCenteredModal,
  getDialogTitle as registryGetDialogTitle,
  getDialogButtonText as registryGetDialogButtonText,
  isUrlNavigableDialog,
} from '../../dialog-registry';
import * as DialogCoordinator from '../../orchestration/DialogCoordinator';
import { syncDialogToUrl, clearDialogFromUrl } from '../../orchestration/UrlStateSync';
import { getUrlState } from '../../infrastructure/url-state';

// Re-export pure functions from DialogCoordinator
export {
  hasPreviewData,
  getPreviewTitle,
  getPreviewStats,
  getPreviewColumns,
  getPreviewRows,
  isNewPreviewColumn,
  clearPreview as clearPreviewDirect,
} from '../../orchestration/DialogCoordinator';

/**
 * Callbacks for dialog operations that need external methods
 */
export interface DialogHandlerCallbacks {
  confirm?: (message: string, confirmLabel?: string) => Promise<boolean>;
  clearColumnSelection?: () => void;
  openDialog?: (dialog: string, section?: string) => void;
  switchToModel?: (model: any) => void;
  switchToSource?: (source: any) => void;
  showModelInfo?: () => void;
  showDatasetInfo?: (source: any) => void;
  // Dialog initialization callbacks (passed to DialogCoordinator)
  initializeJoinDialog?: () => void;
  initializeAppendDialog?: () => void;
  initializePivotDialog?: () => void;
  detectDelimiter?: (column: string) => any;
  debouncedUpdateSplitPreview?: () => void;
  updateDedupePreview?: () => void;
}

let dialogHandlerCallbacks: DialogHandlerCallbacks = {};

/**
 * Set callbacks for dialog operations
 */
export function setDialogHandlerCallbacks(callbacks: DialogHandlerCallbacks): void {
  dialogHandlerCallbacks = { ...dialogHandlerCallbacks, ...callbacks };
}

/**
 * Get serializable state for a dialog (used for change detection).
 * Delegates to the dialog registry via DialogCoordinator.
 */
export function getDialogState(dialog: string): any {
  return DialogCoordinator.getDialogState(dialog);
}

/**
 * Take a snapshot of current dialog state
 */
export function reSnapshot(): void {
  const activeDialog = AppStore.activeDialog.value;
  if (activeDialog) {
    const state = getDialogState(activeDialog);
    AppStore.dialogSnapshot.value = JSON.stringify(state);
  }
}

/**
 * Open a dialog
 */
export function openDialog(dialogName: string, section?: string): void {
  AppStore.activeDialog.value = dialogName as any;
  initDialogState(dialogName, section);

  // Clear column selection via callback
  dialogHandlerCallbacks.clearColumnSelection?.();

  reSnapshot();

  // Update URL for navigable pages
  syncDialogToUrl(dialogName, section);
}

/**
 * Initialize state for a specific dialog.
 * Delegates to DialogCoordinator but sets up callbacks.
 */
export function initDialogState(dialogName: string, section?: string): void {
  // Set up callbacks for DialogCoordinator
  DialogCoordinator.setDialogCallbacks({
    initializeJoinDialog: dialogHandlerCallbacks.initializeJoinDialog,
    initializeAppendDialog: dialogHandlerCallbacks.initializeAppendDialog,
    initializePivotDialog: dialogHandlerCallbacks.initializePivotDialog,
    detectDelimiter: dialogHandlerCallbacks.detectDelimiter,
    debouncedUpdateSplitPreview: dialogHandlerCallbacks.debouncedUpdateSplitPreview,
    updateDedupePreview: dialogHandlerCallbacks.updateDedupePreview,
    clearColumnSelection: dialogHandlerCallbacks.clearColumnSelection,
    confirm: dialogHandlerCallbacks.confirm,
  });

  // Delegate to DialogCoordinator for initialization
  DialogCoordinator.initDialogState(dialogName, section);
}

/**
 * Check if a dialog is a slide panel
 */
export function isSlidePanel(dialog: string | null): boolean {
  return registryIsSlidePanel(dialog as any);
}

/**
 * Check if a dialog is a centered modal
 */
export function isCenteredModal(dialog: string | null): boolean {
  return registryIsCenteredModal(dialog as any);
}

/**
 * Get the title for the active dialog
 */
export function getDialogTitle(): string {
  const activeDialog = AppStore.activeDialog.value;
  return registryGetDialogTitle(activeDialog as any);
}

/**
 * Get the button text for the active dialog
 */
export function getDialogButtonText(): string {
  const activeDialog = AppStore.activeDialog.value;
  return registryGetDialogButtonText(activeDialog as any);
}

/**
 * Clear the preview state
 */
export function clearPreview(): void {
  DialogCoordinator.clearPreview();
}

/**
 * Check if the active dialog has an error that should disable the apply button
 */
export function activeDialogError(): boolean {
  const activeDialog = AppStore.activeDialog.value;

  // Handle dialogs using DialogStore directly
  switch (activeDialog) {
    case 'index':
    case 'regexpMatch':
    case 'regexpExtract':
    case 'replace':
    case 'selectPattern':
    case 'removePattern':
    case 'renamePattern':
      return DialogStore.activeDialogHasError.value;
    case 'split': {
      const state = DialogStore.splitState;
      return !!state.error.value;
    }
    case 'pivot': {
      const state = DialogStore.pivotState;
      return !state.columnColumn.value || !state.valueColumn.value;
    }
    case 'dedupe': {
      const state = DialogStore.dedupeState;
      return !state.useAllColumns.value && !state.selectedColumns.value?.some((v: any) => v);
    }
    case 'import-url': {
      const state = DialogStore.importUrlState;
      return !state.url.value || state.isFetching.value;
    }
    default:
      // Delegate to DialogCoordinator for other dialogs
      return DialogCoordinator.activeDialogHasError();
  }
}

/**
 * Check if dialog has unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  const activeDialog = AppStore.activeDialog.value;
  const snapshot = AppStore.dialogSnapshot.value;

  if (!activeDialog || snapshot === null) return false;

  const current = getDialogState(activeDialog);
  if (current === null) return false;

  return JSON.stringify(current) !== snapshot;
}

/**
 * Close the current dialog
 */
export async function closeDialog(force = false): Promise<void> {
  const activeDialog = AppStore.activeDialog.value;

  if (!force && hasUnsavedChanges()) {
    const confirmFn = dialogHandlerCallbacks.confirm;
    if (confirmFn) {
      const confirmed = await confirmFn(
        i18n.t('confirms.unsavedChanges', { ns: 'common' }),
        i18n.t('buttons.discard', { ns: 'common' })
      );
      if (!confirmed) return;
    }
    // If no confirm callback, just proceed (can't ask user)
  }

  // Clear URL hash if closing a navigable page
  if (activeDialog && isUrlNavigableDialog(activeDialog as any)) {
    clearDialogFromUrl(activeDialog);
  }

  clearPreview();
  AppStore.activeDialog.value = null;
  AppStore.dialogSnapshot.value = null;
  resetDialogStates();
}

/**
 * Reset all dialog states
 */
export function resetDialogStates(): void {
  DialogStore.resetAll();
  AppStore.importFileData.value = null;
}

/**
 * Handle browser back/forward navigation.
 * Uses stores directly and callbacks for navigation.
 */
export function handleHashChange(): void {
  const urlState = getUrlState();
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;
  const activeDialog = AppStore.activeDialog.value;

  // Handle page routes (reference, expressions, settings)
  if (urlState.page) {
    if (activeDialog !== urlState.page) {
      dialogHandlerCallbacks.openDialog?.(urlState.page, urlState.section);
    }
    return;
  }

  // Handle model/source routes
  if (urlState.modelId) {
    const model = models?.find((m: any) => m.id === urlState.modelId);
    if (model) {
      if (urlState.section === 'info') {
        // Show model info view
        if (activeModel?.id !== model.id || AppStore.viewMode.value !== 'model-info') {
          dialogHandlerCallbacks.showModelInfo?.();
        }
      } else {
        // Switch to model view
        if (activeModel?.id !== model.id) {
          dialogHandlerCallbacks.switchToModel?.(model);
        }
      }
    }
  } else if (urlState.sourceId) {
    const source = sources?.find((s: any) => s.id === urlState.sourceId);
    if (source) {
      if (urlState.section === 'info') {
        // Show dataset info view
        if (activeSource?.id !== source.id || AppStore.viewMode.value !== 'dataset-info') {
          dialogHandlerCallbacks.showDatasetInfo?.(source);
        }
      } else {
        // Switch to source view
        if (activeSource?.id !== source.id) {
          dialogHandlerCallbacks.switchToSource?.(source);
        }
      }
    }
  }

  // Close dialog if hash changed to non-page route
  if (activeDialog && isUrlNavigableDialog(activeDialog as any)) {
    AppStore.activeDialog.value = null;
  }
}

// Re-export URL sync functions from UrlStateSync
export { syncDialogToUrl, clearDialogFromUrl } from '../../orchestration/UrlStateSync';
