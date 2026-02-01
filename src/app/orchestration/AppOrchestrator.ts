/**
 * AppOrchestrator - Main application initialization and coordination
 *
 * This module handles:
 * - Application initialization
 * - Theme management
 * - Transformation state (loading indicator)
 * - Pagination management
 * - Settings management
 */

import { AppStore } from '../stores/AppStore';
import { SchemaEngine } from '../../core/schema-engine';
import { loadUXSettings, updateUXSetting } from '../../core/ux-settings';
import { loadInitialData } from '../../core/storage';
import { setUrlState } from '../../core/url-state';
import { initEventRouter, destroyEventRouter, EventRouterCallbacks } from './EventRouter';
import {
  initUrlStateSync,
  destroyUrlStateSync,
  restoreFromUrl,
  syncCurrentStateToUrl,
  UrlSyncCallbacks,
} from './UrlStateSync';
import { setDialogCallbacks, DialogCallbacks } from './DialogCoordinator';
import * as PaginationHandlers from '../handlers/core/pagination-handlers';

export type OrchestratorCallbacks = EventRouterCallbacks &
  UrlSyncCallbacks &
  DialogCallbacks & {
    updatePagination: () => void;
  };

let initialized = false;

/**
 * Initialize the application
 */
export async function initApp(callbacks: OrchestratorCallbacks): Promise<void> {
  if (initialized) {
    console.warn('App already initialized');
    return;
  }

  console.log('Initializing Syto App...');

  // Load UX settings
  const uxSettings = loadUXSettings();
  AppStore.uxSettings.value = uxSettings;
  AppStore.pageSize.value = uxSettings.pagination.pageSize;
  AppStore.theme.value = uxSettings.theme;
  applyTheme();

  // Load data from IndexedDB
  const { sources, models } = await loadInitialData();
  AppStore.sources.value = sources;
  AppStore.models.value = models;

  // Initialize subsystems
  initEventRouter(callbacks);
  initUrlStateSync(callbacks);
  setDialogCallbacks(callbacks);

  // Restore state from URL
  const restored = restoreFromUrl(sources, models, callbacks);

  // If no state restored, show first model
  if (!restored && models.length > 0) {
    AppStore.activeModel.value = models[0];
    AppStore.currentData.value = models[0].data;
    AppStore.viewMode.value = 'model';
    setUrlState({ sourceId: models[0].sourceId, modelId: models[0].id });
  }

  // Set active step index
  const activeModel = AppStore.activeModel.value;
  if (activeModel) {
    AppStore.activeStepIndex.value =
      activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;
    AppStore.viewingIntermediate.value = false;
  }

  // Initialize columns and schema
  initializeColumnsAndSchema();

  // Update pagination
  callbacks.updatePagination();

  // Sync URL state after initial render
  setTimeout(() => syncCurrentStateToUrl(), 0);

  initialized = true;
}

/**
 * Initialize columns and schema from current data
 */
function initializeColumnsAndSchema(): void {
  const currentData = AppStore.currentData.value;
  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;

  if (currentData && currentData.length > 0) {
    if (activeModel && (!activeModel.schema || activeModel.schema.length === 0)) {
      // Fallback: infer logical types for model
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
}

/**
 * Destroy the app and clean up
 */
export function destroyApp(): void {
  destroyEventRouter();
  destroyUrlStateSync();
  initialized = false;
}

/**
 * Apply the current theme to the document
 */
export function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', AppStore.theme.value);
}

/**
 * Switch to a different theme
 */
export function switchTheme(theme: 'blues' | 'syto'): void {
  AppStore.theme.value = theme;
  applyTheme();
  updateUXSetting('theme', '', theme);
}

/**
 * Start a transformation (show loading indicator)
 */
export async function startTransformation(message: string): Promise<void> {
  AppStore.isTransforming.value = true;
  AppStore.transformMessage.value = message;
  // Allow UI to update before continuing
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * End a transformation (hide loading indicator)
 */
export function endTransformation(): void {
  AppStore.isTransforming.value = false;
  AppStore.transformMessage.value = '';
}

/**
 * Update the preview row limit setting
 */
export function updatePreviewRowLimit(value: string): void {
  const limit = Math.max(10, Math.min(10000, parseInt(value, 10) || 100));
  const uxSettings = { ...AppStore.uxSettings.value };
  uxSettings.preview = { rowLimit: limit };
  AppStore.uxSettings.value = uxSettings;
  updateUXSetting('preview', 'rowLimit', limit);
}

/**
 * Get the current preview row limit
 */
export function getPreviewRowLimit(): number {
  return AppStore.uxSettings.value.preview?.rowLimit || 100;
}

/**
 * Update analytics opt-out setting
 */
export function updateAnalyticsOptOut(optOut: boolean): void {
  const uxSettings = { ...AppStore.uxSettings.value };
  uxSettings.analyticsOptOut = optOut;
  AppStore.uxSettings.value = uxSettings;
  updateUXSetting('analyticsOptOut', '', optOut);

  if (optOut) {
    // Remove GoatCounter script and disable tracking
    const existingScript = document.querySelector('script[data-goatcounter]');
    if (existingScript) {
      existingScript.remove();
    }
    if (typeof (window as any).goatcounter !== 'undefined') {
      (window as any).goatcounter = { count: () => {} };
    }
  }
}

// Re-export pagination handlers for convenience
export const updatePagination = PaginationHandlers.updatePagination;
export const getPaginatedData = PaginationHandlers.getPaginatedData;
export const getPaginationInfo = PaginationHandlers.getPaginationInfo;
export const previousPage = PaginationHandlers.previousPage;
export const nextPage = PaginationHandlers.nextPage;
export const goToFirstPage = PaginationHandlers.goToFirstPage;
export const goToLastPage = PaginationHandlers.goToLastPage;
export const updatePageSize = PaginationHandlers.updatePageSize;
