import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const typeConversionState = {
  column: signal<string | null>(null),
  targetType: signal<string | null>(null),
};

export function resetTypeConversionState() {
  typeConversionState.column.value = null;
  typeConversionState.targetType.value = null;
}

registerResetFunction(resetTypeConversionState);
