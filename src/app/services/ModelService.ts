import { AppStore } from '../stores/AppStore';
import { Source, Model } from '../types';
import { SchemaEngine } from '../../core/schema-engine';
import { PersistenceService } from './PersistenceService';

/**
 * ModelService
 *
 * Handles business logic for sources and models, updating the AppStore.
 * Replaces logic previously found in model-handlers.ts.
 */
export class ModelService {
  /**
   * Switches the active view to a specific source
   */
  static switchToSource(source: Source, clearColumnSelection: () => void) {
    AppStore.activeSource.value = source;
    AppStore.activeModel.value = null;
    AppStore.currentData.value = source.data;
    AppStore.columns.value = source.columns.map((c) => c.name);
    AppStore.viewMode.value = 'dataset-info';
    AppStore.activeStepIndex.value = null;
    AppStore.viewingIntermediate.value = false;
    clearColumnSelection();
  }

  /**
   * Switches the active view to a specific model
   */
  static switchToModel(
    model: Model,
    clearColumnSelection: () => void,
    updatePagination: () => void,
    ribbonTab: string,
    setRibbonTab: (tab: string) => void
  ) {
    AppStore.activeSource.value = null;
    AppStore.activeModel.value = model;

    // Ensure schema exists
    if (model.data && model.data.length > 0 && (!model.schema || model.schema.length === 0)) {
      model.schema = SchemaEngine.createInitialSchema(model.data);
    }

    AppStore.currentData.value = model.data;
    AppStore.viewMode.value = 'model';
    AppStore.activeStepIndex.value = model.steps?.length > 0 ? model.steps.length - 1 : null;
    AppStore.viewingIntermediate.value = false;

    clearColumnSelection();

    if (ribbonTab === 'data' || !ribbonTab) {
      setRibbonTab('prepare');
    }

    if (AppStore.currentData.value && AppStore.currentData.value.length > 0) {
      AppStore.columns.value = model.schema
        ? model.schema.map((c) => c.name)
        : Object.keys(AppStore.currentData.value[0]);
    } else {
      AppStore.columns.value = [];
    }

    updatePagination();
  }

  /**
   * Creates a new model for a source
   */
  static async createNewModel(
    source: Source,
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    const defaultName = `model_${AppStore.models.value.filter((m) => m.sourceId === source.id).length + 1}`;
    const modelName = await prompt('Enter name for new model:', defaultName);

    if (!modelName || modelName.trim() === '') return;

    const name = modelName.trim();
    const existingModel = AppStore.models.value.find(
      (m) => m.sourceId === source.id && m.name.toLowerCase() === name.toLowerCase()
    );

    if (existingModel) {
      await alert('A model with this name already exists for this source.');
      return;
    }

    const newModel: Model = {
      id: `mdl_${Date.now()}`,
      name: name,
      sourceId: source.id,
      steps: [],
      schema: JSON.parse(JSON.stringify(source.columns)),
      data: JSON.parse(JSON.stringify(source.data)),
    };

    // Add initial steps
    const importStep = {
      import: {
        source: source.name,
        fileName: source.fileName,
        delimiter: source.delimiter,
        headerMode: source.headerMode,
      },
    } as any;
    if (source.customHeaders) importStep.import.customHeaders = source.customHeaders;
    newModel.steps.push(importStep);

    const typesStep = { types: {} as any };
    source.columns.forEach((col) => {
      typesStep.types[col.name] = col.type;
    });
    newModel.steps.push(typesStep);

    AppStore.models.value = [...AppStore.models.value, newModel];
    switchToModelFn(newModel);

    await PersistenceService.autoSave();
  }

  /**
   * Copies the current model
   */
  static async copyCurrentModel(
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert('No active model selected');
      return;
    }

    const newName = await prompt('Enter name for copied model:', `${activeModel.name}_copy`);
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();

    const existingModel = AppStore.models.value.find(
      (m) => m.sourceId === activeModel.sourceId && m.name.toLowerCase() === name.toLowerCase()
    );

    if (existingModel) {
      await alert('A model with this name already exists for this source.');
      return;
    }

