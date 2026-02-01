import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { UnpivotMode } from '../../../../types/modes';

export const foldState = {
  keyName: signal('key'),
  valueName: signal('value'),
  selectedColumns: signal<boolean[]>([]),
  mode: signal<UnpivotMode>('keep'),
};

export function resetFoldState() {
  foldState.keyName.value = 'key';
  foldState.valueName.value = 'value';
  foldState.selectedColumns.value = [];
  foldState.mode.value = 'keep';
}

registerResetFunction(resetFoldState);
