import * as aq from 'arquero';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { confirm } from '../core/notification-handlers';
import type { PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

/**
 * Pure preview compute for merge — called by useTransformPreview in the component.
 */
export function computeMergePreview(
  columns: string[],
  separator: string,
  columnName: string,
  allColumns: string[]
): PreviewResult | null {
  if (!columns || columns.length === 0) return null;

  if (!columnName) return null;

  // Check if all selected columns exist
  const missingColumns = columns.filter((col) => !allColumns.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Columns not found: ${missingColumns.join(', ')}`);
  }

  // Build the concat expression
  const expression = buildConcatExpression(columns, separator);
  const ast = parseExpression(expression);

  const data = AppStore.currentData.value;
  const previewLimit = Math.min(data!.length, 50);
  const samples = data!.slice(0, previewLimit);
  const outputCol = columnName;

  const previewRows = samples.map((row: any) => {
    try {
      const result = interpretAST(ast, row);
      return { ...row, [outputCol]: result };
    } catch {
      return { ...row, [outputCol]: '(error)' };
    }
  });

  const previewCols = [...columns, outputCol];

  return {
    title: `Merge: ${outputCol}`,
    stats: `Merging ${columns.length} columns`,
    columns: previewCols,
    newColumns: [outputCol],
    rows: previewRows,
  };
}

export function buildConcatExpression(columns: string[], separator: string): string {
  if (columns.length === 0) return '""';

  if (columns.length === 1) {
    const col = escapeColumnName(columns[0]);
    return `(${col} ?? "")`;
  }

  const escapedSep = JSON.stringify(separator);
  const parts: string[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = escapeColumnName(columns[i]);
    if (i === 0) {
      parts.push(`(${col} ?? "")`);
    } else {
      parts.push(escapedSep);
      parts.push(`(${col} ?? "")`);
    }
  }

  return parts.join(' + ');
}

export function escapeColumnName(name: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return name;
  return `[${name}]`;
}

export async function applyMergeTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;
  const columns = state.columns as string[];
  const separator = state.separator as string;
  const columnName = state.columnName as string;
  const removeOriginal = state.removeOriginal as boolean;
  const allColumns = AppStore.columns.value;

  if (!columns || columns.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.mergeColumns', { ns: 'errors' }));
    return;
  }

  if (!columnName) {
    await callbacks.onError?.(i18n.t('validation.required.outputColumnName', { ns: 'errors' }));
    return;
  }

  if (allColumns.includes(columnName)) {
    const confirmed = await confirm(
      i18n.t('confirms.overwriteColumn', {
        ns: 'common',
        message: i18n.t('validation.duplicate.columnExists', {
          ns: 'errors',
          name: columnName,
        }),
      }),
      undefined,
      i18n.t('buttons.overwrite', { ns: 'common' })
    );
    if (!confirmed) return;
  }

  if (callbacks.onTransformStart) callbacks.onTransformStart('Merging columns...');
  try {
    const expression = buildConcatExpression(columns, separator);
    const deriveTransform = { derive: { [columnName]: expression } };

    const data = AppStore.currentData.value;
    const sources = AppStore.sources.value;
    const models = AppStore.models.value;
    let table = aq.from(data!);
    const context = { sources, models };

    let result = applyTransform(table, deriveTransform, allColumns, context);

    await StepService.applyStepResult(deriveTransform, result, {
      ...callbacks,
      closeDialogAfter: !removeOriginal,
    });

    if (removeOriginal) {
      const removeTransform = { remove: columns };
      await StepService.runTransform('Remove Original Columns', removeTransform, callbacks);
    }
  } catch (error: any) {
    console.error('Merge transform error:', error);
    await callbacks.onError?.(
      i18n.t('transform.mergeFailed', { ns: 'errors', message: error.message })
    );
  } finally {
    if (callbacks.onTransformEnd) callbacks.onTransformEnd();
  }
}
