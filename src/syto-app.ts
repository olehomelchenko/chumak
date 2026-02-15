/**
 * SytoApp - Application Initializer
 *
 * This class handles application initialization and callback setup.
 * All UI actions are now handled by AppController (see src/app/orchestration/AppController.ts).
 *
 * Usage:
 *   const app = new SytoApp();
 *   await app.init();
 */

import { loadUXSettings } from './core/ux-settings';
import { loadInitialData } from './core/storage';
import { getUrlState, setUrlState } from './core/url-state';
import { SchemaEngine } from './core/schema-engine';
import { AppStore } from './app/stores/AppStore';
import { ModelService } from './app/services/ModelService';
import { isSlidePanel } from './app/dialog-registry';
import { activeDialogHasError } from './app/orchestration/DialogCoordinator';

// Handler callback setup functions
import { setStepCallbacks } from './app/handlers/core/step-handlers';
import { setDialogHandlerCallbacks } from './app/handlers/dialog/dialog-handlers';
import { setEdaCallbacks } from './app/handlers/core/eda-handlers';
import { setTransformCallbacks } from './app/handlers/core/helper-handlers';
import { setJsonEditCallbacks } from './app/handlers/import/json-handlers';
import { setImportCallbacks } from './app/handlers/import/import-handlers';
import * as SimpleHandlers from './app/handlers/transform/simple-handlers';
import * as KeyboardHandlers from './app/handlers/core/keyboard-handlers';

// AppController for all actions
import { AppController } from './app/orchestration/AppController';

export class SytoApp {
  constructor() {
    // Initialization happens in init()
  }

