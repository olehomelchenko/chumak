import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const deriveState = {
  columnName: signal(''),
  expression: signal(''),
  error: signal<string | null>(null),
};

export function resetDeriveState() {
  deriveState.columnName.value = '';
  deriveState.expression.value = '';
  deriveState.error.value = null;
}

registerResetFunction(resetDeriveState);
