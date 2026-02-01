import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const textState = {
  column: signal(''),
  operations: signal<string[]>([]),
  removeOrigin: signal(false),
  error: signal<string | null>(null),
  previewData: signal<Array<{ input: string; output: any }>>([]),
};

export function resetTextState() {
  textState.column.value = '';
  textState.operations.value = [];
  textState.removeOrigin.value = false;
  textState.error.value = null;
  textState.previewData.value = [];
}

registerResetFunction(resetTextState);
