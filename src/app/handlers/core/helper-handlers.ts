import { describeTransform } from '../../../core/transforms';
import { parseExpression } from '../../../core/expression-parser';
import { validateAST } from '../../../core/ast-validator';
import { formatError } from '../../../core/error-formatter';
import { ColumnSchema } from '../../../core/schema-engine';
import { StepService, ExecutionCallbacks } from '../../services/StepService';
import { DependencyService } from '../../services/DependencyService';
import { AppStore } from '../../stores/AppStore';
import type { Model } from '../../types';

export function getPreviewRowLimit(): number {
  // Default preview row limit (can be overridden from UX settings)
  return 100;
}

/**
 * Get metadata string for a model (row count, column count, step count)
 */
export function getModelMeta(model: any): string {
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

/**
 * Get human-readable description for a transform
 */
export function describeTransformWrapper(transform: any): string {
  return describeTransform(transform);
}

/**
 * Callbacks interface for transform execution.
 * Used by handlers and components to interact with the UI.
 */
export type TransformCallbacks = {
  startTransformation: (label: string) => void;
  endTransformation: () => void;
  alert: (message: string) => Promise<boolean>;
  closeDialog: (clearPreview?: boolean) => void;
  updatePagination: () => void;
};

let transformCallbacks: TransformCallbacks | null = null;

/**
 * Set transform callbacks for store-based operations
 */
export function setTransformCallbacks(cb: TransformCallbacks): void {
  transformCallbacks = cb;
}

/**
 * Creates callbacks for StepService.
 * Uses stored callbacks set via setTransformCallbacks().
 */
export function createExecutionCallbacks(): ExecutionCallbacks {
  if (!transformCallbacks) {
    throw new Error('Transform callbacks not set. Call setTransformCallbacks first.');
  }
  return {
    onTransformStart: (label: string) => transformCallbacks!.startTransformation(label),
    onTransformEnd: () => transformCallbacks!.endTransformation(),
    onError: async (message: string) => {
      await transformCallbacks!.alert(message);
    },
    onDialogClose: (clearPreview?: boolean) => transformCallbacks!.closeDialog(clearPreview),
    updatePagination: () => transformCallbacks!.updatePagination(),
  };
}

/**
 * Runs a transform using StepService.
 * Uses stored callbacks set via setTransformCallbacks().
 */
export async function runTransform(
  label: string,
  transform: any,
  closeDialog = true
): Promise<boolean> {
  const callbacks = createExecutionCallbacks();
  return StepService.runTransform(label, transform, callbacks, closeDialog);
}

/**
 * Apply a step result using StepService.
 * Uses stored callbacks set via setTransformCallbacks().
 */
export async function applyStepResult(
  transform: any,
  resultTable: any,
  closeDialogAfter = true
): Promise<void> {
  const callbacks = createExecutionCallbacks();
  return StepService.applyStepResult(transform, resultTable, callbacks, closeDialogAfter);
}

/**
 * Validate an expression against current columns
 */
export function validateExpression(expr: string): string | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;
  try {
    const ast = parseExpression(trimmed);
    const validation = validateAST(ast, AppStore.columns.value);
    return validation.error ? formatError(validation.error, trimmed) : null;
  } catch (error: any) {
    return formatError(error, trimmed);
  }
}

/**
 * Get the type of a column from the active schema
 */
export function getColumnType(colName: string): string {
  const schema = getActiveSchema();
  if (schema) {
    const col = schema.find((c: any) => c.name === colName);
    if (col) return col.type;
  }
  const activeSource = AppStore.activeSource.value;
  if (activeSource?.columns) {
    const col = activeSource.columns.find((c: any) => c.name === colName);
    if (col) return col.type;
  }
  return 'string';
}

/**
 * Check if a type is comparable (can be used in comparisons)
 */
export function isComparable(type?: string): boolean {
  return ['number', 'integer', 'float', 'date', 'datetime'].includes(type || '');
}

/**
 * Check if a type is a date type
 */
export function isDateType(type?: string): boolean {
  return ['date', 'datetime'].includes(type || '');
}

