/**
 * JSON Editor Module
 *
 * Handles editable raw JSON view with danger zone UI and rollback capability
 *
 * Dependencies:
 * - autoSave from storage.js
 * - Transforms (applyTransform, describeTransform)
 * - TransformResult from transform-result.js
 * - SchemaEngine
 */

/**
 * Create JSON editor methods for Alpine component
 * @returns {Object} JSON editor methods
 */
export function createJsonEditor() {
  return {
    /**
     * Whether JSON editing mode is active
     * @type {boolean}
     */
    jsonEditMode: false,

    /**
     * Raw JSON text being edited
     * @type {string}
     */
    jsonEditContent: '',

    /**
     * JSON parsing/validation error message
     * @type {string|null}
     */
    jsonEditError: null,

    /**
     * Backup of steps before editing (for rollback)
     * @type {Array|null}
     */
    jsonEditBackup: null,

    /**
     * Get the current JSON representation of steps
     * @returns {string} Formatted JSON string
     */
    getStepsJson() {
      if (!this.activeModel?.steps) return '';
      return JSON.stringify({ transforms: this.activeModel.steps }, null, 2);
    },

    /**
     * Enter JSON editing mode
     */
    enterJsonEditMode() {
      if (!this.activeModel?.steps) return;

      // Backup current state
      this.jsonEditBackup = JSON.parse(JSON.stringify(this.activeModel.steps));
      this.jsonEditContent = this.getStepsJson();
      this.jsonEditError = null;
      this.jsonEditMode = true;
    },

    /**
     * Cancel JSON editing and restore original state
     */
    cancelJsonEdit() {
      this.jsonEditMode = false;
      this.jsonEditContent = '';
      this.jsonEditError = null;
      this.jsonEditBackup = null;
    },

    /**
     * Validate JSON without applying
     * @returns {boolean} True if JSON is valid
     */
    validateJsonEdit() {
      try {
        const parsed = JSON.parse(this.jsonEditContent);

        // Check structure
        if (!parsed.transforms || !Array.isArray(parsed.transforms)) {
          this.jsonEditError = 'Invalid structure: Expected { "transforms": [...] }';
          return false;
        }

        // Check for required import step
        if (parsed.transforms.length === 0) {
          this.jsonEditError = 'At least one step (import) is required';
          return false;
        }

        if (!parsed.transforms[0].import) {
          this.jsonEditError = 'First step must be an import step';
          return false;
        }

        this.jsonEditError = null;
        return true;
      } catch (error) {
        this.jsonEditError = `JSON syntax error: ${error.message}`;
        return false;
      }
    },

    /**
     * Apply edited JSON to the model
     * @returns {Promise<boolean>} True if successful
     */
    async applyJsonEdit() {
      // Validate first
      if (!this.validateJsonEdit()) {
        return false;
      }

      const parsed = JSON.parse(this.jsonEditContent);
      const newSteps = parsed.transforms;

      // Backup current model state for rollback
      const backup = {
        steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
        data: JSON.parse(JSON.stringify(this.activeModel.data)),
        schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
      };

      try {
        // Apply new steps
        this.activeModel.steps = newSteps;
        this.activeModel.steps = [...this.activeModel.steps]; // Trigger reactivity

        // Recompute the pipeline
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

        // Exit edit mode
        this.jsonEditMode = false;
        this.jsonEditContent = '';
        this.jsonEditError = null;
        this.jsonEditBackup = null;

        // Show success notification
        this.showSuccess('JSON changes applied successfully');

        return true;
      } catch (error) {
        console.error('Error applying JSON edit:', error);

        // Rollback to backup state
        this.activeModel.steps = backup.steps;
        this.activeModel.data = backup.data;
        this.activeModel.schema = backup.schema;
        this.currentData = this.activeModel.data;
        this.columns = this.activeModel.schema.map((c) => c.name);

        // Show detailed error with step info if available
        const errorMatch = error.message.match(/step (\d+)/i);
        let stepIndex = null;
        let stepDescription = null;

        if (errorMatch) {
          stepIndex = parseInt(errorMatch[1], 10);
          if (newSteps[stepIndex]) {
            stepDescription = describeTransform(newSteps[stepIndex]);
          }
        }

        this.showError(
          'Failed to apply JSON changes',
          `${error.message}\n\nChanges have been reverted.`,
          {
            stepIndex,
            stepDescription,
          }
        );

        // Keep edit mode open so user can fix the error
        this.jsonEditError = error.message;
        return false;
      }
    },
  };
}
