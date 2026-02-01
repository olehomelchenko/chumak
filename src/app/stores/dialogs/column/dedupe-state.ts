import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DedupeMode } from '../../../../types/modes';

export const dedupeState = {
  selectedColumns: signal<boolean[]>([]),
  useAllColumns: signal(true),
  duplicateCount: signal(0),
  mode: signal<DedupeMode>('remove'),
};

export function resetDedupeState() {
  dedupeState.selectedColumns.value = [];
  dedupeState.useAllColumns.value = true;
  dedupeState.duplicateCount.value = 0;
  dedupeState.mode.value = 'remove';
}

registerResetFunction(resetDedupeState);
