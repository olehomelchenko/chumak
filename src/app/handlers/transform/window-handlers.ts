import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import type { WindowFunction } from '../../stores/dialogs/aggregate/window-state';

/** Window functions that require a source column */
const COLUMN_REQUIRED_FUNCTIONS = [
  'lag',
  'lead',
  'first_value',
  'last_value',
  'nth_value',
  'fill_down',
  'fill_up',
];

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
      if (!wf.sourceCol) throw new Error(`Source column required for ${wf.func}`);
      const defaultArg = wf.defaultValue ? `, ${wf.defaultValue}` : '';
      return `op.${wf.func}('${wf.sourceCol}', ${wf.offset || 1}${defaultArg})`;
    }

    case 'first_value':
    case 'last_value':
    case 'fill_down':
    case 'fill_up':
      if (!wf.sourceCol) throw new Error(`Source column required for ${wf.func}`);
      return `op.${wf.func}('${wf.sourceCol}')`;

    case 'nth_value':
      if (!wf.sourceCol) throw new Error(`Source column required for ${wf.func}`);
      return `op.nth_value('${wf.sourceCol}', ${wf.offset || 1})`;

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
    throw new Error('At least one order by column is required for window functions.');
  }

  if (windowFunctions.value.length === 0) {
    throw new Error('At least one window function is required.');
  }

  // Validate all window functions have output names
  for (const wf of windowFunctions.value) {
    if (!wf.output || wf.output.trim() === '') {
      throw new Error('All window functions must have an output column name.');
    }
    if (COLUMN_REQUIRED_FUNCTIONS.includes(wf.func) && !wf.sourceCol) {
      throw new Error(`Source column is required for ${wf.func}.`);
    }
  }

  // Build derive expressions
  const derive: Record<string, string> = {};
  for (const wf of windowFunctions.value) {
    derive[wf.output] = buildWindowExpression(wf);
  }

  return {
    window: {
      orderBy: orderBy.value,
      ...(partitionBy.value.length > 0 && { partitionBy: partitionBy.value }),
      derive,
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
