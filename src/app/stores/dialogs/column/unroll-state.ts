import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const unrollState = {
  column: signal(''),
  indices: signal(false),
  keepOriginal: signal(false),
};

export function resetUnrollState() {
  unrollState.column.value = '';
  unrollState.indices.value = false;
  unrollState.keepOriginal.value = false;
}

registerResetFunction(resetUnrollState);
