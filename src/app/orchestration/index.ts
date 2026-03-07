/**
 * Orchestration module - Centralized app coordination
 *
 * This module provides the main entry points for app initialization,
 * event routing, URL state sync, and dialog coordination.
 */

// Main app orchestration
export {
  initApp,
  destroyApp,
  applyTheme,
  switchTheme,
  startTransformation,
  endTransformation,
  updatePreviewRowLimit,
  getPreviewRowLimit,
  updateAnalyticsOptOut,
  updatePagination,
  getPaginatedData,
  getPaginationInfo,
  previousPage,
  nextPage,
  goToFirstPage,
  goToLastPage,
  updatePageSize,
} from './AppOrchestrator';

// Event routing
export {
  initEventRouter,
  destroyEventRouter,
  isInInteractiveContext,
  hasModifier,
} from './EventRouter';
export type { EventRouterCallbacks } from './EventRouter';

// URL state sync
export {
  initUrlStateSync,
  destroyUrlStateSync,
  syncSourceToUrl,
  syncModelToUrl,
  syncModelInfoToUrl,
  syncDatasetInfoToUrl,
  syncDialogToUrl,
  clearDialogFromUrl,
  getCurrentUrlState,
  restoreFromUrl,
  syncCurrentStateToUrl,
} from './UrlStateSync';
export type { UrlSyncCallbacks } from './UrlStateSync';

// Dialog coordination
export {
  setDialogCallbacks,
  getDialogState,
  snapshotDialogState,
  hasUnsavedChanges,
  initDialogState,
  openDialog,
  closeDialog,
  clearPreview,
  activeDialogHasError,
  hasPreviewData,
  getPreviewTitle,
  getPreviewStats,
  getPreviewColumns,
  getPreviewRows,
  isNewPreviewColumn,
} from './DialogCoordinator';
export type { DialogCallbacks } from './DialogCoordinator';
