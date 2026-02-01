import * as aq from 'arquero';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';

// Preview engine instance for merge operations
const mergePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.mergeState;
    const { columns, separator, columnName } = state;
    const data = AppStore.currentData.value;
    const allColumns = AppStore.columns.value;

    state.error.value = null;

    if (!columns.value || columns.value.length === 0) {
      return null;
    }

    if (!columnName.value) {
      state.error.value = 'Please enter an output column name';
      return null;
    }

    // Check if all selected columns exist
    const missingColumns = columns.value.filter((col) => !allColumns.includes(col));
    if (missingColumns.length > 0) {
      state.error.value = `Columns not found: ${missingColumns.join(', ')}`;
      return null;
    }

    // Build the concat expression
    const expression = buildConcatExpression(columns.value, separator.value);

    // Validate expression
    const ast = parseExpression(expression);

    // Generate preview
    const previewLimit = Math.min(data!.length, 50);
    const samples = data!.slice(0, previewLimit);
    const outputCol = columnName.value;

    const previewRows = samples.map((row: any) => {
      try {
        const result = interpretAST(ast, row);
        return { ...row, [outputCol]: result };
      } catch {
        return { ...row, [outputCol]: '(error)' };
      }
    });

    // Show selected columns + new merged column
    const previewCols = [...columns.value, outputCol];

    return {
      title: `Merge: ${outputCol}`,
      stats: `Merging ${columns.value.length} columns`,
      columns: previewCols,
      newColumns: [outputCol],
      rows: previewRows,
    };
  },
  onError: (error) => {
    DialogStore.mergeState.error.value = error.message;
  },
});

export function selectMergeColumns(selectedColumns: string[]) {
  const state = DialogStore.mergeState;
  state.columns.value = selectedColumns;
  updateMergePreview();
}

export function debouncedUpdateMergePreview() {
  mergePreview.trigger();
}

export function updateMergePreview() {
  mergePreview.compute();
}

function buildConcatExpression(columns: string[], separator: string): string {
  if (columns.length === 0) {
    return '""';
  }

  if (columns.length === 1) {
    // Single column - convert to string, handling null
    const col = escapeColumnName(columns[0]);
    return `(${col} ?? "")`;
  }

  // Multiple columns - build: col1 + sep + col2 + sep + col3
  // Use ?? to handle null values (convert to empty string)
  const escapedSep = JSON.stringify(separator);
  const parts: string[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = escapeColumnName(columns[i]);
    // Handle null values and add separator (except for first column)
    if (i === 0) {
      parts.push(`(${col} ?? "")`);
    } else {
      parts.push(escapedSep);
      parts.push(`(${col} ?? "")`);
    }
  }

  return parts.join(' + ');
}

function escapeColumnName(name: string): string {
  // If column name has spaces or special chars, use bracket notation
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return name;
  }
  return `[${name}]`;
}

// clearPreview is exported from preview-engine
export { clearPreview };

export async function applyMergeTransform(callbacks: any, app?: any) {
  const state = DialogStore.mergeState;
  const { columns, separator, columnName, removeOriginal } = state;
  const allColumns = AppStore.columns.value;

  if (!columns.value || columns.value.length === 0) {
    await callbacks.onError?.('Please select at least one column to merge');
    return;
  }

  if (!columnName.value) {
    await callbacks.onError?.('Please enter an output column name');
    return;
  }

  if (allColumns.includes(columnName.value) && app) {
    const confirmed = await app.confirm(
      `Column "${columnName.value}" already exists. It will be overwritten. Continue?`
    );
    if (!confirmed) return;
  }

  if (callbacks.onTransformStart) callbacks.onTransformStart('Merging columns...');
  try {
    // Build the concat expression
    const expression = buildConcatExpression(columns.value, separator.value);

    // Create derive transform
    const deriveTransform = { derive: { [columnName.value]: expression } };

    const data = AppStore.currentData.value;
    const sources = AppStore.sources.value;
    const models = AppStore.models.value;
    let table = aq.from(data!);
    const context = { sources, models };

    // Apply derive transform
    let result = applyTransform(table, deriveTransform, allColumns, context);

    await StepService.applyStepResult(deriveTransform, result, {
      ...callbacks,
      closeDialogAfter: !removeOriginal.value, // Keep dialog open if we need to remove columns
    });

    // If we need to remove original columns, apply remove transform as a separate step
    if (removeOriginal.value) {
      const removeTransform = { remove: columns.value };
      await StepService.runTransform('Remove Original Columns', removeTransform, callbacks);
    }
  } catch (error: any) {
    console.error('Merge transform error:', error);
    await callbacks.onError?.('Error applying merge: ' + error.message);
  } finally {
    if (callbacks.onTransformEnd) callbacks.onTransformEnd();
  }
}
