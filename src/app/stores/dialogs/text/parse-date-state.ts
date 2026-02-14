import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const parseDateState = {
  column: signal(''),
  format: signal(''),
  error: signal<string | null>(null),
};

export function resetParseDateState() {
  parseDateState.column.value = '';
  parseDateState.format.value = '';
  parseDateState.error.value = null;
}

registerResetFunction(resetParseDateState);
