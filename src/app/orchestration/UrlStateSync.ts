/**
 * UrlStateSync - URL hash state synchronization
 *
 * Manages bidirectional sync between app state and URL hash.
 * Handles browser back/forward navigation.
 */

import { AppStore } from '../stores/AppStore';
import { getUrlState, setUrlState, clearUrlHash, URLState } from '../infrastructure/url-state';
import { isUrlNavigableDialog } from '../dialog-registry';

export type UrlSyncCallbacks = {
  openDialog: (name: string, section?: string) => void;
  switchToModel: (model: any) => void;
  switchToSource: (source: any) => void;
  showModelInfo: () => void;
  showDatasetInfo: (source: any) => void;
  clearColumnSelection: () => void;
};

let callbacks: UrlSyncCallbacks | null = null;
let initialized = false;

/**
 * Initialize URL state sync with callbacks
 */
export function initUrlStateSync(cb: UrlSyncCallbacks): void {
  if (initialized) {
    console.warn('UrlStateSync already initialized');
    return;
  }

  callbacks = cb;
  window.addEventListener('hashchange', handleHashChange);
  initialized = true;
}

/**
 * Clean up URL state sync
 */
export function destroyUrlStateSync(): void {
  window.removeEventListener('hashchange', handleHashChange);
  callbacks = null;
  initialized = false;
}

/**
 * Handle browser back/forward navigation
 */
function handleHashChange(): void {
  if (!callbacks) return;

  const urlState = getUrlState();

  // Handle page routes (reference, expressions, settings)
  if (urlState.page) {
    if (AppStore.activeDialog.value !== urlState.page) {
      callbacks.openDialog(urlState.page, urlState.section);
    }
    return;
  }

  // Handle model/source routes
  if (urlState.modelId) {
    const model = AppStore.models.value.find((m) => m.id === urlState.modelId);
    if (model) {
      if (urlState.section === 'info') {
        // Show model info view
        if (
          AppStore.activeModel.value?.id !== model.id ||
          AppStore.viewMode.value !== 'model-info'
        ) {
          callbacks.showModelInfo();
        }
      } else {
        // Switch to model view
        if (AppStore.activeModel.value?.id !== model.id) {
          callbacks.switchToModel(model);
        }
      }
    }
  } else if (urlState.sourceId) {
    const source = AppStore.sources.value.find((s) => s.id === urlState.sourceId);
    if (source) {
      if (urlState.section === 'info') {
        // Show dataset info view
        if (
          AppStore.activeSource.value?.id !== source.id ||
          AppStore.viewMode.value !== 'dataset-info'
        ) {
          callbacks.showDatasetInfo(source);
        }
      } else {
        // Switch to source view
        if (AppStore.activeSource.value?.id !== source.id) {
          callbacks.switchToSource(source);
        }
      }
    }
  }

  // Close dialog if hash changed to non-page route
  const activeDialog = AppStore.activeDialog.value;
  if (activeDialog && isUrlNavigableDialog(activeDialog as any)) {
    AppStore.activeDialog.value = null;
  }
}

/**
 * Update URL when switching to a source
 */
export function syncSourceToUrl(sourceId: string): void {
  setUrlState({ sourceId });
}

/**
 * Update URL when switching to a model
 */
export function syncModelToUrl(sourceId: string, modelId: string): void {
  setUrlState({ sourceId, modelId });
}

/**
 * Update URL when showing model info
 */
export function syncModelInfoToUrl(sourceId: string, modelId: string): void {
  setUrlState({ sourceId, modelId, section: 'info' });
}

/**
 * Update URL when showing dataset info
 */
export function syncDatasetInfoToUrl(sourceId: string): void {
  setUrlState({ sourceId, section: 'info' });
}

/**
 * Update URL when opening a navigable dialog
 */
export function syncDialogToUrl(dialogName: string, section?: string): void {
  if (isUrlNavigableDialog(dialogName as any)) {
    setUrlState({ page: dialogName, section });
  }
}

/**
 * Clear URL when closing a navigable dialog
 */
export function clearDialogFromUrl(dialogName: string): void {
  if (isUrlNavigableDialog(dialogName as any)) {
    clearUrlHash();
  }
}

/**
 * Get current URL state
 */
export function getCurrentUrlState(): URLState {
  return getUrlState();
}

/**
 * Restore only dialog pages (reference, settings, expressions) from URL on startup.
 * Does not auto-navigate to models/sources — the main menu is always the starting view.
 */
export function restoreDialogsFromUrl(
  _sources: any[],
  _models: any[],
  callbacks: UrlSyncCallbacks
): boolean {
  const urlState = getUrlState();

  if (urlState.page) {
    callbacks.openDialog(urlState.page, urlState.section);
    setUrlState({ page: urlState.page, section: urlState.section });
    return true;
  }

  // Clear any stale model/source hash so it doesn't persist
  if (urlState.sourceId || urlState.modelId) {
    clearUrlHash();
  }

  return false;
}

/**
 * Sync current state to URL (for initial load)
 */
export function syncCurrentStateToUrl(): void {
  if (AppStore.viewMode.value === 'empty') {
    clearUrlHash();
    return;
  }

  const model = AppStore.activeModel.value;
  const source = AppStore.activeSource.value;

  setUrlState({
    modelId: model?.id,
    sourceId: source?.id || model?.sourceId,
  });
}
