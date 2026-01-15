import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { SchemaEngine } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';

export function initializePivotDialog(this: ChumakApp) {
  this.pivotDialogState = {
    rowColumns: [],
    columnColumn: '',
    valueColumn: '',
    aggregation: 'sum',
    options: { sort: true, limit: null },
    uniqueValueCount: 0,
    previewData: null,
    previewError: null,
    isPreviewing: false,
  };
}

export function onPivotConfigChange(this: ChumakApp) {
  const { columnColumn } = this.pivotDialogState;

  // Update unique value count for column column
  if (this.currentData && columnColumn) {
    const uniqueValues = new Set(this.currentData.map((row: any) => row[columnColumn]));
    this.pivotDialogState.uniqueValueCount = uniqueValues.size;
  } else {
    this.pivotDialogState.uniqueValueCount = 0;
  }

  // Clear preview when config changes
  this.pivotDialogState.previewData = null;
  this.pivotDialogState.previewError = null;
}

export function constructPivotStep(this: ChumakApp) {
  const { rowColumns, columnColumn, valueColumn, aggregation, options } = this.pivotDialogState;

  if (!columnColumn) throw new Error('Please select a column for pivot headers');
  if (!valueColumn) throw new Error('Please select a value column');
  if (columnColumn === valueColumn) throw new Error('Column and value columns must be different');
  if (rowColumns.includes(columnColumn)) throw new Error('Column column cannot be used as a row');
  if (rowColumns.includes(valueColumn)) throw new Error('Value column cannot be used as a row');

  const transform: any = {
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

  return transform;
}

export function previewPivot(this: ChumakApp) {
  this.pivotDialogState.isPreviewing = true;
  this.pivotDialogState.previewError = null;
  this.clearPreview();
  try {
    const step = this.constructPivotStep();
    const samples = this.currentData!.slice(0, 50);
    const table = aq.from(samples);
    const resultTable = applyTransform(table, step, this.columns);

    const result = this.preparePreviewData(resultTable, 50);
    const rowCols = this.pivotDialogState.rowColumns;
    const newCols = result.columns.filter((c: string) => !rowCols.includes(c));

    DialogStore.previewState.title.value = 'Pivot Preview';
    DialogStore.previewState.stats.value = `Showing ${result.rows.length} rows, ${result.columns.length} columns`;
    DialogStore.previewState.columns.value = result.columns;
    DialogStore.previewState.newColumns.value = newCols;
    DialogStore.previewState.rows.value = result.rows;
  } catch (error: any) {
    this.pivotDialogState.previewError = error.message;
  } finally {
    this.pivotDialogState.isPreviewing = false;
  }
}

export async function applyPivotTransform(this: ChumakApp) {
  await this.startTransformation('Pivoting data...');
  try {
    const transform = this.constructPivotStep();
    const table = aq.from(this.currentData!);
    const context = { sources: this.sources, models: this.models };
    const result = applyTransform(table, transform, this.columns, context);

    const oldCols = new Set(this.columns);
    const newCols = result.columnNames().filter((col: string) => !oldCols.has(col));
    const hasTypesStep = newCols.length > 0;

    await this.applyStepResult(transform, result, !hasTypesStep);

    if (hasTypesStep) {
      const typeSpecs: Record<string, string> = {};
      for (const colName of newCols) {
        const sampleValues = this.currentData!.slice(0, 100).map((row) => row[colName]);
        const inferredType = SchemaEngine.inferType(sampleValues);
        typeSpecs[colName] = inferredType;
      }
      const typesTransform = { types: typeSpecs };
      await this.applyStepResult(typesTransform, this.currentData!, true);
    }
  } catch (error: any) {
    console.error('Pivot transform error:', error);
    await this.alert('Error applying pivot: ' + error.message);
  } finally {
    this.endTransformation();
  }
}