    const copiedModel: Model = {
      id: `mdl_${Date.now()}`,
      name: name,
      sourceId: activeModel.sourceId,
      steps: JSON.parse(JSON.stringify(activeModel.steps)),
      schema: activeModel.schema ? JSON.parse(JSON.stringify(activeModel.schema)) : [],
      data: JSON.parse(JSON.stringify(activeModel.data)),
    };

    AppStore.models.value = [...AppStore.models.value, copiedModel];
    switchToModelFn(copiedModel);
    await PersistenceService.autoSave();
  }

  /**
   * Renames the current model
   */
  static async renameCurrentModel(
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>
  ) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert('No active model selected');
      return;
    }

    const newName = await prompt('Enter new name for model:', activeModel.name);
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();
    if (name === activeModel.name) return;

    const existingModel = AppStore.models.value.find(
      (m) => m.sourceId === activeModel.sourceId && m.name.toLowerCase() === name.toLowerCase()
    );

    if (existingModel) {
      await alert('A model with this name already exists for this source.');
      return;
    }

    activeModel.name = name;
    AppStore.models.value = [...AppStore.models.value]; // Trigger reactivity
    await PersistenceService.autoSave();
  }

  /**
   * Deletes the current model
   */
  static async deleteCurrentModel(
    confirm: (msg: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert('No active model selected');
      return;
    }

    const sourceModels = AppStore.models.value.filter((m) => m.sourceId === activeModel.sourceId);
    if (sourceModels.length === 1) {
      await alert('Cannot delete the last model for this source.');
      return;
    }

    if (!(await confirm(`Delete model "${activeModel.name}"?\n\nThis cannot be undone.`))) return;

    const deletedModelId = activeModel.id;
    const sourceId = activeModel.sourceId;
    AppStore.models.value = AppStore.models.value.filter((m) => m.id !== deletedModelId);

    const remainingModels = AppStore.models.value.filter((m) => m.sourceId === sourceId);
    if (remainingModels.length > 0) {
      switchToModelFn(remainingModels[0]);
    } else {
      AppStore.activeModel.value = null;
      AppStore.currentData.value = null;
      AppStore.columns.value = [];
      AppStore.viewMode.value = 'empty';
    }

    await PersistenceService.autoSave();
  }

  /**
   * Renames a source
   */
  static async renameSource(
    source: Source,
    prompt: (msg: string, def?: string) => Promise<string | null>
  ) {
    const newName = await prompt('Enter new name for source:', source.name);
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();
    if (name === source.name) return;

    source.name = name;
    AppStore.sources.value = [...AppStore.sources.value]; // Trigger reactivity
    await PersistenceService.autoSave();
  }

  /**
   * Deletes a source and its associated models
   */
  static async deleteSource(
    source: Source,
    confirm: (msg: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>
  ) {
    const modelsCount = AppStore.models.value.filter((m) => m.sourceId === source.id).length;
    const message =
      modelsCount > 0
        ? `Delete source "${source.name}" and its ${modelsCount} model${modelsCount > 1 ? 's' : ''}? This cannot be undone.`
        : `Delete source "${source.name}"? This cannot be undone.`;

    if (!(await confirm(message))) return;

    try {
      AppStore.models.value = AppStore.models.value.filter((m) => m.sourceId !== source.id);
      AppStore.sources.value = AppStore.sources.value.filter((s) => s.id !== source.id);

      const isActiveSource = AppStore.activeSource.value?.id === source.id;
      const isPartOfActiveModel = AppStore.activeModel.value?.sourceId === source.id;

      if (isActiveSource || isPartOfActiveModel) {
        AppStore.activeSource.value = null;
        AppStore.activeModel.value = null;
        AppStore.currentData.value = null;
        AppStore.columns.value = [];
        AppStore.viewMode.value = 'empty';
      }

      await PersistenceService.autoSave();
    } catch (error: any) {
      console.error('Error deleting source:', error);
      await alert('Failed to delete source: ' + error.message);
    }
  }

  /**
   * Resets all application data
   */
  static async clearAllData(
    confirm: (msg: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>
  ) {
    return PersistenceService.clearAllData(confirm, alert);
  }
}
