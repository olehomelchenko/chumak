import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { SchemaEngine, ColumnType } from '../../../core/schema-engine';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import * as HelperHandlers from '../core/helper-handlers';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

export function onPivotConfigChange() {
  const state = DialogStore.pivotState;
  const columnColumn = state.columnColumn.value;
  const currentData = AppStore.currentData.value;

  // Update unique value count for column column
  if (currentData && columnColumn) {
    const uniqueValues = new Set(currentData.map((row: any) => row[columnColumn]));
    state.uniqueValueCount.value = uniqueValues.size;
  } else {
    state.uniqueValueCount.value = 0;
  }

  // Clear preview when config changes
  clearPreview();
}

export function constructPivotStep() {
  const state = DialogStore.pivotState;
  const { rowColumns, columnColumn, valueColumn, aggregation, options } = state;

  const colCol = columnColumn.value;
  const valCol = valueColumn.value;
  const rowCols = rowColumns.value;

  if (!colCol) throw new Error('Please select a column for pivot headers');
  if (!valCol) throw new Error('Please select a value column');
  if (colCol === valCol) throw new Error('Column and value columns must be different');
  if (rowCols.includes(colCol)) throw new Error('Column column cannot be used as a row');
  if (rowCols.includes(valCol)) throw new Error('Value column cannot be used as a row');

  const transform: any = {
    pivot: {
      rows: rowCols.length > 0 ? rowCols : undefined,
      keys: colCol,
      values: valCol,
      aggregation: aggregation.value,
      options: {
        sort: options.value.sort,
        limit: options.value.limit || undefined,
      },
    },
  };

  return transform;
}

// Preview engine instance for pivot operations
const pivotPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const state = DialogStore.pivotState;
    const data = AppStore.currentData.value;
    const columns = AppStore.columns.value;

    if (!data?.length) {
      return null;
    }

    const step = constructPivotStep();
    const samples = data.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, columns);

    const result = HelperHandlers.preparePreviewData.call(null as any, resultTable, 50);
    const rowCols = state.rowColumns.value;
    const newCols = result.columns.filter((c: string) => !rowCols.includes(c));

    return {
      title: 'Pivot Preview',
      stats: `Showing ${result.rows.length} rows, ${result.columns.length} columns`,
      columns: result.columns,
      newColumns: newCols,
      rows: result.rows,
    };
  },
  onError: (error) => {
    DialogStore.pivotState.previewError.value = error.message;
  },
});

export function debouncedPreviewPivot() {
  pivotPreview.trigger();
}

export function previewPivot() {
  const state = DialogStore.pivotState;
  state.isPreviewing.value = true;
  state.previewError.value = null;
  try {
    pivotPreview.compute();
  } finally {
    state.isPreviewing.value = false;
  }
}

// Re-export clearPreview from preview-engine
export { clearPreview };

export async function applyPivotTransform(callbacks: any) {
  const columns = AppStore.columns.value;
  const data = AppStore.currentData.value;
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  if (callbacks.onTransformStart) callbacks.onTransformStart('Pivoting data...');
  try {
    const transform = constructPivotStep();
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
