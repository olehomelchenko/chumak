import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export type ReplaceFindMode = 'value' | 'errors' | 'null';

export const replaceState = {
  column: signal(''),
  findMode: signal<ReplaceFindMode>('value'),
  findValue: signal(''),
  replaceValue: signal(''),
  isRegex: signal(false),
};

export function resetReplaceState() {
  replaceState.column.value = '';
  replaceState.findMode.value = 'value';
  replaceState.findValue.value = '';
  replaceState.replaceValue.value = '';
  replaceState.isRegex.value = false;
}

registerResetFunction(resetReplaceState);
