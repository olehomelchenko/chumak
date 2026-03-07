/**
 * AppOrchestrator - Application initialization
 *
 * Single entry point for bootstrapping the app:
 * - Wires handler callbacks
 * - Loads persisted state (UX settings, IndexedDB data)
 * - Initializes subsystems (EventRouter, UrlStateSync, DialogCoordinator)
 * - Restores URL state
 * - Sets up initial schema, columns, and pagination
 */

import { AppStore } from '../stores/AppStore';
import { SchemaEngine } from '../../core/schema-engine';
import { loadUXSettings } from '../infrastructure/ux-settings';
import { loadInitialData } from '../infrastructure/storage';
import { initEventRouter, destroyEventRouter } from './EventRouter';
import {
  initUrlStateSync,
  destroyUrlStateSync,
  restoreDialogsFromUrl,
  syncCurrentStateToUrl,
} from './UrlStateSync';
import { setDialogCallbacks } from './DialogCoordinator';

// Handler callback setup functions
import { setDialogHandlerCallbacks } from '../handlers/dialog/dialog-handlers';
import { setStepCallbacks } from '../handlers/core/step-handlers';
import { setEdaCallbacks } from '../handlers/core/eda-handlers';
import { setTransformCallbacks } from '../handlers/core/helper-handlers';
import { setJsonEditCallbacks } from '../handlers/import/json-handlers';
import { setImportCallbacks } from '../handlers/import/import-handlers';
import { setGenerateCallbacks } from '../handlers/import/generate-handlers';
import * as SimpleHandlers from '../handlers/transform/simple-handlers';

// AppController for constructing callback objects
import { AppController } from './AppController';

let initialized = false;

/**
 * Initialize the application
 */
export async function initApp(): Promise<void> {
  if (initialized) {
    console.warn('App already initialized');
    return;
  }

  console.log('Initializing Syto App...');

  // Phase 1: Wire handler callbacks
  wireHandlerCallbacks();

  // Phase 2: Load persisted state
  const uxSettings = loadUXSettings();
  AppStore.uxSettings.value = uxSettings;
  AppStore.pageSize.value = uxSettings.pagination.pageSize;
  AppStore.theme.value = uxSettings.theme;
  AppController.applyTheme();

  // Note: i18n language is already initialized from localStorage in src/i18n/index.ts

  const { sources, models } = await loadInitialData();
  AppStore.sources.value = sources;
  AppStore.models.value = models;

  // Phase 3: Initialize subsystems
  initEventRouter();

  initUrlStateSync({
    openDialog: (name, section) => AppController.openDialog(name, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    clearColumnSelection: () => AppController.clearColumnSelection(),
  });

  setDialogCallbacks({
    confirm: (msg) => AppController.confirm(msg),
    clearColumnSelection: () => AppController.clearColumnSelection(),
    initializeJoinDialog: () => AppController.initializeJoinDialog(),
    initializeAppendDialog: () => AppController.initializeAppendDialog(),
    initializePivotDialog: () => AppController.initializePivotDialog(),
    detectDelimiter: (col) => AppController.detectDelimiter(col),
    debouncedUpdateSplitPreview: () => AppController.debouncedUpdateSplitPreview(),
    updateDedupePreview: () => AppController.updateDedupePreview(),
    updateImputePreview: () => SimpleHandlers.updateImputePreview(),
  });

  // Phase 4: Restore URL state
  restoreDialogsFromUrl(sources, models, {
    openDialog: (name, section) => AppController.openDialog(name, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    clearColumnSelection: () => AppController.clearColumnSelection(),
  });

  // Phase 5: Initialize data state
  const activeModel = AppStore.activeModel.value;
  if (activeModel) {
    AppStore.activeStepIndex.value =
      activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;
    AppStore.viewingIntermediate.value = false;
  }

  initializeColumnsAndSchema();

  AppController.updatePagination();

  // Sync URL state after initial render
  setTimeout(() => syncCurrentStateToUrl(), 0);

  initialized = true;
}

/**
 * Wire all handler callback registrations.
 * Connects handler modules to AppController methods.
 */
function wireHandlerCallbacks(): void {
  setDialogHandlerCallbacks({
    confirm: (msg) => AppController.confirm(msg),
    clearColumnSelection: () => AppController.clearColumnSelection(),
    openDialog: (dialog, section) => AppController.openDialog(dialog, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    initializeJoinDialog: () => AppController.initializeJoinDialog(),
    initializeAppendDialog: () => AppController.initializeAppendDialog(),
    initializePivotDialog: () => AppController.initializePivotDialog(),
    detectDelimiter: (col) => AppController.detectDelimiter(col),
    debouncedUpdateSplitPreview: () => AppController.debouncedUpdateSplitPreview(),
    updateDedupePreview: () => AppController.updateDedupePreview(),
    updateImputePreview: () => SimpleHandlers.updateImputePreview(),
  });

  setStepCallbacks({
    updatePagination: () => AppController.updatePagination(),
    openDialog: (name, section) => AppController.openDialog(name, section),
    closeDialog: (force) => AppController.closeDialog(force),
    onJoinTargetChange: () => AppController.onJoinTargetChange(),
    onAppendTargetChange: () => AppController.onAppendTargetChange(),
    onPivotConfigChange: () => AppController.onPivotConfigChange(),
    updateSplitPreview: () => AppController.updateSplitPreview(),
    updateDedupePreview: () => AppController.updateDedupePreview(),
    confirmImport: () => AppController.confirmImport(),
    confirmTextEntry: () => AppController.confirmTextEntry(),
    fetchAndImportFromUrl: () => AppController.fetchAndImportFromUrl(),
    generateData: () => AppController.generateData(),
  });

  setEdaCallbacks({
    updateToolbarPosition: () => AppController.updateToolbarPosition(),
    clearColumnSelection: () => AppController.clearColumnSelection(),
  });

  setTransformCallbacks({
    startTransformation: (label) => AppController.startTransformation(label),
    endTransformation: () => AppController.endTransformation(),
    alert: (msg) => AppController.alert(msg),
    closeDialog: (clearPreview) => AppController.closeDialog(clearPreview),
    updatePagination: () => AppController.updatePagination(),
  });

  setJsonEditCallbacks({
    computeModelUpToStep: (model, stepIndex) =>
      AppController.computeModelUpToStep(model, stepIndex),
    updatePagination: () => AppController.updatePagination(),
  });

  setImportCallbacks({
    openDialog: (name, section) => AppController.openDialog(name, section),
    closeDialog: (force) => AppController.closeDialog(force),
    createSource: (file, name, columns, data, headerMode, delimiter, customHeaders, format) =>
      AppController.createSource(
        file,
        name,
        columns,
        data,
        headerMode,
        delimiter,
        customHeaders,
        format
      ),
  });

  setGenerateCallbacks({
    updatePagination: () => AppController.updatePagination(),
    closeDialog: (force) => AppController.closeDialog(force),
  });
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
