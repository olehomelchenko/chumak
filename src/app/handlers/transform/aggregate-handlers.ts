import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';

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

// Preview engine instance for aggregate operations
const aggregatePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.aggregateState;
    const data = AppStore.currentData.value;

    if (!data?.length || state.aggregations.value.length === 0) {
      return null;
    }

    const step = constructAggregateStep();
    const samples = data.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, AppStore.columns.value);

    const result = HelperHandlers.preparePreviewData.call(null as any, resultTable, 50);
    const groupBy = state.groupBy.value;
    const newCols = result.columns.filter((c: string) => !groupBy.includes(c));

    return {
      title: 'Aggregate Preview',
      stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
      columns: result.columns,
      newColumns: newCols,
      rows: result.rows,
    };
  },
  onError: (error) => {
    DialogStore.aggregateState.previewError.value = error.message;
  },
});

export function debouncedUpdateAggregatePreview() {
  aggregatePreview.trigger();
}

export function updateAggregatePreview() {
  const state = DialogStore.aggregateState;
  state.isPreviewing.value = true;
  state.previewError.value = null;
  try {
    aggregatePreview.compute();
  } finally {
    state.isPreviewing.value = false;
  }
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export async function applyAggregateTransform(callbacks: any) {
  try {
    const transform = constructAggregateStep();
    await StepService.runTransform('Aggregate', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
