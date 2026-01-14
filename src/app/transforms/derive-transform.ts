import type { ChumakApp } from '../../chumak-app';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';

export function validateDeriveExpression(this: ChumakApp) {
  const expr = DialogStore.deriveState.expression.value;
  DialogStore.deriveState.error.value = this.validateExpression(expr);
}

export function debouncedUpdateDerivePreview(this: ChumakApp) {
  if (this.previewState._debounceTimer) {
    clearTimeout(this.previewState._debounceTimer);
  }
  this.previewState._debounceTimer = setTimeout(() => {
    this.updateDerivePreview();
  }, 150);
}

export function updateDerivePreview(this: ChumakApp) {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;

  if (!expression || error || !this.currentData?.length) {
    this.clearPreview();
    return;
  }

  try {
    const ast = parseExpression(expression);
    const previewLimit = Math.min(this.getPreviewRowLimit(), 50); // Cap at 50 for expression previews
    const samples = this.currentData.slice(0, previewLimit);
    const outputCol = columnName || 'new_column';

    const previewRows = samples.map((row: any) => {
      try {
        const result = interpretAST(ast, row);
        return { ...row, [outputCol]: result };
      } catch {
        return { ...row, [outputCol]: '(error)' };
      }
    });

    // Show first 4 source columns + new derived column
    const previewCols = [...this.columns.slice(0, 4), outputCol];

    this.previewState = {
      title: `Derive: ${outputCol}`,
      stats: `Showing ${previewRows.length} sample rows`,
      columns: previewCols,
      newColumns: [outputCol],
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch {
    this.clearPreview();
  }
}

export async function applyDeriveTransform(this: ChumakApp) {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;

  if (!columnName || !expression) {
    await this.alert('Please provide both column name and expression');
    return;
  }
  if (error) {
    await this.alert('Please fix the expression errors before applying');
    return;
  }
  if (this.columns.includes(columnName)) {
    if (
      !(await this.confirm(
        `Column "${columnName}" already exists. It will be overwritten. Continue?`
      ))
    )
      return;
  }

  const transform = { derive: { [columnName]: expression } };
  await this.runTransform('Derive', transform);
}
