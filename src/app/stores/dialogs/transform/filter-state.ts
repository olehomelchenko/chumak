import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { FilterPreviewMode } from '../../../../types/modes';

export const filterState = {
  expression: signal(''),
  error: signal<string | null>(null),
  previewMode: signal<FilterPreviewMode>('all'),
};

export function resetFilterState() {
  filterState.expression.value = '';
  filterState.error.value = null;
  filterState.previewMode.value = 'all';
}

registerResetFunction(resetFilterState);
