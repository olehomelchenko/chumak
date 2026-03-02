import * as aq from 'arquero';
import { applyTransform, describeTransform } from '../../core/transforms';
import { TransformResult } from '../../core/transform-result';
import { metricsCollector, getDataShape } from '../../core/metrics';
import { PersistenceService } from './PersistenceService';
import { DependencyService } from './DependencyService';
import { Model, Source } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { AppStore, HistoryStack } from '../stores/AppStore';
import { showSuccess } from '../handlers/core/notification-handlers';

const MAX_HISTORY_SIZE = 50;

/**
 * Extract the transform type from a step object.
 * TransformStep has a single primary key indicating the type.
 */
function getTransformType(step: TransformStep): string {
  // Special markers that aren't transform types
  const nonTransformKeys = ['import'];

  for (const key of Object.keys(step)) {
    if (!nonTransformKeys.includes(key)) {
      return key;
    }
  }
  return 'unknown';
}

export interface ComputeResult {
  data: any[];
  schema: ColumnSchema[];
  columns: string[];
}

export interface ComputeContext {
  sources: Source[];
  models: Model[];
}

export interface ExecutionCallbacks {
  onTransformStart?: (label: string) => void;
  onTransformEnd?: () => void;
  onError?: (message: string) => Promise<void>;
  onDialogClose?: (clearPreview?: boolean) => void;
  updatePagination?: () => void;
}

/**
 * StepService
 *
 * Handles step computation, viewing, editing, and removal.
 * This is the "Execution Engine" - framework-agnostic transform orchestration.
 */
export class StepService {
  /**
   * Executes a transform and applies the result to the active model.
   * This is the main entry point for running transforms.
   * Returns true on success, false on failure.
   */
  static async runTransform(
    label: string,
    transform: TransformStep,
    callbacks: ExecutionCallbacks,
    closeDialog = true
  ): Promise<boolean> {
    const model = AppStore.activeModel.value;
    const currentData = AppStore.currentData.value;
    const columns = AppStore.columns.value;

    if (!model || !currentData) {
      await callbacks.onError?.('No active model or data');
      return false;
    }

    callbacks.onTransformStart?.(label);

    try {
      const table = aq.from(currentData);
      const context = StepService.getContext();
      const resultTable = applyTransform(table, transform, columns, context);

      await StepService.applyStepResult(transform, resultTable, callbacks, closeDialog);
      return true;
    } catch (error: any) {
      console.error(`${label} error:`, error);
      await callbacks.onError?.(`Error applying ${label.toLowerCase()}: ${error.message}`);
      return false;
    } finally {
      callbacks.onTransformEnd?.();
    }
  }

  /**
   * Applies a transform result to the active model.
   * Handles both new step addition and step editing.
   */
  static async applyStepResult(
    transform: TransformStep,
    resultTable: any,
    callbacks: ExecutionCallbacks,
    closeDialogAfter = true
  ): Promise<void> {
    const model = AppStore.activeModel.value;
    const editingStepIndex = AppStore.editingStepIndex.value;

    if (!model) return;

    // Handle editing existing step
    if (editingStepIndex !== null) {
      await StepService.updateStep(model, editingStepIndex, transform, {
        onSuccess: (result) => {
          AppStore.currentData.value = result.data;
          AppStore.columns.value = result.columns;
          AppStore.activeStepIndex.value = model.steps.length - 1;
          AppStore.viewingIntermediate.value = false;
          AppStore.viewingSchema.value = null;
          AppStore.editingStepIndex.value = null;
          callbacks.updatePagination?.();
        },
        onError: (error, backup) => {
          // Rollback on failure
          model.steps = backup.steps;
          model.data = backup.data;
          model.schema = backup.schema;
          console.error('Step update failed, rolled back:', error);
        },
      });
      callbacks.onDialogClose?.(true);
      return;
    }

    // Snapshot for undo before mutation
    StepService.pushSnapshot(model, describeTransform(transform));

    // Add new step
    model.steps.push(transform);

    let result;
    if (Array.isArray(resultTable)) {
      result = TransformResult.createFromData(resultTable, model.schema, transform);
    } else {
      result = TransformResult.create(resultTable, model.schema, transform);
    }

    // Update AppStore signals
    AppStore.currentData.value = result.data;
    AppStore.columns.value = result.columns;

    // Update model
    model.schema = result.schema;
    model.data = result.data;

    const validation = TransformResult.validate(result);
    if (!validation.valid) {
      console.warn('applyStepResult: Result validation warnings', validation.errors);
    }

    AppStore.activeStepIndex.value = model.steps.length - 1;
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;

    callbacks.updatePagination?.();

    // Show dependency impact dialog and handle dependent models
    const shouldContinue = await StepService.handleDependencyImpact(model.id);

    if (!shouldContinue) {
      // User cancelled - rollback the step addition
      model.steps.pop();
      // Note: We don't restore previous data here as it would require keeping a backup
      // The step is removed but the current data remains (which is the result of the step)
      // This is acceptable as the user can just undo their last action
      callbacks.onDialogClose?.(true);
      return;
    }

    await PersistenceService.autoSave();
    showSuccess(describeTransform(transform));

    if (closeDialogAfter) {
      callbacks.onDialogClose?.(true);
    }
  }

