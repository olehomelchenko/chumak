import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import * as NotificationHandlers from './notification-handlers';
import { StepService } from '../services/StepService';

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function validateFilterExpression() {
  const expr = DialogStore.filterState.expression.value;
  DialogStore.filterState.error.value = HelperHandlers.validateExpression.call(null as any, expr);
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
    await NotificationHandlers.alert.call(null as any, 'Please enter a filter expression');
    return;
  }
  if (hasError) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please fix the expression errors before applying'
    );
    return;
  }

  const transform = { filter: expr };
  await StepService.runTransform('Filter', transform, callbacks);
}