/**
 * Get icon name for a column type
 */
export function getTypeIcon(colName: string): string {
  const type = getColumnType(colName);
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
    case 'json':
      return 'mdi:code-json';
    default:
      return 'ix:data-type-string';
  }
}

/**
 * Format a cell value for display in the data table
 */
export function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'null';

  // Handle error objects (Power Query-style error cells)
  // Return just "Error" for display - full message shown on click
  if (value && typeof value === 'object' && value.type === 'error') {
    return 'Error';
  }

  // Handle boolean values - format as checkmark/X like column editor
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗';
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return 'Invalid Date';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    if (value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0) {
      return `${dateStr} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    }
    return dateStr;
  }

  // Ensure we return a renderable primitive value
  // Preact can render: string, number, boolean, null, undefined
  // Preact cannot render: objects, arrays (as children), etc.
  if (typeof value === 'object' && value !== null) {
    // JSON objects/arrays: stringify and truncate for cell display
    try {
      const json = JSON.stringify(value);
      if (json.length > 50) return json.slice(0, 50) + '...';
      return json;
    } catch {
      return String(value);
    }
  }

  // Return primitives as string
  return String(value);
}

/**
 * Formats a cell value for tooltip display.
 * Returns "Error" for error objects instead of "[Object object]".
 */
export function formatCellValueForTooltip(value: any): string {
  if (value === null || value === undefined || value === '') return 'null';

  // Handle error objects - return "Error" instead of "[Object object]"
  if (value && typeof value === 'object' && value.type === 'error') {
    return 'Error';
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return 'Invalid Date';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    if (value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0) {
      return `${dateStr} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    }
    return dateStr;
  }

  // For other objects, pretty-print as JSON for tooltip
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // Return primitives as string
  return String(value);
}

/**
 * Get text indicator for a column type
 */
export function getTypeIndicator(colName: string): string {
  const type = getColumnType(colName);
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
    case 'json':
      return '{}';
    default:
      return 'Abc';
  }
}

/**
 * Quote a column reference if it contains special characters
 */
export function quoteColumnRef(colName: string): string {
  if (/[\s\-+*/()[\]{}]/.test(colName)) {
    return `[${colName}]`;
  }
  return colName;
}

/**
 * Escape special characters in a pattern string
 */
export function escapePattern(pattern: string): string {
  return pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Format a value as a literal for use in expressions
 */
export function formatLiteral(value: any, type?: string): string {
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

/**
 * Get the active schema (viewing intermediate or model schema)
 */
export function getActiveSchema(): ColumnSchema[] {
  if (AppStore.viewingIntermediate.value && AppStore.viewingSchema.value) {
    return AppStore.viewingSchema.value;
  }
  return AppStore.activeModel.value?.schema || [];
}

/**
 * Prepare data from a table for preview display
 */
export function preparePreviewData(
  table: any,
  limit = 100
): {
  rows: any[];
  columns: string[];
  totalRows: number;
} {
  return {
    rows: table.slice(0, limit).objects(),
    columns: table.columnNames(),
    totalRows: table.numRows(),
  };
}

/**
 * Gets dependency tooltip text for a model showing dependency relationships.
 */
export function getDependencyTooltip(model: Model): string {
  const graph = DependencyService.buildGraph(AppStore.sources.value, AppStore.models.value);
  const deps = DependencyService.getDependencies(graph, model.id);
  const dependents = DependencyService.getDependents(graph, model.id);

  // Filter out the source dependency (model.sourceId) from deps count
  const modelDeps = deps.filter((id) => id !== model.sourceId);
  const modelDependents = dependents.filter((id) => AppStore.models.value.some((m) => m.id === id));

  const parts: string[] = [];
  if (modelDeps.length > 0) {
    parts.push(`Depends on: ${modelDeps.length} model${modelDeps.length !== 1 ? 's' : ''}`);
  }
  if (modelDependents.length > 0) {
    parts.push(
      `Used by: ${modelDependents.length} model${modelDependents.length !== 1 ? 's' : ''}`
    );
  }

  return parts.join(' • ') || 'No dependencies';
}
