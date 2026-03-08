import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DataRow } from '../../../types';

export const describeState = {
  selectedColumns: signal<string[]>([]),
  previewData: signal<DataRow[] | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
};

export function resetDescribeState() {
  describeState.selectedColumns.value = [];
  describeState.previewData.value = null;
  describeState.previewError.value = null;
  describeState.isPreviewing.value = false;
}

registerResetFunction(resetDescribeState);
