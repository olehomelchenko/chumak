/**
 * Chumak Main Application
 *
 * Alpine.js component that orchestrates all app functionality
 * by mixing in specialized handler modules.
 */

// Import all handler modules
import { createExportHandlers } from './app/export-handlers.js';
import { createImportHandlers } from './app/import-handlers.js';
import { createEdaHandlers } from './app/eda-handlers.js';
import { createDialogManager } from './app/dialog-manager.js';
import { createInteractionHandlers } from './app/interaction-handlers.js';
import { createTransformDialogs } from './app/transform-dialogs.js';
import { createModelManager } from './app/model-manager.js';
import { createStepManager } from './app/step-manager.js';
import { createPagination } from './app/pagination.js';

function chumakApp() {
  return {
    // ============================================================
    // State
    // ============================================================

    // UI state
    ribbonTab: 'prepare',
    activeTab: 'steps',
    activeStep: null,
    activeStepIndex: null, // null = viewing final result, number = viewing step N
    viewingIntermediate: false, // true when viewing intermediate step
    editingStepIndex: null, // Index of step being edited (null = not editing)
    activeDialog: null,
    dialogSnapshot: null,
    isDragging: false,
    selectedColumn: null, // Interactive header selection
    columnToolbarPos: { x: 0, y: 0 },
    selectedCell: null, // Interactive cell selection { col, value, type }
    cellToolbarPos: { x: 0, y: 0 },
    edaStats: null, // Stats for the selected column
    edaChartView: 'boxplot', // 'boxplot' or 'histogram'
    edaBrushSelection: null, // { min, max } for histogram brush selection

    // Type Menu State
    typeMenuOpen: false,
    typeMenuPos: { x: 0, y: 0 },
    typeMenuCol: null,

    // Pagination state
    currentPage: 1,
    pageSize: 500, // Default, will be loaded from UX settings
    totalPages: 1,

    // Import dialog state
    importDialogState: {
      fileName: '',
      sourceName: '', // Custom source name (defaults to fileName)
      rawPreviewData: [], // Raw parsed data (array of arrays)
      previewHeaders: [], // Headers to display in preview (with duplicates resolved)
      previewDataRows: [], // Data rows to display in preview
      headerMode: 'first-row',
      delimiter: ',',
      originalHeaders: [], // Original headers from first row (before duplicate resolution)
      customHeaders: [], // Resolved headers (for import)
      duplicateWarning: '', // Warning message if duplicates detected
    },
    importFileData: null,

    // Data state
    sources: [],
    models: [],
    activeSource: null, // Currently selected source (for dataset info view)
    activeModel: null,
    currentData: null,
    columns: [],
    viewMode: 'empty', // 'empty', 'dataset-info', or 'model'

    // Transform state
    selectedColumns: [], // For Select dialog checkboxes
    selectPatternText: '', // Pattern text for select dialog
    selectPatternMatchType: 'prefix', // 'prefix', 'suffix', or 'exact'
    selectPatternMode: 'include', // 'include' or 'exclude'
    filterExpression: '',
    filterError: null,
    removedColumns: [], // For remove dialog checkboxes

    // Aggregate dialog state
    aggregateDialogState: {
      groupBy: [], // Array of selected column names
      aggregations: [], // Array of { output, func, col }
      previewData: null,
      previewError: null,
      isPreviewing: false,
    },

    // Join dialog state
    joinDialogState: {
      rightModel: null, // Selected model/source to join with
      joinType: 'left', // 'inner', 'left', 'right', 'full', 'cross'
      keyPairs: [[null, null]], // Array of [leftKey, rightKey] pairs
      suffixes: ['_x', '_y'], // Column name suffixes for conflicts
      availableTargets: [], // Models and sources available for joining
      leftColumns: [], // Current model's columns
      rightColumns: [], // Right model's columns
      previewData: null, // Preview result
      previewError: null, // Preview error message
      isPreviewing: false, // Loading state for preview
    },

    // Derive dialog state
    deriveDialogState: {
      columnName: '',
      expression: '',
      error: null,
    },

    // Sort dialog state
    sortDialogState: {
      field: '',
      order: 'asc',
    },

    // Rename dialog state
    renameDialogState: {
      renames: {}, // Map of oldName -> newName
    },

    // Fold dialog state
    foldDialogState: {
      keyName: 'key',
      valueName: 'value',
      selectedColumns: [], // Boolean array matching this.columns
    },

    // Replace dialog state
    replaceDialogState: {
      column: '',
      findValue: '',
      replaceValue: '',
    },

    // ============================================================
    // Initialization
    // ============================================================

    async init() {
      console.log('Initializing Chumak...');

      // Load UX settings
      const uxSettings = loadUXSettings();
      this.pageSize = uxSettings.pagination.pageSize;

      // Load persisted data from IndexedDB
      const { sources, models } = await loadInitialData();

      this.sources = sources;
      this.models = models;

      // Restore state from URL if present
      const urlState = getUrlState();
      let restored = false;

      if (urlState.modelId) {
        const model = models.find((m) => m.id === urlState.modelId);
        if (model) {
          this.activeModel = model;
          this.currentData = model.data;
          this.viewMode = 'model';
          restored = true;
        }
      } else if (urlState.sourceId) {
        const source = sources.find((s) => s.id === urlState.sourceId);
        if (source) {
          this.activeSource = source;
          this.currentData = source.data;
          this.viewMode = 'dataset-info';
          restored = true;
        }
      }

      if (restored) {
        console.log('Restored state from URL:', urlState);
      } else if (models.length > 0) {
        // If no URL state or invalid, activate the first model (existing behavior)
        this.activeModel = models[0];
        this.currentData = models[0].data;
        this.viewMode = 'model';
        console.log('Restored session: showing first model');
      }

      // Sync columns and pagination if we have data
      if (this.currentData && this.currentData.length > 0) {
        // Self-healing: Ensure active model has a schema
        if (
          this.activeModel &&
          (!this.activeModel.schema || this.activeModel.schema.length === 0)
        ) {
          console.log('Self-healing: Generating missing schema for active model');
          this.activeModel.schema = SchemaEngine.createInitialSchema(this.activeModel.data);
        }

        // Set columns from current schema if available, else fallback to keys
        if (this.activeModel?.schema) {
          this.columns = this.activeModel.schema.map((c) => c.name);
        } else if (this.activeSource?.columns) {
          this.columns = this.activeSource.columns.map((c) => c.name);
        } else {
          this.columns = Object.keys(this.currentData[0]);
        }
      }
      this.updatePagination();

      // Set up watchers for URL state sync
      // Note: we wait a tick to avoid syncing initial load state back to URL immediately
      this.$nextTick(() => {
        this.$watch('activeModel', () => this.syncUrlState());
        this.$watch('activeSource', () => this.syncUrlState());

        // Final sync to ensure URL is clean
        this.syncUrlState();
      });

      // Global keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.activeDialog) {
            this.closeDialog();
            return;
          }
          if (this.typeMenuOpen) {
            this.typeMenuOpen = false;
            return;
          }
          if (this.selectedColumn || this.selectedCell) {
            this.clearColumnSelection();
            return;
          }
        }
      });

      console.log('Initialization complete:', sources.length, 'sources,', models.length, 'models');

      // Load templates
      await this.loadTemplates();
    },

    /**
     * Sync current app state to URL parameters
     */
    syncUrlState() {
      setUrlState({
        modelId: this.activeModel?.id,
        sourceId: this.activeSource?.id || this.activeModel?.sourceId,
      });
    },

    // ============================================================
    // Mix in all handler modules
    // ============================================================

    ...createExportHandlers(),
    ...createImportHandlers(),
    ...createEdaHandlers(),
    ...createDialogManager(),
    ...createInteractionHandlers(),
    ...createTransformDialogs(),
    ...createModelManager(),
    ...createStepManager(),
    ...createPagination(),
  };
}

// Export for use in index.html
window.chumakApp = chumakApp;
