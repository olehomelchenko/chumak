import {
  V2Workflow,
  translateNamesToIds,
  getReachableModels,
  topologicalSortV2,
} from '../../core/workflow-v2';
import { SchemaEngine, TransformStep } from '../../core/schema-engine';
import { AppStore } from '../stores/AppStore';
import { NameService } from './NameService';
import { StepService } from './StepService';
import { PersistenceService } from './PersistenceService';
import { showSuccess } from '../handlers/core/notification-handlers';
import { DataRow, Source, Model } from '../types';
import i18n from '../../i18n';

export interface WorkflowImportCallbacks {
  updatePagination: () => void;
  closeDialog: () => void;
}

/**
 * WorkflowImportService
 *
 * Imports a v2 workflow into the app, creating sources and models
 * from the workflow definition and user-provided data files.
 */
export class WorkflowImportService {
  /**
   * Import a validated v2 workflow with bound source data.
   */
  static async importWorkflow(
    workflow: V2Workflow,
    sourceData: Map<string, DataRow[]>,
    callbacks: WorkflowImportCallbacks
  ): Promise<void> {
    const reachable = getReachableModels(workflow, workflow.outputs);
    const executionOrder = topologicalSortV2(workflow, reachable);

    // Map workflow names → runtime IDs
    const nameToId = new Map<string, string>();
    const now = Date.now();
    let idOffset = 0;

    // 1. Create sources (batched — single signal assignment)
    const newSources: Source[] = [];
    for (const [sourceName, sourceDef] of Object.entries(workflow.sources)) {
      const id = `src_${now + idOffset++}`;
      const data = sourceData.get(sourceName) || [];
      const physicalSchema = SchemaEngine.createPhysicalSchema(data);

      const uniqueName = NameService.suggestUniqueName(sourceName, (name) =>
        NameService.isSourceNameTaken(name)
      );

      newSources.push({
        id,
        name: uniqueName,
        columns: physicalSchema,
        data,
        headerMode: sourceDef.parsing?.headerMode || 'first-row',
        delimiter: sourceDef.parsing?.delimiter || ',',
        customHeaders: sourceDef.parsing?.customHeaders || null,
        origin: 'workflow-import',
        rowCount: data.length,
        createdAt: new Date().toISOString(),
      });
      nameToId.set(sourceName, id);
    }
    AppStore.sources.value = [...AppStore.sources.value, ...newSources];

    // 2. Create models in topological order (batched — single signal assignment)
    const newModels: Model[] = [];
    for (const modelName of executionOrder) {
      const modelDef = workflow.models[modelName];
      if (!modelDef) continue;

      const id = `mdl_${now + idOffset++}`;
      const sourceId = nameToId.get(modelDef.source);
      if (!sourceId) {
        throw new Error(`Source "${modelDef.source}" not found for model "${modelName}"`);
      }

      // Translate name-based refs in steps to runtime IDs
      const translatedSteps = translateNamesToIds(modelDef.steps, nameToId);

      // Build initial steps (import + types) for root models (those backed by a real source)
      const sourceObj = AppStore.sources.value.find((s) => s.id === sourceId);
      let steps: TransformStep[];

      if (sourceObj) {
        // Root model: prepend import step; workflow already contains the types step
        const [importStep] = StepService.createInitialSteps(sourceObj);
        steps = [importStep, ...translatedSteps];
      } else {
        // Chained model: just workflow steps (no import step — data comes from parent model)
        steps = translatedSteps;
      }

      // Derive a display name from the composite key (e.g., "source/model" → "model")
      const displayName = modelName.includes('/') ? modelName.split('/').pop()! : modelName;

      const uniqueName = NameService.suggestUniqueName(displayName, (name) =>
        NameService.isModelNameTaken(name, sourceId)
      );

      const model: Model = {
        id,
        name: uniqueName,
        sourceId,
        steps,
        schema: [],
        data: [],
      };

      // Compute pipeline (needs current store state including previously added models)
      const context = {
        sources: AppStore.sources.value,
        models: [...AppStore.models.value, ...newModels],
      };

      const result = StepService.computeModelUpToStep(model, model.steps.length - 1, context);
      model.data = result.data;
      model.schema = result.schema;

      newModels.push(model);
      nameToId.set(modelName, id);
    }
    AppStore.models.value = [...AppStore.models.value, ...newModels];

    // 3. Activate first output model
    const firstOutputName = workflow.outputs[0];
    const firstOutputId = nameToId.get(firstOutputName);
    if (firstOutputId) {
      const model = AppStore.models.value.find((m) => m.id === firstOutputId);
      if (model) {
        AppStore.activeModel.value = model;
        AppStore.currentData.value = model.data;
        AppStore.columns.value = model.schema.map((c) => c.name);
        AppStore.viewMode.value = 'model';
        AppStore.activeStepIndex.value = model.steps.length - 1;
      }
    }

    // 4. Persist and notify
    callbacks.updatePagination();
    await PersistenceService.autoSave();
    showSuccess(
      i18n.t('notifications.workflowImported', {
        ns: 'common',
        count: executionOrder.length,
      })
    );
    callbacks.closeDialog();
  }
}
