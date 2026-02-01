import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const indexState = {
  columnName: signal('row_index'),
  startFrom: signal(1),
};

export function resetIndexState() {
  indexState.columnName.value = 'index';
  indexState.startFrom.value = 1;
}

registerResetFunction(resetIndexState);
