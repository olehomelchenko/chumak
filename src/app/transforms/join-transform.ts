import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { JoinTarget } from '../components/JoinDialog';

export function initializeJoinDialog(this: ChumakApp) {
  const availableTargets: JoinTarget[] = [];
  this.models.forEach((model) => {
    if (this.activeModel && model.id !== this.activeModel.id) {
      availableTargets.push({
        id: model.id,
        name: model.name,
        type: 'model',
        sourceName: this.sources.find((s) => s.id === model.sourceId)?.name || 'Unknown',
      });
    }
  });
  this.sources.forEach((source) => {
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
  state.rightColumns.value = initialRightModel
    ? (this as any).getColumnsForTarget(initialRightModel)
    : [];
  state.previewData.value = null;
  state.previewError.value = null;
  state.isPreviewing.value = false;

  // Set active dialog in store
  AppStore.activeDialog.value = 'join';
}

export function getColumnsForTarget(this: ChumakApp, targetId: string) {
  if (!targetId) return [];
  const model = this.models.find((m) => m.id === targetId);
  if (model) {
    try {
      const result = (this as any).computeModelUpToStep(model, model.steps.length - 1);
      return result.columns;
    } catch (error) {
      console.error('Error computing columns for target model:', error);
      if (model.data && model.data.length > 0) return Object.keys(model.data[0]);
    }
  }
  const source = this.sources.find((s) => s.id === targetId);
  if (source) return source.columns.map((c: any) => c.name);
  return [];
}

export function onJoinTargetChange(this: ChumakApp) {
  const state = DialogStore.joinState;
  const rightModelId = state.rightModel.value;

  if (rightModelId) {
    state.rightColumns.value = (this as any).getColumnsForTarget(rightModelId);
  } else {
    state.rightColumns.value = [];
  }

  state.keyPairs.value = [[null, null]];
  state.previewData.value = null;
  state.previewError.value = null;
}

export function addJoinKeyPair(this: ChumakApp) {
  const state = DialogStore.joinState;
  state.keyPairs.value = [...state.keyPairs.value, [null, null]];
}

export function removeJoinKeyPair(this: ChumakApp, index: number) {
  const state = DialogStore.joinState;
  if (state.keyPairs.value.length > 1) {
    state.keyPairs.value = state.keyPairs.value.filter((_, i) => i !== index);
  }
}

export async function previewJoin(this: ChumakApp) {
  const state = DialogStore.joinState;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;

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
    const targetModel = this.models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = (this as any).computeModelUpToStep(targetModel, targetModel.steps.length - 1);
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
    const table = aq.from(this.currentData!);
    const context = { sources: this.sources, models: this.models };
    const result = applyTransform(table, transform, this.columns, context);
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

export async function applyJoinTransform(this: ChumakApp) {
  const state = DialogStore.joinState;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;

  if (!rightModel) {
    await this.alert('Please select a model or source to join with');
    return;
  }
  if (joinType !== 'cross') {
    const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]);
    if (completePairs.length === 0) {
      await this.alert('Please specify at least one complete key pair');
      return;
    }
  }

  try {
    const targetModel = this.models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = (this as any).computeModelUpToStep(targetModel, targetModel.steps.length - 1);
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
    await this.runTransform('Join', transform);
  } catch (error: any) {
    console.error('Join transform setup error:', error);
    await this.alert('Error preparing join: ' + error.message);
  }
}
