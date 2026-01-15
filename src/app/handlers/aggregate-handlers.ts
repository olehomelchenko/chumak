import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as HelperHandlers from './helper-handlers';
import * as NotificationHandlers from './notification-handlers';

export function addAggregation() {
  const state = DialogStore.aggregateState;
  state.aggregations.value = [...state.aggregations.value, { output: '', func: 'mean', col: '' }];
}

export function removeAggregation(index: number) {
  const state = DialogStore.aggregateState;
  state.aggregations.value = state.aggregations.value.filter((_, i) => i !== index);
}

export function updateAggregateOutputName(index: number) {
  const state = DialogStore.aggregateState;
  const aggregations = [...state.aggregations.value];
  const agg = aggregations[index];
  if (agg.func === 'count') {
    agg.output = 'count';
  } else if (agg.col) {
    agg.output = `${agg.func}_${agg.col}`;
  }
  state.aggregations.value = aggregations;
}

export function constructAggregateStep() {
  const { groupBy, aggregations } = DialogStore.aggregateState;
  if (aggregations.value.length === 0) throw new Error('At least one aggregation is required.');
  const rollup: Record<string, string> = {};
  aggregations.value.forEach((agg: any) => {
    if (!agg.output) throw new Error('All aggregations must have an output name.');
    if (agg.output.trim() === '') throw new Error('Output name cannot be empty.');
    if (agg.func === 'count') {
      rollup[agg.output] = 'op.count()';
    } else if (agg.func === 'distinct') {
      if (!agg.col) throw new Error(`Column required for ${agg.func}`);
      rollup[agg.output] = `op.distinct('${agg.col}')`;
    } else {
      if (!agg.col) throw new Error(`Column required for ${agg.func}`);
      rollup[agg.output] = `op.${agg.func}('${agg.col}')`;
    }
  });
  return { aggregate: { groupby: groupBy.value, rollup: rollup } };
}

export async function previewAggregate() {
  const state = DialogStore.aggregateState;
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  state.isPreviewing.value = true;
  state.previewError.value = null;
  clearPreview();
  try {
    const step = constructAggregateStep();
    const samples = data!.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, columns);

    const result = HelperHandlers.preparePreviewData.call(null as any, resultTable, 50);
    const groupBy = state.groupBy.value;
    const newCols = result.columns.filter((c: string) => !groupBy.includes(c));

    DialogStore.previewState.title.value = 'Aggregate Preview';
    DialogStore.previewState.stats.value = `Showing ${result.rows.length} rows, ${result.columns.length} columns`;
    DialogStore.previewState.columns.value = result.columns;
    DialogStore.previewState.newColumns.value = newCols;
    DialogStore.previewState.rows.value = result.rows;
  } catch (error: any) {
    state.previewError.value = error.message;
  } finally {
    state.isPreviewing.value = false;
  }
}

export function clearPreview() {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

export async function applyAggregateTransform(callbacks: any) {
  try {
    const transform = constructAggregateStep();
    await StepService.runTransform('Aggregate', transform, callbacks);
  } catch (error: any) {
    await NotificationHandlers.alert.call(null as any, error.message);
  }
}
