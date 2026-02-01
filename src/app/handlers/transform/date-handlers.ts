import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';

export function getDateColumns(): string[] {
  const schema = HelperHandlers.getActiveSchema.call({
    viewingIntermediate: AppStore.viewingIntermediate.value,
    viewingSchema: AppStore.viewingSchema.value,
    activeModel: AppStore.activeModel.value,
  } as any);
  if (!schema) return [];
  return AppStore.columns.value.filter((col) => {
    const colSchema = schema.find((c) => c.name === col);
    const type = colSchema?.type;
    return type === 'date' || type === 'datetime';
  });
}

export function getExtractParts() {
  return [
    { value: 'year', label: 'Year', example: '2024' },
    { value: 'month', label: 'Month', example: '1-12' },
    { value: 'day', label: 'Day', example: '1-31' },
    { value: 'quarter', label: 'Quarter', example: '1-4' },
    { value: 'week', label: 'Week', example: '1-53' },
    { value: 'weekday', label: 'Weekday', example: '0-6' },
    { value: 'hour', label: 'Hour', example: '0-23' },
    { value: 'minute', label: 'Minute', example: '0-59' },
    { value: 'second', label: 'Second', example: '0-59' },
  ];
}

export function getTruncateUnits() {
  return [
    { value: 'year', label: 'Year' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'hour', label: 'Hour' },
    { value: 'minute', label: 'Minute' },
    { value: 'second', label: 'Second' },
  ];
}

export function toggleDateSelection(value: string, event?: MouseEvent) {
  const state = DialogStore.dateState;
  const isExtract = state.operation.value === 'extract';
  const current = isExtract ? [...state.extractParts.value] : [...state.truncateUnits.value];

  if (event?.metaKey || event?.ctrlKey) {
    if (current.includes(value)) {
      if (current.length > 1) {
        const index = current.indexOf(value);
        current.splice(index, 1);
      }
    } else {
      current.push(value);
    }
  } else {
    current.length = 0;
    current.push(value);
  }

  if (isExtract) {
    state.extractParts.value = current;
  } else {
    state.truncateUnits.value = current;
  }
  updateDatePreview();
}

export function toggleExtractSelection(value: string) {
  const state = DialogStore.dateState;
  const current = [...state.extractParts.value];

  // Always toggle for checkbox clicks
  if (current.includes(value)) {
    const index = current.indexOf(value);
    current.splice(index, 1);
  } else {
    current.push(value);
  }

  state.extractParts.value = current;
  updateDatePreview();
}

export function toggleTruncateSelection(value: string) {
  const state = DialogStore.dateState;
  const current = [...state.truncateUnits.value];

  // Always toggle for checkbox clicks
  if (current.includes(value)) {
    const index = current.indexOf(value);
    current.splice(index, 1);
  } else {
    current.push(value);
  }

  state.truncateUnits.value = current;
  updateDatePreview();
}

export function getDateOutputPlaceholder(): string {
  const { column, operation, extractParts, truncateUnits } = DialogStore.dateState;
  const colVal = column.value;
  if (!colVal) return '';

  const parts = operation.value === 'extract' ? extractParts.value : truncateUnits.value;

  if (operation.value === 'extract') {
    if (parts.length > 1) return '(Multiple columns)';
    return `${colVal}_${parts[0]}`;
  }

  if (parts.length > 1) return '(Multiple columns)';
  return `${colVal}_${parts[0]}_trunc`;
}

// Preview engine instance for date operations
const datePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.dateState;
    const { column, extractParts, truncateUnits } = state;
    const colVal = column.value;
    const data = AppStore.currentData.value;

    if (!colVal || !data?.length) {
      return null;
    }

    const extractPartsList = extractParts.value;
    const truncateUnitsList = truncateUnits.value;

    if (extractPartsList.length === 0 && truncateUnitsList.length === 0) {
      return null;
    }

    // Use preview row limit setting
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    const samples = data.slice(0, previewLimit);
    const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
    const outputCols: string[] = [];

    const previewRows = samples.map((row) => {
      const previewRow: any = { [colVal]: row[colVal] };

      // Process extract parts
      for (const part of extractPartsList) {
        const outputName = `${colVal}_${part}`;
        const expression = `${part}(${colRef})`;

        try {
          const ast = parseExpression(expression);
          const result = interpretAST(ast, row);
          previewRow[outputName] = result != null ? String(result) : '—';
          if (!outputCols.includes(outputName)) outputCols.push(outputName);
        } catch {
          previewRow[outputName] = '(error)';
          if (!outputCols.includes(outputName)) outputCols.push(outputName);
        }
      }

      // Process truncate units
      for (const unit of truncateUnitsList) {
        const outputName = `${colVal}_${unit}_trunc`;
        const expression = `date_trunc(${colRef}, "${unit}")`;

        try {
          const ast = parseExpression(expression);
          const result = interpretAST(ast, row);
          previewRow[outputName] = result != null ? String(result) : '—';
          if (!outputCols.includes(outputName)) outputCols.push(outputName);
        } catch {
          previewRow[outputName] = '(error)';
          if (!outputCols.includes(outputName)) outputCols.push(outputName);
        }
      }

      return previewRow;
    });

    const operationNames: string[] = [];
    if (extractPartsList.length > 0) {
      operationNames.push(
        `Extract ${extractPartsList.length} part${extractPartsList.length > 1 ? 's' : ''}`
      );
    }
    if (truncateUnitsList.length > 0) {
      operationNames.push(
        `Truncate ${truncateUnitsList.length} unit${truncateUnitsList.length > 1 ? 's' : ''}`
      );
    }

    return {
      title: `Date: ${operationNames.join(' + ')}`,
      stats: `Showing ${previewRows.length} sample rows`,
      columns: [colVal, ...outputCols],
      newColumns: outputCols,
      rows: previewRows,
    };
  },
});

