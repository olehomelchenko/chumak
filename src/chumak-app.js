function chumakApp() {
  return {
    // UI state
    ribbonTab: 'data',
    activeTab: 'steps',
    activeStep: null,
    activeStepIndex: null, // null = viewing final result, number = viewing step N
    viewingIntermediate: false, // true when viewing intermediate step
    editingStepIndex: null, // Index of step being edited (null = not editing)
    activeDialog: null,
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
    filterExpression: '',
    filterError: null,

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

    // Remove state
    removedColumns: [], // For remove dialog checkboxes

    // Fold dialog state
    foldDialogState: {
      keyName: 'key',
      valueName: 'value',
      selectedColumns: [], // Boolean array matching this.columns
    },

    // Initialization
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

      console.log('Initialization complete:', sources.length, 'sources,', models.length, 'models');

      // Load templates
      await this.loadTemplates();
    },

    /**
     * Load HTML templates from separate files
     */
    async loadTemplates() {
      const templates = [
        { id: 'join-modal-container', url: 'templates/join-modal.html' },
        { id: 'aggregate-modal-container', url: 'templates/aggregate-modal.html' },
        { id: 'import-csv-modal-container', url: 'templates/import-csv-modal.html' },
        { id: 'select-columns-modal-container', url: 'templates/select-columns-modal.html' },
      ];

      for (const template of templates) {
        try {
          const response = await fetch(template.url);
          if (!response.ok) {
            console.error(`Failed to load template: ${template.url}`);
            continue;
          }
          const html = await response.text();
          const container = document.getElementById(template.id);
          if (container) {
            container.innerHTML = html;
          }
        } catch (error) {
          console.error(`Error loading template ${template.url}:`, error);
        }
      }
    },

    // Dialog methods
    openDialog(dialogName) {
      this.activeDialog = dialogName;

      // Initialize state for specific dialogs
      if (dialogName === 'select') {
        // Select all columns by default
        this.selectedColumns = this.columns.map(() => true);
        // Reset pattern state
        this.selectPatternText = '';
        this.selectPatternMatchType = 'prefix';
        this.selectPatternMode = 'include';
      } else if (dialogName === 'filter') {
        // Clear filter state
        this.filterExpression = '';
        this.filterError = null;
      } else if (dialogName === 'join') {
        // Initialize join dialog
        this.initializeJoinDialog();
      } else if (dialogName === 'derive') {
        this.deriveDialogState = { columnName: '', expression: '', error: null };
      } else if (dialogName === 'sort') {
        this.sortDialogState = { field: this.columns[0] || '', order: 'asc' };
      } else if (dialogName === 'rename') {
        const renames = {};
        this.columns.forEach((col) => {
          renames[col] = col;
        });
        this.renameDialogState = { renames };
      } else if (dialogName === 'remove') {
        this.removedColumns = this.columns.map(() => false);
      } else if (dialogName === 'aggregate') {
        this.aggregateDialogState = {
          groupBy: [],
          aggregations: [{ output: 'count', func: 'count', col: '' }],
          previewData: null,
          previewError: null,
          isPreviewing: false,
        };
      } else if (dialogName === 'fold') {
        this.foldDialogState = {
          keyName: 'key',
          valueName: 'value',
          selectedColumns: this.columns.map(() => false),
        };
      }

      this.clearColumnSelection();
    },

    closeDialog() {
      this.activeDialog = null;
      // Reset aggregate state
      this.aggregateDialogState = {
        groupBy: [],
        aggregations: [],
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };
      // Reset import dialog state to defaults
      this.importDialogState = {
        fileName: '',
        sourceName: '',
        rawPreviewData: [],
        previewHeaders: [],
        previewDataRows: [],
        headerMode: 'first-row',
        delimiter: ',',
        originalHeaders: [],
        customHeaders: [],
        duplicateWarning: '',
      };
      this.importFileData = null;

      // Reset join dialog state
      this.joinDialogState = {
        rightModel: null,
        joinType: 'left',
        keyPairs: [[null, null]],
        suffixes: ['_x', '_y'],
        availableTargets: [],
        leftColumns: [],
        rightColumns: [],
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };
    },

    // Header Interactivity Methods
    selectColumn(col, event) {
      if (this.selectedColumn === col) {
        this.selectedColumn = null;
        return;
      }
      this.selectedColumn = col;

      // Wait for next tick to ensure DOM is updated if needed, though here it's fine
      this.$nextTick(() => this.updateToolbarPosition());

      // Calculate EDA stats
      if (this.selectedColumn && this.currentData) {
        // Get type from unified schema if possible, else infer
        let colSchema = null;
        if (this.activeModel?.schema) {
          colSchema = this.activeModel.schema.find((c) => c.name === this.selectedColumn);
        } else if (this.activeSource?.columns) {
          colSchema = this.activeSource.columns.find((c) => c.name === this.selectedColumn);
        }

        const type = colSchema
          ? colSchema.type
          : SchemaEngine.inferType(
              this.currentData.slice(0, 20).map((r) => r[this.selectedColumn])
            );
        this.edaStats = EDAEngine.calculateStats(this.currentData, this.selectedColumn, type);

        // Reset brush selection when switching columns
        this.edaBrushSelection = null;

        // Draw charts based on type (integer/float are both numeric)
        if (['integer', 'float', 'number'].includes(type)) {
          this.$nextTick(() => {
            if (this.edaChartView === 'boxplot') {
              ChartsEngine.renderBoxPlot('#eda-boxplot', this.currentData, this.selectedColumn);
            } else {
              ChartsEngine.renderHistogram(
                '#eda-histogram',
                this.currentData,
                this.selectedColumn,
                (sel) => this.handleBrushSelection(sel)
              );
            }
          });
        } else {
          this.$nextTick(() => {
            ChartsEngine.renderCategoricalBar('#eda-categorical-bar', this.edaStats.topValues);
          });
        }
      } else {
        this.edaStats = null;
        this.edaBrushSelection = null;
      }
    },
    // Interaction handling
    handleBodyClick(event) {
      if (
        this.selectedColumn &&
        !event.target.closest('.data-table__header') &&
        !event.target.closest('.floating-toolbar') &&
        !event.target.closest('.modal')
      ) {
        this.selectedColumn = null;
      }

      if (
        this.typeMenuOpen &&
        !event.target.closest('.type-menu') &&
        !event.target.closest('.type-indicator')
      ) {
        this.typeMenuOpen = false;
        this.typeMenuCol = null;
      }
    },

    openTypeMenu(col, event) {
      this.typeMenuCol = col;
      this.typeMenuOpen = true;
      this.selectedColumn = null; // Close other toolbars

      const rect = event.target.getBoundingClientRect();
      this.typeMenuPos = {
        x: rect.left,
        y: rect.bottom + 4,
      };
    },

    async changeColumnType(col, newType) {
      this.typeMenuOpen = false;

      let typeToSet = newType;
      // Handle single-column auto-detection
      if (newType === 'auto') {
        const sample = this.currentData.slice(0, 50).map((row) => row[col]);
        typeToSet = SchemaEngine.inferType(sample);
      }

      // Create a new step intended to update the type of this column
      const typeStep = {
        types: {
          [col]: typeToSet,
        },
      };

      await this.applyStepResult(typeStep, this.currentData); // Pass-through data, metadata update
    },

    async autoDetectSchema() {
      if (!this.currentData || !this.columns) return;

      const types = {};
      this.columns.forEach((col) => {
        const sample = this.currentData.slice(0, 50).map((row) => row[col]);
        types[col] = SchemaEngine.inferType(sample);
      });

      const typeStep = { types };
      await this.applyStepResult(typeStep, this.currentData);
    },

    updateToolbarPosition() {
      if (this.selectedColumn) {
        const header = document.querySelector(
          `.data-table__header[data-col="${this.selectedColumn}"]`
        );
        if (header) {
          const rect = header.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          const toolbarWidth = 200;
          const windowWidth = window.innerWidth;
          const margin = 12;

          // Clamp X to keep toolbar within viewport
          let x = Math.max(
            toolbarWidth / 2 + margin,
            Math.min(windowWidth - toolbarWidth / 2 - margin, center)
          );

          this.columnToolbarPos = {
            x: x,
            y: rect.top - 8,
            arrowOffset: center - x,
          };
        }
      }

      if (this.selectedCell) {
        // If it's an EDA stat, don't try to find it in the data table
        if (this.selectedCell.isEda) return;

        const cell = document.querySelector(
          `.data-table__cell[data-col="${this.selectedCell.col}"][data-row="${this.selectedCell.rowIdx}"]`
        );
        if (cell) {
          const rect = cell.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          const toolbarWidth = ['number', 'integer', 'float'].includes(this.selectedCell.type)
            ? 220
            : 80;
          const windowWidth = window.innerWidth;
          const margin = 12;

          // Clamp X to keep toolbar within viewport
          let x = Math.max(
            toolbarWidth / 2 + margin,
            Math.min(windowWidth - toolbarWidth / 2 - margin, center)
          );

          this.cellToolbarPos = {
            x: x,
            y: rect.top - 8,
            arrowOffset: center - x,
          };
        }
      }
    },

    clearColumnSelection() {
      this.selectedColumn = null;
      this.selectedCell = null;
      this.edaStats = null;
      this.edaBrushSelection = null;
    },

    selectCell(col, value, rowIdx, event) {
      // Clear previous selections
      this.selectedColumn = null;

      // Find type from source columns if available
      let type = 'string';
      if (this.activeModel?.schema) {
        const colInfo = this.activeModel.schema.find((c) => c.name === col);
        if (colInfo) type = colInfo.type;
      } else if (this.activeSource) {
        const colInfo = this.activeSource.columns.find((c) => c.name === col);
        if (colInfo) type = colInfo.type || colInfo.inferredType;
      } else {
        // Fallback to basic check
        type = typeof value === 'number' ? 'number' : 'string';
      }

      this.selectedCell = { col, value, type, rowIdx };

      this.$nextTick(() => this.updateToolbarPosition());
    },

    selectEdaStat(label, rawValue, event) {
      // Capture element before the next tick as currentTarget will be nullified
      const el = event.currentTarget;

      // Clear previous cell selection to reset positioning
      this.selectedCell = null;

      // Set up cell data to reuse cell-toolbar for numbers
      this.selectedCell = {
        col: this.selectedColumn,
        value: rawValue,
        type: 'number',
        isEda: true,
        edaLabel: label,
      };

      this.$nextTick(() => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const toolbarWidth = 220;
        const windowWidth = window.innerWidth;
        const margin = 12;

        // Clamp X to keep toolbar within viewport
        let x = Math.max(
          toolbarWidth / 2 + margin,
          Math.min(windowWidth - toolbarWidth / 2 - margin, center)
        );

        this.cellToolbarPos = {
          x: x,
          y: rect.top - 8,
          arrowOffset: center - x,
        };
      });
    },

    setEdaChartView(view) {
      this.edaChartView = view;
      this.edaBrushSelection = null;
      // Re-render chart
      if (this.selectedColumn && this.edaStats) {
        const type = this.edaStats.type;
        if (['integer', 'float', 'number'].includes(type)) {
          this.$nextTick(() => {
            if (view === 'boxplot') {
              ChartsEngine.renderBoxPlot('#eda-boxplot', this.currentData, this.selectedColumn);
            } else {
              ChartsEngine.renderHistogram(
                '#eda-histogram',
                this.currentData,
                this.selectedColumn,
                (sel) => this.handleBrushSelection(sel)
              );
            }
          });
        }
      }
    },

    handleBrushSelection(selection) {
      this.edaBrushSelection = selection;
    },

    async applyBrushFilter() {
      if (!this.edaBrushSelection || !this.selectedColumn) return;
      const { min, max } = this.edaBrushSelection;
      const col = this.selectedColumn;

      // Format values properly (keeping decimals for float/number)
      const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
      const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);

      const expr = `[${col}] >= ${fmtMin} && [${col}] <= ${fmtMax}`;
      this.filterExpression = expr;
      this.filterError = null;
      await this.applyFilterTransform();

      // Clear selection and panel
      this.clearColumnSelection();
    },

    async applyQuickCellFilter(op) {
      if (!this.selectedCell) return;
      const { col, value, type } = this.selectedCell;

      let expr = '';

      // Format value for expression
      let formattedValue = value;
      if (value === null || value === undefined) {
        formattedValue = 'null';
      } else if (type === 'number' || type === 'integer' || type === 'float') {
        formattedValue = value;
      } else {
        // Escape quotes if it's a string
        formattedValue = `"${String(value).replace(/"/g, '\\"')}"`;
      }

      if (op === 'exact') expr = `[${col}] == ${formattedValue}`;
      else if (op === 'not') expr = `[${col}] != ${formattedValue}`;
      else if (op === 'gt') expr = `[${col}] > ${formattedValue}`;
      else if (op === 'gte') expr = `[${col}] >= ${formattedValue}`;
      else if (op === 'lt') expr = `[${col}] < ${formattedValue}`;
      else if (op === 'lte') expr = `[${col}] <= ${formattedValue}`;

      if (expr) {
        this.filterExpression = expr;
        // We need to ensure filterError is null before applying
        this.filterError = null;
        await this.applyFilterTransform();
      }
      this.selectedCell = null;
    },

    async quickSort(order) {
      if (!this.selectedColumn) return;

      this.sortDialogState.field = this.selectedColumn;
      this.sortDialogState.order = order;
      await this.applySortTransform();
      this.selectedColumn = null;
    },

    quickFilter() {
      if (!this.selectedColumn) return;

      this.openDialog('filter');
      this.filterExpression = `${this.selectedColumn} == `;
      // Optional: focus the input after a short delay
      setTimeout(() => {
        const input = document.querySelector('.modal input[x-model="filterExpression"]');
        if (input) {
          input.focus();
          // Put cursor at the end
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 50);
    },

    quickRename() {
      if (!this.selectedColumn) return;

      const col = this.selectedColumn;
      this.openDialog('rename');
      // Selection is cleared by openDialog if we don't handle it,
      // but we want the rename dialog to focus on this column
      setTimeout(() => {
        const input = document.querySelector(`.modal input[data-col="${col}"]`);
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
    },

    async quickRemove() {
      if (!this.selectedColumn) return;

      const col = this.selectedColumn;
      if (confirm(`Are you sure you want to remove column "${col}"?`)) {
        // Set the removedColumns state to only the selected column
        this.removedColumns = this.columns.map((c) => c === col);
        await this.applyRemoveTransform();
        this.selectedColumn = null;
      }
    },

    // CSV import: Step 1 - Show import dialog
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.showImportDialog(file);

      // Reset file input
      event.target.value = '';
    },

    handleFileDrop(event) {
      this.isDragging = false;

      const files = event.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];

      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please drop a CSV file');
        return;
      }

      this.showImportDialog(file);
    },

    /**
     * Global paste handler to import CSV data from clipboard.
     * Intercepts paste events on the window, unless an input is focused.
     * @param {ClipboardEvent} event
     */
    handlePaste(event) {
      // Don't intercept paste if we're in an input or textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      // 1. Try to get files from clipboard (some browsers support this)
      if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (
          file.name.toLowerCase().endsWith('.csv') ||
          file.type === 'text/csv' ||
          file.type === 'text/plain'
        ) {
          this.showImportDialog(file);
          return;
        }
      }

      // 2. Try to get text from clipboard
      const pastedText = clipboardData.getData('text');
      if (pastedText && pastedText.trim().length > 0) {
        // Create a virtual file from the pasted text
        // We use a .csv extension to trigger the CSV logic correctly
        const file = new File([pastedText], 'Pasted Data.csv', { type: 'text/csv' });
        this.showImportDialog(file);
      }
    },

    /**
     * Manually trigger clipboard read to import data.
     * Requires secure context and user permission.
     */
    async promptPaste() {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().length > 0) {
            const file = new File([text], 'Pasted Data.csv', { type: 'text/csv' });
            this.showImportDialog(file);
          } else {
            alert('Clipboard is empty or does not contain text. Try copying some CSV data first.');
          }
        } else {
          alert(
            'Your browser does not support direct clipboard access. Please use Ctrl+V to paste data.'
          );
        }
      } catch (err) {
        console.warn('Clipboard access denied:', err);
        alert('Please press Ctrl+V to paste your data directly.');
      }
    },

    // Show import configuration dialog
    showImportDialog(file) {
      // Store file for later
      this.importFileData = { file };

      // Quick parse: First 5 rows, no header assumptions
      Papa.parse(file, {
        preview: 5,
        header: false,
        skipEmptyLines: true,
        complete: (previewResult) => {
          // Extract first row for header initialization
          const firstRow = previewResult.data[0] || [];

          // Generate default source name from filename (remove .csv extension)
          const defaultName = file.name.replace(/\.csv$/i, '');

          // Set initial dialog state
          const initialHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);
          this.importDialogState = {
            fileName: file.name,
            sourceName: defaultName,
            rawPreviewData: previewResult.data,
            previewHeaders: [],
            previewDataRows: [],
            headerMode: 'first-row', // Default
            delimiter: previewResult.meta.delimiter || ',',
            originalHeaders: initialHeaders, // Store originals
            customHeaders: initialHeaders, // Will be resolved in updateHeadersForPreview
          };

          // Initialize preview based on default settings
          this.updateHeadersForPreview();

          // Show dialog
          this.activeDialog = 'import-csv';
        },
        error: (error) => {
          console.error('CSV preview error:', error);
          alert('Error reading CSV: ' + error.message);
        },
      });
    },

    // CSV import: Step 2 - Confirm and create Source
    confirmImport() {
      const { headerMode, delimiter, customHeaders, sourceName } = this.importDialogState;
      const file = this.importFileData.file;

      // Validate source name
      if (!sourceName || sourceName.trim() === '') {
        alert('Please enter a source name');
        return;
      }

      // Always parse with header: false to get raw data
      Papa.parse(file, {
        header: false, // Get raw array of arrays
        delimiter: delimiter === '\t' ? '\t' : delimiter,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            alert('Error: CSV file is empty');
            return;
          }

          let columns, data;
          const rawData = results.data;

          if (headerMode === 'first-row') {
            // Use the resolved custom headers (which include duplicate resolution)
            columns = customHeaders;

            // Data starts from second row (skip header row)
            const dataRows = rawData.slice(1);

            // Convert array of arrays to array of objects
            data = dataRows.map((row) => {
              const obj = {};
              columns.forEach((col, i) => {
                obj[col] = row[i];
              });
              return obj;
            });

            await this.createSource(
              file,
              sourceName.trim(),
              columns,
              data,
              headerMode,
              delimiter,
              customHeaders
            );
          } else if (headerMode === 'auto-generate') {
            // Generate Column 1, Column 2, ...
            // (auto-generated names can't have duplicates, so no resolution needed)
            columns = rawData[0]?.map((_, i) => `Column ${i + 1}`) || [];

            // All rows are data (including first row)
            data = rawData.map((row) => {
              const obj = {};
              columns.forEach((col, i) => {
                obj[col] = row[i];
              });
              return obj;
            });

            await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter);
          } else if (headerMode === 'manual') {
            // Use the resolved custom headers (which include duplicate resolution)
            columns = customHeaders;

            // All rows are data (including first row)
            data = rawData.map((row) => {
              const obj = {};
              columns.forEach((col, i) => {
                obj[col] = row[i];
              });
              return obj;
            });

            await this.createSource(
              file,
              sourceName.trim(),
              columns,
              data,
              headerMode,
              delimiter,
              customHeaders
            );
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          alert('Error parsing CSV: ' + error.message);
        },
      });
    },

    // Create Source and default Model
    async createSource(
      file,
      sourceName,
      columns,
      data,
      headerMode,
      delimiter,
      customHeaders = null
    ) {
      const start = performance.now();

      // Validate columns: no empty names (duplicates are already resolved in the dialog)
      if (columns.some((c) => !c || c.trim() === '')) {
        alert('Error: Column names cannot be empty.');
        return;
      }

      // Create a clean copy of data (ensure it's serializable for IndexedDB)
      const cleanData = JSON.parse(JSON.stringify(data));

      const source = {
        id: `src_${Date.now()}`,
        name: sourceName, // Use custom source name
        fileName: file.name, // Store original filename for reference
        origin: 'file',

        // CSV configuration
        delimiter: delimiter,
        headerMode: headerMode,
        customHeaders: customHeaders || null,

        // Data metadata
        rawSize: file.size,
        rowCount: cleanData.length,
        columns: SchemaEngine.createInitialSchema(cleanData),
        createdAt: new Date().toISOString(),

        data: cleanData,
      };

      this.sources.push(source);

      // Create default "main" model
      const mainModel = {
        id: `mdl_${Date.now()}`,
        name: 'main',
        sourceId: source.id, // Link to source by ID, not name
        steps: [],
        schema: JSON.parse(JSON.stringify(source.columns)),
        data: cleanData,
      };

      // Add CSV import configuration as the first transformation step
      const importStep = {
        import: {
          source: sourceName,
          fileName: file.name, // Store original filename too
          delimiter: delimiter,
          headerMode: headerMode,
        },
      };

      // Add custom headers to the step if they were used
      if (headerMode === 'manual' && customHeaders) {
        importStep.import.customHeaders = customHeaders;
      }

      mainModel.steps.push(importStep);

      // Add data type detection step
      const typesStep = {
        types: {},
      };
      source.columns.forEach((col) => {
        typesStep.types[col.name] = col.type;
      });
      mainModel.steps.push(typesStep);

      this.models.push(mainModel);

      // Display
      this.activeModel = mainModel;
      this.currentData = cleanData;
      this.columns = columns;
      this.viewMode = 'model';

      // Update pagination
      this.updatePagination();

      // Auto-save to IndexedDB
      await autoSave(this.sources, this.models);

      console.log(
        `⚡ Import CSV — ${(performance.now() - start).toFixed(1)}ms — ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      );

      // Close dialog
      this.closeDialog();
    },

    // Transform methods
    describeTransform(transform) {
      return describeTransform(transform);
    },

    selectAllColumns() {
      this.selectedColumns = this.columns.map(() => true);
    },

    selectNoColumns() {
      this.selectedColumns = this.columns.map(() => false);
    },

    getSelectedColumnsList() {
      return this.columns.filter((col, idx) => this.selectedColumns[idx]);
    },

    /**
     * Apply column pattern to update checkbox selections
     */
    applyColumnPattern() {
      if (!this.selectPatternText || this.selectPatternText.trim() === '') {
        // No pattern - do nothing
        return;
      }

      // Get matching columns
      const matched = matchColumnPattern(this.columns, {
        pattern: this.selectPatternText,
        matchType: this.selectPatternMatchType,
        mode: this.selectPatternMode,
      });

      // Update selectedColumns based on matched columns
      this.selectedColumns = this.columns.map((col) => matched.includes(col));
    },

    /**
     * Get info text about current pattern matching
     */
    getPatternMatchInfo() {
      if (!this.selectPatternText || this.selectPatternText.trim() === '') {
        return '';
      }

      const matched = matchColumnPattern(this.columns, {
        pattern: this.selectPatternText,
        matchType: this.selectPatternMatchType,
        mode: this.selectPatternMode,
      });

      const totalColumns = this.columns.length;
      const matchedCount = matched.length;
      const removedCount = totalColumns - matchedCount;

      if (matchedCount === 0) {
        return 'No columns match this pattern';
      }

      if (this.selectPatternMode === 'include') {
        return `${matchedCount} of ${totalColumns} columns selected, ${removedCount} will be removed`;
      } else {
        return `${matchedCount} of ${totalColumns} columns excluded, ${removedCount} will be kept`;
      }
    },

    async applyStepResult(transform, resultTable) {
      // Check if we're editing an existing step
      if (this.editingStepIndex !== null) {
        await this.updateStep(this.editingStepIndex, transform);
        return;
      }

      // Update model steps (add new step)
      this.activeModel.steps.push(transform);

      // Update current data and schema
      // Check if resultTable is an Arquero table or a plain array (for pass-through types transform)
      const transformedData = Array.isArray(resultTable) ? resultTable : resultTable.objects();
      this.currentData = transformedData;

      // Propagation: Calculate next schema
      const sampleData = Array.isArray(resultTable)
        ? resultTable.slice(0, 20)
        : resultTable.slice(0, 20).objects();

      this.activeModel.schema = SchemaEngine.deriveNextSchema(
        this.activeModel.schema,
        transform,
        sampleData
      );
      this.columns = this.activeModel.schema.map((c) => c.name);

      // Update the model's data
      this.activeModel.data = JSON.parse(JSON.stringify(transformedData));

      // Update pagination
      this.updatePagination();

      // Auto-save to IndexedDB
      await autoSave(this.sources, this.models);

      // Close dialog
      this.closeDialog();
    },

    getColumnType(colName) {
      if (this.activeModel?.schema) {
        const col = this.activeModel.schema.find((c) => c.name === colName);
        if (col) return col.type;
      }
      if (this.activeSource?.columns) {
        const col = this.activeSource.columns.find((c) => c.name === colName);
        if (col) return col.type || col.inferredType;
      }
      return 'string';
    },

    getTypeIndicator(colName) {
      const type = this.getColumnType(colName);
      switch (type) {
        case 'string':
          return 'Abc';
        case 'integer':
          return '#';
        case 'float':
          return '1.1';
        case 'boolean':
          return '✓';
        case 'date':
          return '📅';
        case 'datetime':
          return '🕒';
        default:
          return 'Abc';
      }
    },

    async applySelectTransform() {
      const selectedCols = this.getSelectedColumnsList();

      if (selectedCols.length === 0) {
        alert('Please select at least one column');
        return;
      }

      try {
        // Create transform specification
        const transform = { select: selectedCols };

        // Apply to current data using Arquero
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Transform error:', error);
        alert('Error applying transform: ' + error.message);
      }
    },

    // Validate filter expression as user types
    validateFilterExpression() {
      const expr = this.filterExpression.trim();

      // Empty expression is valid (no filter)
      if (!expr) {
        this.filterError = null;
        return;
      }

      try {
        // Parse
        const ast = parseExpression(expr);

        // Validate
        const validation = validateAST(ast, this.columns);

        if (!validation.valid) {
          this.filterError = formatError(validation.error, expr);
        } else {
          this.filterError = null;
        }
      } catch (error) {
        // Parse error
        this.filterError = formatError(error, expr);
      }
    },

    // Apply filter transform
    async applyFilterTransform() {
      const expr = this.filterExpression.trim();

      if (!expr) {
        alert('Please enter a filter expression');
        return;
      }

      if (this.filterError) {
        alert('Please fix the expression errors before applying');
        return;
      }

      try {
        // Create transform specification
        const transform = { filter: expr };

        // Apply to current data using Arquero
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Filter transform error:', error);
        alert('Error applying filter: ' + error.message);
      }
    },

    // Validate derive expression as user types
    validateDeriveExpression() {
      const { columnName, expression } = this.deriveDialogState;
      const expr = expression.trim();

      if (!expr) {
        this.deriveDialogState.error = null;
        return;
      }

      try {
        const ast = parseExpression(expr);
        const validation = validateAST(ast, this.columns);
        if (!validation.valid) {
          this.deriveDialogState.error = formatError(validation.error, expr);
        } else {
          this.deriveDialogState.error = null;
        }
      } catch (error) {
        this.deriveDialogState.error = formatError(error, expr);
      }
    },

    // Apply derive transform
    async applyDeriveTransform() {
      const { columnName, expression } = this.deriveDialogState;
      if (!columnName || !expression) {
        alert('Please provide both column name and expression');
        return;
      }

      if (this.deriveDialogState.error) {
        alert('Please fix the expression errors before applying');
        return;
      }

      if (this.columns.includes(columnName)) {
        if (!confirm(`Column "${columnName}" already exists. It will be overwritten. Continue?`))
          return;
      }

      try {
        const transform = { derive: { [columnName]: expression } };
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Derive transform error:', error);
        alert('Error applying derive: ' + error.message);
      }
    },

    // Apply sort transform
    async applySortTransform() {
      const { field, order } = this.sortDialogState;
      if (!field) {
        alert('Please select a column to sort by');
        return;
      }

      try {
        const transform = { sort: { field, order } };
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Sort transform error:', error);
        alert('Error applying sort: ' + error.message);
      }
    },

    // Apply rename transform
    async applyRenameTransform() {
      const { renames } = this.renameDialogState;
      const actualRenames = {};
      for (const [oldName, newName] of Object.entries(renames)) {
        if (oldName !== newName && newName && newName.trim() !== '') {
          actualRenames[oldName] = newName.trim();
        }
      }

      if (Object.keys(actualRenames).length === 0) {
        this.closeDialog();
        return;
      }

      try {
        const transform = { rename: actualRenames };
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Rename transform error:', error);
        alert('Error applying rename: ' + error.message);
      }
    },

    // Apply remove transform
    async applyRemoveTransform() {
      const colsToRemove = this.columns.filter((_, idx) => this.removedColumns[idx]);
      if (colsToRemove.length === 0) {
        this.closeDialog();
        return;
      }

      if (colsToRemove.length === this.columns.length) {
        alert('Cannot remove all columns');
        return;
      }

      try {
        const transform = { remove: colsToRemove };
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Remove transform error:', error);
        alert('Error applying remove: ' + error.message);
      }
    },

    // Apply fold (unpivot) transform
    async applyFoldTransform() {
      const { keyName, valueName, selectedColumns } = this.foldDialogState;
      const colsToFold = this.columns.filter((_, idx) => selectedColumns[idx]);

      if (colsToFold.length === 0) {
        alert('Please select at least one column to unpivot');
        return;
      }

      try {
        const transform = {
          fold: {
            columns: colsToFold,
            as: [keyName || 'key', valueName || 'value'],
          },
        };

        const table = aq.from(this.currentData);
        // Fold doesn't need context
        const result = applyTransform(table, transform, this.columns);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Fold transform error:', error);
        alert('Error applying unpivot: ' + error.message);
      }
    },

    // Aggregate Dialog Methods
    addAggregation() {
      this.aggregateDialogState.aggregations.push({ output: '', func: 'mean', col: '' });
    },

    removeAggregation(index) {
      this.aggregateDialogState.aggregations.splice(index, 1);
    },

    updateAggregateOutputName(index) {
      const agg = this.aggregateDialogState.aggregations[index];
      if (agg.func === 'count') {
        agg.output = 'count';
      } else if (agg.col) {
        agg.output = `${agg.func}_${agg.col}`;
      }
    },

    constructAggregateStep() {
      const { groupBy, aggregations } = this.aggregateDialogState;

      // Validate
      if (aggregations.length === 0) {
        throw new Error('At least one aggregation is required.');
      }

      const rollup = {};
      aggregations.forEach((agg) => {
        if (!agg.output) throw new Error('All aggregations must have an output name.');
        if (agg.output.trim() === '') throw new Error('Output name cannot be empty.');

        if (agg.func === 'count') {
          rollup[agg.output] = 'op.count()';
        } else if (agg.func === 'distinct') {
          if (!agg.col) throw new Error(`Column required for ${agg.func}`);
          rollup[agg.output] = `op.distinct('${agg.col}')`;
        } else {
          if (!agg.col) throw new Error(`Column required for ${agg.func}`);
          rollup[agg.output] = `op.${agg.func}('${agg.col}')`;
        }
      });

      return {
        aggregate: {
          groupby: groupBy,
          rollup: rollup,
        },
      };
    },

    async previewAggregate() {
      this.aggregateDialogState.isPreviewing = true;
      this.aggregateDialogState.previewError = null;
      this.aggregateDialogState.previewData = null;

      try {
        const step = this.constructAggregateStep();

        // Use current data
        const table = aq.from(this.currentData);

        // Apply transform reuse logic
        const resultTable = applyTransform(table, step, this.columns);

        // Get preview (first 100 rows)
        const previewRows = resultTable.slice(0, 100).objects();
        const previewCols = resultTable.columnNames();

        this.aggregateDialogState.previewData = {
          rows: previewRows,
          columns: previewCols,
          totalRows: resultTable.numRows(),
        };
      } catch (error) {
        this.aggregateDialogState.previewError = error.message;
      } finally {
        this.aggregateDialogState.isPreviewing = false;
      }
    },

    async applyAggregateTransform() {
      try {
        const step = this.constructAggregateStep();
        // For aggregate, result relies on logic in previewAggregate essentially
        // We'll let applyStepResult handle the final computation and storage
        // But applyStepResult expects us to calculate the result first usually?
        // Actually applyStepResult takes (transform, resultTable).

        const table = aq.from(this.currentData);
        const result = applyTransform(table, step, this.columns);

        await this.applyStepResult(step, result);
      } catch (error) {
        alert(error.message);
      }
    },

    // Join transform methods
    initializeJoinDialog() {
      // Build list of available join targets (all models and sources except current)
      const availableTargets = [];

      // Add all models (except current one)
      this.models.forEach((model) => {
        if (model.id !== this.activeModel.id) {
          availableTargets.push({
            id: model.id,
            name: model.name,
            type: 'model',
            sourceName: this.sources.find((s) => s.id === model.sourceId)?.name || 'Unknown',
          });
        }
      });

      // Add all sources
      this.sources.forEach((source) => {
        availableTargets.push({
          id: source.id,
          name: source.name,
          type: 'source',
          sourceName: source.name,
        });
      });

      this.joinDialogState = {
        rightModel: availableTargets[0]?.id || null,
        joinType: 'left',
        keyPairs: [[null, null]],
        suffixes: ['_x', '_y'],
        availableTargets: availableTargets,
        leftColumns: this.columns,
        rightColumns: this.getColumnsForTarget(availableTargets[0]?.id),
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };
    },

    getColumnsForTarget(targetId) {
      if (!targetId) return [];

      // Try to find in models first
      const model = this.models.find((m) => m.id === targetId);
      if (model) {
        try {
          // Always compute fresh schema to avoid stale results
          const result = this.computeModelUpToStep(model, model.steps.length - 1);
          return result.columns;
        } catch (error) {
          console.error('Error computing columns for target model:', error);
          // Fallback to cached data if possible
          if (model.data && model.data.length > 0) {
            return Object.keys(model.data[0]);
          }
        }
      }

      // Try to find in sources
      const source = this.sources.find((s) => s.id === targetId);
      if (source) {
        return source.columns.map((c) => c.name);
      }

      return [];
    },

    onJoinTargetChange() {
      // Update right columns when target changes
      this.joinDialogState.rightColumns = this.getColumnsForTarget(this.joinDialogState.rightModel);
      // Reset key pairs
      this.joinDialogState.keyPairs = [[null, null]];
      // Clear preview
      this.joinDialogState.previewData = null;
      this.joinDialogState.previewError = null;
    },

    addJoinKeyPair() {
      this.joinDialogState.keyPairs.push([null, null]);
    },

    removeJoinKeyPair(index) {
      if (this.joinDialogState.keyPairs.length > 1) {
        this.joinDialogState.keyPairs.splice(index, 1);
      }
    },

    async previewJoin() {
      const state = this.joinDialogState;

      // Validate inputs
      if (!state.rightModel) {
        state.previewError = 'Please select a model or source to join with';
        return;
      }

      // Validate key pairs (at least one complete pair required, unless cross join)
      if (state.joinType !== 'cross') {
        const hasCompleteKeyPair = state.keyPairs.some((pair) => pair[0] && pair[1]);
        if (!hasCompleteKeyPair) {
          state.previewError = 'Please specify at least one complete key pair';
          return;
        }

        // Filter out incomplete pairs for the join
        const completePairs = state.keyPairs.filter((pair) => pair[0] && pair[1]);
        if (completePairs.length === 0) {
          state.previewError = 'Please specify at least one complete key pair';
          return;
        }
      }

      state.isPreviewing = true;
      state.previewError = null;
      state.previewData = null;

      try {
        // Refresh target model data to ensure transformations are respected
        const targetModel = this.models.find((m) => m.id === state.rightModel);
        if (targetModel && targetModel.steps.length > 0) {
          const result = this.computeModelUpToStep(targetModel, targetModel.steps.length - 1);
          targetModel.data = result.data;
        }

        // Build transform
        const transform = {
          join: {
            right: state.rightModel,
            on: state.keyPairs.filter((pair) => pair[0] && pair[1]),
            how: state.joinType,
            suffixes: state.suffixes,
          },
        };

        // Apply transform to preview
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        // Get preview (first 100 rows)
        const allData = result.objects();
        state.previewData = {
          rows: allData.slice(0, 100),
          totalRows: allData.length,
          columns: result.columnNames(),
        };
      } catch (error) {
        console.error('Join preview error:', error);
        state.previewError = error.message;
      } finally {
        state.isPreviewing = false;
      }
    },

    async applyJoinTransform() {
      const state = this.joinDialogState;

      // Validate inputs
      if (!state.rightModel) {
        alert('Please select a model or source to join with');
        return;
      }

      // Validate key pairs (unless cross join)
      if (state.joinType !== 'cross') {
        const completePairs = state.keyPairs.filter((pair) => pair[0] && pair[1]);
        if (completePairs.length === 0) {
          alert('Please specify at least one complete key pair');
          return;
        }
      }

      try {
        // Refresh target model data to ensure transformations are respected
        const targetModel = this.models.find((m) => m.id === state.rightModel);
        if (targetModel && targetModel.steps.length > 0) {
          const result = this.computeModelUpToStep(targetModel, targetModel.steps.length - 1);
          targetModel.data = result.data;
        }

        // Build transform
        const completePairs = state.keyPairs.filter((pair) => pair[0] && pair[1]);
        const transform = {
          join: {
            right: state.rightModel,
            on: completePairs,
            how: state.joinType,
            suffixes: state.suffixes,
          },
        };

        // Apply transform
        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Join transform error:', error);
        alert('Error applying join: ' + error.message);
      }
    },

    // Export current data as CSV
    exportCSV() {
      if (!this.currentData || this.currentData.length === 0) {
        alert('No data to export');
        return;
      }

      const start = performance.now();
      try {
        // Convert current data to CSV using PapaParse
        const csv = Papa.unparse(this.currentData);

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`⚡ Export CSV — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      } catch (error) {
        console.error('CSV export error:', error);
        alert('Failed to export CSV: ' + error.message);
      }
    },

    // Export workflow as JSON
    exportWorkflowJSON() {
      if (!this.activeModel) {
        alert('No workflow to export');
        return;
      }

      try {
        // Create workflow export object
        const workflow = {
          version: '1.0',
          name: this.activeModel.name,
          exportedAt: new Date().toISOString(),
          source: {
            id: this.sources.find((s) => s.id === this.activeModel.sourceId)?.id,
            name: this.sources.find((s) => s.id === this.activeModel.sourceId)?.name,
            columns: this.sources.find((s) => s.id === this.activeModel.sourceId)?.columns,
          },
          model: {
            id: this.activeModel.id,
            name: this.activeModel.name,
            steps: this.activeModel.steps,
          },
        };

        // Convert to JSON
        const json = JSON.stringify(workflow, null, 2);

        // Create download link
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_workflow_${timestamp}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Exported workflow JSON:', filename);
      } catch (error) {
        console.error('Workflow export error:', error);
        alert('Failed to export workflow: ' + error.message);
      }
    },

    // Export current data as JSON
    exportDataJSON() {
      if (!this.currentData || this.currentData.length === 0) {
        alert('No data to export');
        return;
      }

      const start = performance.now();
      try {
        // Convert current data to JSON
        const json = JSON.stringify(this.currentData, null, 2);

        // Create download link
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_data_${timestamp}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`⚡ Export JSON — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      } catch (error) {
        console.error('JSON export error:', error);
        alert('Failed to export JSON: ' + error.message);
      }
    },

    // Copy current data as CSV to clipboard
    // Copy current page data as CSV to clipboard
    async copyCSVToClipboard() {
      const pageData = this.getPaginatedData();
      if (!pageData || pageData.length === 0) {
        alert('No data to copy on this page');
        return;
      }

      try {
        const csv = Papa.unparse(pageData);
        await navigator.clipboard.writeText(csv);
        alert('Current page data copied to clipboard (CSV)!');
      } catch (error) {
        console.error('Copy to clipboard error:', error);
        alert('Failed to copy to clipboard: ' + error.message);
      }
    },

    // Copy current page data as JSON to clipboard
    async copyJSONToClipboard() {
      const pageData = this.getPaginatedData();
      if (!pageData || pageData.length === 0) {
        alert('No data to copy on this page');
        return;
      }

      try {
        const json = JSON.stringify(pageData, null, 2);
        await navigator.clipboard.writeText(json);
        alert('Current page data copied to clipboard (JSON)!');
      } catch (error) {
        console.error('Copy to clipboard error:', error);
        alert('Failed to copy to clipboard: ' + error.message);
      }
    },

    // Switch to a source (shows dataset info view)
    switchToSource(source) {
      this.activeSource = source;
      this.activeModel = null;
      this.currentData = source.data; // Show source data
      this.columns = source.columns.map((c) => c.name);
      this.viewMode = 'dataset-info';
      this.activeStepIndex = null;
      this.viewingIntermediate = false;
      this.clearColumnSelection();

      // Switch to 'data' ribbon tab
      this.ribbonTab = 'data';

      console.log('Viewing dataset info for:', source.name);
    },

    // Switch to a different model
    switchToModel(model) {
      this.activeSource = null;
      this.activeModel = model;

      // Self-healing: Ensure model has a schema if data is present
      if (model.data && model.data.length > 0 && (!model.schema || model.schema.length === 0)) {
        console.log('Self-healing: Generating schema for existing model on switch');
        model.schema = SchemaEngine.createInitialSchema(model.data);
      }

      this.currentData = model.data;
      this.viewMode = 'model';
      this.activeStepIndex = null;
      this.viewingIntermediate = false;
      this.clearColumnSelection();

      // Switch to 'transform' ribbon tab by default
      if (this.ribbonTab === 'model' || !this.ribbonTab) {
        this.ribbonTab = 'transform';
      }

      // Update columns from the model's schema or data
      if (this.currentData && this.currentData.length > 0) {
        this.columns = model.schema
          ? model.schema.map((c) => c.name)
          : Object.keys(this.currentData[0]);
      } else {
        this.columns = [];
      }

      // Update pagination
      this.updatePagination();

      console.log('Switched to model:', model.name);
    },

    // Create a new model from a source
    async createNewModel(source) {
      // Prompt for model name
      const modelName = prompt(
        'Enter name for new model:',
        `model_${this.models.filter((m) => m.sourceId === source.id).length + 1}`
      );

      if (!modelName || modelName.trim() === '') {
        return; // User cancelled or entered empty name
      }

      // Check for duplicate model names within the same source
      const existingModel = this.models.find(
        (m) => m.sourceId === source.id && m.name.toLowerCase() === modelName.trim().toLowerCase()
      );

      if (existingModel) {
        alert(
          'A model with this name already exists for this source. Please choose a different name.'
        );
        return;
      }

      // Create new model with source data and no transforms
      const newModel = {
        id: `mdl_${Date.now()}`,
        name: modelName.trim(),
        sourceId: source.id,
        steps: [],
        schema: JSON.parse(JSON.stringify(source.columns)),
        data: JSON.parse(JSON.stringify(source.data)), // Deep copy of source data
      };

      // Add import step (reconstructed from source metadata)
      const importStep = {
        import: {
          source: source.name,
          fileName: source.fileName,
          delimiter: source.delimiter,
          headerMode: source.headerMode,
        },
      };
      if (source.customHeaders) {
        importStep.import.customHeaders = source.customHeaders;
      }
      newModel.steps.push(importStep);

      // Add data type detection step
      const typesStep = {
        types: {},
      };
      source.columns.forEach((col) => {
        typesStep.types[col.name] = col.type;
      });
      newModel.steps.push(typesStep);

      this.models.push(newModel);

      // Switch to the new model
      this.switchToModel(newModel);

      // Auto-save
      await autoSave(this.sources, this.models);

      console.log('Created new model:', newModel.name, 'for source:', source.name);
    },

    // Create new model from currently active model's source
    async createNewModelFromActive() {
      if (!this.activeModel) {
        alert('No active model selected');
        return;
      }

      // Find the source for the active model
      const source = this.sources.find((s) => s.id === this.activeModel.sourceId);
      if (!source) {
        alert('Source not found for current model');
        return;
      }

      await this.createNewModel(source);
    },

    // Copy current model (with all transforms)
    async copyCurrentModel() {
      if (!this.activeModel) {
        alert('No active model selected');
        return;
      }

      // Prompt for new model name
      const newName = prompt('Enter name for copied model:', `${this.activeModel.name}_copy`);

      if (!newName || newName.trim() === '') {
        return; // User cancelled
      }

      // Check for duplicate names within same source
      const existingModel = this.models.find(
        (m) =>
          m.sourceId === this.activeModel.sourceId &&
          m.name.toLowerCase() === newName.trim().toLowerCase()
      );

      if (existingModel) {
        alert(
          'A model with this name already exists for this source. Please choose a different name.'
        );
        return;
      }

      // Deep copy the current model
      const copiedModel = {
        id: `mdl_${Date.now()}`,
        name: newName.trim(),
        sourceId: this.activeModel.sourceId,
        steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
        schema: this.activeModel.schema
          ? JSON.parse(JSON.stringify(this.activeModel.schema))
          : null,
        data: JSON.parse(JSON.stringify(this.activeModel.data)),
      };

      this.models.push(copiedModel);

      // Switch to copied model
      this.switchToModel(copiedModel);

      // Auto-save
      await autoSave(this.sources, this.models);

      console.log('Copied model:', this.activeModel.name, '→', copiedModel.name);
    },

    // Rename current model
    async renameCurrentModel() {
      if (!this.activeModel) {
        alert('No active model selected');
        return;
      }

      const newName = prompt('Enter new name for model:', this.activeModel.name);

      if (!newName || newName.trim() === '') {
        return; // User cancelled
      }

      if (newName.trim() === this.activeModel.name) {
        return; // No change
      }

      // Check for duplicate names within same source
      const existingModel = this.models.find(
        (m) =>
          m.sourceId === this.activeModel.sourceId &&
          m.name.toLowerCase() === newName.trim().toLowerCase()
      );

      if (existingModel) {
        alert(
          'A model with this name already exists for this source. Please choose a different name.'
        );
        return;
      }

      // Update model name
      this.activeModel.name = newName.trim();

      // Auto-save
      await autoSave(this.sources, this.models);

      console.log('Model renamed to:', newName.trim());
    },

    // Delete current model
    async deleteCurrentModel() {
      if (!this.activeModel) {
        alert('No active model selected');
        return;
      }

      // Prevent deleting the last model
      const sourceModels = this.models.filter((m) => m.sourceId === this.activeModel.sourceId);
      if (sourceModels.length === 1) {
        alert('Cannot delete the last model for this source.');
        return;
      }

      if (!confirm(`Delete model "${this.activeModel.name}"?\n\nThis cannot be undone.`)) {
        return;
      }

      const deletedModelId = this.activeModel.id;
      const sourceId = this.activeModel.sourceId;

      // Remove model
      this.models = this.models.filter((m) => m.id !== deletedModelId);

      // Switch to the first remaining model from the same source
      const remainingModels = this.models.filter((m) => m.sourceId === sourceId);
      if (remainingModels.length > 0) {
        this.switchToModel(remainingModels[0]);
      } else {
        // This shouldn't happen due to the check above, but handle it anyway
        this.activeModel = null;
        this.currentData = null;
        this.columns = [];
        this.viewMode = 'empty';
      }

      // Auto-save
      await autoSave(this.sources, this.models);

      console.log('Model deleted');
    },

    // Rename source
    async renameSource(source) {
      const newName = prompt('Enter new name for source:', source.name);

      if (!newName || newName.trim() === '') {
        return; // User cancelled or entered empty name
      }

      if (newName.trim() === source.name) {
        return; // No change
      }

      // Update source name
      source.name = newName.trim();

      // Auto-save
      await autoSave(this.sources, this.models);

      console.log('Source renamed to:', newName.trim());
    },

    // Delete source and all its models
    async deleteSource(source) {
      const modelCount = this.models.filter((m) => m.sourceId === source.id).length;
      const message =
        modelCount > 0
          ? `Delete source "${source.name}" and its ${modelCount} model${modelCount > 1 ? 's' : ''}?\n\nThis cannot be undone.`
          : `Delete source "${source.name}"?\n\nThis cannot be undone.`;

      if (!confirm(message)) {
        return;
      }

      try {
        // Remove all models for this source
        this.models = this.models.filter((m) => m.sourceId !== source.id);

        // Remove source
        this.sources = this.sources.filter((s) => s.id !== source.id);

        // If we were viewing this source or its models, clear the view
        if (
          this.activeSource?.id === source.id ||
          this.models.find((m) => m.id === this.activeModel?.id && m.sourceId === source.id)
        ) {
          this.activeSource = null;
          this.activeModel = null;
          this.currentData = null;
          this.columns = [];
          this.viewMode = 'empty';
        }

        // Auto-save
        await autoSave(this.sources, this.models);

        console.log('Source deleted:', source.name);
      } catch (error) {
        console.error('Error deleting source:', error);
        alert('Failed to delete source: ' + error.message);
      }
    },

    // Clear all data (for debugging)
    async clearAllData() {
      if (!confirm('Clear all data from IndexedDB? This cannot be undone.')) {
        return;
      }

      try {
        await clearAllData();

        // Reset app state
        this.sources = [];
        this.models = [];
        this.activeModel = null;
        this.currentData = null;
        this.columns = [];

        alert('All data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Failed to clear data: ' + error.message);
      }
    },

    // ============================================================
    // Step Navigation & Removal
    // ============================================================

    computeModelUpToStep(model, stepIndex) {
      const start = performance.now();

      // Get source data
      const source = this.sources.find((s) => s.id === model.sourceId);
      if (!source) {
        throw new Error('Source not found for model');
      }

      // Start with source data and its initial schema
      let table = aq.from(source.data);
      let schema = JSON.parse(JSON.stringify(source.columns));
      let columns = schema.map((c) => c.name);

      // Apply transforms 0 through stepIndex
      for (let i = 0; i <= stepIndex; i++) {
        const step = model.steps[i];

        // Skip import step (it's just metadata, not a transform)
        if (step.import) {
          continue;
        }

        try {
          const context = { sources: this.sources, models: this.models };
          table = applyTransform(table, step, columns, context);

          // Update column schema after each step
          // We only get objects if we need to infer types (like in derive)
          let sampleData = [];
          if (step.derive || step.join) {
            sampleData = table.slice(0, 20).objects();
          }

          schema = SchemaEngine.deriveNextSchema(schema, step, sampleData);
          columns = schema.map((c) => c.name);
        } catch (error) {
          console.error(`Error applying step ${i}:`, error);
          throw error;
        }
      }

      const result = {
        data: table.objects(),
        schema: schema,
        columns: columns,
      };

      perfLogger.log(
        `Compute model '${model.name}' to step ${stepIndex + 1}`,
        source.data,
        result.data,
        performance.now() - start
      );
      return result;
    },

    /**
     * Compute data state for ACTIVE model up to a specific step index
     * @param {number} stepIndex - Step to compute up to (inclusive)
     * @returns {Object} { data: Array, columns: Array }
     */
    computeUpToStep(stepIndex) {
      return this.computeModelUpToStep(this.activeModel, stepIndex);
    },

    /**
     * Track how column schema changes after a transform
     * @param {Array<string>} currentColumns - Current column names
     * @param {Object} step - Transform step
     * @returns {Array<string>} Updated column names
     */
    getColumnsAfterStep(currentColumns, step) {
      // SELECT: Keep only specified columns
      if (step.select) {
        return step.select;
      }

      // DERIVE: Add new columns
      if (step.derive) {
        return [...currentColumns, ...Object.keys(step.derive)];
      }

      // RENAME: Rename columns
      if (step.rename) {
        return currentColumns.map((c) => step.rename[c] || c);
      }

      // REMOVE: Remove columns
      if (step.remove) {
        return currentColumns.filter((c) => !step.remove.includes(c));
      }

      // Other transforms (filter, sort, fillna, dropna, replace, aggregate)
      // don't change column names
      return currentColumns;
    },

    /**
     * View data at an intermediate step
     * @param {number} stepIndex - Step index to view
     */
    viewStep(stepIndex) {
      try {
        const result = this.computeUpToStep(stepIndex);

        this.currentData = result.data;
        this.columns = result.columns;
        this.activeModel.schema = result.schema; // Keep track of schema at this step
        this.activeStepIndex = stepIndex;
        this.viewingIntermediate = true;

        // Update pagination
        this.updatePagination();

        console.log(`Viewing step ${stepIndex + 1}:`, result.data.length, 'rows');
      } catch (error) {
        console.error('Error computing step:', error);
        alert(`Error viewing step ${stepIndex + 1}: ${error.message}`);
      }
    },

    /**
     * Return to viewing final result
     */
    viewFinalResult() {
      if (!this.activeModel) return;

      this.currentData = this.activeModel.data;

      // Get columns from model data
      if (this.currentData && this.currentData.length > 0) {
        this.columns = Object.keys(this.currentData[0]);
      } else {
        this.columns = [];
      }

      this.activeStepIndex = null;
      this.viewingIntermediate = false;

      // Update pagination
      this.updatePagination();

      console.log('Viewing final result');
    },

    /**
     * Remove a step and recompute from source
     * @param {number} stepIndex - Index of step to remove
     */
    async removeStep(stepIndex) {
      // Can't remove import step (first step)
      if (this.activeModel.steps[stepIndex].import) {
        alert('Cannot remove the import step');
        return;
      }

      // Confirm deletion
      const step = this.activeModel.steps[stepIndex];
      const description = describeTransform(step);

      if (!confirm(`Remove step "${description}"?\n\nThis cannot be undone.`)) {
        return;
      }

      try {
        // Remove step from array
        this.activeModel.steps.splice(stepIndex, 1);

        // Trigger reactivity
        this.activeModel.steps = [...this.activeModel.steps];

        // Recompute final result
        // We always have at least one step (Import), so length >= 1.
        // We compute up to the last step in the chain.
        const lastStepIndex = this.activeModel.steps.length - 1;
        const result = this.computeUpToStep(lastStepIndex);

        // Update model with new final result
        this.activeModel.data = JSON.parse(JSON.stringify(result.data));
        this.activeModel.schema = result.schema;

        // Update app state
        this.currentData = this.activeModel.data;
        this.columns = result.columns;

        // Return to final view
        this.viewFinalResult();

        // Auto-save
        await autoSave(this.sources, this.models);

        console.log('Step removed and data recomputed');
      } catch (error) {
        console.error('Error removing step:', error);
        alert(`Error recomputing after removal: ${error.message}`);
      }
    },

    editStep(stepIndex) {
      const step = this.activeModel.steps[stepIndex];

      // Store editing context
      this.editingStepIndex = stepIndex;

      // Open appropriate dialog based on step type
      if (step.filter) {
        this.filterExpression = step.filter;
        this.filterError = null;
        this.openDialog('filter');
      } else if (step.select) {
        // Set selected columns
        this.selectedColumns = this.columns.map((col) => step.select.includes(col));
        this.openDialog('select');
      } else if (step.remove) {
        this.removedColumns = this.columns.map((col) => step.remove.includes(col));
        this.openDialog('remove');
      } else if (step.rename) {
        // Populate rename state with current mappings
        const renames = {};
        this.columns.forEach((col) => {
          renames[col] = step.rename[col] || col;
        });
        this.renameDialogState = { renames };
        this.openDialog('rename');
      } else if (step.derive) {
        // For derive, populate with first column (simple case)
        const firstCol = Object.keys(step.derive)[0];
        this.deriveDialogState = {
          columnName: firstCol,
          expression: step.derive[firstCol],
          error: null,
        };
        this.openDialog('derive');
      } else if (step.sort) {
        this.sortDialogState = {
          field: step.sort.field,
          order: step.sort.order,
        };
        this.openDialog('sort');
      } else if (step.fold) {
        // Determine which columns are being folded
        const foldCols = step.fold.columns || [];
        this.foldDialogState = {
          keyName: step.fold.as?.[0] || 'key',
          valueName: step.fold.as?.[1] || 'value',
          selectedColumns: this.columns.map((col) => foldCols.includes(col)),
        };
        this.openDialog('fold');
      } else {
        alert('Editing this step type is not yet supported');
        this.editingStepIndex = null;
      }
    },

    async updateStep(stepIndex, newTransform) {
      // Backup current state for rollback
      const backup = {
        steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
        data: JSON.parse(JSON.stringify(this.activeModel.data)),
        schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
      };

      try {
        // Update step
        this.activeModel.steps[stepIndex] = newTransform;

        // Trigger reactivity
        this.activeModel.steps = [...this.activeModel.steps];

        // Recompute from updated step to end
        const lastStepIndex = this.activeModel.steps.length - 1;
        const result = this.computeUpToStep(lastStepIndex);

        // Update model with recomputed result
        this.activeModel.data = JSON.parse(JSON.stringify(result.data));
        this.activeModel.schema = result.schema;

        // Update app state
        this.currentData = this.activeModel.data;
        this.columns = result.columns;

        // Return to final view
        this.viewFinalResult();

        // Auto-save
        await autoSave(this.sources, this.models);

        // Clear editing context
        this.editingStepIndex = null;

        console.log('Step updated and data recomputed');
      } catch (error) {
        console.error('Error updating step:', error);

        // Rollback to backup state
        this.activeModel.steps = backup.steps;
        this.activeModel.data = backup.data;
        this.activeModel.schema = backup.schema;
        this.currentData = this.activeModel.data;
        this.columns = this.activeModel.schema.map((c) => c.name);

        // Clear editing context
        this.editingStepIndex = null;

        alert(`Error updating step: ${error.message}\n\nChanges have been reverted.`);
      }
    },

    // ============================================================
    // Import Dialog Live Preview
    // ============================================================

    /**
     * Update preview when delimiter changes - reparse the file
     */
    updateImportPreview() {
      const file = this.importFileData.file;
      const delimiter = this.importDialogState.delimiter;

      // Reparse with new delimiter
      Papa.parse(file, {
        preview: 5,
        header: false,
        skipEmptyLines: true,
        delimiter: delimiter === '\t' ? '\t' : delimiter,
        complete: (previewResult) => {
          const firstRow = previewResult.data[0] || [];

          // Update raw data and original headers
          this.importDialogState.rawPreviewData = previewResult.data;
          const newHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);
          this.importDialogState.originalHeaders = newHeaders;
          this.importDialogState.customHeaders = newHeaders;

          // Update preview display
          this.updateHeadersForPreview();
        },
        error: (error) => {
          console.error('CSV preview error:', error);
          alert('Error parsing CSV with selected delimiter: ' + error.message);
        },
      });
    },

    /**
     * Update preview headers and data rows based on current header mode
     */
    updateHeadersForPreview() {
      const { rawPreviewData, headerMode, originalHeaders, customHeaders } = this.importDialogState;

      if (rawPreviewData.length === 0) {
        this.importDialogState.previewHeaders = [];
        this.importDialogState.previewDataRows = [];
        return;
      }

      let headers;

      if (headerMode === 'first-row') {
        // Always use original headers (before resolution) for duplicate detection
        headers = originalHeaders;
        // Show rows 2-5 (skip first row which is headers)
        this.importDialogState.previewDataRows = rawPreviewData.slice(1);
      } else if (headerMode === 'auto-generate') {
        // Generate Column 1, Column 2, ...
        const numCols = rawPreviewData[0]?.length || 0;
        headers = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
        // Show all rows (including first row)
        this.importDialogState.previewDataRows = rawPreviewData;
      } else if (headerMode === 'manual') {
        // Use custom headers from inputs
        headers = customHeaders;
        // Show all rows (including first row)
        this.importDialogState.previewDataRows = rawPreviewData;
      }

      // Detect and resolve duplicates
      const { resolvedHeaders, warning } = this.resolveDuplicateHeaders(headers);
      this.importDialogState.previewHeaders = resolvedHeaders;
      this.importDialogState.duplicateWarning = warning;

      // Update customHeaders with resolved names (so they're used on import)
      if (headerMode === 'first-row') {
        // For first-row mode, store the resolved headers for import
        this.importDialogState.customHeaders = resolvedHeaders;
      } else if (headerMode === 'manual') {
        // For manual mode, user is editing customHeaders directly
        // Update with resolved names to ensure they see the resolution
        this.importDialogState.customHeaders = resolvedHeaders;
      }
    },

    /**
     * Detect duplicate headers and resolve them by adding suffixes
     * @param {Array<string>} headers - Original headers
     * @returns {Object} { resolvedHeaders: Array<string>, warning: string }
     */
    resolveDuplicateHeaders(headers) {
      const seen = {};
      const duplicates = [];
      const resolvedHeaders = [];

      headers.forEach((header, index) => {
        let finalHeader = header;

        if (seen[header] !== undefined) {
          // This is a duplicate
          if (!duplicates.some((d) => d.name === header)) {
            duplicates.push({ name: header, positions: [seen[header] + 1] });
          }

          // Find the duplicate entry and add current position
          const dupEntry = duplicates.find((d) => d.name === header);
          dupEntry.positions.push(index + 1);

          // Generate unique name with suffix
          let suffix = 2;
          while (seen[`${header}_${suffix}`] !== undefined) {
            suffix++;
          }
          finalHeader = `${header}_${suffix}`;
        }

        seen[finalHeader] = index;
        resolvedHeaders.push(finalHeader);
      });

      // Generate warning message
      let warning = '';
      if (duplicates.length > 0) {
        const dupList = duplicates
          .map((d) => `"${d.name}" at positions ${d.positions.join(', ')}`)
          .join('; ');
        warning = `Found ${duplicates.length} duplicate column name${duplicates.length > 1 ? 's' : ''}: ${dupList}`;
      }

      return { resolvedHeaders, warning };
    },

    // ============================================================
    // Pagination Methods
    // ============================================================

    /**
     * Update pagination state when data changes
     */
    updatePagination() {
      if (!this.currentData) {
        this.totalPages = 1;
        this.currentPage = 1;
        return;
      }

      const totalRows = this.currentData.length;
      this.totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));

      // Reset to page 1 if current page is out of bounds
      if (this.currentPage > this.totalPages) {
        this.currentPage = 1;
      }
    },

    /**
     * Get paginated slice of current data
     * @returns {Array} Paginated data
     */
    getPaginatedData() {
      if (!this.currentData || this.currentData.length === 0) {
        return [];
      }

      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.currentData.slice(start, end);
    },

    /**
     * Get pagination info text
     * @returns {string} Info text like "Showing 1-500 of 10,000"
     */
    getPaginationInfo() {
      if (!this.currentData || this.currentData.length === 0) {
        return 'No data';
      }

      const totalRows = this.currentData.length;
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, totalRows);

      return `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}`;
    },

    /**
     * Navigate to previous page
     */
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.clearColumnSelection();
      }
    },

    /**
     * Navigate to next page
     */
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.clearColumnSelection();
      }
    },

    /**
     * Update page size and save to UX settings
     * @param {number} newSize - New page size
     */
    updatePageSize(newSize) {
      const size = parseInt(newSize, 10);
      if (isNaN(size) || size < 1) {
        return;
      }

      this.pageSize = size;
      this.clearColumnSelection();
      this.updatePagination();

      // Save to UX settings
      updateUXSetting('pagination', 'pageSize', size);

      // Update pagination (recalculate total pages, reset to page 1)
      this.currentPage = 1;
      this.updatePagination();

      console.log('Page size updated to:', size);
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
  };
}
