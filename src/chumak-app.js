
function chumakApp() {
    return {
        // UI state
        ribbonTab: 'data',
        activeTab: 'steps',
        activeStep: null,
        activeStepIndex: null,        // null = viewing final result, number = viewing step N
        viewingIntermediate: false,   // true when viewing intermediate step
        activeDialog: null,
        isDragging: false,

        // Pagination state
        currentPage: 1,
        pageSize: 500,  // Default, will be loaded from UX settings
        totalPages: 1,

        // Import dialog state
        importDialogState: {
            fileName: '',
            sourceName: '',           // Custom source name (defaults to fileName)
            rawPreviewData: [],       // Raw parsed data (array of arrays)
            previewHeaders: [],       // Headers to display in preview (with duplicates resolved)
            previewDataRows: [],      // Data rows to display in preview
            headerMode: 'first-row',
            delimiter: ',',
            originalHeaders: [],      // Original headers from first row (before duplicate resolution)
            customHeaders: [],        // Resolved headers (for import)
            duplicateWarning: ''      // Warning message if duplicates detected
        },
        importFileData: null,

        // Data state
        sources: [],
        models: [],
        activeSource: null,       // Currently selected source (for dataset info view)
        activeModel: null,
        currentData: null,
        columns: [],
        viewMode: 'empty',        // 'empty', 'dataset-info', or 'model'

        // Transform state
        selectedColumns: [],  // For Select dialog checkboxes
        selectPatternText: '',  // Pattern text for select dialog
        selectPatternMatchType: 'prefix',  // 'prefix', 'suffix', or 'exact'
        selectPatternMode: 'include',  // 'include' or 'exclude'
        filterExpression: '',
        filterError: null,

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

            // If we have data, activate the first model
            if (models.length > 0) {
                this.activeModel = models[0];
                this.currentData = models[0].data;

                // Get columns from the model's data
                if (this.currentData && this.currentData.length > 0) {
                    this.columns = Object.keys(this.currentData[0]);
                }

                // Update pagination
                this.updatePagination();

                console.log('Restored session:', sources.length, 'sources,', models.length, 'models');
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
            }
        },

        closeDialog() {
            this.activeDialog = null;
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
                duplicateWarning: ''
            };
            this.importFileData = null;
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
                        headerMode: 'first-row',  // Default
                        delimiter: previewResult.meta.delimiter || ',',
                        originalHeaders: initialHeaders,  // Store originals
                        customHeaders: initialHeaders     // Will be resolved in updateHeadersForPreview
                    };

                    // Initialize preview based on default settings
                    this.updateHeadersForPreview();

                    // Show dialog
                    this.activeDialog = 'import-csv';
                },
                error: (error) => {
                    console.error('CSV preview error:', error);
                    alert('Error reading CSV: ' + error.message);
                }
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
                header: false,  // Get raw array of arrays
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
                        data = dataRows.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter, customHeaders);
                    } else if (headerMode === 'auto-generate') {
                        // Generate Column 1, Column 2, ...
                        // (auto-generated names can't have duplicates, so no resolution needed)
                        columns = rawData[0]?.map((_, i) => `Column ${i + 1}`) || [];

                        // All rows are data (including first row)
                        data = rawData.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter);
                    } else if (headerMode === 'manual') {
                        // Use the resolved custom headers (which include duplicate resolution)
                        columns = customHeaders;

                        // All rows are data (including first row)
                        data = rawData.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter, customHeaders);
                    }
                },
                error: (error) => {
                    console.error('CSV parsing error:', error);
                    alert('Error parsing CSV: ' + error.message);
                }
            });
        },

        // Create Source and default Model
        async createSource(file, sourceName, columns, data, headerMode, delimiter, customHeaders = null) {
            const start = performance.now();

            // Validate columns: no empty names (duplicates are already resolved in the dialog)
            if (columns.some(c => !c || c.trim() === '')) {
                alert('Error: Column names cannot be empty.');
                return;
            }

            // Create a clean copy of data (ensure it's serializable for IndexedDB)
            const cleanData = JSON.parse(JSON.stringify(data));

            const source = {
                id: `src_${Date.now()}`,
                name: sourceName,  // Use custom source name
                fileName: file.name,  // Store original filename for reference
                origin: 'file',

                // CSV configuration
                delimiter: delimiter,
                headerMode: headerMode,
                customHeaders: customHeaders || null,

                // Data metadata
                rawSize: file.size,
                rowCount: cleanData.length,
                columns: columns.map((name, i) => ({
                    name: name,
                    inferredType: this.inferType(cleanData, name),
                    originalPosition: i
                })),
                createdAt: new Date().toISOString(),

                data: cleanData
            };

            this.sources.push(source);

            // Create default "main" model
            const mainModel = {
                id: `mdl_${Date.now()}`,
                name: 'main',
                sourceId: source.id,  // Link to source by ID, not name
                steps: [],
                data: cleanData
            };

            // Add CSV import configuration as the first transformation step
            const importStep = {
                import: {
                    source: sourceName,
                    fileName: file.name,  // Store original filename too
                    delimiter: delimiter,
                    headerMode: headerMode
                }
            };

            // Add custom headers to the step if they were used
            if (headerMode === 'manual' && customHeaders) {
                importStep.import.customHeaders = customHeaders;
            }

            mainModel.steps.push(importStep);
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

            console.log(`⚡ Import CSV — ${(performance.now() - start).toFixed(1)}ms — ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

            // Close dialog
            this.closeDialog();
        },

        // Infer type from sample data
        inferType(data, columnName) {
            if (data.length === 0) return 'string';

            const sample = data.slice(0, 10).map(row => row[columnName]);

            // Check if all samples are numbers
            if (sample.every(val => typeof val === 'number')) return 'number';

            // Check if all samples look like dates
            // (Simple check: contains dashes or slashes)
            if (sample.every(val => typeof val === 'string' && /\d{4}[-\/]\d{2}[-\/]\d{2}/.test(val))) {
                return 'date';
            }

            return 'string';
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
                mode: this.selectPatternMode
            });

            // Update selectedColumns based on matched columns
            this.selectedColumns = this.columns.map(col => matched.includes(col));
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
                mode: this.selectPatternMode
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
                const result = applyTransform(table, transform, this.columns);

                // Update model state
                this.activeModel.steps.push(transform);

                // Update current data and columns
                const transformedData = result.objects();
                this.currentData = transformedData;
                this.columns = selectedCols;

                // Update the model's data (create clean copy for IndexedDB)
                this.activeModel.data = JSON.parse(JSON.stringify(transformedData));

                // Update pagination
                this.updatePagination();

                // Auto-save to IndexedDB
                await autoSave(this.sources, this.models);

                // Close dialog
                this.closeDialog();
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
                const result = applyTransform(table, transform, this.columns);

                // Update model state
                this.activeModel.steps.push(transform);

                // Update current data (columns stay the same for filter)
                const transformedData = result.objects();
                this.currentData = transformedData;

                // Update the model's data (create clean copy for IndexedDB)
                this.activeModel.data = JSON.parse(JSON.stringify(transformedData));

                // Update pagination
                this.updatePagination();

                // Auto-save to IndexedDB
                await autoSave(this.sources, this.models);

                // Close dialog
                this.closeDialog();
            } catch (error) {
                console.error('Filter transform error:', error);
                alert('Error applying filter: ' + error.message);
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
                        id: this.sources.find(s => s.id === this.activeModel.sourceId)?.id,
                        name: this.sources.find(s => s.id === this.activeModel.sourceId)?.name,
                        columns: this.sources.find(s => s.id === this.activeModel.sourceId)?.columns
                    },
                    model: {
                        id: this.activeModel.id,
                        name: this.activeModel.name,
                        steps: this.activeModel.steps
                    }
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

        // Switch to a source (shows dataset info view)
        switchToSource(source) {
            this.activeSource = source;
            this.activeModel = null;
            this.currentData = source.data;  // Show source data
            this.columns = source.columns.map(c => c.name);
            this.viewMode = 'dataset-info';
            this.activeStepIndex = null;
            this.viewingIntermediate = false;

            // Switch to 'data' ribbon tab
            this.ribbonTab = 'data';

            console.log('Viewing dataset info for:', source.name);
        },

        // Switch to a different model
        switchToModel(model) {
            this.activeSource = null;
            this.activeModel = model;
            this.currentData = model.data;
            this.viewMode = 'model';
            this.activeStepIndex = null;
            this.viewingIntermediate = false;

            // Switch to 'model' ribbon tab
            this.ribbonTab = 'model';

            // Update columns from the model's data
            if (this.currentData && this.currentData.length > 0) {
                this.columns = Object.keys(this.currentData[0]);
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
            const modelName = prompt('Enter name for new model:', `model_${this.models.filter(m => m.sourceId === source.id).length + 1}`);

            if (!modelName || modelName.trim() === '') {
                return;  // User cancelled or entered empty name
            }

            // Check for duplicate model names within the same source
            const existingModel = this.models.find(m =>
                m.sourceId === source.id && m.name.toLowerCase() === modelName.trim().toLowerCase()
            );

            if (existingModel) {
                alert('A model with this name already exists for this source. Please choose a different name.');
                return;
            }

            // Create new model with source data and no transforms
            const newModel = {
                id: `mdl_${Date.now()}`,
                name: modelName.trim(),
                sourceId: source.id,
                steps: [],
                data: JSON.parse(JSON.stringify(source.data))  // Deep copy of source data
            };

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
            const source = this.sources.find(s => s.id === this.activeModel.sourceId);
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
                return;  // User cancelled
            }

            // Check for duplicate names within same source
            const existingModel = this.models.find(m =>
                m.sourceId === this.activeModel.sourceId &&
                m.name.toLowerCase() === newName.trim().toLowerCase()
            );

            if (existingModel) {
                alert('A model with this name already exists for this source. Please choose a different name.');
                return;
            }

            // Deep copy the current model
            const copiedModel = {
                id: `mdl_${Date.now()}`,
                name: newName.trim(),
                sourceId: this.activeModel.sourceId,
                steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
                data: JSON.parse(JSON.stringify(this.activeModel.data))
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
                return;  // User cancelled
            }

            if (newName.trim() === this.activeModel.name) {
                return;  // No change
            }

            // Check for duplicate names within same source
            const existingModel = this.models.find(m =>
                m.sourceId === this.activeModel.sourceId &&
                m.name.toLowerCase() === newName.trim().toLowerCase()
            );

            if (existingModel) {
                alert('A model with this name already exists for this source. Please choose a different name.');
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
            const sourceModels = this.models.filter(m => m.sourceId === this.activeModel.sourceId);
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
            this.models = this.models.filter(m => m.id !== deletedModelId);

            // Switch to the first remaining model from the same source
            const remainingModels = this.models.filter(m => m.sourceId === sourceId);
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
                return;  // User cancelled or entered empty name
            }

            if (newName.trim() === source.name) {
                return;  // No change
            }

            // Update source name
            source.name = newName.trim();

            // Auto-save
            await autoSave(this.sources, this.models);

            console.log('Source renamed to:', newName.trim());
        },

        // Delete source and all its models
        async deleteSource(source) {
            const modelCount = this.models.filter(m => m.sourceId === source.id).length;
            const message = modelCount > 0
                ? `Delete source "${source.name}" and its ${modelCount} model${modelCount > 1 ? 's' : ''}?\n\nThis cannot be undone.`
                : `Delete source "${source.name}"?\n\nThis cannot be undone.`;

            if (!confirm(message)) {
                return;
            }

            try {
                // Remove all models for this source
                this.models = this.models.filter(m => m.sourceId !== source.id);

                // Remove source
                this.sources = this.sources.filter(s => s.id !== source.id);

                // If we were viewing this source or its models, clear the view
                if (this.activeSource?.id === source.id ||
                    this.models.find(m => m.id === this.activeModel?.id && m.sourceId === source.id)) {
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

        /**
         * Compute data state up to a specific step index
         * @param {number} stepIndex - Step to compute up to (inclusive)
         * @returns {Object} { data: Array, columns: Array }
         */
        computeUpToStep(stepIndex) {
            const start = performance.now();

            // Get source data
            const source = this.sources.find(s => s.id === this.activeModel.sourceId);
            if (!source) {
                throw new Error('Source not found for active model');
            }

            // Start with source data
            let table = aq.from(source.data);
            let columns = source.columns.map(c => c.name);

            // Apply transforms 0 through stepIndex
            for (let i = 0; i <= stepIndex; i++) {
                const step = this.activeModel.steps[i];

                // Skip import step (it's just metadata, not a transform)
                if (step.import) {
                    continue;
                }

                try {
                    table = applyTransform(table, step, columns);

                    // Update column schema after each step
                    columns = this.getColumnsAfterStep(columns, step);
                } catch (error) {
                    console.error(`Error applying step ${i}:`, error);
                    throw error;
                }
            }

            const result = {
                data: table.objects(),
                columns: columns
            };

            perfLogger.log(`Compute to step ${stepIndex + 1}`, source.data, result.data, performance.now() - start);
            return result;
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
                return currentColumns.map(c => step.rename[c] || c);
            }

            // REMOVE: Remove columns
            if (step.remove) {
                return currentColumns.filter(c => !step.remove.includes(c));
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

                // Recompute final result from source
                // Find last non-import step
                let lastStepIndex = this.activeModel.steps.length - 1;

                if (lastStepIndex >= 0) {
                    const result = this.computeUpToStep(lastStepIndex);

                    // Update model with new final result
                    this.activeModel.data = JSON.parse(JSON.stringify(result.data));

                    // Return to final view
                    this.viewFinalResult();
                } else {
                    // No transforms left, just show source data
                    const source = this.sources.find(s => s.id === this.activeModel.sourceId);
                    this.activeModel.data = source.data;
                    this.viewFinalResult();
                }

                // Auto-save
                await autoSave(this.sources, this.models);

                console.log('Step removed and data recomputed');

            } catch (error) {
                console.error('Error removing step:', error);
                alert(`Error recomputing after removal: ${error.message}`);
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
                }
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
                    if (!duplicates.some(d => d.name === header)) {
                        duplicates.push({ name: header, positions: [seen[header] + 1] });
                    }

                    // Find the duplicate entry and add current position
                    const dupEntry = duplicates.find(d => d.name === header);
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
                const dupList = duplicates.map(d =>
                    `"${d.name}" at positions ${d.positions.join(', ')}`
                ).join('; ');
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
            }
        },

        /**
         * Navigate to next page
         */
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
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

            // Save to UX settings
            updateUXSetting('pagination', 'pageSize', size);

            // Update pagination (recalculate total pages, reset to page 1)
            this.currentPage = 1;
            this.updatePagination();

            console.log('Page size updated to:', size);
        }
    }
}
