import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';

export function constructDescribeStep() {
  const { selectedColumns } = DialogStore.describeState;
  if (selectedColumns.value.length === 0) {
    throw new Error('At least one column must be selected.');
  }
  return { describe: { columns: selectedColumns.value } };
}

const describePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.describeState;
    const data = AppStore.currentData.value;

    if (!data?.length || state.selectedColumns.value.length === 0) {
      return null;
    }

    const step = constructDescribeStep();
    const table = aq.from(data);
    const resultTable = applyTransform(table, step, AppStore.columns.value);

    const result = HelperHandlers.preparePreviewData(resultTable, 20);

    return {
      title: 'Summary Statistics',
      stats: `${result.rows.length} statistics × ${state.selectedColumns.value.length} columns`,
      columns: result.columns,
      newColumns: result.columns.filter((c: string) => c !== 'statistic'),
      rows: result.rows,
    };
  },
  onError: (error) => {
    DialogStore.describeState.previewError.value = error.message;
  },
});

export function debouncedUpdateDescribePreview() {
  describePreview.trigger();
}

export function updateDescribePreview() {
  const state = DialogStore.describeState;
  state.isPreviewing.value = true;
  state.previewError.value = null;
  try {
    describePreview.compute();
  } finally {
    state.isPreviewing.value = false;
  }
}

export { clearPreview };

export async function applyDescribeTransform(callbacks: any) {
  try {
    const transform = constructDescribeStep();
    await StepService.runTransform('Describe', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
