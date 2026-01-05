/**
 * EDA (Exploratory Data Analysis) Handlers Module
 *
 * Handles column selection, statistical analysis, and chart rendering
 *
 * Dependencies:
 * - EDAEngine
 * - ChartsEngine
 * - SchemaEngine
 */

/**
 * Create EDA handler methods for Alpine component
 * @returns {Object} EDA handler methods
 */
export function createEdaHandlers() {
  return {
    /**
     * Select a column for EDA analysis
     * Calculates stats and renders appropriate charts
     */
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

    /**
     * Select an EDA statistic value (from summary panel)
     * Shows cell toolbar for the stat value
     */
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

    /**
     * Switch between chart views (boxplot/histogram)
     */
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

    /**
     * Handle brush selection on histogram
     */
    handleBrushSelection(selection) {
      this.edaBrushSelection = selection;
    },

    /**
     * Apply filter based on histogram brush selection
     */
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

    /**
     * Clear column selection and EDA state
     */
    clearColumnSelection() {
      this.selectedColumn = null;
      this.selectedCell = null;
      this.edaStats = null;
      this.edaBrushSelection = null;
    },
  };
}
