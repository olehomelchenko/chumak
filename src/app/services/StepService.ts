import * as aq from 'arquero';
import { applyTransform, describeTransform } from '../../core/transforms';
import { TransformResult } from '../../core/transform-result';
import { perfLogger } from '../../core/performance-logger';
import { PersistenceService } from './PersistenceService';
import { DependencyService } from './DependencyService';
import { Model, Source } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { AppStore } from '../stores/AppStore';

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
    model.data = JSON.parse(JSON.stringify(result.data));

    const validation = TransformResult.validate(result);
    if (!validation.valid) {
      console.warn('applyStepResult: Result validation warnings', validation.errors);
    }

    AppStore.activeStepIndex.value = model.steps.length - 1;
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;

    callbacks.updatePagination?.();

    // Mark dependent models as stale since this model's data changed
    StepService.markDependentsStale(model.id);

    await PersistenceService.autoSave();

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

      try {
        table = applyTransform(table, step, columns, context);

        const stepResult = TransformResult.create(table, schema, step);
        schema = stepResult.schema;
        columns = stepResult.columns;
      } catch (error: any) {
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

    perfLogger.log(
      `Compute model '${model.name}' to step ${stepIndex + 1}`,
      source.data,
      result.data,
      performance.now() - start
    );
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

      model.data = JSON.parse(JSON.stringify(result.data));
      model.schema = result.schema;

      callbacks.onSuccess(result);

      // Mark dependent models as stale since this model's data changed
      StepService.markDependentsStale(model.id);

      await PersistenceService.autoSave();
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
    const backup = {
      steps: JSON.parse(JSON.stringify(model.steps)),
      data: JSON.parse(JSON.stringify(model.data)),
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

      model.data = JSON.parse(JSON.stringify(result.data));
      model.schema = result.schema;

      callbacks.onSuccess(result);

      // Mark dependent models as stale since this model's data changed
      StepService.markDependentsStale(model.id);

      await PersistenceService.autoSave();
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
   * Marks all models that depend on the given model as stale.
   * Should be called after any change to model data/steps.
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
}