  async init() {
    console.log('Initializing Syto App...');

    // Set up dialog handler callbacks using AppController
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

    // Set up step handler callbacks using AppController
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
      fetchAndImportFromUrl: () => AppController.fetchAndImportFromUrl(),
      generateData: () => AppController.generateData(),
    });

    // Set up EDA handler callbacks using AppController
    setEdaCallbacks({
      updateToolbarPosition: () => AppController.updateToolbarPosition(),
      clearColumnSelection: () => AppController.clearColumnSelection(),
    });

    // Set up transform callbacks using AppController
    setTransformCallbacks({
      startTransformation: (label) => AppController.startTransformation(label),
      endTransformation: () => AppController.endTransformation(),
      alert: (msg) => AppController.alert(msg),
      closeDialog: (clearPreview) => AppController.closeDialog(clearPreview),
      updatePagination: () => AppController.updatePagination(),
    });

    // Set up JSON edit callbacks using AppController
    setJsonEditCallbacks({
      computeModelUpToStep: (model, stepIndex) =>
        AppController.computeModelUpToStep(model, stepIndex),
      updatePagination: () => AppController.updatePagination(),
    });

    // Set up import callbacks using AppController
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

    // Load UX settings
    const uxSettings = loadUXSettings();
    AppStore.uxSettings.value = uxSettings;
    AppStore.pageSize.value = uxSettings.pagination.pageSize;
    AppStore.theme.value = uxSettings.theme;
    AppController.applyTheme();

    // Load initial data from IndexedDB
    const { sources, models } = await loadInitialData();
    AppStore.sources.value = sources;
    AppStore.models.value = models;

    // Restore URL state
    const urlState = getUrlState();
    let restored = false;

    // Handle page routes (about, reference, expressions, settings)
    if (urlState.page) {
      AppController.openDialog(urlState.page, urlState.section);
      setUrlState({ page: urlState.page, section: urlState.section });
      restored = true;
    } else if (urlState.modelId) {
      const model = models.find((m) => m.id === urlState.modelId);
      if (model) {
        if (urlState.section === 'info') {
          ModelService.showModelInfo(model, () => AppController.clearColumnSelection());
          setUrlState({ sourceId: model.sourceId, modelId: model.id, section: 'info' });
        } else {
          AppStore.activeModel.value = model;
          AppStore.currentData.value = model.data;
          AppStore.viewMode.value = 'model';
          setUrlState({ sourceId: model.sourceId, modelId: model.id });
        }
        restored = true;
      }
    } else if (urlState.sourceId) {
      const source = sources.find((s) => s.id === urlState.sourceId);
      if (source) {
        if (urlState.section === 'info') {
          ModelService.showDatasetInfo(source, () => AppController.clearColumnSelection());
          setUrlState({ sourceId: source.id, section: 'info' });
        } else {
          AppStore.activeSource.value = source;
          AppStore.currentData.value = source.data;
          AppStore.viewMode.value = 'dataset-info';
          setUrlState({ sourceId: source.id });
        }
        restored = true;
      }
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => AppController.handleHashChange());

    // Set default view if nothing restored
    if (!restored && models.length > 0) {
      AppStore.activeModel.value = models[0];
      AppStore.currentData.value = models[0].data;
      AppStore.viewMode.value = 'model';
      setUrlState({ sourceId: models[0].sourceId, modelId: models[0].id });
    }

    // Initialize step index
    const activeModel = AppStore.activeModel.value;
    if (activeModel) {
      AppStore.activeStepIndex.value =
        activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;
      AppStore.viewingIntermediate.value = false;
    }

    // Initialize schema if needed
    const currentData = AppStore.currentData.value;
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

    // Initialize pagination
    AppController.updatePagination();

    // Sync URL state after initial render
    setTimeout(() => this.syncUrlState(), 0);

    // Set up keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Handle Escape key first (highest priority)
      if (e.key === 'Escape') {
        if (AppStore.messageBox.value.visible) {
          AppController.closeMessageBox(false);
          return;
        }
        if (AppStore.activeDialog.value) {
          AppController.closeDialog();
          return;
        }
        if (AppStore.typeMenuOpen.value) {
          AppStore.typeMenuOpen.value = false;
          return;
        }
        if (AppStore.selectedColumn.value || AppStore.selectedCell.value) {
          AppController.clearColumnSelection();
          return;
        }
      }

      // Handle Enter key for slide panel submit
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const dialog = AppStore.activeDialog.value;
        if (dialog && isSlidePanel(dialog)) {
          const active = document.activeElement;
          const tag = active?.tagName.toLowerCase();
          // Skip if in textarea, select, or contenteditable
          if (tag === 'textarea' || tag === 'select') return;
          if (active instanceof HTMLElement && active.isContentEditable) return;
          // Skip if inside a CodeMirror editor
          if (active?.closest('.cm-editor')) return;
          // Skip if Apply button is disabled (dialog has error)
          if (activeDialogHasError()) return;
          e.preventDefault();
          AppController.applyActiveTransform();
          return;
        }
      }

      // Handle other keyboard shortcuts
      KeyboardHandlers.handleKeyDown(this, e);
    });

    // Global event listeners
    window.addEventListener('paste', (e) => AppController.handlePaste(e));
    window.addEventListener('click', (e) => AppController.handleBodyClick(e));
  }

  /**
   * Sync URL state with current app state
   */
  syncUrlState() {
    const activeModel = AppStore.activeModel.value;
    const activeSource = AppStore.activeSource.value;
    setUrlState({
      modelId: activeModel?.id,
      sourceId: activeSource?.id || activeModel?.sourceId,
    });
  }

  // ============================================================
  // Legacy compatibility methods for keyboard handlers
  // These are used by KeyboardHandlers which needs a SytoApp-like object
  // TODO: Refactor keyboard handlers to use AppController directly
  // ============================================================

  alert(message: string, title = 'Alert') {
    return AppController.alert(message, title);
  }

  showSuccess(message: string, options: any = {}) {
    return AppController.showSuccess(message, options);
  }

  showError(title: string, message: string, options: any = {}) {
    return AppController.showError(title, message, options);
  }

  removeStep(stepIndex: number) {
    return AppController.removeStep(stepIndex);
  }

  viewStep(stepIndex: number) {
    return AppController.viewStep(stepIndex);
  }
}
