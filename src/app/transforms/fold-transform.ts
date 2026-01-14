import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';

export function toggleColumnForFold(this: ChumakApp, index: number) {
  // Simple toggle - works like a checkbox
  this.foldDialogState.selectedColumns[index] = !this.foldDialogState.selectedColumns[index];
  this.updateFoldPreview();
}

export function toggleFoldMode(this: ChumakApp) {
  // Toggle between 'keep' and 'fold' modes
  this.foldDialogState.mode = this.foldDialogState.mode === 'keep' ? 'fold' : 'keep';
  this.updateFoldPreview();
}

export function getColumnsToFold(this: ChumakApp): string[] {
  const { selectedColumns, mode } = this.foldDialogState;
  if (mode === 'fold') {
    // Selected columns are the ones to fold
    return this.columns.filter((_c, idx) => selectedColumns[idx]);
  } else {
    // 'keep' mode: selected columns are kept as index, fold everything else
    return this.columns.filter((_c, idx) => !selectedColumns[idx]);
  }
}

export function selectAllForFold(this: ChumakApp) {
  this.foldDialogState.selectedColumns = this.columns.map(() => true);
  this.updateFoldPreview();
}

export function selectNoneForFold(this: ChumakApp) {
  this.foldDialogState.selectedColumns = this.columns.map(() => false);
  this.updateFoldPreview();
}

export function updateFoldPreview(this: ChumakApp) {
  const { keyName, valueName } = this.foldDialogState;
  const colsToFold = this.getColumnsToFold();

  if (colsToFold.length === 0) {
    this.clearPreview();
    return;
  }

  try {
    const samples = this.currentData!.slice(0, 20);
    const table = aq.from(samples);
    const step = {
      fold: {
        columns: colsToFold,
        as: [keyName || 'key', valueName || 'value'],
      },
    };

    const resultTable = applyTransform(table, step, this.columns);
    const previewRows = resultTable.objects();
    const resultColumns = resultTable.columnNames();
    const newCols = [keyName || 'key', valueName || 'value'];

    this.previewState = {
      title: 'Unpivot Preview',
      stats: `Showing sample result: ${previewRows.length} rows produced`,
      columns: resultColumns,
      newColumns: newCols,
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch (e) {
    this.clearPreview();
  }
}

export async function applyFoldTransform(this: ChumakApp) {
  const { keyName, valueName } = this.foldDialogState;
  const colsToFold = this.getColumnsToFold();
  if (colsToFold.length === 0) {
    await this.alert('Please select at least one column to unpivot');
    return;
  }
  const transform = {
    fold: {
      columns: colsToFold,
      as: [keyName || 'key', valueName || 'value'],
    },
  };
  await this.runTransform('Fold', transform);
}
