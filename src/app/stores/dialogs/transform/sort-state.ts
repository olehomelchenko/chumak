import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const sortState = {
  field: signal(''),
  order: signal<'asc' | 'desc'>('asc'),
};

export function resetSortState() {
  sortState.field.value = '';
  sortState.order.value = 'asc';
}

registerResetFunction(resetSortState);