export function debouncedUpdateDatePreview() {
  datePreview.trigger();
}

export function updateDatePreview() {
  datePreview.compute();
}

// Re-export clearPreview from preview-engine (aliased for backward compatibility)
export { clearPreview as clearDatePreview };

export function getDatePartPreview(
  partValue: string,
  operationType: 'extract' | 'truncate'
): string {
  const state = DialogStore.dateState;
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
      if (row[colVal] != null) {
        sampleRow = row;
        break;
      }
    }

    if (!sampleRow) {
      return '—';
    }

    const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
    let expression: string;

    if (operationType === 'extract') {
      expression = `${partValue}(${colRef})`;
    } else {
      expression = `date_trunc(${colRef}, "${partValue}")`;
    }

    const ast = parseExpression(expression);
    const result = interpretAST(ast, sampleRow);
    return result != null ? String(result) : '—';
  } catch {
    return '(error)';
  }
}

export async function applyDateTransform(callbacks: any, app?: any) {
  const state = DialogStore.dateState;
  const { column, extractParts, truncateUnits, removeOrigin } = state;
  const colVal = column.value;

  if (!colVal) {
    await callbacks.onError?.('Please select a source column');
    return;
  }

  const extractPartsList = extractParts.value;
  const truncateUnitsList = truncateUnits.value;

  if (extractPartsList.length === 0 && truncateUnitsList.length === 0) {
    await callbacks.onError?.('Please select at least one date part or unit to extract/truncate');
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const deriveSpecs: Record<string, string> = {};
  const appCols = AppStore.columns.value;
  const columnsToCheck: string[] = [];

  // Process extract parts
  for (const part of extractPartsList) {
    const partOutputName = `${colVal}_${part}`;
    columnsToCheck.push(partOutputName);
    deriveSpecs[partOutputName] = `${part}(${colRef})`;
  }

  // Process truncate units
  for (const unit of truncateUnitsList) {
    const unitOutputName = `${colVal}_${unit}_trunc`;
    columnsToCheck.push(unitOutputName);
    deriveSpecs[unitOutputName] = `date_trunc(${colRef}, "${unit}")`;
  }

  // Check for existing columns
  const existingCols = columnsToCheck.filter((name) => appCols.includes(name) && name !== colVal);
  if (existingCols.length > 0 && app) {
    const message =
      existingCols.length === 1
        ? `Column "${existingCols[0]}" already exists. It will be overwritten. Continue?`
        : `Columns ${existingCols.map((c) => `"${c}"`).join(', ')} already exist. They will be overwritten. Continue?`;
    const confirmed = await app.confirm(message);
    if (!confirmed) return;
  }

  // Build operation name
  const operationNames: string[] = [];
  if (extractPartsList.length > 0) {
    operationNames.push(
      `Extract ${extractPartsList.length} part${extractPartsList.length > 1 ? 's' : ''}`
    );
  }
  if (truncateUnitsList.length > 0) {
    operationNames.push(
      `Truncate ${truncateUnitsList.length} unit${truncateUnitsList.length > 1 ? 's' : ''}`
    );
  }
  const opName = operationNames.join(' + ');

  // Apply the transform
  await StepService.runTransform(opName, { derive: deriveSpecs }, callbacks);

  // If removeOrigin is checked, apply a separate remove step
  if (removeOrigin.value) {
    await StepService.runTransform(`Remove column "${colVal}"`, { remove: [colVal] }, callbacks);
  }
}
