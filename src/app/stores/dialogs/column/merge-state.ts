import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const mergeState = {
  columns: signal<string[]>([]),
  separator: signal(' '),
  columnName: signal(''),
  removeOriginal: signal(false),
  error: signal<string | null>(null),
};

export function resetMergeState() {
  mergeState.columns.value = [];
  mergeState.separator.value = ' ';
  mergeState.columnName.value = '';
  mergeState.removeOriginal.value = false;
  mergeState.error.value = null;
}

registerResetFunction(resetMergeState);
