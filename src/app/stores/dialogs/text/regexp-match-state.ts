import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const regexpMatchState = {
  sourceColumn: signal(''),
  pattern: signal(''),
  columnName: signal(''),
  error: signal<string | null>(null),
};

export function resetRegexpMatchState() {
  regexpMatchState.sourceColumn.value = '';
  regexpMatchState.pattern.value = '';
  regexpMatchState.columnName.value = '';
  regexpMatchState.error.value = null;
}

registerResetFunction(resetRegexpMatchState);
