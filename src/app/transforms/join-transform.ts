import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';

export function initializeJoinDialog(this: ChumakApp) {
  const availableTargets: any[] = [];
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
  this.joinDialogState = {
    rightModel: availableTargets[0]?.id || null,
    joinType: 'left',
    keyPairs: [[null, null]],
    suffixes: ['_x', '_y'],
    availableTargets: availableTargets,
    leftColumns: this.columns,
    rightColumns: this.getColumnsForTarget(availableTargets[0]?.id),
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
}

export function getColumnsForTarget(this: ChumakApp, targetId: string) {
  if (!targetId) return [];
  const model = this.models.find((m) => m.id === targetId);
  if (model) {
    try {
      const result = this.computeModelUpToStep(model, model.steps.length - 1);
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
  if (this.joinDialogState.rightModel) {
    this.joinDialogState.rightColumns = this.getColumnsForTarget(this.joinDialogState.rightModel);
  }
  this.joinDialogState.keyPairs = [[null, null]];
  this.joinDialogState.previewData = null;
  this.joinDialogState.previewError = null;
}

export function addJoinKeyPair(this: ChumakApp) {
  this.joinDialogState.keyPairs.push([null, null]);
}

export function removeJoinKeyPair(this: ChumakApp, index: number) {
  if (this.joinDialogState.keyPairs.length > 1) {
    this.joinDialogState.keyPairs.splice(index, 1);
  }
}

export async function previewJoin(this: ChumakApp) {
  const state = this.joinDialogState;
  if (!state.rightModel) {
    state.previewError = 'Please select a model or source to join with';
    return;
  }
  if (state.joinType !== 'cross') {
    const hasCompleteKeyPair = state.keyPairs.some((pair: any) => pair[0] && pair[1]);
    if (!hasCompleteKeyPair) {
      state.previewError = 'Please specify at least one complete key pair';
      return;
    }
  }
  state.isPreviewing = true;
  state.previewError = null;
  state.previewData = null;
  try {
    const targetModel = this.models.find((m) => m.id === state.rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = this.computeModelUpToStep(targetModel, targetModel.steps.length - 1);
      targetModel.data = result.data;
    }
    const transform = {
      join: {
        right: state.rightModel,
        on: state.keyPairs.filter((pair: any) => pair[0] && pair[1]),
        how: state.joinType,
        suffixes: state.suffixes,
      },
    };
    const table = aq.from(this.currentData!);
    const context = { sources: this.sources, models: this.models };
    const result = applyTransform(table, transform, this.columns, context);
    const allData = result.objects();
    state.previewData = {
      rows: allData.slice(0, 100),
      totalRows: allData.length,
      columns: result.columnNames(),
    };
  } catch (error: any) {
    console.error('Join preview error:', error);
    state.previewError = error.message;
  } finally {
    state.isPreviewing = false;
  }
}

export async function applyJoinTransform(this: ChumakApp) {
  const state = this.joinDialogState;
  if (!state.rightModel) {
    await this.alert('Please select a model or source to join with');
    return;
  }
  if (state.joinType !== 'cross') {
    const completePairs = state.keyPairs.filter((pair: any) => pair[0] && pair[1]);
    if (completePairs.length === 0) {
      await this.alert('Please specify at least one complete key pair');
      return;
    }
  }

  try {
    const targetModel = this.models.find((m) => m.id === state.rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = this.computeModelUpToStep(targetModel, targetModel.steps.length - 1);
      targetModel.data = result.data;
    }
    const completePairs = state.keyPairs.filter((pair: any) => pair[0] && pair[1]);
    const transform = {
      join: {
        right: state.rightModel,
        on: completePairs,
        how: state.joinType,
        suffixes: state.suffixes,
      },
    };
    await this.runTransform('Join', transform);
  } catch (error: any) {
    console.error('Join transform setup error:', error);
    await this.alert('Error preparing join: ' + error.message);
  }
}
