import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { SliceMode } from '../../../../types/modes';

export const sliceRowsState = {
  count: signal(10),
  mode: signal<SliceMode>('first'),
};

export function resetSliceRowsState() {
  sliceRowsState.count.value = 10;
  sliceRowsState.mode.value = 'first';
}

registerResetFunction(resetSliceRowsState);
