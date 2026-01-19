import type { SytoApp } from '../../syto-app';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';

export function validateFilterExpression(this: SytoApp) {
  const expr = DialogStore.filterState.expression.value;
  DialogStore.filterState.error.value = this.validateExpression(expr);
}

export function debouncedUpdateFilterPreview(this: SytoApp) {
  if (this._previewDebounceTimer) {
    clearTimeout(this._previewDebounceTimer);
  }
  this._previewDebounceTimer = setTimeout(() => {
    this.updateFilterPreview();
  }, 150);
}

export function updateFilterPreview(this: SytoApp) {
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

    DialogStore.previewState.title.value = 'Filter Preview';
    DialogStore.previewState.stats.value = `<strong>${totalMatchCount}</strong> of ${this.currentData.length} rows match`;
    DialogStore.previewState.columns.value = this.columns.slice(0, 8);
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = previewRows;
  } catch {
    this.clearPreview();
  }
}

export function toggleFilterPreviewMode(this: SytoApp) {
  const current = DialogStore.filterState.previewMode.value;
  DialogStore.filterState.previewMode.value = current === 'matching' ? 'all' : 'matching';
  this.updateFilterPreview();
}

export async function applyFilterTransform(this: SytoApp) {
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
