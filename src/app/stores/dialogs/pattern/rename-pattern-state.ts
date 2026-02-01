import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const renamePatternState = {
  find: signal(''),
  replace: signal(''),
  regex: signal(false),
  error: signal<string | null>(null),
};

export function resetRenamePatternState() {
  renamePatternState.find.value = '';
  renamePatternState.replace.value = '';
  renamePatternState.regex.value = false;
  renamePatternState.error.value = null;
}

registerResetFunction(resetRenamePatternState);
