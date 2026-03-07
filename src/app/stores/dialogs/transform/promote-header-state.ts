import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const promoteHeaderState = {
  skipRows: signal(0),
};

export function resetPromoteHeaderState() {
  promoteHeaderState.skipRows.value = 0;
}

registerResetFunction(resetPromoteHeaderState);
