import { AppStore } from '../stores/AppStore';
import { Source, Model } from '../types';
import { SchemaEngine } from '../../core/schema-engine';
import { PersistenceService } from './PersistenceService';
import { DependencyService } from './DependencyService';
import { StepService } from './StepService';
import { NameService } from './NameService';
import { showSuccess, showWarning } from '../handlers/core/notification-handlers';
import { cloneData } from '../../core/type-converter';
import { metricsCollector } from '../infrastructure/metrics';
import i18n from '../../i18n';

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
   * Shows the dataset info view for a source
   */
  static showDatasetInfo(source: Source, clearColumnSelection: () => void) {
    AppStore.activeSource.value = source;
    AppStore.activeModel.value = null;
    AppStore.viewMode.value = 'dataset-info';
    AppStore.activeStepIndex.value = null;
    AppStore.viewingIntermediate.value = false;
    clearColumnSelection();
  }

  /**
   * Shows the model info view for a model
   */
  static showModelInfo(model: Model, clearColumnSelection: () => void) {
    AppStore.activeSource.value = null;
    AppStore.activeModel.value = model;
    AppStore.viewMode.value = 'model-info';
    AppStore.activeStepIndex.value = null;
    AppStore.viewingIntermediate.value = false;
    clearColumnSelection();
  }

  /**
   * Switches the active view to a specific model.
   * If the model is stale (dependency changed), auto-recomputes it.
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

    // Auto-recompute if model is stale (a dependency changed)
    if (model.isStale && model.steps.length > 0) {
      const recomputeStart = performance.now();
      try {
        const models = AppStore.models.value;
        const sources = AppStore.sources.value;
        const context = StepService.getContext();

        // Recompute stale upstream dependencies first (topological order)
        const graph = DependencyService.buildGraph(sources, models);
        const executionOrder = DependencyService.getExecutionOrder(graph, [model.id]);

        for (const nodeId of executionOrder) {
          if (nodeId === model.id) continue; // Handle target model below
          const dep = models.find((m) => m.id === nodeId);
          if (!dep?.isStale || dep.steps.length === 0) continue;

          const depResult = StepService.computeModelUpToStep(dep, dep.steps.length - 1, context);
          dep.data = depResult.data;
          dep.schema = depResult.schema;
          DependencyService.clearStaleFlag(dep);
        }

        const result = StepService.computeModelUpToStep(model, model.steps.length - 1, context);
        model.data = result.data;
        model.schema = result.schema;
        DependencyService.clearStaleFlag(model);

        metricsCollector.record({
          transformType: 'model:recompute',
          durationMs: performance.now() - recomputeStart,
          success: true,
          metadata: { modelId: model.id },
        });

        // Trigger reactivity for models list
        AppStore.models.value = [...AppStore.models.value];
        PersistenceService.autoSave();
      } catch (error: any) {
        metricsCollector.record({
          transformType: 'model:recompute',
          durationMs: performance.now() - recomputeStart,
          success: false,
          metadata: { modelId: model.id, errorMessage: error.message },
        });
        console.error('Failed to recompute stale model:', error);
        showWarning(
          i18n.t('notifications.model.recomputeFailed', { ns: 'common', name: model.name }),
          error.message || String(error)
        );
      }
    }

    // Ensure schema exists (fallback for models that lost their schema)
    if (model.data && model.data.length > 0 && (!model.schema || model.schema.length === 0)) {
      model.schema = SchemaEngine.createLogicalSchema(model.data);
    }

    AppStore.currentData.value = model.data;
    AppStore.viewMode.value = 'model';
    AppStore.activeStepIndex.value = model.steps?.length > 0 ? model.steps.length - 1 : null;
    AppStore.viewingIntermediate.value = false;

    clearColumnSelection();

    if (ribbonTab === 'data' || !ribbonTab) {
      setRibbonTab('rows');
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
    const modelName = await prompt(i18n.t('prompts.newModel', { ns: 'common' }), defaultName);

    if (!modelName || modelName.trim() === '') return;

    const name = modelName.trim();
    if (NameService.isModelNameTaken(name, source.id)) {
      await alert(i18n.t('validation.duplicate.modelExists', { ns: 'errors' }));
      return;
    }

    const newModel: Model = {
      id: `mdl_${Date.now()}`,
      name: name,
      sourceId: source.id,
      steps: [],
      schema: JSON.parse(JSON.stringify(source.columns)),
      data: cloneData(source.data),
      __v: 1,
    };

    // Initial steps: import (metadata) + types (logical type inference)
    const [importStep, typesStep] = StepService.createInitialSteps(source);
    newModel.steps.push(importStep, typesStep);

    // Compute final data and schema after initial steps
    const context = { sources: AppStore.sources.value, models: AppStore.models.value };
    const result = StepService.computeModelUpToStep(newModel, newModel.steps.length - 1, context);

    newModel.data = result.data;
    newModel.schema = result.schema;

    AppStore.models.value = [...AppStore.models.value, newModel];
    switchToModelFn(newModel);

    await PersistenceService.autoSave();
    showSuccess(i18n.t('notifications.model.created', { ns: 'common', name }));
  }

  /**
   * Copies the current model
   */
  static async copyCurrentModel(
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    return ModelService.deriveModel(
      {
        promptKey: 'prompts.copyModel',
        defaultSuffix: '_copy',
        successKey: 'notifications.model.copied',
      },
      prompt,
      alert,
      switchToModelFn
    );
  }

  /**
   * Forks the current model at a specific step, creating a new model with steps 0..stepIndex
   */
  static async forkModelAtStep(
    stepIndex: number,
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    return ModelService.deriveModel(
      {
        promptKey: 'prompts.forkModel',
        defaultSuffix: '_fork',
        successKey: 'notifications.model.forked',
        upToStep: stepIndex,
      },
      prompt,
      alert,
      switchToModelFn
    );
  }

  /**
   * Shared logic for copy/fork: clone steps, create a new model, recompute from source.
   */
  private static async deriveModel(
    config: { promptKey: string; defaultSuffix: string; successKey: string; upToStep?: number },
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert(i18n.t('system.noActiveModel', { ns: 'errors' }));
      return;
    }

    const newName = await prompt(
      i18n.t(config.promptKey as any, { ns: 'common' }),
      `${activeModel.name}${config.defaultSuffix}`
    );
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();

    if (NameService.isModelNameTaken(name, activeModel.sourceId)) {
      await alert(i18n.t('validation.duplicate.modelExists', { ns: 'errors' }));
      return;
    }

    const sourceSteps =
      config.upToStep !== undefined
        ? activeModel.steps.slice(0, config.upToStep + 1)
        : activeModel.steps;
    const clonedSteps = JSON.parse(JSON.stringify(sourceSteps));

    const newModel: Model = {
      id: `mdl_${Date.now()}`,
      name,
      sourceId: activeModel.sourceId,
      steps: clonedSteps,
      schema: [],
      data: [],
      __v: activeModel.__v ?? 1,
    };

    const context = { sources: AppStore.sources.value, models: AppStore.models.value };
    const result = StepService.computeModelUpToStep(newModel, clonedSteps.length - 1, context);
    newModel.data = result.data;
    newModel.schema = result.schema;

    AppStore.models.value = [...AppStore.models.value, newModel];
    switchToModelFn(newModel);
    await PersistenceService.autoSave();
    showSuccess(i18n.t(config.successKey as any, { ns: 'common', name }));
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
      await alert(i18n.t('system.noActiveModel', { ns: 'errors' }));
      return;
    }

    const newName = await prompt(i18n.t('prompts.renameModel', { ns: 'common' }), activeModel.name);
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();
    if (name === activeModel.name) return;

    if (NameService.isModelNameTaken(name, activeModel.sourceId, activeModel.id)) {
      await alert(i18n.t('validation.duplicate.modelExists', { ns: 'errors' }));
      return;
    }

    activeModel.name = name;
    AppStore.models.value = [...AppStore.models.value]; // Trigger reactivity
    await PersistenceService.autoSave();
    showSuccess(i18n.t('notifications.model.renamed', { ns: 'common', name }));
  }

  /**
   * Deletes the current model
   */
  static async deleteCurrentModel(
    confirm: (msg: string, confirmLabel?: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>,
    switchToModelFn: (model: Model) => void
  ) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert(i18n.t('system.noActiveModel', { ns: 'errors' }));
      return;
    }

    const sourceModels = AppStore.models.value.filter((m) => m.sourceId === activeModel.sourceId);
    if (sourceModels.length === 1) {
      await alert(i18n.t('system.cannotDeleteLastModel', { ns: 'errors' }));
      return;
    }

    // Check for dependent models that reference this model
    const dependencyCheck = DependencyService.canDeleteModel(
      AppStore.models.value,
      AppStore.sources.value,
      activeModel.id
    );

    if (!dependencyCheck.canDelete) {
      await alert(
        dependencyCheck.message || i18n.t('system.cannotDeleteReferenced', { ns: 'errors' })
      );
      return;
    }

    if (
      !(await confirm(
        i18n.t('confirms.deleteModel', { ns: 'common', name: activeModel.name }),
        i18n.t('buttons.delete', { ns: 'common' })
      ))
    )
      return;

    const deletedModelName = activeModel.name;
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
    showSuccess(i18n.t('notifications.model.deleted', { ns: 'common', name: deletedModelName }));
  }

  /**
   * Renames a source
   */
  static async renameSource(
    source: Source,
    prompt: (msg: string, def?: string) => Promise<string | null>,
    alert: (msg: string) => Promise<any>
  ) {
    const newName = await prompt(i18n.t('prompts.renameSource', { ns: 'common' }), source.name);
    if (!newName || newName.trim() === '') return;
    const name = newName.trim();
    if (name === source.name) return;

    if (NameService.isSourceNameTaken(name, source.id)) {
      await alert(i18n.t('validation.duplicate.sourceExists', { ns: 'errors' }));
      return;
    }

    source.name = name;
    AppStore.sources.value = [...AppStore.sources.value]; // Trigger reactivity
    await PersistenceService.autoSave();
    showSuccess(i18n.t('notifications.source.renamed', { ns: 'common', name }));
  }

  /**
   * Deletes a source and its associated models
   */
  static async deleteSource(
    source: Source,
    confirm: (msg: string, confirmLabel?: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>
  ) {
    // Check if source's models are referenced by models in other sources
    const dependencyCheck = DependencyService.canDeleteSource(
      AppStore.models.value,
      AppStore.sources.value,
      source.id
    );

    if (!dependencyCheck.canDelete) {
      await alert(
        dependencyCheck.message || i18n.t('system.cannotDeleteSourceReferenced', { ns: 'errors' })
      );
      return;
    }

    const modelsCount = AppStore.models.value.filter((m) => m.sourceId === source.id).length;
    const message =
      modelsCount > 0
        ? i18n.t('confirms.deleteSourceWithModels', {
            ns: 'common',
            name: source.name,
            count: modelsCount,
          })
        : i18n.t('confirms.deleteSource', { ns: 'common', name: source.name });

    if (!(await confirm(message, i18n.t('buttons.delete', { ns: 'common' })))) return;

    const deletedSourceName = source.name;
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
      showSuccess(
        i18n.t('notifications.source.deleted', { ns: 'common', name: deletedSourceName })
      );
    } catch (error: any) {
      console.error('Error deleting source:', error);
      await alert(i18n.t('system.deleteSourceFailed', { ns: 'errors', message: error.message }));
    }
  }

  /**
   * Resets all application data
   */
  static async clearAllData(
    confirm: (msg: string, confirmLabel?: string) => Promise<boolean>,
    alert: (msg: string) => Promise<any>
  ) {
    return PersistenceService.clearAllData(confirm, alert);
  }
}
