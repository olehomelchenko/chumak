/**
 * Import Handlers Module
 *
 * Handles all data import functionality (CSV files, drag-drop, clipboard paste)
 *
 * Dependencies:
 * - Papa Parse (global window.Papa)
 * - SchemaEngine
 * - autoSave from storage.js
 */

/**
 * Create import handler methods for Alpine component
 * @returns {Object} Import handler methods
 */
export function createImportHandlers() {
  return {
    /**
     * Handle file selection from input
     */
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.showImportDialog(file);

      // Reset file input
      event.target.value = '';
    },

    /**
     * Handle file drop
     */
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

    /**
     * Show import configuration dialog
     */
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

    /**
     * CSV import: Step 2 - Confirm and create Source
     */
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

    /**
     * Create Source and default Model
     */
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
  };
}
