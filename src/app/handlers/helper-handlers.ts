import type { ChumakApp } from '../../chumak-app';
import { describeTransform } from '../../core/transforms';
import { parseExpression } from '../../core/expression-parser';
import { validateAST } from '../../core/ast-validator';
import { formatError } from '../../core/error-formatter';
import { ColumnSchema } from '../../core/schema-engine';
import { StepService, ExecutionCallbacks } from '../services/StepService';

export function getPreviewRowLimit(): number {
  // Default preview row limit (can be overridden from UX settings)
  return 100;
}

export function getModelMeta(this: ChumakApp, model: any) {
  if (!model) return '';
  const rowCount = model.data ? model.data.length : 0;
  const colCount = model.schema
    ? model.schema.length
    : model.data && model.data.length > 0
      ? Object.keys(model.data[0]).length
      : 0;
  const stepsCount = Math.max(0, (model.steps ? model.steps.length : 0) - 1);
  const stepsText = stepsCount === 1 ? '1 step' : `${stepsCount} steps`;

  return `${rowCount.toLocaleString()} x ${colCount} • ${stepsText}`;
}

export function describeTransformWrapper(this: ChumakApp, transform: any) {
  return describeTransform(transform);
}

/**
 * Creates callbacks from ChumakApp for StepService.
 * This allows the framework-agnostic StepService to interact with the UI.
 */
export function createExecutionCallbacks(app: ChumakApp): ExecutionCallbacks {
  return {
    onTransformStart: (label: string) => app.startTransformation(label),
    onTransformEnd: () => app.endTransformation(),
    onError: async (message: string) => {
      await app.alert(message);
    },
    onDialogClose: (clearPreview?: boolean) => app.closeDialog(clearPreview),
    updatePagination: () => app.updatePagination(),
  };
}

/**
 * Runs a transform using StepService.
 */
export async function runTransform(
  this: ChumakApp,
  label: string,
  transform: any,
  closeDialog = true
) {
  const callbacks = createExecutionCallbacks(this);
  return StepService.runTransform(label, transform, callbacks, closeDialog);
}

/**
 * @deprecated Use StepService.applyStepResult directly with callbacks
 * Kept for backward compatibility during migration
 */
export async function applyStepResult(
  this: ChumakApp,
  transform: any,
  resultTable: any,
  closeDialogAfter = true
) {
  const callbacks = createExecutionCallbacks(this);
  return StepService.applyStepResult(transform, resultTable, callbacks, closeDialogAfter);
}

export function validateExpression(this: ChumakApp, expr: string): string | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;
  try {
    const ast = parseExpression(trimmed);
    const validation = validateAST(ast, this.columns);
    return validation.error ? formatError(validation.error, trimmed) : null;
  } catch (error: any) {
    return formatError(error, trimmed);
  }
}

export function getColumnType(this: ChumakApp, colName: string): string {
  const schema = this.getActiveSchema();
  if (schema) {
    const col = schema.find((c: any) => c.name === colName);
    if (col) return col.type;
  }
  if (this.activeSource?.columns) {
    const col = this.activeSource.columns.find((c: any) => c.name === colName);
    if (col) return col.type;
  }
  return 'string';
}

export function isComparable(this: ChumakApp, type?: string) {
  return ['number', 'integer', 'float', 'date', 'datetime'].includes(type || '');
}

export function isDateType(this: ChumakApp, type?: string) {
  return ['date', 'datetime'].includes(type || '');
}

export function getTypeIcon(this: ChumakApp, colName: string) {
  const type = this.getColumnType(colName);
  switch (type) {
    case 'date':
      return 'ix:calendar';
    case 'datetime':
      return 'ix:calendar';
    case 'time':
      return 'carbon:time';
    case 'float':
    case 'number':
      return 'ix:data-type-double';
    case 'string':
      return 'ix:data-type-string';
    case 'boolean':
      return 'ix:data-type-boolean';
    case 'integer':
      return 'ix:data-type-integer';
    default:
      return 'ix:data-type-string';
  }
}

export function formatCellValue(this: ChumakApp, value: any) {
  if (value === null || value === undefined || value === '') return 'null';
  return value;
}

export function getTypeIndicator(this: ChumakApp, colName: string) {
  const type = this.getColumnType(colName);
  switch (type) {
    case 'string':
      return 'Abc';
    case 'integer':
      return '#';
    case 'float':
      return '1.1';
    case 'boolean':
      return '✓';
    case 'date':
      return '📅';
    case 'datetime':
      return '🕒';
    default:
      return 'Abc';
  }
}

export function quoteColumnRef(this: ChumakApp, colName: string) {
  if (/[\s\-+*/()[\]{}]/.test(colName)) {
    return `[${colName}]`;
  }
  return colName;
}

export function escapePattern(this: ChumakApp, pattern: string) {
  return pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatLiteral(this: ChumakApp, value: any, type?: string) {
  if (value === null || value === undefined) return 'null';
  if (type === 'number' || type === 'integer' || type === 'float' || typeof value === 'number')
    return String(value);
  if (
    value instanceof Date ||
    ((type === 'date' || type === 'datetime') && typeof value === 'string')
  ) {
    const d = value instanceof Date ? value : new Date(value);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (type === 'date' || (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0)) {
        return `"${dateStr}"`;
      }
      return `"${dateStr}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}"`;
    }
  }
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function getActiveSchema(this: ChumakApp): ColumnSchema[] {
  if (this.viewingIntermediate && this.viewingSchema) {
    return this.viewingSchema;
  }
  return this.activeModel?.schema || [];
}

export function preparePreviewData(this: ChumakApp, table: any, limit = 100) {
  return {
    rows: table.slice(0, limit).objects(),
    columns: table.columnNames(),
    totalRows: table.numRows(),
  };
}
