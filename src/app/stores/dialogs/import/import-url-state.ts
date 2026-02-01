import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const importUrlState = {
  url: signal(''),
  isFetching: signal(false),
  error: signal<string | null>(null),
};

export function resetImportUrlState() {
  importUrlState.url.value = '';
  importUrlState.isFetching.value = false;
  importUrlState.error.value = null;
}

registerResetFunction(resetImportUrlState);
