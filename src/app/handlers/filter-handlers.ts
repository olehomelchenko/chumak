import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { validateAST } from '../../core/ast-validator';
import { formatError } from '../../core/error-formatter';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import { StepService } from '../services/StepService';

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function validateFilterExpression() {
  const expr = DialogStore.filterState.expression.value;
  const trimmed = expr.trim();
  if (!trimmed) {
    DialogStore.filterState.error.value = null;
    return;
  }
  try {
    const ast = parseExpression(trimmed);
    const columns = AppStore.columns.value;
    const validation = validateAST(ast, columns);
    DialogStore.filterState.error.value = validation.error
      ? formatError(validation.error, trimmed)
      : null;
  } catch (error: any) {
    DialogStore.filterState.error.value = formatError(error, trimmed);
  }
}

export function debouncedUpdateFilterPreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }
  previewDebounceTimer = setTimeout(() => {
    updateFilterPreview();
  }, 150);
}

export function updateFilterPreview() {
  const expr = DialogStore.filterState.expression.value.trim();
  const hasError = DialogStore.filterState.error.value;
  const previewMode = DialogStore.filterState.previewMode.value;
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  if (!expr || hasError || !data?.length) {
    clearPreview();
    return;
  }

  try {
    const ast = parseExpression(expr);
    const previewRows: any[] = [];
    let matchCount = 0;

    // Use configurable preview row limit
    const previewLimit = HelperHandlers.getPreviewRowLimit.call(null as any);
    const sampleData = data.slice(0, previewLimit);

    for (const row of sampleData) {
      try {
        const matches = interpretAST(ast, row);
        if (matches) {
          matchCount++;
          if (previewMode === 'matching') {
            if (previewRows.length < 50) previewRows.push(row);
          } else {
            if (previewRows.length < 50) previewRows.push(row);
          }
        } else {
          if (previewMode === 'all' && previewRows.length < 50) {
            previewRows.push({ ...row, _removed: true });
          }
        }
      } catch {
        // Skip rows with evaluation errors
      }
    }

    // Count matches in full dataset for stats
    let totalMatchCount = matchCount;
    if (data.length > previewLimit) {
      totalMatchCount = 0;
      for (const row of data) {
        try {
          if (interpretAST(ast, row)) totalMatchCount++;
        } catch {
          // Skip
        }
      }
    }

    DialogStore.previewState.title.value = 'Filter Preview';
    DialogStore.previewState.stats.value = `<strong>${totalMatchCount}</strong> of ${data.length} rows match`;
    DialogStore.previewState.columns.value = columns.slice(0, 8);
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = previewRows;
  } catch {
    clearPreview();
  }
}

export function clearPreview() {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

export function toggleFilterPreviewMode() {
  const current = DialogStore.filterState.previewMode.value;
  DialogStore.filterState.previewMode.value = current === 'matching' ? 'all' : 'matching';
  updateFilterPreview();
}

export async function applyFilterTransform(callbacks: any) {
  const expr = DialogStore.filterState.expression.value.trim();
  const hasError = DialogStore.filterState.error.value;

  if (!expr) {
    await callbacks.onError?.('Please enter a filter expression');
    return;
  }
  if (hasError) {
    await callbacks.onError?.('Please fix the expression errors before applying');
    return;
  }

  const transform = { filter: expr };
  await StepService.runTransform('Filter', transform, callbacks);
}
