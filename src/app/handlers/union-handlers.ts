import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as NotificationHandlers from './notification-handlers';

export function initializeUnionDialog() {
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const activeModel = AppStore.activeModel.value;

  const availableTargets: any[] = [];
  models.forEach((model) => {
    if (activeModel && model.id !== activeModel.id) {
      availableTargets.push({
        id: model.id,
        name: model.name,
        type: 'model',
        sourceName: sources.find((s) => s.id === model.sourceId)?.name || 'Unknown',
      });
    }
  });
  sources.forEach((source) => {
    availableTargets.push({
      id: source.id,
      name: source.name,
      type: 'source',
      sourceName: source.name,
    });
  });

  // Reset store state
  const state = DialogStore.unionState;
  const initialTargetModel = availableTargets[0]?.id || null;

  state.targets.value = availableTargets;
  state.targetModel.value = initialTargetModel;
  state.previewData.value = null;
  state.previewError.value = null;
  state.isPreviewing.value = false;

  AppStore.activeDialog.value = 'union';
}

export function onUnionTargetChange() {
  const state = DialogStore.unionState;

  state.previewData.value = null;
  state.previewError.value = null;
}

export async function previewUnion() {
  const state = DialogStore.unionState;
  const targetModel = state.targetModel.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const currentData = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  if (!targetModel) {
    state.previewError.value = 'Please select a model or source to union with';
    return;
  }

  state.isPreviewing.value = true;
  state.previewError.value = null;
  state.previewData.value = null;

  try {
    const targetModelData = models.find((m) => m.id === targetModel);
    if (targetModelData && targetModelData.steps.length > 0) {
      const result = StepService.computeModelUpToStep(
        targetModelData,
        targetModelData.steps.length - 1,
        {
          sources,
          models,
        }
      );
      targetModelData.data = result.data;
    }
    const transform = {
      union: {
        with: targetModel,
      },
    };
    const table = aq.from(currentData!);
    const context = { sources, models };
    const result = applyTransform(table, transform, columns, context);
    const allData = result.objects();

    state.previewData.value = {
      rows: allData.slice(0, 100),
      totalRows: allData.length,
      columns: result.columnNames(),
    };
  } catch (error: any) {
    console.error('Union preview error:', error);
    state.previewError.value = error.message;
  } finally {
    state.isPreviewing.value = false;
  }
}

export async function applyUnionTransform(callbacks: any) {
  const state = DialogStore.unionState;
  const targetModel = state.targetModel.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  if (!targetModel) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please select a model or source to union with'
    );
    return;
  }

  try {
    const targetModelData = models.find((m) => m.id === targetModel);
    if (targetModelData && targetModelData.steps.length > 0) {
      const result = StepService.computeModelUpToStep(
        targetModelData,
        targetModelData.steps.length - 1,
        {
          sources,
          models,
        }
      );
      targetModelData.data = result.data;
    }

    const transform = {
      union: {
        with: targetModel,
      },
    };
    await StepService.runTransform('Union', transform, callbacks);
  } catch (error: any) {
    console.error('Union transform setup error:', error);
    await NotificationHandlers.alert.call(null as any, 'Error preparing union: ' + error.message);
  }
}
