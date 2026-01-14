import type { ChumakApp } from '../../chumak-app';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';

export function validateFilterExpression(this: ChumakApp) {
  const expr = DialogStore.filterState.expression.value;
  DialogStore.filterState.error.value = this.validateExpression(expr);
}

export function debouncedUpdateFilterPreview(this: ChumakApp) {
  if (this.previewState._debounceTimer) {
    clearTimeout(this.previewState._debounceTimer);
  }
  this.previewState._debounceTimer = setTimeout(() => {
    this.updateFilterPreview();
  }, 150);
}

export function updateFilterPreview(this: ChumakApp) {
  const expr = DialogStore.filterState.expression.value.trim();
  const hasError = DialogStore.filterState.error.value;
  const previewMode = DialogStore.filterState.previewMode.value;

  if (!expr || hasError || !this.currentData?.length) {
    this.clearPreview();
    return;
  }

  try {
    const ast = parseExpression(expr);
    const previewRows: any[] = [];
    let matchCount = 0;
    let removedCount = 0;

    // Use configurable preview row limit
    const previewLimit = this.getPreviewRowLimit();
    const sampleData = this.currentData.slice(0, previewLimit);

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
          removedCount++;
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
    if (this.currentData.length > previewLimit) {
      totalMatchCount = 0;
      for (const row of this.currentData) {
        try {
          if (interpretAST(ast, row)) totalMatchCount++;
        } catch {
          // Skip
        }
      }
    }

    this.previewState = {
      title: 'Filter Preview',
      stats: `<strong>${totalMatchCount}</strong> of ${this.currentData.length} rows match`,
      columns: this.columns.slice(0, 8),
      newColumns: [],
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch {
    this.clearPreview();
  }
}

export function toggleFilterPreviewMode(this: ChumakApp) {
  const current = DialogStore.filterState.previewMode.value;
  DialogStore.filterState.previewMode.value = current === 'matching' ? 'all' : 'matching';
  this.updateFilterPreview();
}

export async function applyFilterTransform(this: ChumakApp) {
  const expr = DialogStore.filterState.expression.value.trim();
  const hasError = DialogStore.filterState.error.value;

  if (!expr) {
    await this.alert('Please enter a filter expression');
    return;
  }
  if (hasError) {
    await this.alert('Please fix the expression errors before applying');
    return;
  }

  const transform = { filter: expr };
  await this.runTransform('Filter', transform);
}
