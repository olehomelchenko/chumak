import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DataRow } from '../../../types';
import type { PivotAggregation } from '../../../../types/modes';

export interface PivotOptions {
  sort: boolean;
  limit: number | null;
}

export const pivotState = {
  rowColumns: signal<string[]>([]),
  columnColumn: signal(''),
  valueColumn: signal(''),
  aggregation: signal<PivotAggregation>('sum'),
  options: signal<PivotOptions>({ sort: true, limit: null }),
  uniqueValueCount: signal(0),
  previewData: signal<DataRow[] | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
};

export function resetPivotState() {
  pivotState.rowColumns.value = [];
  pivotState.columnColumn.value = '';
  pivotState.valueColumn.value = '';
  pivotState.aggregation.value = 'sum';
  pivotState.options.value = { sort: true, limit: null };
  pivotState.uniqueValueCount.value = 0;
  pivotState.previewData.value = null;
  pivotState.previewError.value = null;
  pivotState.isPreviewing.value = false;
}

registerResetFunction(resetPivotState);