  /**
   * Computes a model's data up to (and including) a specific step index.
   * This is a pure function that doesn't depend on SytoApp state.
   */
  static computeModelUpToStep(
    model: Model,
    stepIndex: number,
    context: ComputeContext
  ): ComputeResult {
    const start = performance.now();
    if (!model) throw new Error('No model provided');

    const source = context.sources.find((s) => s.id === model.sourceId);
    if (!source) throw new Error('Source not found for model');

    let table = aq.from(source.data);
    let schema = JSON.parse(JSON.stringify(source.columns)) as ColumnSchema[];
    let columns = schema.map((c: ColumnSchema) => c.name);

    for (let i = 0; i <= stepIndex; i++) {
      const step = model.steps[i];
      if (step.import) continue;

      const stepStart = performance.now();
      const inputShape = getDataShape(table);
      const transformType = getTransformType(step);

      try {
        table = applyTransform(table, step, columns, context);

        const stepResult = TransformResult.create(table, schema, step);
        schema = stepResult.schema;
        columns = stepResult.columns;

        // Record per-step metrics
        const outputShape = getDataShape(table);
        metricsCollector.record({
          transformType,
          durationMs: performance.now() - stepStart,
          success: true,
          inputRows: inputShape.rows,
          inputCols: inputShape.cols,
          outputRows: outputShape.rows,
          outputCols: outputShape.cols,
          metadata: {
            modelId: model.id,
            stepIndex: i,
          },
        });
      } catch (error: any) {
        // Record failed step metrics
        metricsCollector.record({
          transformType,
          durationMs: performance.now() - stepStart,
          success: false,
          inputRows: inputShape.rows,
          inputCols: inputShape.cols,
          outputRows: 0,
          outputCols: 0,
          metadata: {
            modelId: model.id,
            stepIndex: i,
            errorMessage: error.message,
          },
        });

        console.error(`Error applying step ${i}:`, error);
        const stepDescription = describeTransform(step);
        const enhancedError = new Error(
          `Step ${i + 1} failed: ${stepDescription}\n\n${error.message}`
        ) as any;
        enhancedError.stepIndex = i;
        enhancedError.stepDescription = stepDescription;
        throw enhancedError;
      }
    }

    const result = {
      data: table.objects() as any[],
      schema: schema,
      columns: columns,
    };

    const validation = TransformResult.validate(result);
    if (!validation.valid) {
      console.warn('computeModelUpToStep: Result validation warnings', validation.errors);
    }

    const duration = performance.now() - start;
    const inputShape = getDataShape(source.data);
    const outputShape = getDataShape(result.data);

    // Record metrics for the pipeline computation
    metricsCollector.record({
      transformType: 'pipeline',
      durationMs: duration,
      success: true,
      inputRows: inputShape.rows,
      inputCols: inputShape.cols,
      outputRows: outputShape.rows,
      outputCols: outputShape.cols,
      metadata: {
        modelId: model.id,
        stepIndex: stepIndex,
      },
    });

    return result;
  }

  /**
   * Computes the active model up to a specific step using AppStore state
   */
  static computeUpToStep(stepIndex: number): ComputeResult {
    const model = AppStore.activeModel.value;
    if (!model) throw new Error('No active model');

    return StepService.computeModelUpToStep(model, stepIndex, {
      sources: AppStore.sources.value,
      models: AppStore.models.value,
    });
  }

