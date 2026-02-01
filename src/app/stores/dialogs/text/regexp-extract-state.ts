import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const regexpExtractState = {
  sourceColumn: signal(''),
  pattern: signal(''),
  columnName: signal(''),
  group: signal(0),
  error: signal<string | null>(null),
};

export function resetRegexpExtractState() {
  regexpExtractState.sourceColumn.value = '';
  regexpExtractState.pattern.value = '';
  regexpExtractState.columnName.value = '';
  regexpExtractState.group.value = 0;
  regexpExtractState.error.value = null;
}

registerResetFunction(resetRegexpExtractState);
