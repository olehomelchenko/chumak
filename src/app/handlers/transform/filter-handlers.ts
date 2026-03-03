import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import { validateExpression } from '../validation-engine';
import i18n from '../../../i18n';

export function validateFilterExpression() {
  validateExpression(DialogStore.filterState.expression.value, AppStore.columns.value, {
    errorSignal: DialogStore.filterState.error,
  });
}

// Preview engine instance for filter operations
const filterPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const expr = DialogStore.filterState.expression.value.trim();
    const hasError = DialogStore.filterState.error.value;
    const previewMode = DialogStore.filterState.previewMode.value;
    const data = AppStore.currentData.value;
    const columns = AppStore.columns.value;

    if (!expr || hasError || !data?.length) {
      return null;
    }

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

    return {
      title: 'Filter Preview',
      stats: `<strong>${totalMatchCount}</strong> of ${data.length} rows match`,
      columns: columns.slice(0, 8),
      rows: previewRows,
    };
  },
});

export function debouncedUpdateFilterPreview() {
  filterPreview.trigger();
}

export function updateFilterPreview() {
  filterPreview.compute();
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export function toggleFilterPreviewMode() {
  const current = DialogStore.filterState.previewMode.value;
  DialogStore.filterState.previewMode.value = current === 'matching' ? 'all' : 'matching';
  updateFilterPreview();
}

export async function applyFilterTransform(callbacks: any) {
  const expr = DialogStore.filterState.expression.value.trim();
  const hasError = DialogStore.filterState.error.value;

  if (!expr) {
    await callbacks.onError?.(i18n.t('validation.required.expression', { ns: 'errors' }));
    return;
  }
  if (hasError) {
    await callbacks.onError?.(i18n.t('validation.invalid.expression', { ns: 'errors' }));
    return;
  }

  const transform = { filter: expr };
  await StepService.runTransform('Filter', transform, callbacks);
}
