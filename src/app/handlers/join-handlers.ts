import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as NotificationHandlers from './notification-handlers';

export function initializeJoinDialog() {
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
  const state = DialogStore.joinState;
  const initialRightModel = availableTargets[0]?.id || null;

  state.targets.value = availableTargets;
  state.rightModel.value = initialRightModel;
  state.joinType.value = 'left';
  state.keyPairs.value = [[null, null]];
  state.suffixes.value = ['_x', '_y'];
  state.rightColumns.value = initialRightModel ? getColumnsForTarget(initialRightModel) : [];
  state.previewData.value = null;
  state.previewError.value = null;
  state.isPreviewing.value = false;

  AppStore.activeDialog.value = 'join';
}

export function getColumnsForTarget(targetId: string) {
  if (!targetId) return [];
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  const model = models.find((m) => m.id === targetId);
  if (model) {
    try {
      const result = StepService.computeModelUpToStep(model, model.steps.length - 1, {
        sources,
        models,
      });
      return result.columns;
    } catch (error) {
      console.error('Error computing columns for target model:', error);
      if (model.data && model.data.length > 0) return Object.keys(model.data[0]);
    }
  }
  const source = sources.find((s) => s.id === targetId);
  if (source) return source.columns.map((c: any) => c.name);
  return [];
}

export function onJoinTargetChange() {
  const state = DialogStore.joinState;
  const rightModelId = state.rightModel.value;

  if (rightModelId) {
    state.rightColumns.value = getColumnsForTarget(rightModelId);
  } else {
    state.rightColumns.value = [];
  }

  state.keyPairs.value = [[null, null]];
  state.previewData.value = null;
  state.previewError.value = null;
}

export function addJoinKeyPair() {
  const state = DialogStore.joinState;
  state.keyPairs.value = [...state.keyPairs.value, [null, null]];
}

export function removeJoinKeyPair(index: number) {
  const state = DialogStore.joinState;
  if (state.keyPairs.value.length > 1) {
    state.keyPairs.value = state.keyPairs.value.filter((_, i) => i !== index);
  }
}

export async function previewJoin() {
  const state = DialogStore.joinState;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const currentData = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  if (!rightModel) {
    state.previewError.value = 'Please select a model or source to join with';
    return;
  }
  if (joinType !== 'cross') {
    const hasCompleteKeyPair = keyPairs.some((pair) => pair[0] && pair[1]);
    if (!hasCompleteKeyPair) {
      state.previewError.value = 'Please specify at least one complete key pair';
      return;
    }
  }

  state.isPreviewing.value = true;
  state.previewError.value = null;
  state.previewData.value = null;

  try {
    const targetModel = models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = StepService.computeModelUpToStep(targetModel, targetModel.steps.length - 1, {
        sources,
        models,
      });
      targetModel.data = result.data;
    }
    const transform = {
      join: {
        right: rightModel,
        on: keyPairs.filter((pair: any) => pair[0] && pair[1]),
        how: joinType,
        suffixes: suffixes,
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
    console.error('Join preview error:', error);
    state.previewError.value = error.message;
  } finally {
    state.isPreviewing.value = false;
  }
}

export async function applyJoinTransform(callbacks: any) {
  const state = DialogStore.joinState;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  if (!rightModel) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please select a model or source to join with'
    );
    return;
  }
  if (joinType !== 'cross') {
    const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]);
    if (completePairs.length === 0) {
      await NotificationHandlers.alert.call(
        null as any,
        'Please specify at least one complete key pair'
      );
      return;
    }
  }

  try {
    const targetModel = models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = StepService.computeModelUpToStep(targetModel, targetModel.steps.length - 1, {
        sources,
        models,
      });
      targetModel.data = result.data;
    }

    // Type casting for key pairs to ensure they match expected transform format
    const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]) as [string, string][];

    const transform = {
      join: {
        right: rightModel,
        on: completePairs,
        how: joinType,
        suffixes: suffixes as [string, string],
      },
    };
    await StepService.runTransform('Join', transform, callbacks);
  } catch (error: any) {
    console.error('Join transform setup error:', error);
    await NotificationHandlers.alert.call(null as any, 'Error preparing join: ' + error.message);
  }
}
