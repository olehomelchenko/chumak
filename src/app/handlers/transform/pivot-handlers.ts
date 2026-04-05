import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { SchemaEngine, ColumnType } from '../../../core/schema-engine';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import type { PreviewResult } from '../preview-engine';
import type { PivotAggregation } from '../../../types/modes';
import i18n from '../../../i18n';

export interface PivotOptions {
  sort: boolean;
  limit: number | null;
}

/**
 * Pure function: construct a pivot transform step from explicit parameters.
 */
export function constructPivotStep(
  rowColumns: string[],
  columnColumn: string,
  valueColumn: string,
  aggregation: PivotAggregation,
  options: PivotOptions
) {
  if (!columnColumn) throw new Error('Please select a column for pivot headers');
  if (!valueColumn) throw new Error('Please select a value column');
  if (columnColumn === valueColumn) throw new Error('Column and value columns must be different');
  if (rowColumns.includes(columnColumn)) throw new Error('Column column cannot be used as a row');
  if (rowColumns.includes(valueColumn)) throw new Error('Value column cannot be used as a row');

  return {
    pivot: {
      rows: rowColumns.length > 0 ? rowColumns : undefined,
      keys: columnColumn,
      values: valueColumn,
      aggregation,
      options: {
        sort: options.sort,
        limit: options.limit || undefined,
      },
    },
  };
}

/**
 * Count unique values in a column (reads from AppStore.currentData).
 */
export function countUniqueValues(columnColumn: string): number {
  const currentData = AppStore.currentData.value;
  if (currentData && columnColumn) {
    const uniqueValues = new Set(currentData.map((row: any) => row[columnColumn]));
    return uniqueValues.size;
  }
  return 0;
}

/**
 * Preview compute for pivot — called from the component via createDebouncedPreview.
 */
export function computePivotPreview(
  rowColumns: string[],
  columnColumn: string,
  valueColumn: string,
  aggregation: PivotAggregation,
  options: PivotOptions
): PreviewResult | null {
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;

  if (!data?.length) {
    return null;
  }

  const step = constructPivotStep(rowColumns, columnColumn, valueColumn, aggregation, options);
  const samples = data.slice(0, 50);
  const table = aq.from(samples);
  const resultTable = applyTransform(table, step, columns);

  const result = HelperHandlers.preparePreviewData(resultTable, 50);
  const newCols = result.columns.filter((c: string) => !rowColumns.includes(c));

  return {
    title: 'Pivot Preview',
    stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
    columns: result.columns,
    newColumns: newCols,
    rows: result.rows,
  };
}

export async function applyPivotTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const columns = AppStore.columns.value;
  const data = AppStore.currentData.value;
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  if (callbacks.onTransformStart) callbacks.onTransformStart('Pivoting data...');
  try {
    const transform = constructPivotStep(
      state.rowColumns as string[],
      state.columnColumn as string,
      state.valueColumn as string,
      state.aggregation as PivotAggregation,
      state.options as PivotOptions
    );
    const table = aq.from(data!);
    const context = { sources, models };
    const result = applyTransform(table, transform, columns, context);

    const oldCols = new Set(columns);
    const newCols = result.columnNames().filter((col: string) => !oldCols.has(col));
    const hasTypesStep = newCols.length > 0;

    await StepService.applyStepResult(transform, result, {
      ...callbacks,
      closeDialogAfter: !hasTypesStep,
    });

    if (hasTypesStep) {
      const typeSpecs: Record<string, string> = {};
      const currentData = AppStore.currentData.value;
      for (const colName of newCols) {
        const sampleValues = currentData!.slice(0, 100).map((row) => row[colName]);
        const inferredType = SchemaEngine.inferType(sampleValues);
        typeSpecs[colName] = inferredType;
      }
      const typesTransform = { types: typeSpecs as Record<string, ColumnType> };
      await StepService.runTransform('Auto-Type Pivot Columns', typesTransform, callbacks);
    }
  } catch (error: any) {
    console.error('Pivot transform error:', error);
    await callbacks.onError?.(
      i18n.t('transform.pivotFailed', { ns: 'errors', message: error.message })
    );
  } finally {
    if (callbacks.onTransformEnd) callbacks.onTransformEnd();
  }
}
