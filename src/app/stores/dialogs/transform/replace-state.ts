import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const replaceState = {
  column: signal(''),
  findValue: signal(''),
  replaceValue: signal(''),
  isRegex: signal(false),
};

export function resetReplaceState() {
  replaceState.column.value = '';
  replaceState.findValue.value = '';
  replaceState.replaceValue.value = '';
  replaceState.isRegex.value = false;
}

registerResetFunction(resetReplaceState);
