import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import type { PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';
import {
  AGGREGATE_FUNCTIONS,
  COLUMN_REQUIRED_FUNCTIONS,
} from '../../../core/transforms/window-constants';

export interface WindowFunction {
  func: string; // 'lag', 'lead', 'row_number', 'rank', 'sum', 'mean', etc.
  sourceCol: string; // Source column (for lag/lead/first_value/aggregates/etc.)
  offset: number; // For lag/lead/ntile/nth_value
  defaultValue: string; // For lag/lead (as string for UI)
  output: string; // Output column name
  frameStart: number | null; // Window frame start (null = unbounded, only for aggregates)
  frameEnd: number | null; // Window frame end (null = unbounded, only for aggregates)
}

export interface OrderByItem {
  field: string;
  order: 'asc' | 'desc';
}

// --- Preset mechanism for RibbonToolbar quick actions ---

let pendingPreset: WindowFunction[] | null = null;

export function setWindowPreset(preset: WindowFunction[]) {
  pendingPreset = preset;
}

export function consumeWindowPreset(): WindowFunction[] | null {
  const p = pendingPreset;
  pendingPreset = null;
  return p;
}

/**
 * Parse window derive expressions back to WindowFunction objects.
 * Used when editing an existing window step.
 */
export function parseWindowDeriveToFunctions(
  derive: Record<string, string>,
  frames?: Record<string, [number | null, number | null]>
): WindowFunction[] {
  return Object.entries(derive).map(([output, exprString]) => {
    const match = (exprString as string).match(/^op\.(\w+)\(([^)]*)\)$/);
    if (!match) {
      return {
        func: 'row_number',
        sourceCol: '',
        offset: 1,
        defaultValue: '',
        output,
        frameStart: null,
        frameEnd: 0,
      };
    }

    const func = match[1];
    const argsStr = match[2].trim();
    let sourceCol = '';
    let offset = 1;
    let defaultValue = '';

    if (argsStr) {
      const args = argsStr.match(/(?:[^,'"]+|'[^']*'|"[^"]*")+/g) || [];

      if (args[0]) {
        const trimmed = args[0].trim();
        if (
          (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ) {
          sourceCol = trimmed.slice(1, -1);
        }
      }

      if (args[1]) {
        const numVal = parseInt(args[1].trim(), 10);
        if (!isNaN(numVal)) offset = numVal;
      }

      if (args[2]) {
        defaultValue = args[2].trim();
      }
    }

    const frameSpec = frames?.[output];
    const frameStart = frameSpec ? frameSpec[0] : null;
    const frameEnd = frameSpec ? frameSpec[1] : 0;

    return { func, sourceCol, offset, defaultValue, output, frameStart, frameEnd };
  });
}

/**
 * Build the window expression string for a window function (pure)
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
 * Construct the window transform step from explicit parameters (pure).
 */
export function constructWindowStep(
  orderBy: OrderByItem[],
  partitionBy: string[],
  windowFunctions: WindowFunction[]
) {
  if (orderBy.length === 0) {
    throw new Error(i18n.t('validation.selection.orderByColumn', { ns: 'errors' }));
  }

  if (windowFunctions.length === 0) {
    throw new Error(i18n.t('validation.selection.windowFunction', { ns: 'errors' }));
  }

  // Validate all window functions have output names
  for (const wf of windowFunctions) {
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

  for (const wf of windowFunctions) {
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
      orderBy,
      ...(partitionBy.length > 0 && { partitionBy }),
      derive,
      ...(hasFrames && { frames }),
    },
  };
}

/**
 * Compute window preview (pure — called from component via createDebouncedPreview).
 */
export function computeWindowPreview(
  orderBy: OrderByItem[],
  partitionBy: string[],
  windowFunctions: WindowFunction[]
): PreviewResult | null {
  const data = AppStore.currentData.value;

  if (!data?.length || orderBy.length === 0 || windowFunctions.length === 0) {
    return null;
  }

  const step = constructWindowStep(orderBy, partitionBy, windowFunctions);
  const samples = data.slice(0, 50);
  const table = aq.from(samples);
  const resultTable = applyTransform(table, step, AppStore.columns.value);

  const result = HelperHandlers.preparePreviewData(resultTable, 50);
  const existingCols = AppStore.columns.value;
  const newCols = result.columns.filter((c: string) => !existingCols.includes(c));

  return {
    title: 'Window Preview',
    stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
    columns: result.columns,
    newColumns: newCols,
    rows: result.rows,
  };
}

export async function applyWindowTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  try {
    const transform = constructWindowStep(
      state.orderBy as OrderByItem[],
      state.partitionBy as string[],
      state.windowFunctions as WindowFunction[]
    );
    await StepService.runTransform('Window', transform, callbacks);
  } catch (error: any) {
    await callbacks.onError?.(error.message);
  }
}
