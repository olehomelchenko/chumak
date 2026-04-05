import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import type { PreviewResult } from '../preview-engine';
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

/**
 * Get a single-value preview for a date part/unit (shown inline in the table).
 * Pure function — reads column value from AppStore.
 */
export function getDatePartPreview(
  columnName: string,
  partValue: string,
  operationType: 'extract' | 'truncate',
  intervals?: Record<string, number>
): string {
  const data = AppStore.currentData.value;

  if (!columnName || !data?.length) {
    return '—';
  }

  try {
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    const searchData = data.slice(0, previewLimit);

    let sampleRow: any = null;
    for (const row of searchData) {
      if (row[columnName] != null) {
        sampleRow = row;
        break;
      }
    }

    if (!sampleRow) {
      return '—';
    }

    const colRef = HelperHandlers.quoteColumnRef.call(null as any, columnName);
    let expression: string;

    if (operationType === 'extract') {
      expression = `${partValue}(${colRef})`;
    } else {
      const interval = intervals?.[partValue] ?? 1;
      expression = buildTruncExpression(colRef, partValue, interval);
    }

    const ast = parseExpression(expression);
    const result = interpretAST(ast, sampleRow);
    return result != null ? String(result) : '—';
  } catch {
    return '(error)';
  }
}

/**
 * Pure preview computation — called from useTransformPreview in the component.
 */
export function computeDatePreview(
  columnName: string,
  extractPartsList: string[],
  truncateUnitsList: string[],
  intervals: Record<string, number>
): PreviewResult | null {
  const data = AppStore.currentData.value;

  if (!columnName || !data?.length) {
    return null;
  }

  if (extractPartsList.length === 0 && truncateUnitsList.length === 0) {
    return null;
  }

  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
  const samples = data.slice(0, previewLimit);
  const colRef = HelperHandlers.quoteColumnRef.call(null as any, columnName);
  const outputCols: string[] = [];

  const previewRows = samples.map((row) => {
    const previewRow: any = { [columnName]: row[columnName] };

    for (const part of extractPartsList) {
      const outputName = `${columnName}_${part}`;
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

    for (const unit of truncateUnitsList) {
      const interval = intervals[unit] ?? 1;
      const outputName = buildTruncOutputName(columnName, unit, interval);
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
    columns: [columnName, ...outputCols],
    newColumns: outputCols,
    rows: previewRows,
  };
}

export async function applyDateTransform(callbacks: any, app?: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const colVal = state.column as string;
  const extractPartsList = state.extractParts as string[];
  const truncateUnitsList = state.truncateUnits as string[];
  const intervals = state.truncateIntervals as Record<string, number>;
  const removeOriginVal = state.removeOrigin as boolean;

  if (!colVal) {
    await callbacks.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
    return;
  }

  if (extractPartsList.length === 0 && truncateUnitsList.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.datePartOrUnit', { ns: 'errors' }));
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const deriveSpecs: Record<string, string> = {};
  const appCols = AppStore.columns.value;
  const columnsToCheck: string[] = [];

  for (const part of extractPartsList) {
    const partOutputName = `${colVal}_${part}`;
    columnsToCheck.push(partOutputName);
    deriveSpecs[partOutputName] = `${part}(${colRef})`;
  }

  for (const unit of truncateUnitsList) {
    const interval = intervals[unit] ?? 1;
    const unitOutputName = buildTruncOutputName(colVal, unit, interval);
    columnsToCheck.push(unitOutputName);
    deriveSpecs[unitOutputName] = buildTruncExpression(colRef, unit, interval);
  }

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

  await StepService.runTransform(opName, { derive: deriveSpecs }, callbacks);

  if (removeOriginVal) {
    await StepService.runTransform(`Remove column "${colVal}"`, { remove: [colVal] }, callbacks);
  }
}
