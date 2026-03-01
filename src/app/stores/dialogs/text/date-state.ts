import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DateOperation } from '../../../../types/modes';

export const dateState = {
  column: signal(''),
  operation: signal<DateOperation>('extract'),
  extractParts: signal<string[]>([]),
  truncateUnits: signal<string[]>([]),
  truncateIntervals: signal<Record<string, number>>({}),
  outputColumn: signal(''),
  removeOrigin: signal(false),
  error: signal<string | null>(null),
  previewData: signal<Array<{ input: string; output: any }>>([]),
};

export function resetDateState() {
  dateState.column.value = '';
  dateState.operation.value = 'extract';
  dateState.extractParts.value = ['year'];
  dateState.truncateUnits.value = ['month'];
  dateState.truncateIntervals.value = {};
  dateState.outputColumn.value = '';
  dateState.removeOrigin.value = false;
  dateState.error.value = null;
  dateState.previewData.value = [];
}

registerResetFunction(resetDateState);
