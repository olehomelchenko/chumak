import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const appendState = {
  leftModel: signal<string | null>(null),
  targetModel: signal<string | null>(null),
  leftColumns: signal<string[]>([]),
  rightColumns: signal<string[]>([]),
  selectedLeftColumns: signal<string[]>([]),
  selectedRightColumns: signal<string[]>([]),
  removeDuplicates: signal(false),
  previewData: signal<any | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
  previewTableId: signal<string | null>(null),
};

export function resetAppendState() {
  appendState.leftModel.value = null;
  appendState.targetModel.value = null;
  appendState.leftColumns.value = [];
  appendState.rightColumns.value = [];
  appendState.selectedLeftColumns.value = [];
  appendState.selectedRightColumns.value = [];
  appendState.removeDuplicates.value = false;
  appendState.previewData.value = null;
  appendState.previewError.value = null;
  appendState.isPreviewing.value = false;
  appendState.previewTableId.value = null;
}

registerResetFunction(resetAppendState);
