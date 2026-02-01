import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { SplitMode } from '../../../../types/modes';
import type { DataRow } from '../../../types';

export const splitState = {
  column: signal(''),
  delimiter: signal(','),
  isRegex: signal(false),
  mode: signal<SplitMode>('spread'),
  maxColumns: signal(10),
  keepOriginal: signal(false),
  error: signal<string | null>(null),
  previewData: signal<DataRow[]>([]),
  previewColumns: signal<string[]>([]),
  autoDetectedDelimiter: signal<string | null>(null),
  columnRenames: signal<Record<string, string>>({}),
};

export function resetSplitState() {
  splitState.column.value = '';
  splitState.delimiter.value = ',';
  splitState.isRegex.value = false;
  splitState.mode.value = 'spread';
  splitState.maxColumns.value = 10;
  splitState.keepOriginal.value = false;
  splitState.error.value = null;
  splitState.previewData.value = [];
  splitState.previewColumns.value = [];
  splitState.autoDetectedDelimiter.value = null;
  splitState.columnRenames.value = {};
}

registerResetFunction(resetSplitState);
