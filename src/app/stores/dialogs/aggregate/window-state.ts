import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DataRow } from '../../../types';

export interface WindowFunction {
  func: string; // 'lag', 'lead', 'row_number', 'rank', 'sum', 'mean', etc.
  sourceCol: string; // Source column (for lag/lead/first_value/aggregates/etc.)
  offset: number; // For lag/lead/ntile/nth_value
  defaultValue: string; // For lag/lead (as string for UI)
  output: string; // Output column name
  frameStart: number | null; // Window frame start (null = unbounded, only for aggregates)
  frameEnd: number | null; // Window frame end (null = unbounded, only for aggregates)
}

export interface OrderByItem {
  field: string;
  order: 'asc' | 'desc';
}

export const windowState = {
  orderBy: signal<OrderByItem[]>([]),
  partitionBy: signal<string[]>([]),
  windowFunctions: signal<WindowFunction[]>([]),
  previewData: signal<DataRow[] | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
};

export function resetWindowState() {
  windowState.orderBy.value = [];
  windowState.partitionBy.value = [];
  windowState.windowFunctions.value = [];
  windowState.previewData.value = null;
  windowState.previewError.value = null;
  windowState.isPreviewing.value = false;
}

registerResetFunction(resetWindowState);
