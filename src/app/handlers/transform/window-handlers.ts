import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import type { WindowFunction } from '../../stores/dialogs/aggregate/window-state';
import i18n from '../../../i18n';
import {
  AGGREGATE_FUNCTIONS,
  COLUMN_REQUIRED_FUNCTIONS,
} from '../../../core/transforms/window-constants';

/**
 * Build the window expression string for a window function
 */
function buildWindowExpression(wf: WindowFunction): string {
  switch (wf.func) {
    case 'row_number':
    case 'rank':
    case 'dense_rank':
    case 'avg_rank':
    case 'percent_rank':
    case 'cume_dist':
      return `op.${wf.func}()`;

    case 'ntile':
      return `op.ntile(${wf.offset || 4})`;

    case 'lag':
    case 'lead': {
      if (!wf.sourceCol)
        throw new Error(
          i18n.t('validation.selection.columnForFunction', { ns: 'errors', func: wf.func })
        );
      const defaultArg = wf.defaultValue ? `, ${wf.defaultValue}` : '';
      return `op.${wf.func}('${wf.sourceCol}', ${wf.offset || 1}${defaultArg})`;
    }

    case 'first_value':
    case 'last_value':
    case 'fill_down':
    case 'fill_up':
      if (!wf.sourceCol)
        throw new Error(
          i18n.t('validation.selection.columnForFunction', { ns: 'errors', func: wf.func })
        );
      return `op.${wf.func}('${wf.sourceCol}')`;

    case 'nth_value':
      if (!wf.sourceCol)
        throw new Error(
          i18n.t('validation.selection.columnForFunction', { ns: 'errors', func: wf.func })
        );
      return `op.nth_value('${wf.sourceCol}', ${wf.offset || 1})`;

    // Aggregate functions (used as rolling/cumulative via aq.rolling in handler)
    case 'sum':
    case 'mean':
    case 'min':
    case 'max':
    case 'product':
    case 'median':
    case 'mode':
    case 'stdev':
    case 'variance':
      if (!wf.sourceCol)
        throw new Error(
          i18n.t('validation.selection.columnForFunction', { ns: 'errors', func: wf.func })
        );
      return `op.${wf.func}('${wf.sourceCol}')`;

    case 'count':
      return `op.count()`;

    default:
      throw new Error(`Unknown window function: ${wf.func}`);
  }
}

/**
 * Construct the window transform step from dialog state
 */
export function constructWindowStep() {
  const { orderBy, partitionBy, windowFunctions } = DialogStore.windowState;

  if (orderBy.value.length === 0) {
    throw new Error(i18n.t('validation.selection.orderByColumn', { ns: 'errors' }));
  }

  if (windowFunctions.value.length === 0) {
    throw new Error(i18n.t('validation.selection.windowFunction', { ns: 'errors' }));
  }

  // Validate all window functions have output names
  for (const wf of windowFunctions.value) {
    if (!wf.output || wf.output.trim() === '') {
      throw new Error('All window functions must have an output column name.');
    }
    if (COLUMN_REQUIRED_FUNCTIONS.includes(wf.func) && !wf.sourceCol) {
      throw new Error(
        i18n.t('validation.selection.columnForFunction', { ns: 'errors', func: wf.func })
      );
    }
  }

  // Build derive expressions and frames
  const derive: Record<string, string> = {};
  const frames: Record<string, [number | null, number | null]> = {};
  let hasFrames = false;

  for (const wf of windowFunctions.value) {
    derive[wf.output] = buildWindowExpression(wf);

    // Only aggregate functions support frame specification
    if (AGGREGATE_FUNCTIONS.includes(wf.func)) {
      const isDefaultFrame = wf.frameStart === null && wf.frameEnd === 0;
      if (!isDefaultFrame) {
        frames[wf.output] = [wf.frameStart, wf.frameEnd];
        hasFrames = true;
      }
    }
  }

  return {
    window: {
      orderBy: orderBy.value,
      ...(partitionBy.value.length > 0 && { partitionBy: partitionBy.value }),
      derive,
      ...(hasFrames && { frames }),
    },
  };
}

// Preview engine instance for window operations
const windowPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.windowState;
    const data = AppStore.currentData.value;

    if (
      !data?.length ||
      state.orderBy.value.length === 0 ||
      state.windowFunctions.value.length === 0
    ) {
      return null;
    }

    const step = constructWindowStep();
    const samples = data.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, AppStore.columns.value);

    const result = HelperHandlers.preparePreviewData.call(null as any, resultTable, 50);
    const existingCols = AppStore.columns.value;
    const newCols = result.columns.filter((c: string) => !existingCols.includes(c));

    return {
      title: 'Window Preview',
      stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
      columns: result.columns,
      newColumns: newCols,
      rows: result.rows,
    };
  },
  onError: (error) => {
    DialogStore.windowState.previewError.value = error.message;
  },
});

export function debouncedUpdateWindowPreview() {
  windowPreview.trigger();
}

export function updateWindowPreview() {
  const state = DialogStore.windowState;
  state.isPreviewing.value = true;
  state.previewError.value = null;
  try {
    windowPreview.compute();
  } finally {
    state.isPreviewing.value = false;
  }
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export async function applyWindowTransform(callbacks: any) {
  try {
    const transform = constructWindowStep();
    await StepService.runTransform('Window', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
