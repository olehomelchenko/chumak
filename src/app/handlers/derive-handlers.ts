import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import * as NotificationHandlers from './notification-handlers';
import { StepService } from '../services/StepService';

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function validateDeriveExpression() {
  const expr = DialogStore.deriveState.expression.value;
  DialogStore.deriveState.error.value = HelperHandlers.validateExpression.call(null as any, expr);
}

export function debouncedUpdateDerivePreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }
  previewDebounceTimer = setTimeout(() => {
    updateDerivePreview();
  }, 150);
}

export function updateDerivePreview() {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  if (!expression || error || !data?.length) {
    clearPreview();
    return;
  }

  try {
    const ast = parseExpression(expression);
    const previewLimit = Math.min(HelperHandlers.getPreviewRowLimit.call(null as any), 50); // Cap at 50 for expression previews
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

    DialogStore.previewState.title.value = `Derive: ${outputCol}`;
    DialogStore.previewState.stats.value = `Showing ${previewRows.length} sample rows`;
    DialogStore.previewState.columns.value = previewCols;
    DialogStore.previewState.newColumns.value = [outputCol];
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

export async function applyDeriveTransform(callbacks: any) {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;
  const columns = AppStore.columns.value;

  if (!columnName || !expression) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please provide both column name and expression'
    );
    return;
  }
  if (error) {
    await NotificationHandlers.alert.call(
      null as any,
      'Please fix the expression errors before applying'
    );
    return;
  }
  if (columns.includes(columnName)) {
    if (
      !(await NotificationHandlers.confirm.call(
        null as any,
        `Column "${columnName}" already exists. It will be overwritten. Continue?`
      ))
    )
      return;
  }

  const transform = { derive: { [columnName]: expression } };
  await StepService.runTransform('Derive', transform, callbacks);
}
