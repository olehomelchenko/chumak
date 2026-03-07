import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const importTextState = {
  text: signal(''),
  isEditMode: signal(false),
  targetSourceId: signal<string | null>(null),
};

export function resetImportTextState() {
  importTextState.text.value = '';
  importTextState.isEditMode.value = false;
  importTextState.targetSourceId.value = null;
}

registerResetFunction(resetImportTextState);
