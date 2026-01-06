/**
 * Step Manager Module
 *
 * Handles step navigation, viewing, editing, and removal
 *
 * Dependencies:
 * - Arquero (global window.aq)
 * - SchemaEngine
 * - Transforms (applyTransform, describeTransform)
 * - autoSave from storage.js
 * - perfLogger from performance-logger.js
 */

/**
 * Create step manager methods for Alpine component
 * @returns {Object} Step manager methods
 */
export function createStepManager() {
  return {
    /**
     * Schema for the intermediate step being viewed (not the final model schema)
     * This prevents corrupting activeModel.schema when viewing intermediate steps
     * @type {Array|null}
     */
    viewingSchema: null,

    /**
     * Get the currently active schema (intermediate or final)
     * Use this instead of directly accessing activeModel.schema
     * @returns {Array} Current schema array
     */
    getActiveSchema() {
      if (this.viewingIntermediate && this.viewingSchema) {
        return this.viewingSchema;
      }
      return this.activeModel?.schema || [];
    },
    /**
     * Compute data state for a model up to a specific step index
     * Uses TransformResult contract to ensure schema/columns/data stay in sync
     *
     * @param {Object} model - Model to compute
     * @param {number} stepIndex - Step to compute up to (inclusive)
     * @returns {Object} { data: Array, schema: Array, columns: Array }
     */
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

          // Use TransformResult contract to derive schema with sample data
          // This centralizes schema derivation and ensures sample data is always provided
          const stepResult = TransformResult.create(table, schema, step);
          schema = stepResult.schema;
          columns = stepResult.columns;

          // Note: We keep `table` as an Arquero table for efficient chaining
          // and only extract objects at the end
        } catch (error) {
          console.error(`Error applying step ${i}:`, error);
          // Enhance error with step information
          const stepDescription = describeTransform(step);
          const enhancedError = new Error(
            `Step ${i + 1} failed: ${stepDescription}\n\n${error.message}`
          );
          enhancedError.stepIndex = i;
          enhancedError.stepDescription = stepDescription;
          throw enhancedError;
        }
      }

      const result = {
        data: table.objects(),
        schema: schema,
        columns: columns,
      };

      // Validate result using contract
      const validation = TransformResult.validate(result);
      if (!validation.valid) {
        console.warn('computeModelUpToStep: Result validation warnings', validation.errors);
      }

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
        // Store intermediate schema separately - DO NOT overwrite activeModel.schema
        // This prevents schema corruption when dialogs use the schema during intermediate view
        this.viewingSchema = result.schema;
        this.activeStepIndex = stepIndex;
        this.viewingIntermediate = true;

        // Update pagination
        this.updatePagination();

        console.log(`Viewing step ${stepIndex + 1}:`, result.data.length, 'rows');
      } catch (error) {
        console.error('Error computing step:', error);
        this.showError('Error viewing step', `Step ${stepIndex + 1}: ${error.message}`, {
          stepIndex: error.stepIndex ?? stepIndex,
          stepDescription: error.stepDescription,
        });
      }
    },

    /**
     * Return to viewing final result
     */
    viewFinalResult() {
      if (!this.activeModel) return;

      this.currentData = this.activeModel.data;

      // Get columns from model schema (source of truth)
      if (this.activeModel.schema && this.activeModel.schema.length > 0) {
        this.columns = this.activeModel.schema.map((c) => c.name);
      } else if (this.currentData && this.currentData.length > 0) {
        this.columns = Object.keys(this.currentData[0]);
      } else {
        this.columns = [];
      }

      this.activeStepIndex = null;
      this.viewingIntermediate = false;
      this.viewingSchema = null; // Clear intermediate schema

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
        this.showWarning(
          'Cannot remove import step',
          'The import step is required and cannot be removed.'
        );
        return;
      }

      // Confirm deletion
      const step = this.activeModel.steps[stepIndex];
      const description = describeTransform(step);

      if (!confirm(`Remove step "${description}"?\n\nThis cannot be undone.`)) {
        return;
      }

      await this.startTransformation('Removing step...');

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
        this.showError('Error recomputing after removal', error.message, {
          stepIndex: error.stepIndex,
          stepDescription: error.stepDescription,
        });
      } finally {
        this.endTransformation();
      }
    },

    /**
     * Edit an existing step (opens dialog with pre-filled state)
     * @param {number} stepIndex - Index of step to edit
     */
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
      } else if (step.replace) {
        // Open dialog first (this initializes the state)
        this.openDialog('replace');

        // Then override with the step's values
        this.replaceDialogState = {
          column: step.replace.column,
          findValue: step.replace.find,
          replaceValue: step.replace.replace === null ? '' : step.replace.replace,
        };
      } else {
        this.showWarning('Cannot edit step', 'Editing this step type is not yet supported.');
        this.editingStepIndex = null;
      }
    },

    /**
     * Update an existing step and recompute pipeline
     * @param {number} stepIndex - Index of step to update
     * @param {Object} newTransform - New transform specification
     */
    async updateStep(stepIndex, newTransform) {
      // Backup current state for rollback
      const backup = {
        steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
        data: JSON.parse(JSON.stringify(this.activeModel.data)),
        schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
      };

      await this.startTransformation('Updating step...');

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

        this.showError('Error updating step', `${error.message}\n\nChanges have been reverted.`, {
          stepIndex: error.stepIndex ?? stepIndex,
          stepDescription: error.stepDescription,
        });
      } finally {
        this.endTransformation();
      }
    },
  };
}
