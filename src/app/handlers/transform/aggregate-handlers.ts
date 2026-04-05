import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import type { PreviewResult } from '../preview-engine';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

/**
 * Pure function: auto-generate output name for an aggregation.
 */
export function generateOutputName(agg: Aggregation): string {
  if (agg.func === 'count') return 'count';
  if (agg.col) return `${agg.func}_${agg.col}`;
  return agg.output;
}

/**
 * Pure function: construct aggregate transform step from explicit parameters.
 */
export function constructAggregateStep(groupBy: string[], aggregations: Aggregation[]) {
  if (aggregations.length === 0) throw new Error('At least one aggregation is required.');
  const rollup: Record<string, string> = {};
  aggregations.forEach((agg) => {
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
  return { aggregate: { groupby: groupBy, rollup } };
}

/**
 * Pure function: parse rollup op strings from a saved step back to Aggregation objects.
 */
export function parseRollupToAggregations(rollup: Record<string, string>): Aggregation[] {
  return Object.entries(rollup).map(([output, opStr]) => {
    const match = opStr.match(/op\.(\w+)\('([^']+)'\)/);
    if (match) {
      return { output, func: match[1], col: match[2] };
    }
    if (opStr === 'op.count()') {
      return { output, func: 'count', col: '' };
    }
    return { output, func: 'custom', col: '' };
  });
}

/**
 * Preview compute for aggregate — called from the component via createDebouncedPreview.
 */
export function computeAggregatePreview(
  groupBy: string[],
  aggregations: Aggregation[]
): PreviewResult | null {
  const data = AppStore.currentData.value;

  if (!data?.length || aggregations.length === 0) {
    return null;
  }

  const step = constructAggregateStep(groupBy, aggregations);
  const samples = data.slice(0, 50);
  const table = aq.from(samples);
  const resultTable = applyTransform(table, step, AppStore.columns.value);

  const result = HelperHandlers.preparePreviewData(resultTable, 50);
  const newCols = result.columns.filter((c: string) => !groupBy.includes(c));

  return {
    title: 'Aggregate Preview',
    stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
    columns: result.columns,
    newColumns: newCols,
    rows: result.rows,
  };
}

export async function applyAggregateTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  try {
    const transform = constructAggregateStep(
      state.groupBy as string[],
      state.aggregations as Aggregation[]
    );
    await StepService.runTransform('Aggregate', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
