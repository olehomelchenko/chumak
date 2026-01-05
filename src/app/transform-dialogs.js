/**
 * Transform Dialogs Module
 *
 * Handles all transform dialog logic and transform application
 *
 * Dependencies:
 * - Arquero (global window.aq)
 * - Expression parser (parseExpression, validateAST, formatError)
 * - Transforms (applyTransform, describeTransform, matchColumnPattern)
 * - SchemaEngine
 * - autoSave from storage.js
 */

/**
 * Create transform dialog handler methods for Alpine component
 * @returns {Object} Transform dialog handler methods
 */
export function createTransformDialogs() {
  return {
    /**
     * Get model metadata for display
     */
    getModelMeta(model) {
      if (!model) return '';
      const rowCount = model.data ? model.data.length : 0;
      const colCount = model.schema
        ? model.schema.length
        : model.data && model.data.length > 0
          ? Object.keys(model.data[0]).length
          : 0;
      const stepsCount = Math.max(0, (model.steps ? model.steps.length : 0) - 1);
      const stepsText = stepsCount === 1 ? '1 step' : `${stepsCount} steps`;

      return `${rowCount.toLocaleString()} x ${colCount} • ${stepsText}`;
    },

    /**
     * Describe a transform in human-readable format
     */
    describeTransform(transform) {
      return describeTransform(transform);
    },

    /**
     * Select all columns in select dialog
     */
    selectAllColumns() {
      this.selectedColumns = this.columns.map(() => true);
    },

    /**
     * Deselect all columns in select dialog
     */
    selectNoColumns() {
      this.selectedColumns = this.columns.map(() => false);
    },

    /**
     * Get list of selected column names
     */
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

    /**
     * Apply transform step result to model
     * Handles both new steps and editing existing steps
     * Uses TransformResult contract to ensure schema/columns/data stay in sync
     *
     * @param {Object} transform - Transform specification
     * @param {Object|Array} resultTable - Arquero table or plain array with result data
     * @param {boolean} closeDialogAfter - Whether to close the dialog after applying (default: true)
     */
    async applyStepResult(transform, resultTable, closeDialogAfter = true) {
      // Check if we're editing an existing step
      if (this.editingStepIndex !== null) {
        await this.updateStep(this.editingStepIndex, transform);
        this.closeDialog(true);
        return;
      }

      // Update model steps (add new step)
      this.activeModel.steps.push(transform);

      // Use TransformResult contract for consistent schema derivation
      // This ensures sample data is always provided for type inference
      let result;
      if (Array.isArray(resultTable)) {
        // Plain array (e.g., pass-through types transform)
        result = TransformResult.createFromData(resultTable, this.activeModel.schema, transform);
      } else {
        // Arquero table
        result = TransformResult.create(resultTable, this.activeModel.schema, transform);
      }

      // Update state from contract result
      this.currentData = result.data;
      this.activeModel.schema = result.schema;
      this.columns = result.columns;

      // Update the model's data
      this.activeModel.data = JSON.parse(JSON.stringify(result.data));

      // Validate result
      const validation = TransformResult.validate(result);
      if (!validation.valid) {
        console.warn('applyStepResult: Result validation warnings', validation.errors);
      }

      // Update pagination
      this.updatePagination();

      // Auto-save to IndexedDB
      await autoSave(this.sources, this.models);

      // Close dialog (optionally)
      if (closeDialogAfter) {
        this.closeDialog(true);
      }
    },

    /**
     * Get column type from schema
     * Uses getActiveSchema() to handle intermediate view state correctly
     */
    getColumnType(colName) {
      // Use getActiveSchema() to get correct schema (intermediate or final)
      const schema = this.getActiveSchema ? this.getActiveSchema() : this.activeModel?.schema;
      if (schema) {
        const col = schema.find((c) => c.name === colName);
        if (col) return col.type;
      }
      if (this.activeSource?.columns) {
        const col = this.activeSource.columns.find((c) => c.name === colName);
        if (col) return col.type || col.inferredType;
      }
      return 'string';
    },

    /**
     * Get type indicator icon for column
     */
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

    /**
     * Apply select transform
     */
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

    /**
     * Validate filter expression as user types
     */
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

    /**
     * Apply filter transform
     */
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

    /**
     * Validate derive expression as user types
     */
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

    /**
     * Apply derive transform
     */
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

    /**
     * Apply sort transform
     */
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

    /**
     * Apply rename transform
     */
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

    /**
     * Apply remove transform
     */
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

    /**
     * Apply fold (unpivot) transform
     */
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

    // ============================================================
    // Aggregate Dialog Methods
    // ============================================================

    /**
     * Add new aggregation to aggregate dialog
     */
    addAggregation() {
      this.aggregateDialogState.aggregations.push({ output: '', func: 'mean', col: '' });
    },

    /**
     * Remove aggregation from aggregate dialog
     */
    removeAggregation(index) {
      this.aggregateDialogState.aggregations.splice(index, 1);
    },

    /**
     * Auto-generate output name for aggregation
     */
    updateAggregateOutputName(index) {
      const agg = this.aggregateDialogState.aggregations[index];
      if (agg.func === 'count') {
        agg.output = 'count';
      } else if (agg.col) {
        agg.output = `${agg.func}_${agg.col}`;
      }
    },

    /**
     * Construct aggregate transform step from dialog state
     */
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

    /**
     * Preview aggregate results
     */
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

    /**
     * Apply aggregate transform
     */
    async applyAggregateTransform() {
      try {
        const step = this.constructAggregateStep();

        const table = aq.from(this.currentData);
        const result = applyTransform(table, step, this.columns);

        await this.applyStepResult(step, result);
      } catch (error) {
        alert(error.message);
      }
    },

    // ============================================================
    // Join Transform Methods
    // ============================================================

    /**
     * Initialize join dialog with available targets
     */
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

    /**
     * Get columns for a join target (model or source)
     */
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

    /**
     * Handle join target change
     */
    onJoinTargetChange() {
      // Update right columns when target changes
      this.joinDialogState.rightColumns = this.getColumnsForTarget(this.joinDialogState.rightModel);
      // Reset key pairs
      this.joinDialogState.keyPairs = [[null, null]];
      // Clear preview
      this.joinDialogState.previewData = null;
      this.joinDialogState.previewError = null;
    },

    /**
     * Add join key pair
     */
    addJoinKeyPair() {
      this.joinDialogState.keyPairs.push([null, null]);
    },

    /**
     * Remove join key pair
     */
    removeJoinKeyPair(index) {
      if (this.joinDialogState.keyPairs.length > 1) {
        this.joinDialogState.keyPairs.splice(index, 1);
      }
    },

    /**
     * Preview join results
     */
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

    /**
     * Apply join transform
     */
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

    /**
     * Apply replace transform
     */
    async applyReplaceTransform() {
      const { column, findValue, replaceValue } = this.replaceDialogState;

      if (!column) {
        alert('Please select a column');
        return;
      }

      if (findValue === undefined || findValue === null) {
        if (!confirm('Replace null/empty values?')) {
          return;
        }
      }

      try {
        const transform = {
          replace: {
            column: column,
            find: findValue,
            replace: replaceValue === '' ? null : replaceValue,
          },
        };

        const table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        await this.applyStepResult(transform, result);
      } catch (error) {
        console.error('Replace transform error:', error);
        alert('Error applying replace: ' + error.message);
      }
    },

    /**
     * Detect common delimiter in column based on frequency and consistency analysis
     */
    detectDelimiter(column) {
      if (!column || !this.currentData || this.currentData.length === 0) {
        return null;
      }

      // Common delimiters to check (ordered by typical priority)
      const delimiters = [
        { char: ',', name: 'Comma', isRegex: false },
        { char: ';', name: 'Semicolon', isRegex: false },
        { char: '|', name: 'Pipe', isRegex: false },
        { char: '/', name: 'Forward Slash', isRegex: false },
        { char: '-', name: 'Hyphen', isRegex: false },
        { char: '@', name: '@ Sign', isRegex: false },
        { char: '\t', name: 'Tab', isRegex: false },
        { char: '\\s+', name: 'Whitespace', isRegex: true },
        { char: '\\', name: 'Backslash', isRegex: false },
      ];

      // Sample first 100 rows (sufficient for detection, faster than 1000)
      const sampleSize = Math.min(100, this.currentData.length);
      const sample = this.currentData.slice(0, sampleSize);

      // Count occurrences and consistency (how many rows contain the delimiter)
      const counts = delimiters.map((delim) => {
        let totalOccurrences = 0;
        let rowsWithDelimiter = 0;

        sample.forEach((row) => {
          const value = row[column];
          if (value != null) {
            const str = String(value);
            let matches;
            if (delim.isRegex) {
              matches = str.match(new RegExp(delim.char, 'g'));
            } else {
              matches = str.match(
                new RegExp(delim.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
              );
            }
            if (matches && matches.length > 0) {
              totalOccurrences += matches.length;
              rowsWithDelimiter++;
            }
          }
        });

        // Calculate consistency: percentage of rows that contain this delimiter
        const consistency = sampleSize > 0 ? rowsWithDelimiter / sampleSize : 0;

        // Score: balance between frequency and consistency
        // High consistency is more important than raw count
        const score = consistency * (totalOccurrences / Math.max(sampleSize, 1));

        return { ...delim, count: totalOccurrences, rowsWithDelimiter, consistency, score };
      });

      // Filter to delimiters that appear in at least 5% of rows (more lenient for small datasets)
      // Also require at least 2 rows to have the delimiter (avoids single-row anomalies)
      const threshold = Math.max(2, sampleSize * 0.05);
      const validDelimiters = counts
        .filter((d) => d.rowsWithDelimiter >= threshold)
        .sort((a, b) => {
          // Sort by consistency first, then by count as tiebreaker
          if (Math.abs(a.consistency - b.consistency) > 0.1) {
            return b.consistency - a.consistency;
          }
          return b.count - a.count;
        });

      return validDelimiters.length > 0 ? validDelimiters[0] : null;
    },

    /**
     * Debounced split preview update (150ms delay)
     * Avoids expensive preview recalculation when rapidly changing settings
     */
    debouncedUpdateSplitPreview() {
      // Clear any pending update
      if (this.splitDialogState._previewDebounceTimer) {
        clearTimeout(this.splitDialogState._previewDebounceTimer);
      }

      // Schedule update after 150ms
      this.splitDialogState._previewDebounceTimer = setTimeout(() => {
        this.updateSplitPreview();
        this.splitDialogState._previewDebounceTimer = null;
      }, 150);
    },

    /**
     * Update split preview when settings change
     */
    updateSplitPreview() {
      const { column, delimiter, mode, maxColumns, keepOriginal, isRegex } = this.splitDialogState;

      // Clear previous state
      this.splitDialogState.error = null;
      this.splitDialogState.previewData = [];
      this.splitDialogState.previewColumns = [];
      // Keep columnRenames but they'll be initialized for new columns below

      if (!column || !delimiter) {
        return;
      }

      try {
        // Validate regex if in regex mode
        if (isRegex) {
          new RegExp(delimiter); // Test regex validity
        }

        // Build transform
        const transform = {
          split: {
            column,
            delimiter,
            isRegex,
            mode,
            maxColumns: mode === 'firstN' || mode === 'lastN' ? maxColumns : undefined,
            keepOriginal,
          },
        };

        // Apply to first 50 rows
        const previewRows = this.currentData.slice(0, 50);
        const table = aq.from(previewRows);
        const context = { sources: this.sources, models: this.models };
        const result = applyTransform(table, transform, this.columns, context);

        // Get result data
        const resultData = result.objects();
        const resultColumns = result.columnNames();

        // Filter to show only relevant columns: input + output
        const previewColumns = [];

        // Always show the input column first (with removed status if not keeping)
        if (keepOriginal || !resultColumns.includes(column)) {
          // Column is either kept or removed (show it either way)
          previewColumns.push({
            name: column,
            status: keepOriginal ? 'unchanged' : 'removed',
          });

          // If removed, add the original data back to preview rows
          if (!keepOriginal) {
            resultData.forEach((row, idx) => {
              row[column] = previewRows[idx][column];
            });
          }
        }

        // Add all new split columns
        resultColumns.forEach((name) => {
          if (name.startsWith(`${column}_`)) {
            previewColumns.push({ name, status: 'new' });
            // Initialize rename mapping if not already set
            if (!this.splitDialogState.columnRenames[name]) {
              this.splitDialogState.columnRenames[name] = name;
            }
          }
        });

        this.splitDialogState.previewData = resultData;
        this.splitDialogState.previewColumns = previewColumns;
      } catch (error) {
        this.splitDialogState.error = error.message;
      }
    },

    /**
     * Apply split transform
     * Generates up to 3 separate steps:
     * 1. Split - the actual column split
     * 2. Rename (optional) - if user provided custom column names
     * 3. Types - auto-detect types for newly created columns
     */
    async applySplitTransform() {
      const { column, delimiter, mode, maxColumns, keepOriginal, isRegex, columnRenames } =
        this.splitDialogState;

      if (!column) {
        alert('Please select a column');
        return;
      }

      if (!delimiter) {
        alert('Please enter a delimiter');
        return;
      }

      try {
        // Step 1: Apply split transform (without inline renames)
        const splitTransform = {
          split: {
            column,
            delimiter,
            isRegex,
            mode,
            maxColumns: mode === 'firstN' || mode === 'lastN' ? maxColumns : undefined,
            keepOriginal,
            // Do not include renames - will be a separate step
          },
        };

        let table = aq.from(this.currentData);
        const context = { sources: this.sources, models: this.models };
        let result = applyTransform(table, splitTransform, this.columns, context);

        // Determine if we have more steps coming (rename and/or types)
        const actualRenames = {};
        for (const [oldName, newName] of Object.entries(columnRenames)) {
          if (oldName !== newName && newName && newName.trim() !== '') {
            actualRenames[oldName] = newName.trim();
          }
        }
        const hasRenameStep = Object.keys(actualRenames).length > 0;

        // Get the new column names created by split
        const newColumns = result.columnNames().filter((name) => name.startsWith(`${column}_`));
        const hasTypesStep = newColumns.length > 0;

        // Apply split step (don't close dialog if more steps coming)
        await this.applyStepResult(splitTransform, result, !hasRenameStep && !hasTypesStep);

        // Step 2: Apply rename transform (if user provided custom names)
        if (hasRenameStep) {
          const renameTransform = { rename: actualRenames };
          table = aq.from(this.currentData); // Get fresh data after split
          result = applyTransform(table, renameTransform, this.columns, context);
          await this.applyStepResult(renameTransform, result, !hasTypesStep);
        }

        // Step 3: Apply types transform for auto-detection on new columns
        // Determine final column names (after potential rename)
        const finalNewColumns = newColumns.map((name) => actualRenames[name] || name);

        if (finalNewColumns.length > 0) {
          // Infer types for new columns from current data
          const typeSpecs = {};
          for (const colName of finalNewColumns) {
            const sampleValues = this.currentData.slice(0, 100).map((row) => row[colName]);
            const inferredType = SchemaEngine.inferType(sampleValues);
            typeSpecs[colName] = inferredType;
          }

          const typesTransform = { types: typeSpecs };
          // Types is a pass-through transform, current data unchanged
          // This is the last step, so close the dialog
          await this.applyStepResult(typesTransform, this.currentData, true);
        }
      } catch (error) {
        console.error('Split transform error:', error);
        alert('Error applying split: ' + error.message);
      }
    },
  };
}
