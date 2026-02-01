import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { ImputeStrategy } from '../../../../types/modes';

export const imputeState = {
  column: signal(''),
  strategy: signal<ImputeStrategy>('constant'),
  value: signal(''),
  includeEmptyString: signal(false),
  previewRows: signal<any[] | null>(null),
  error: signal<string | null>(null),
};

export function resetImputeState() {
  imputeState.column.value = '';
  imputeState.strategy.value = 'constant';
  imputeState.value.value = '';
  imputeState.includeEmptyString.value = false;
  imputeState.previewRows.value = null;
  imputeState.error.value = null;
}

registerResetFunction(resetImputeState);