  /**
   * Creates a compute context from AppStore
   */
  static getContext(): ComputeContext {
    return {
      sources: AppStore.sources.value,
      models: AppStore.models.value,
    };
  }

  /**
   * Executes step removal from a model
   */
  static async executeStepRemoval(
    model: Model,
    stepIndex: number,
    mode: 'single' | 'all',
    callbacks: {
      onSuccess: (result: ComputeResult) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    // Snapshot for undo before mutation
    const removedDesc =
      mode === 'all'
        ? `Remove steps ${stepIndex + 1}+`
        : `Remove ${describeTransform(model.steps[stepIndex])}`;
    StepService.pushSnapshot(model, removedDesc);

    try {
      if (mode === 'all') {
        model.steps.splice(stepIndex);
      } else {
        model.steps.splice(stepIndex, 1);
      }
      model.steps = [...model.steps];

      const result = StepService.computeModelUpToStep(
        model,
        model.steps.length - 1,
        StepService.getContext()
      );

      model.data = result.data;
      model.schema = result.schema;

      callbacks.onSuccess(result);

      // Handle dependent models (show dialog if needed)
      await StepService.handleDependencyImpact(model.id);

      await PersistenceService.autoSave();
      showSuccess('Step removed');
    } catch (error: any) {
      callbacks.onError(error);
    }
  }

  /**
   * Updates a step in a model with rollback on failure
   */
  static async updateStep(
    model: Model,
    stepIndex: number,
    newTransform: TransformStep,
    callbacks: {
      onSuccess: (result: ComputeResult) => void;
      onError: (
        error: Error,
        backup: { steps: TransformStep[]; data: any[]; schema: ColumnSchema[] }
      ) => void;
    }
  ): Promise<void> {
    // Snapshot for undo before mutation
    StepService.pushSnapshot(model, `Edit ${describeTransform(model.steps[stepIndex])}`);

    const backup = {
      steps: JSON.parse(JSON.stringify(model.steps)),
      data: structuredClone(model.data),
      schema: JSON.parse(JSON.stringify(model.schema)),
    };

    try {
      model.steps[stepIndex] = newTransform;
      model.steps = [...model.steps];

      const result = StepService.computeModelUpToStep(
        model,
        model.steps.length - 1,
        StepService.getContext()
      );

      model.data = result.data;
      model.schema = result.schema;

      callbacks.onSuccess(result);

      // Handle dependent models (show dialog if needed)
      await StepService.handleDependencyImpact(model.id);

      await PersistenceService.autoSave();
      showSuccess('Step updated');
    } catch (error: any) {
      callbacks.onError(error, backup);
    }
  }

  /**
   * Creates step removal modal configuration
   */
  static getStepRemovalInfo(model: Model, stepIndex: number) {
    const step = model.steps[stepIndex];
    const affectedSteps = model.steps
      .slice(stepIndex + 1)
      .map((s: TransformStep) => describeTransform(s));

    return {
      stepIndex,
      stepName: describeTransform(step),
      affectedSteps,
    };
  }

  /**
   * Shows dependency impact dialog if there are dependents, then handles them based on user choice
   */
  static async handleDependencyImpact(modelId: string): Promise<boolean> {
    const models = AppStore.models.value;
    const sources = AppStore.sources.value;

    // Check if there are any dependents
    const dependentModels = DependencyService.getDependentModelsForUI(models, sources, modelId);

    if (dependentModels.length === 0) {
      return true; // No dependents, continue
    }

    // Show dialog and wait for user choice
    const action = await new Promise<'mark-stale' | 'recalculate' | null>((resolve) => {
      AppStore.dependencyImpactModal.value = {
        visible: true,
        dependentModels,
        action: 'mark-stale',
        resolve,
      };
    });

    if (action === null) {
      return false; // User cancelled
    }

    if (action === 'mark-stale') {
      // Mark dependents as stale (current behavior)
      const staleIds = DependencyService.markDependentsStale(models, sources, modelId);
      if (staleIds.length > 0) {
        AppStore.models.value = [...models];
      }
    } else {
      // Recalculate dependents now (eager)
      const context = StepService.getContext();
      const staleIds = DependencyService.getModelsToMarkStale(models, sources, modelId);

      // Get topological execution order to ensure we recompute dependencies before dependents
      const graph = DependencyService.buildGraph(sources, models);
      const executionOrder = DependencyService.getExecutionOrder(graph, staleIds);
      const sortedStaleIds = executionOrder.filter((id) => staleIds.includes(id));

      for (const dependentId of sortedStaleIds) {
        const dependentModel = models.find((m) => m.id === dependentId);
        if (!dependentModel) continue;

        try {
          const result = StepService.computeModelUpToStep(
            dependentModel,
            dependentModel.steps.length - 1,
            context
          );

          dependentModel.data = result.data;
          dependentModel.schema = result.schema;
          dependentModel.isStale = false;
        } catch (error: any) {
          console.error(`Failed to recompute dependent model ${dependentModel.name}:`, error);
          dependentModel.isStale = true;
        }
      }

      AppStore.models.value = [...models];
    }

    return true; // Continue
  }

  /**
   * Marks all models that depend on the given model as stale.
   * Should be called after any change to model data/steps.
   * [DEPRECATED] Use handleDependencyImpact instead for user-facing operations
   */
  static markDependentsStale(modelId: string): void {
    const models = AppStore.models.value;
    const sources = AppStore.sources.value;

    const staleIds = DependencyService.markDependentsStale(models, sources, modelId);

    if (staleIds.length > 0) {
      // Trigger reactivity to update any UI showing stale state
      AppStore.models.value = [...models];
    }
  }

  // --- Undo/Redo History ---

  private static getHistory(modelId: string): HistoryStack {
    const map = AppStore.history.value;
    let stack = map.get(modelId);
    if (!stack) {
      stack = { undo: [], redo: [] };
      map.set(modelId, stack);
    }
    return stack;
  }

  static pushSnapshot(model: Model, description: string): void {
    const history = StepService.getHistory(model.id);
    history.undo.push({
      steps: JSON.parse(JSON.stringify(model.steps)),
      description,
    });
    if (history.undo.length > MAX_HISTORY_SIZE) {
      history.undo.shift();
    }
    history.redo = [];
    // Trigger signal reactivity
    AppStore.history.value = new Map(AppStore.history.value);
  }

  static canUndo(modelId: string): boolean {
    const stack = AppStore.history.value.get(modelId);
    return !!stack && stack.undo.length > 0;
  }

  static canRedo(modelId: string): boolean {
    const stack = AppStore.history.value.get(modelId);
    return !!stack && stack.redo.length > 0;
  }

  static async undo(
    model: Model,
    callbacks: {
      onSuccess: (result: ComputeResult) => void;
      onError: (error: Error) => void;
    }
  ): Promise<string | null> {
    const history = StepService.getHistory(model.id);
    const entry = history.undo.pop();
    if (!entry) return null;

    // Push current state to redo
    history.redo.push({
      steps: JSON.parse(JSON.stringify(model.steps)),
      description: entry.description,
    });

    // Restore steps from snapshot (already a fresh array from JSON.parse)
    model.steps = entry.steps;

    try {
      const result = StepService.computeModelUpToStep(
        model,
        model.steps.length - 1,
        StepService.getContext()
      );

      model.data = result.data;
      model.schema = result.schema;
      callbacks.onSuccess(result);

      // Silently mark dependents stale (no dialog)
      StepService.markDependentsStale(model.id);

      await PersistenceService.autoSave();
      AppStore.history.value = new Map(AppStore.history.value);
      return entry.description;
    } catch (error: any) {
      callbacks.onError(error);
      return null;
    }
  }

  static async redo(
    model: Model,
    callbacks: {
      onSuccess: (result: ComputeResult) => void;
      onError: (error: Error) => void;
    }
  ): Promise<string | null> {
    const history = StepService.getHistory(model.id);
    const entry = history.redo.pop();
    if (!entry) return null;

    // Push current state to undo
    history.undo.push({
      steps: JSON.parse(JSON.stringify(model.steps)),
      description: entry.description,
    });

    // Restore steps from snapshot (already a fresh array from JSON.parse)
    model.steps = entry.steps;

    try {
      const result = StepService.computeModelUpToStep(
        model,
        model.steps.length - 1,
        StepService.getContext()
      );

      model.data = result.data;
      model.schema = result.schema;
      callbacks.onSuccess(result);

      // Silently mark dependents stale (no dialog)
      StepService.markDependentsStale(model.id);

      await PersistenceService.autoSave();
      AppStore.history.value = new Map(AppStore.history.value);
      return entry.description;
    } catch (error: any) {
      callbacks.onError(error);
      return null;
    }
  }
}
