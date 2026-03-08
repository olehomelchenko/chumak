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
import {
  setDialogHandlerCallbacks,
  openDialog,
  closeDialog,
} from '../handlers/dialog/dialog-handlers';
import { setStepCallbacks, computeModelUpToStep } from '../handlers/core/step-handlers';
import { setEdaCallbacks } from '../handlers/core/eda-handlers';
import { setTransformCallbacks } from '../handlers/core/helper-handlers';
import { setJsonEditCallbacks } from '../handlers/import/json-handlers';
import {
  setImportCallbacks,
  confirmImport,
  confirmTextEntry,
  fetchAndImportFromUrl,
} from '../handlers/import/import-handlers';
import { setGenerateCallbacks, generateData } from '../handlers/import/generate-handlers';
import * as SimpleHandlers from '../handlers/transform/simple-handlers';

// Direct handler imports for callback wiring
import {
  alert as notificationAlert,
  confirm,
  showWarning,
} from '../handlers/core/notification-handlers';
import { clearColumnSelection, updateToolbarPosition } from '../handlers/core/interaction-handlers';
import { updatePagination } from '../handlers/core/pagination-handlers';
import { initializeJoinDialog, onJoinTargetChange } from '../handlers/transform/join-handlers';
import {
  initializeAppendDialog,
  onAppendTargetChange,
} from '../handlers/transform/append-handlers';
import { initializePivotDialog, onPivotConfigChange } from '../handlers/transform/pivot-handlers';
import {
  detectDelimiter,
  debouncedUpdateSplitPreview,
  updateSplitPreview,
} from '../handlers/transform/split-handlers';
import { updateDedupePreview } from '../handlers/transform/dedupe-handlers';

// AppController for orchestration methods only
import { AppController } from './AppController';
import i18n from '../../i18n';

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

  const { sources, models, validationWarnings } = await loadInitialData();
  AppStore.sources.value = sources;
  AppStore.models.value = models;

  // Show warning toast if any stored workflows have validation issues
  if (validationWarnings.length > 0) {
    // Delay to ensure ToastContainer is mounted
    setTimeout(() => {
      showWarning(
        i18n.t('notifications.workflowValidationTitle', { ns: 'common' }),
        validationWarnings.join('\n'),
        { duration: 0 }
      );
    }, 500);
  }

  // Phase 3: Initialize subsystems
  initEventRouter();

  initUrlStateSync({
    openDialog: (name, section) => openDialog(name, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    clearColumnSelection: () => clearColumnSelection(),
  });

  setDialogCallbacks({
    confirm: (msg) => confirm(msg),
    clearColumnSelection: () => clearColumnSelection(),
    initializeJoinDialog: () => initializeJoinDialog(),
    initializeAppendDialog: () => initializeAppendDialog(),
    initializePivotDialog: () => initializePivotDialog(),
    detectDelimiter: (col) => detectDelimiter(col),
    debouncedUpdateSplitPreview: () => debouncedUpdateSplitPreview(),
    updateDedupePreview: () => updateDedupePreview(),
    updateImputePreview: () => SimpleHandlers.updateImputePreview(),
  });

  // Phase 4: Restore URL state
  restoreDialogsFromUrl(sources, models, {
    openDialog: (name, section) => openDialog(name, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    clearColumnSelection: () => clearColumnSelection(),
  });

  // Phase 5: Initialize data state
  const activeModel = AppStore.activeModel.value;
  if (activeModel) {
    AppStore.activeStepIndex.value =
      activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;
    AppStore.viewingIntermediate.value = false;
  }

  initializeColumnsAndSchema();

  updatePagination();

  // Sync URL state after initial render
  setTimeout(() => syncCurrentStateToUrl(), 0);

  initialized = true;
}

/**
 * Wire all handler callback registrations.
 * Connects handler modules to each other via callback interfaces.
 */
function wireHandlerCallbacks(): void {
  setDialogHandlerCallbacks({
    confirm: (msg) => confirm(msg),
    clearColumnSelection: () => clearColumnSelection(),
    openDialog: (dialog, section) => openDialog(dialog, section),
    switchToModel: (model) => AppController.switchToModel(model),
    switchToSource: (source) => AppController.switchToSource(source),
    showModelInfo: () => AppController.showModelInfo(),
    showDatasetInfo: (source) => AppController.showDatasetInfo(source),
    initializeJoinDialog: () => initializeJoinDialog(),
    initializeAppendDialog: () => initializeAppendDialog(),
    initializePivotDialog: () => initializePivotDialog(),
    detectDelimiter: (col) => detectDelimiter(col),
    debouncedUpdateSplitPreview: () => debouncedUpdateSplitPreview(),
    updateDedupePreview: () => updateDedupePreview(),
    updateImputePreview: () => SimpleHandlers.updateImputePreview(),
  });

  setStepCallbacks({
    updatePagination: () => updatePagination(),
    openDialog: (name, section) => openDialog(name, section),
    closeDialog: (force) => closeDialog(force),
    onJoinTargetChange: () => onJoinTargetChange(),
    onAppendTargetChange: () => onAppendTargetChange(),
    onPivotConfigChange: () => onPivotConfigChange(),
    updateSplitPreview: () => updateSplitPreview(),
    updateDedupePreview: () => updateDedupePreview(),
    confirmImport: () => confirmImport(),
    confirmTextEntry: () => confirmTextEntry(),
    fetchAndImportFromUrl: () => fetchAndImportFromUrl(),
    generateData: () => generateData(),
  });

  setEdaCallbacks({
    updateToolbarPosition: () => updateToolbarPosition(),
    clearColumnSelection: () => clearColumnSelection(),
  });

  setTransformCallbacks({
    startTransformation: (label) => AppController.startTransformation(label),
    endTransformation: () => AppController.endTransformation(),
    alert: (msg) => notificationAlert(msg),
    closeDialog: (clearPreview) => closeDialog(clearPreview),
    updatePagination: () => updatePagination(),
  });

  setJsonEditCallbacks({
    computeModelUpToStep: (model, stepIndex) => computeModelUpToStep(model, stepIndex),
    updatePagination: () => updatePagination(),
  });

  setImportCallbacks({
    openDialog: (name, section) => openDialog(name, section),
    closeDialog: (force) => closeDialog(force),
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
    updatePagination: () => updatePagination(),
    closeDialog: (force) => closeDialog(force),
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
