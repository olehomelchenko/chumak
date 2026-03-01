import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export interface SortField {
  field: string;
  order: 'asc' | 'desc';
}

export const sortState = {
  fields: signal<SortField[]>([{ field: '', order: 'asc' }]),
};

export function resetSortState() {
  sortState.fields.value = [{ field: '', order: 'asc' }];
}

registerResetFunction(resetSortState);
