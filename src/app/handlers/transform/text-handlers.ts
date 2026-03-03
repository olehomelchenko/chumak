import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
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

export function setCaseOperation(opValue: string | null) {
  const state = DialogStore.textState;
  const caseOps = ['uppercase', 'lowercase', 'titlecase'];

  // Remove all case operations
  const filtered = state.operations.value.filter((op) => !caseOps.includes(op));

  // Add the new one if not null
  if (opValue) {
    filtered.push(opValue);
  }

  state.operations.value = filtered;
  updatePreview();
}

export function setTrimOperation(enabled: boolean) {
  const state = DialogStore.textState;
  const current = [...state.operations.value];

  if (enabled) {
    // Add trim if not already present
    if (!current.includes('trim')) {
      current.push('trim');
    }
  } else {
    // Remove trim if present
    const index = current.indexOf('trim');
    if (index !== -1) {
      current.splice(index, 1);
    }
  }

  state.operations.value = current;
  updatePreview();
}

// Preview engine instance for text operations
const textPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.textState;
    const { column, operations } = state;
    const colVal = column.value;
    const data = AppStore.currentData.value;

    if (!colVal || !data?.length || operations.value.length === 0) {
      return null;
    }

    // Use preview row limit setting
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    const samples = data.slice(0, previewLimit);
    const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);

    // Build the expression
    let expression = colRef;

    // Apply trim first (if selected)
    if (operations.value.includes('trim')) {
      expression = `trim(${expression})`;
    }

    // Apply case transformation (only one)
    if (operations.value.includes('uppercase')) {
      expression = `upper(${expression})`;
    } else if (operations.value.includes('lowercase')) {
      expression = `lower(${expression})`;
    } else if (operations.value.includes('titlecase')) {
      expression = `titlecase(${expression})`;
    }

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

    // Build operation description
    const opLabels = operations.value.map((op) => {
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
  },
});

export function debouncedUpdatePreview() {
  textPreview.trigger();
}

export function updatePreview() {
  textPreview.compute();
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export function getTextOperationPreview(opValue: string): string {
  const state = DialogStore.textState;
  const { column } = state;
  const colVal = column.value;
  const data = AppStore.currentData.value;

  if (!colVal || !data?.length) {
    return '—';
  }

  try {
    // Use preview row limit setting
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    const searchData = data.slice(0, previewLimit);

    // Find first non-null value in the column within preview limit
    let sampleRow: any = null;
    for (const row of searchData) {
      if (row[colVal] != null && String(row[colVal]).trim() !== '') {
        sampleRow = row;
        break;
      }
    }

    if (!sampleRow) {
      return '—';
    }

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

export async function applyTextTransform(callbacks: any, app?: any) {
  const state = DialogStore.textState;
  const { column, operations, removeOrigin } = state;
  const colVal = column.value;

  if (!colVal) {
    await callbacks.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
    return;
  }

  if (operations.value.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.operation', { ns: 'errors' }));
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);

  // Build the expression
  let expression = colRef;

  // Apply trim first (if selected)
  if (operations.value.includes('trim')) {
    expression = `trim(${expression})`;
  }

  // Apply case transformation (only one)
  if (operations.value.includes('uppercase')) {
    expression = `upper(${expression})`;
  } else if (operations.value.includes('lowercase')) {
    expression = `lower(${expression})`;
  } else if (operations.value.includes('titlecase')) {
    expression = `titlecase(${expression})`;
  }

  const outputName = `${colVal}_text`;
  const deriveSpecs: Record<string, string> = {
    [outputName]: expression,
  };

  // Check for existing column
  const appCols = AppStore.columns.value;
  if (appCols.includes(outputName) && outputName !== colVal && app) {
    const message = i18n.t('confirms.overwriteColumn', {
      ns: 'common',
      message: i18n.t('validation.duplicate.columnExists', { ns: 'errors', name: outputName }),
    });
    const confirmed = await app.confirm(message);
    if (!confirmed) return;
  }

  // Build operation description
  const opLabels = operations.value.map((op) => {
    const opDef = getTextOperations().find((o) => o.value === op);
    return opDef?.label || op;
  });
  const opName = `Text: ${opLabels.join(' + ')}`;

  // Apply the transform
  await StepService.runTransform(opName, { derive: deriveSpecs }, callbacks);

  // If removeOrigin is checked, apply a separate remove step
  if (removeOrigin.value) {
    await StepService.runTransform(`Remove column "${colVal}"`, { remove: [colVal] }, callbacks);
  }
}
