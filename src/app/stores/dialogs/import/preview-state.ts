import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { DataRow } from '../../../types';

export const previewState = {
  title: signal(''),
  stats: signal(''),
  columns: signal<string[]>([]),
  newColumns: signal<string[]>([]),
  rows: signal<DataRow[]>([]),
  isLoading: signal(false),
};

export function resetPreviewState() {
  previewState.title.value = '';
  previewState.stats.value = '';
  previewState.columns.value = [];
  previewState.newColumns.value = [];
  previewState.rows.value = [];
  previewState.isLoading.value = false;
}

registerResetFunction(resetPreviewState);
