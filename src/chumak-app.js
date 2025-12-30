
function chumakApp() {
    return {
        // UI state
        ribbonTab: 'data',
        activeTab: 'steps',
        activeStep: null,
        activeDialog: null,
        isDragging: false,

        // Import dialog state
        importDialogState: {
            fileName: '',
            previewRows: [],
            headerMode: 'first-row',
            delimiter: ',',
            customHeaders: []
        },
        importFileData: null,

        // Data state
        sources: [],
        models: [],
        activeModel: null,
        currentData: null,
        columns: [],

        // Transform state
        selectedColumns: [],  // For Select dialog checkboxes
        filterExpression: '',
        filterError: null,

        // Initialization
        async init() {
            console.log('Initializing Chumak...');

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
                previewRows: [],
                headerMode: 'first-row',
                delimiter: ',',
                customHeaders: []
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
            // Quick parse: First 5 rows, no header assumptions
            Papa.parse(file, {
                preview: 5,
                header: false,
                skipEmptyLines: true,
                complete: (previewResult) => {
                    // Extract first row for header preview
                    const firstRow = previewResult.data[0] || [];

                    // Set dialog state
                    this.importFileData = { file };
                    this.importDialogState = {
                        fileName: file.name,
                        previewRows: previewResult.data,
                        headerMode: 'first-row',  // Default
                        delimiter: previewResult.meta.delimiter || ',',
                        customHeaders: firstRow.map((cell, i) => cell || `Column ${i + 1}`)
                    };

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
            const { headerMode, delimiter, customHeaders } = this.importDialogState;
            const file = this.importFileData.file;

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
                        // Extract column names from first row
                        columns = rawData[0];

                        // Data starts from second row (skip header row)
                        const dataRows = rawData.slice(1);

                        // Convert array of arrays to array of objects
                        data = dataRows.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, columns, data, headerMode, delimiter);
                    } else if (headerMode === 'auto-generate') {
                        // Generate Column 1, Column 2, ...
                        columns = rawData[0]?.map((_, i) => `Column ${i + 1}`) || [];

                        // All rows are data (including first row)
                        data = rawData.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, columns, data, headerMode, delimiter);
                    } else if (headerMode === 'manual') {
                        // Use custom headers
                        columns = customHeaders;

                        // All rows are data (including first row)
                        data = rawData.map(row => {
                            const obj = {};
                            columns.forEach((col, i) => { obj[col] = row[i]; });
                            return obj;
                        });

                        await this.createSource(file, columns, data, headerMode, delimiter, customHeaders);
                    }
                },
                error: (error) => {
                    console.error('CSV parsing error:', error);
                    alert('Error parsing CSV: ' + error.message);
                }
            });
        },

        // Create Source and default Model
        async createSource(file, columns, data, headerMode, delimiter, customHeaders = null) {
            // Validate columns: no duplicates, no empty names
            const uniqueColumns = new Set(columns);
            if (uniqueColumns.size !== columns.length) {
                alert('Error: Duplicate column names detected. Please fix and try again.');
                return;
            }
            if (columns.some(c => !c || c.trim() === '')) {
                alert('Error: Column names cannot be empty.');
                return;
            }

            // Create a clean copy of data (ensure it's serializable for IndexedDB)
            const cleanData = JSON.parse(JSON.stringify(data));

            const source = {
                id: `src_${Date.now()}`,
                name: file.name,
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
                    source: file.name,
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

            // Auto-save to IndexedDB
            await autoSave(this.sources, this.models);

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

                console.log('Exported CSV:', filename);
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

        // Switch to a source (selects first model for that source)
        switchToSource(source) {
            // Find first model for this source
            const firstModel = this.models.find(m => m.sourceId === source.id);

            if (firstModel) {
                this.switchToModel(firstModel);
            } else {
                console.warn('No models found for source:', source.name);
            }
        },

        // Switch to a different model
        switchToModel(model) {
            this.activeModel = model;
            this.currentData = model.data;

            // Update columns from the model's data
            if (this.currentData && this.currentData.length > 0) {
                this.columns = Object.keys(this.currentData[0]);
            } else {
                this.columns = [];
            }

            console.log('Switched to model:', model.name);
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
        }
    }
}
