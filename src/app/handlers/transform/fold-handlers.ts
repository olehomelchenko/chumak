import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import type { PreviewResult } from '../preview-engine';
import type { UnpivotMode } from '../../../types/modes';
import i18n from '../../../i18n';

/**
 * Pure function: compute which columns will be folded based on mode and selection.
 */
export function computeColumnsToFold(
  columns: string[],
  selectedColumns: boolean[],
  mode: UnpivotMode
): string[] {
  if (mode === 'fold') {
    return columns.filter((_c, idx) => selectedColumns[idx]);
  } else {
    return columns.filter((_c, idx) => !selectedColumns[idx]);
  }
}

/**
 * Pure preview compute for fold — called by useTransformPreview in the component.
 */
export function computeFoldPreview(
  columns: string[],
  selectedColumns: boolean[],
  mode: UnpivotMode,
  keyName: string,
  valueName: string
): PreviewResult | null {
  const data = AppStore.currentData.value;
  const colsToFold = computeColumnsToFold(columns, selectedColumns, mode);

  if (colsToFold.length === 0 || !data?.length) {
    return null;
  }

  const samples = data.slice(0, 20);
  const table = aq.from(samples);
  const step = {
    fold: {
      columns: colsToFold,
      as: [keyName || 'key', valueName || 'value'] as [string, string],
    },
  };

  const resultTable = applyTransform(table, step, columns);
  const previewRows = resultTable.objects();
  const resultColumns = resultTable.columnNames();
  const newCols = [keyName || 'key', valueName || 'value'];

  return {
    title: 'Unpivot Preview',
    stats: `Showing sample result: ${previewRows.length} rows produced`,
    columns: resultColumns,
    newColumns: newCols,
    rows: previewRows,
  };
}

export async function applyFoldTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const columns = AppStore.columns.value;
  const colsToFold = computeColumnsToFold(
    columns,
    state.selectedColumns as boolean[],
    state.mode as UnpivotMode
  );

  if (colsToFold.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.unpivotColumns', { ns: 'errors' }));
    return;
  }

  const transform = {
    fold: {
      columns: colsToFold,
      as: [(state.keyName as string) || 'key', (state.valueName as string) || 'value'] as [
        string,
        string,
      ],
    },
  };
  await StepService.runTransform('Fold', transform, callbacks);
}
