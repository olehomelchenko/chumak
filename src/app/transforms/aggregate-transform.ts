import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';

export function addAggregation(this: ChumakApp) {
  this.aggregateDialogState.aggregations.push({ output: '', func: 'mean', col: '' });
}

export function removeAggregation(this: ChumakApp, index: number) {
  this.aggregateDialogState.aggregations.splice(index, 1);
}

export function updateAggregateOutputName(this: ChumakApp, index: number) {
  const agg = this.aggregateDialogState.aggregations[index];
  if (agg.func === 'count') {
    agg.output = 'count';
  } else if (agg.col) {
    agg.output = `${agg.func}_${agg.col}`;
  }
}

export function constructAggregateStep(this: ChumakApp) {
  const { groupBy, aggregations } = this.aggregateDialogState;
  if (aggregations.length === 0) throw new Error('At least one aggregation is required.');
  const rollup: Record<string, string> = {};
  aggregations.forEach((agg: any) => {
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
  return { aggregate: { groupby: groupBy, rollup: rollup } };
}

export async function previewAggregate(this: ChumakApp) {
  this.aggregateDialogState.isPreviewing = true;
  this.aggregateDialogState.previewError = null;
  this.clearPreview();
  try {
    const step = this.constructAggregateStep();
    const samples = this.currentData!.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, this.columns);

    const result = this.preparePreviewData(resultTable, 50);
    const groupBy = this.aggregateDialogState.groupBy;
    const newCols = result.columns.filter((c: string) => !groupBy.includes(c));

    DialogStore.previewState.title.value = 'Aggregate Preview';
    DialogStore.previewState.stats.value = `Showing ${result.rows.length} rows, ${result.columns.length} columns`;
    DialogStore.previewState.columns.value = result.columns;
    DialogStore.previewState.newColumns.value = newCols;
    DialogStore.previewState.rows.value = result.rows;
  } catch (error: any) {
    this.aggregateDialogState.previewError = error.message;
  } finally {
    this.aggregateDialogState.isPreviewing = false;
  }
}

export async function applyAggregateTransform(this: ChumakApp) {
  try {
    const transform = this.constructAggregateStep();
    await this.runTransform('Aggregate', transform);
  } catch (error: any) {
    await this.alert(error.message);
  }
}
