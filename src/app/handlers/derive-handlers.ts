import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import { StepService } from '../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from './preview-engine';
import { validateExpression } from './validation-engine';

export function validateDeriveExpression() {
  validateExpression(DialogStore.deriveState.expression.value, AppStore.columns.value, {
    errorSignal: DialogStore.deriveState.error,
  });
}

// Preview engine instance for derive operations
const derivePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const columnName = DialogStore.deriveState.columnName.value;
    const expression = DialogStore.deriveState.expression.value;
    const error = DialogStore.deriveState.error.value;
    const data = AppStore.currentData.value;
    const columns = AppStore.columns.value;

    if (!expression || error || !data?.length) {
      return null;
    }

    const ast = parseExpression(expression);
    const previewLimit = Math.min(HelperHandlers.getPreviewRowLimit.call(null as any), 50);
    const samples = data.slice(0, previewLimit);
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
    const previewCols = [...columns.slice(0, 4), outputCol];

    return {
      title: `Derive: ${outputCol}`,
      stats: `Showing ${previewRows.length} sample rows`,
      columns: previewCols,
      newColumns: [outputCol],
      rows: previewRows,
    };
  },
});

export function debouncedUpdateDerivePreview() {
  derivePreview.trigger();
}

export function updateDerivePreview() {
  derivePreview.compute();
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export async function applyDeriveTransform(callbacks: any, app?: any) {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;
  const columns = AppStore.columns.value;

  if (!columnName || !expression) {
    await callbacks.onError?.('Please provide both column name and expression');
    return;
  }
  if (error) {
    await callbacks.onError?.('Please fix the expression errors before applying');
    return;
  }
  if (columns.includes(columnName)) {
    if (app) {
      const confirmed = await app.confirm(
        `Column "${columnName}" already exists. It will be overwritten. Continue?`
      );
      if (!confirmed) return;
    }
  }

  const transform = { derive: { [columnName]: expression } };
  await StepService.runTransform('Derive', transform, callbacks);
}
