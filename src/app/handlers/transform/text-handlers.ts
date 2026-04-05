import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import type { PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

export function getTextColumns(): string[] {
  const schema = HelperHandlers.getActiveSchema.call({
    viewingIntermediate: AppStore.viewingIntermediate.value,
    viewingSchema: AppStore.viewingSchema.value,
    activeModel: AppStore.activeModel.value,
  } as any);
  if (!schema) return [];
  return AppStore.columns.value.filter((col) => {
    const colSchema = schema.find((c) => c.name === col);
    const type = colSchema?.type;
    return type === 'string';
  });
}

export function getTextOperations() {
  return [
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'titlecase', label: 'Title Case' },
    { value: 'trim', label: 'Trim Whitespace' },
  ];
}

export function getCaseOperations() {
  return [
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'titlecase', label: 'Title Case' },
  ];
}

/**
 * Build a text transform expression from column ref and operations list.
 */
export function buildTextExpression(colRef: string, operations: string[]): string {
  let expression = colRef;

  if (operations.includes('trim')) {
    expression = `trim(${expression})`;
  }

  if (operations.includes('uppercase')) {
    expression = `upper(${expression})`;
  } else if (operations.includes('lowercase')) {
    expression = `lower(${expression})`;
  } else if (operations.includes('titlecase')) {
    expression = `titlecase(${expression})`;
  }

  return expression;
}

/**
 * Pure preview compute for text operations — called by useTransformPreview in the component.
 */
export function computeTextPreview(colVal: string, operations: string[]): PreviewResult | null {
  const data = AppStore.currentData.value;
  if (!colVal || !data?.length || operations.length === 0) return null;

  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
  const samples = data.slice(0, previewLimit);
  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const expression = buildTextExpression(colRef, operations);
  const outputName = `${colVal}_text`;

  const previewRows = samples.map((row) => {
    const previewRow: any = { [colVal]: row[colVal] };
    try {
      const ast = parseExpression(expression);
      const result = interpretAST(ast, row);
      previewRow[outputName] = result != null ? String(result) : '—';
    } catch {
      previewRow[outputName] = '(error)';
    }
    return previewRow;
  });

  const opLabels = operations.map((op) => {
    const opDef = getTextOperations().find((o) => o.value === op);
    return opDef?.label || op;
  });

  return {
    title: `Text: ${opLabels.join(' + ')}`,
    stats: `Showing ${previewRows.length} sample rows`,
    columns: [colVal, outputName],
    newColumns: [outputName],
    rows: previewRows,
  };
}

/**
 * Get a sample preview for a single text operation (shown inline in the table).
 */
export function getTextOperationPreview(opValue: string, colVal: string): string {
  const data = AppStore.currentData.value;

  if (!colVal || !data?.length) return '—';

  try {
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    const searchData = data.slice(0, previewLimit);

    let sampleRow: any = null;
    for (const row of searchData) {
      if (row[colVal] != null && String(row[colVal]).trim() !== '') {
        sampleRow = row;
        break;
      }
    }

    if (!sampleRow) return '—';

    const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
    let expression: string;

    switch (opValue) {
      case 'uppercase':
        expression = `upper(${colRef})`;
        break;
      case 'lowercase':
        expression = `lower(${colRef})`;
        break;
      case 'titlecase':
        expression = `titlecase(${colRef})`;
        break;
      case 'trim':
        expression = `trim(${colRef})`;
        break;
      default:
        return '—';
    }

    const ast = parseExpression(expression);
    const result = interpretAST(ast, sampleRow);
    return result != null ? String(result) : '—';
  } catch {
    return '(error)';
  }
}

export async function applyTextTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;
  const colVal = state.column as string;
  const operations = state.operations as string[];
  const removeOrigin = state.removeOrigin as boolean;

  if (!colVal) {
    await callbacks.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
    return;
  }

  if (operations.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.operation', { ns: 'errors' }));
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const expression = buildTextExpression(colRef, operations);
  const outputName = `${colVal}_text`;
  const deriveSpecs: Record<string, string> = { [outputName]: expression };

  const appCols = AppStore.columns.value;
  if (appCols.includes(outputName) && outputName !== colVal) {
    const { confirm } = await import('../core/notification-handlers');
    const message = i18n.t('confirms.overwriteColumn', {
      ns: 'common',
      message: i18n.t('validation.duplicate.columnExists', { ns: 'errors', name: outputName }),
    });
    const confirmed = await confirm(
      message,
      undefined,
      i18n.t('buttons.overwrite', { ns: 'common' })
    );
    if (!confirmed) return;
  }

  const opLabels = operations.map((op) => {
    const opDef = getTextOperations().find((o) => o.value === op);
    return opDef?.label || op;
  });
  const opName = `Text: ${opLabels.join(' + ')}`;

  await StepService.runTransform(opName, { derive: deriveSpecs }, callbacks);

  if (removeOrigin) {
    await StepService.runTransform(`Remove column "${colVal}"`, { remove: [colVal] }, callbacks);
  }
}
