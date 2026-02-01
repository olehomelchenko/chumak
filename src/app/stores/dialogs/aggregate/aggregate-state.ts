import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DataRow } from '../../../types';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

export const aggregateState = {
  groupBy: signal<string[]>([]),
  aggregations: signal<Aggregation[]>([]),
  previewData: signal<DataRow[] | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
};

export function resetAggregateState() {
  aggregateState.groupBy.value = [];
  aggregateState.aggregations.value = [];
  aggregateState.previewData.value = null;
  aggregateState.previewError.value = null;
  aggregateState.isPreviewing.value = false;
}

registerResetFunction(resetAggregateState);
