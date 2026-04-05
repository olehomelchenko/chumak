import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import type { PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

/**
 * Pure function: build describe step from selected columns.
 */
export function constructDescribeStep(selectedColumns: string[]) {
  return { describe: { columns: selectedColumns } };
}

/**
 * Pure preview compute for describe — called manually from the component.
 */
export function computeDescribePreview(selectedColumns: string[]): PreviewResult | null {
  const data = AppStore.currentData.value;

  if (!data?.length || selectedColumns.length === 0) {
    return null;
  }

  const step = constructDescribeStep(selectedColumns);
  const table = aq.from(data);
  const resultTable = applyTransform(table, step, AppStore.columns.value);

  const result = HelperHandlers.preparePreviewData(resultTable, 20);

  return {
    title: 'Summary Statistics',
    stats: `${result.rows.length} statistics × ${selectedColumns.length} columns`,
    columns: result.columns,
    newColumns: result.columns.filter((c: string) => c !== 'statistic'),
    rows: result.rows,
  };
}

export async function applyDescribeTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const selectedColumns = state.selectedColumns as string[];
  if (!selectedColumns || selectedColumns.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.atLeastOneColumn', { ns: 'errors' }));
    return;
  }

  try {
    const transform = constructDescribeStep(selectedColumns);
    await StepService.runTransform('Describe', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
