/**
 * Interaction Handlers Module
 *
 * Handles UI interactions: clicks, cell selection, toolbar positioning, quick actions
 *
 * Dependencies:
 * - SchemaEngine
 */

/**
 * Create interaction handler methods for Alpine component
 * @returns {Object} Interaction handler methods
 */
export function createInteractionHandlers() {
  return {
    /**
     * Handle body click to close menus/toolbars
     */
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

    /**
     * Open type menu for a column
     */
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

    /**
     * Change column type (creates a types transform step)
     */
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

    /**
     * Auto-detect schema for all columns
     */
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

    /**
     * Update toolbar positions based on selected column/cell
     */
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

    /**
     * Select a data cell
     */
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

    /**
     * Apply quick cell filter (keep/exclude value)
     */
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

    /**
     * Quick sort from column toolbar
     */
    async quickSort(order) {
      if (!this.selectedColumn) return;

      this.sortDialogState.field = this.selectedColumn;
      this.sortDialogState.order = order;
      await this.applySortTransform();
      this.selectedColumn = null;
    },

    /**
     * Quick filter from column toolbar (opens filter dialog pre-filled)
     */
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

    /**
     * Quick rename from column toolbar (opens rename dialog focused on column)
     */
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

    /**
     * Quick remove column from toolbar
     */
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
  };
}
