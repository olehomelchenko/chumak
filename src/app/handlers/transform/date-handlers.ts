import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

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
    { value: 'year', label: 'Year', supportsInterval: false, max: 1 },
    { value: 'quarter', label: 'Quarter', supportsInterval: false, max: 1 },
    { value: 'month', label: 'Month', supportsInterval: false, max: 1 },
    { value: 'week', label: 'Week', supportsInterval: false, max: 1 },
    { value: 'day', label: 'Day', supportsInterval: false, max: 1 },
    { value: 'hour', label: 'Hour', supportsInterval: true, max: 23 },
    { value: 'minute', label: 'Minute', supportsInterval: true, max: 59 },
    { value: 'second', label: 'Second', supportsInterval: true, max: 59 },
  ];
}

const UNIT_ABBREVIATIONS: Record<string, string> = {
  second: 'sec',
  minute: 'min',
  hour: 'hr',
};

function getIntervalForUnit(unit: string): number {
  const intervals = DialogStore.dateState.truncateIntervals.value;
  return intervals[unit] ?? 1;
}

function buildTruncExpression(colRef: string, unit: string, interval: number): string {
  if (interval > 1) {
    return `date_trunc(${colRef}, "${unit}", ${interval})`;
  }
  return `date_trunc(${colRef}, "${unit}")`;
}

function buildTruncOutputName(col: string, unit: string, interval: number): string {
  if (interval > 1) {
    const abbr = UNIT_ABBREVIATIONS[unit] || unit;
    return `${col}_${interval}${abbr}_trunc`;
  }
  return `${col}_${unit}_trunc`;
}

export function setTruncateInterval(unit: string, interval: number) {
  const state = DialogStore.dateState;
  const current = { ...state.truncateIntervals.value };
  const clamped = Math.max(1, Math.floor(interval));
  if (clamped === 1) {
    delete current[unit];
  } else {
    current[unit] = clamped;
  }
  state.truncateIntervals.value = current;
  updateDatePreview();
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
        const interval = getIntervalForUnit(unit);
        const outputName = buildTruncOutputName(colVal, unit, interval);
        const expression = buildTruncExpression(colRef, unit, interval);

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
      const interval = getIntervalForUnit(partValue);
      expression = buildTruncExpression(colRef, partValue, interval);
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
    await callbacks.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
    return;
  }

  const extractPartsList = extractParts.value;
  const truncateUnitsList = truncateUnits.value;

  if (extractPartsList.length === 0 && truncateUnitsList.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.datePartOrUnit', { ns: 'errors' }));
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
    const interval = getIntervalForUnit(unit);
    const unitOutputName = buildTruncOutputName(colVal, unit, interval);
    columnsToCheck.push(unitOutputName);
    deriveSpecs[unitOutputName] = buildTruncExpression(colRef, unit, interval);
  }

  // Check for existing columns
  const existingCols = columnsToCheck.filter((name) => appCols.includes(name) && name !== colVal);
  if (existingCols.length > 0 && app) {
    const message =
      existingCols.length === 1
        ? i18n.t('confirms.overwriteColumn', {
            ns: 'common',
            message: i18n.t('validation.duplicate.columnExists', {
              ns: 'errors',
              name: existingCols[0],
            }),
          })
        : i18n.t('confirms.overwriteColumns', {
            ns: 'common',
            columns: existingCols.map((c) => `"${c}"`).join(', '),
          });
    const confirmed = await app.confirm(message, i18n.t('buttons.overwrite', { ns: 'common' }));
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
