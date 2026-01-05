/**
 * Dialog Manager Module
 *
 * Handles dialog state management, opening, closing, and dirty checking
 *
 * Dependencies: None (pure state management)
 */

/**
 * Create dialog manager methods for Alpine component
 * @returns {Object} Dialog manager methods
 */
export function createDialogManager() {
  return {
    /**
     * Get serializable state for a dialog (for dirty checking)
     */
    getDialogState(dialog) {
      switch (dialog) {
        case 'filter':
          return this.filterExpression;
        case 'derive':
          return this.deriveDialogState;
        case 'rename':
          return this.renameDialogState;
        case 'aggregate':
          return this.aggregateDialogState;
        case 'join':
          // Avoid circular ref/large object serialization for models
          return {
            ...this.joinDialogState,
            rightModel: this.joinDialogState.rightModel?.id,
            availableTargets: null, // Don't track this, it's static for the session
          };
        case 'fold':
          return this.foldDialogState;
        case 'sort':
          return this.sortDialogState;
        case 'remove':
          return this.removedColumns;
        case 'select':
          return {
            cols: this.selectedColumns,
            pattern: this.selectPatternText,
            mode: this.selectPatternMode,
            type: this.selectPatternMatchType,
          };
        case 'replace':
          return this.replaceDialogState;
        case 'split':
          return this.splitDialogState;
        default:
          return null;
      }
    },

    /**
     * Open a dialog and initialize its state
     */
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
      } else if (dialogName === 'replace') {
        this.replaceDialogState = {
          column: this.columns[0] || '',
          findValue: '',
          replaceValue: '',
        };
      } else if (dialogName === 'split') {
        this.splitDialogState = {
          column: this.columns[0] || '',
          delimiter: ',',
          isRegex: false,
          mode: 'spread',
          maxColumns: 10,
          keepOriginal: false,
          error: null,
          previewData: [],
          previewColumns: [],
          autoDetectedDelimiter: null,
          columnRenames: {},
        };
        // Trigger delimiter detection and preview
        if (this.columns.length > 0) {
          this.$nextTick(() => {
            const detected = this.detectDelimiter(this.splitDialogState.column);
            if (detected) {
              this.splitDialogState.delimiter = detected.char;
              this.splitDialogState.isRegex = detected.isRegex;
              this.splitDialogState.autoDetectedDelimiter = detected.name;
            }
            this.updateSplitPreview();
          });
        }
      }

      this.clearColumnSelection();

      // Capture snapshot for dirty checking
      this.dialogSnapshot = JSON.stringify(this.getDialogState(dialogName));
    },

    /**
     * Check if dialog has unsaved changes
     */
    hasUnsavedChanges() {
      if (!this.activeDialog) return false;
      const currentState = JSON.stringify(this.getDialogState(this.activeDialog));
      return currentState !== this.dialogSnapshot;
    },

    /**
     * Close dialog with optional dirty check
     */
    closeDialog(force = false) {
      if (!force && this.hasUnsavedChanges()) {
        if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
          return;
        }
      }

      this.activeDialog = null;
      this.dialogSnapshot = null;

      // Reset shared/complex states
      this.aggregateDialogState = {
        groupBy: [],
        aggregations: [],
        previewData: null,
        previewError: null,
        isPreviewing: false,
      };

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

      // Reset fold dialog state
      this.foldDialogState = {
        keyName: 'key',
        valueName: 'value',
        selectedColumns: this.columns ? this.columns.map(() => false) : [],
      };

      // Reset split dialog state
      this.splitDialogState = {
        column: '',
        delimiter: ',',
        isRegex: false,
        mode: 'spread',
        maxColumns: 10,
        keepOriginal: false,
        error: null,
        previewData: [],
        previewColumns: [],
        autoDetectedDelimiter: null,
        columnRenames: {},
      };
    },
  };
}
