import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const spreadState = {
  column: signal(''),
  limit: signal<number | undefined>(undefined),
  keepOriginal: signal(false),
};

export function resetSpreadState() {
  spreadState.column.value = '';
  spreadState.limit.value = undefined;
  spreadState.keepOriginal.value = false;
}

registerResetFunction(resetSpreadState);
