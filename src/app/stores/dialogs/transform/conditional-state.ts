import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const conditionalState = {
  column: signal(''),
  conditions: signal<Array<{ when: string; then: string }>>([{ when: '', then: '' }]),
  else: signal(''),
  error: signal<string | null>(null),
};

export function resetConditionalState() {
  conditionalState.column.value = '';
  conditionalState.conditions.value = [{ when: '', then: '' }];
  conditionalState.else.value = '';
  conditionalState.error.value = null;
}

registerResetFunction(resetConditionalState);
