import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as NotificationHandlers from './notification-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from './preview-engine';

export function toggleColumnForFold(index: number) {
  const state = DialogStore.foldState;
  const selected = [...state.selectedColumns.value];
  selected[index] = !selected[index];
  state.selectedColumns.value = selected;
  updateFoldPreview();
}

export function toggleFoldMode() {
  const state = DialogStore.foldState;
  state.mode.value = state.mode.value === 'keep' ? 'fold' : 'keep';
  updateFoldPreview();
}

export function getColumnsToFold(): string[] {
  const state = DialogStore.foldState;
  const columns = AppStore.columns.value;
  const { selectedColumns, mode } = state;
  if (mode.value === 'fold') {
    return columns.filter((_c, idx) => selectedColumns.value[idx]);
  } else {
    return columns.filter((_c, idx) => !selectedColumns.value[idx]);
  }
}

export function selectAllForFold() {
  const state = DialogStore.foldState;
  const columns = AppStore.columns.value;
  state.selectedColumns.value = columns.map(() => true);
  updateFoldPreview();
}

export function selectNoneForFold() {
  const state = DialogStore.foldState;
  const columns = AppStore.columns.value;
  state.selectedColumns.value = columns.map(() => false);
  updateFoldPreview();
}

// Preview engine instance for fold operations
const foldPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.foldState;
    const data = AppStore.currentData.value;
    const columns = AppStore.columns.value;
    const { keyName, valueName } = state;
    const colsToFold = getColumnsToFold();

    if (colsToFold.length === 0 || !data?.length) {
      return null;
    }

    const samples = data.slice(0, 20);
    const table = aq.from(samples);
    const step = {
      fold: {
        columns: colsToFold,
        as: [keyName.value || 'key', valueName.value || 'value'] as [string, string],
      },
    };

    const resultTable = applyTransform(table, step, columns);
    const previewRows = resultTable.objects();
    const resultColumns = resultTable.columnNames();
    const newCols = [keyName.value || 'key', valueName.value || 'value'];

    return {
      title: 'Unpivot Preview',
      stats: `Showing sample result: ${previewRows.length} rows produced`,
      columns: resultColumns,
      newColumns: newCols,
      rows: previewRows,
    };
  },
});

export function debouncedUpdateFoldPreview() {
  foldPreview.trigger();
}

export function updateFoldPreview() {
  foldPreview.compute();
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export async function applyFoldTransform(callbacks: any) {
  const state = DialogStore.foldState;
  const { keyName, valueName } = state;
  const colsToFold = getColumnsToFold();
  if (colsToFold.length === 0) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please select at least one column to unpivot'
    );
    return;
  }
  const transform = {
    fold: {
      columns: colsToFold,
      as: [keyName.value || 'key', valueName.value || 'value'] as [string, string],
    },
  };
  await StepService.runTransform('Fold', transform, callbacks);
}
