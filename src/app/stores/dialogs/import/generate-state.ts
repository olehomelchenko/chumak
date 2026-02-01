import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const generateState = {
  sourceName: signal('generated_data'),
  rowCount: signal(100),
  isRowAuto: signal(false),
  columnName: signal('id'),
  type: signal('numberSequence'),
  config: signal<any>({ type: 'numberSequence', start: 1, step: 1, decimals: 0 }),
  error: signal<string | null>(null),
};

export function resetGenerateState() {
  generateState.sourceName.value = 'generated_data';
  generateState.rowCount.value = 100;
  generateState.isRowAuto.value = false;
  generateState.columnName.value = 'id';
  generateState.type.value = 'numberSequence';
  generateState.config.value = { type: 'numberSequence', start: 1, step: 1, decimals: 0 };
  generateState.error.value = null;
}

registerResetFunction(resetGenerateState);
