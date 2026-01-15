import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import * as HelperHandlers from './helper-handlers';
import * as NotificationHandlers from './notification-handlers';
import { StepService } from '../services/StepService';

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

export function updateDatePreview() {
  const state = DialogStore.dateState;
  const { column, operation, extractParts, truncateUnits, outputColumn } = state;
  const colVal = column.value;
  const data = AppStore.currentData.value;

  if (!colVal || !data?.length) {
    clearDatePreview();
    return;
  }

  try {
    const samples = data.slice(0, 20);
    const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
    const activeParts = operation.value === 'extract' ? extractParts.value : truncateUnits.value;

    if (activeParts.length === 0) {
      clearDatePreview();
      return;
    }

    const previewRows = samples.map((row) => {
      const previewRow: any = { [colVal]: row[colVal] };
      for (const part of activeParts) {
        let outputName: string;
        const outColVal = outputColumn.value;
        if (activeParts.length === 1 && outColVal) {
          outputName = outColVal;
        } else {
          outputName =
            operation.value === 'extract' ? `${colVal}_${part}` : `${colVal}_${part}_trunc`;
        }

        let expression: string;
        if (operation.value === 'extract') {
          expression = `${part}(${colRef})`;
        } else {
          expression = `date_trunc(${colRef}, "${part}")`;
        }

        try {
          const ast = parseExpression(expression);
          const result = interpretAST(ast, row);
          previewRow[outputName] = result != null ? String(result) : '—';
        } catch {
          previewRow[outputName] = '(error)';
        }
      }
      return previewRow;
    });

    const outputCols = activeParts.map((part: string) => {
      const outColVal = outputColumn.value;
      if (activeParts.length === 1 && outColVal) return outColVal;
      return operation.value === 'extract' ? `${colVal}_${part}` : `${colVal}_${part}_trunc`;
    });

    DialogStore.previewState.title.value = `Date: ${operation.value === 'extract' ? 'Extract' : 'Truncate'}`;
    DialogStore.previewState.stats.value = `Showing ${previewRows.length} sample rows`;
    DialogStore.previewState.columns.value = [colVal, ...outputCols];
    DialogStore.previewState.newColumns.value = outputCols;
    DialogStore.previewState.rows.value = previewRows;
  } catch (e) {
    clearDatePreview();
  }
}

export function clearDatePreview() {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

export async function applyDateTransform(callbacks: any) {
  const state = DialogStore.dateState;
  const { column, operation, extractParts, truncateUnits, outputColumn } = state;
  const colVal = column.value;

  if (!colVal) {
    await NotificationHandlers.alert.call(null as any, 'Please select a source column');
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const activeParts = operation.value === 'extract' ? extractParts.value : truncateUnits.value;
  const deriveSpecs: Record<string, string> = {};

  const appCols = AppStore.columns.value;

  for (const part of activeParts) {
    let partOutputName: string;
    const outColVal = outputColumn.value;
    if (activeParts.length === 1 && outColVal) {
      partOutputName = outColVal;
    } else {
      partOutputName =
        operation.value === 'extract' ? `${colVal}_${part}` : `${colVal}_${part}_trunc`;
    }

    // Check for existence
    if (appCols.includes(partOutputName) && partOutputName !== colVal) {
      if (
        !(await NotificationHandlers.confirm.call(
          null as any,
          `Column "${partOutputName}" already exists. It will be overwritten. Continue?`
        ))
      )
        return;
    }

    if (operation.value === 'extract') {
      deriveSpecs[partOutputName] = `${part}(${colRef})`;
    } else {
      deriveSpecs[partOutputName] = `date_trunc(${colRef}, "${part}")`;
    }
  }

  const opName =
    activeParts.length === 1
      ? operation.value === 'extract'
        ? `Extract ${activeParts[0]}`
        : `Truncate to ${activeParts[0]}`
      : operation.value === 'extract'
        ? `Extract ${activeParts.length} parts`
        : `Truncate ${activeParts.length} units`;

  await StepService.runTransform(opName, { derive: deriveSpecs }, callbacks);
}
