import type { ChumakApp } from '../../chumak-app';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';

export function validateFilterExpression(this: ChumakApp) {
  this.filterError = this.validateExpression(this.filterExpression);
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
  const expr = this.filterExpression?.trim();
  if (!expr || this.filterError || !this.currentData?.length) {
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
          if (this.filterPreviewMode === 'matching') {
            if (previewRows.length < 50) previewRows.push(row);
          } else {
            if (previewRows.length < 50) previewRows.push(row);
          }
        } else {
          removedCount++;
          if (this.filterPreviewMode === 'all' && previewRows.length < 50) {
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
  this.filterPreviewMode = this.filterPreviewMode === 'matching' ? 'all' : 'matching';
  this.updateFilterPreview();
}

export async function applyFilterTransform(this: ChumakApp) {
  const expr = this.filterExpression.trim();
  if (!expr) {
    await this.alert('Please enter a filter expression');
    return;
  }
  if (this.filterError) {
    await this.alert('Please fix the expression errors before applying');
    return;
  }

  const transform = { filter: expr };
  await this.runTransform('Filter', transform);
}
