/**
 * Model Manager Module
 *
 * Handles source and model CRUD operations, switching, and template loading
 *
 * Dependencies:
 * - SchemaEngine
 * - autoSave, clearAllData from storage.js
 */

/**
 * Create model manager methods for Alpine component
 * @returns {Object} Model manager methods
 */
export function createModelManager() {
  return {
    /**
     * Load HTML templates from separate files
     */
    async loadTemplates() {
      const templates = [
        { id: 'join-modal-container', url: 'templates/join-modal.html' },
        { id: 'aggregate-modal-container', url: 'templates/aggregate-modal.html' },
        { id: 'import-csv-modal-container', url: 'templates/import-csv-modal.html' },
        { id: 'select-columns-modal-container', url: 'templates/select-columns-modal.html' },
        { id: 'split-modal-container', url: 'templates/split-column-modal.html' },
        { id: 'unpivot-modal-container', url: 'templates/unpivot-modal.html' },
        { id: 'replace-modal-container', url: 'templates/replace-modal.html' },
        { id: 'remove-modal-container', url: 'templates/remove-modal.html' },
        { id: 'rename-modal-container', url: 'templates/rename-modal.html' },
        { id: 'sort-modal-container', url: 'templates/sort-modal.html' },
        { id: 'derive-modal-container', url: 'templates/derive-modal.html' },
        { id: 'filter-modal-container', url: 'templates/filter-modal.html' },
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

    /**
     * Switch to a source (shows dataset info view)
     */
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

    /**
     * Switch to a different model
     */
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

    /**
     * Create a new model from a source
     */
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

    /**
     * Create new model from currently active model's source
     */
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

    /**
     * Copy current model (with all transforms)
     */
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

    /**
     * Rename current model
     */
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

    /**
     * Delete current model
     */
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

    /**
     * Rename source
     */
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

    /**
     * Delete source and all its models
     */
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

    /**
     * Clear all data (for debugging)
     */
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
  };
}
