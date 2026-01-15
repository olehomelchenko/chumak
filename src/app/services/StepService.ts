import * as aq from 'arquero';
import { applyTransform, describeTransform } from '../../core/transforms';
import { TransformResult } from '../../core/transform-result';
import { perfLogger } from '../../core/performance-logger';
import { PersistenceService } from './PersistenceService';
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

/**
 * StepService
 *
 * Handles step computation, viewing, editing, and removal.
 * Replaces logic previously in step-handlers.ts with proper typing.
 */
export class StepService {
  /**
   * Computes a model's data up to (and including) a specific step index.
   * This is a pure function that doesn't depend on ChumakApp state.
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
}
