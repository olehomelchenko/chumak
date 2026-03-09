import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import { computeTokens } from '../../../core/expression-token-extractor';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import { validateExpression } from '../validation-engine';
import { confirm } from '../core/notification-handlers';
import i18n from '../../../i18n';

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

    // Show columns referenced in the expression + the new derived column
    const { columns: referencedCols } = computeTokens(expression, columns);
    const previewCols = [...referencedCols.filter((c) => c !== outputCol), outputCol];

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

export async function applyDeriveTransform(callbacks: any) {
  const columnName = DialogStore.deriveState.columnName.value;
  const expression = DialogStore.deriveState.expression.value;
  const error = DialogStore.deriveState.error.value;
  const columns = AppStore.columns.value;

  if (!columnName || !expression) {
    await callbacks.onError?.(
      i18n.t('validation.required.columnNameAndExpression', { ns: 'errors' })
    );
    return;
  }
  if (error) {
    await callbacks.onError?.(i18n.t('validation.invalid.expression', { ns: 'errors' }));
    return;
  }
  if (columns.includes(columnName)) {
    const confirmed = await confirm(
      i18n.t('confirms.overwriteColumn', {
        ns: 'common',
        message: i18n.t('validation.duplicate.columnExists', { ns: 'errors', name: columnName }),
      })
    );
    if (!confirmed) return;
  }

  const transform = { derive: { [columnName]: expression } };
  await StepService.runTransform('Derive', transform, callbacks);
}
