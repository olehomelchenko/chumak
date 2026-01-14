import type { ChumakApp } from '../../chumak-app';
import { describeTransform, applyTransform } from '../../core/transforms';
import { TransformResult } from '../../core/transform-result';
import { autoSave } from '../../core/storage';
import { parseExpression } from '../../core/expression-parser';
import { validateAST } from '../../core/ast-validator';
import { formatError } from '../../core/error-formatter';
import { ColumnSchema } from '../../core/schema-engine';
import * as aq from 'arquero';

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

export async function applyStepResult(
  this: ChumakApp,
  transform: any,
  resultTable: any,
  closeDialogAfter = true
) {
  if (this.editingStepIndex !== null) {
    await this.updateStep(this.editingStepIndex, transform);
    this.closeDialog(true);
    return;
  }
  if (!this.activeModel) return;

  this.activeModel.steps.push(transform);

  let result;
  if (Array.isArray(resultTable)) {
    result = TransformResult.createFromData(resultTable, this.activeModel.schema, transform);
  } else {
    result = TransformResult.create(resultTable, this.activeModel.schema, transform);
  }

  this.currentData = result.data;
  this.activeModel.schema = result.schema;
  (this as any).columns = result.columns;
  this.activeModel.data = JSON.parse(JSON.stringify(result.data));

  const validation = TransformResult.validate(result);
  if (!validation.valid) {
    console.warn('applyStepResult: Result validation warnings', validation.errors);
  }

  this.activeStepIndex = this.activeModel.steps.length - 1;
  this.viewingIntermediate = false;
  this.viewingSchema = null;

  (this as any).updatePagination();
  await autoSave(this.sources, this.models);

  if (closeDialogAfter) {
    this.closeDialog(true);
  }
}

export async function runTransform(
  this: ChumakApp,
  label: string,
  transform: any,
  closeDialog = true
) {
  (this as any).startTransformation(label);
  try {
    const table = aq.from(this.currentData!);
    const context = { sources: this.sources, models: this.models };
    const result = applyTransform(table, transform, this.columns, context);
    await (this as any).applyStepResult(transform, result, closeDialog);
    return true;
  } catch (error: any) {
    console.error(`${label} error:`, error);
    await this.alert(`Error applying ${label.toLowerCase()}: ${error.message}`);
    return false;
  } finally {
    (this as any).endTransformation();
  }
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

export function getColumnType(this: ChumakApp, colName: string) {
  const schema = (this as any).getActiveSchema();
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

export function getCellClass(this: ChumakApp, value: any, column: string) {
  const type = this.getColumnType(column);
  const classes: string[] = ['data-table__cell'];

  if (['number', 'integer', 'float'].includes(type)) {
    classes.push('data-table__cell--number');
  }

  if (value === null || value === undefined || value === '') {
    classes.push('data-table__cell--empty');
  } else if (value === 0 || value === '0') {
    classes.push('data-table__cell--zero');
  }

  return classes.join(' ');
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
