import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { SchemaEngine, ColumnType } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as NotificationHandlers from './notification-handlers';

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function detectDelimiter(column: string) {
  const data = AppStore.currentData.value;
  if (!column || !data || data.length === 0) return null;
  const delimiters = [
    { char: ',', name: 'Comma', isRegex: false },
    { char: ';', name: 'Semicolon', isRegex: false },
    { char: '|', name: 'Pipe', isRegex: false },
    { char: '/', name: 'Forward Slash', isRegex: false },
    { char: '-', name: 'Hyphen', isRegex: false },
    { char: '@', name: '@ Sign', isRegex: false },
    { char: '\t', name: 'Tab', isRegex: false },
    { char: '\\s+', name: 'Whitespace', isRegex: true },
    { char: '\\', name: 'Backslash', isRegex: false },
  ];
  const sampleSize = Math.min(100, data.length);
  const sample = data.slice(0, sampleSize);
  const counts = delimiters.map((delim) => {
    let totalOccurrences = 0;
    let rowsWithDelimiter = 0;
    sample.forEach((row) => {
      const value = row[column];
      if (value != null) {
        const str = String(value);
        let matches;
        if (delim.isRegex) matches = str.match(new RegExp(delim.char, 'g'));
        else
          matches = str.match(new RegExp(delim.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        if (matches && matches.length > 0) {
          totalOccurrences += matches.length;
          rowsWithDelimiter++;
        }
      }
    });
    const consistency = sampleSize > 0 ? rowsWithDelimiter / sampleSize : 0;
    const score = consistency * (totalOccurrences / Math.max(sampleSize, 1));
    return { ...delim, count: totalOccurrences, rowsWithDelimiter, consistency, score };
  });
  const threshold = Math.max(2, sampleSize * 0.05);
  const validDelimiters = counts
    .filter((d) => d.rowsWithDelimiter >= threshold)
    .sort((a, b) => {
      if (Math.abs(a.consistency - b.consistency) > 0.1) return b.consistency - a.consistency;
      return b.count - a.count;
    });
  return validDelimiters.length > 0 ? validDelimiters[0] : null;
}

export function debouncedUpdateSplitPreview() {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    updateSplitPreview();
    previewDebounceTimer = null;
  }, 150);
}

export function selectSplitColumn(col: string) {
  const state = DialogStore.splitState;
  state.column.value = col;
  const detected = detectDelimiter(col);
  if (detected) {
    state.delimiter.value = detected.char;
    state.isRegex.value = detected.isRegex;
    state.autoDetectedDelimiter.value = detected.name;
  } else {
    state.autoDetectedDelimiter.value = null;
  }
  updateSplitPreview();
}

export function updateSplitPreview() {
  const state = DialogStore.splitState;
  const { column, delimiter, mode, maxColumns, keepOriginal, isRegex } = state;
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  state.error.value = null;
  clearPreview();

  if (!column.value || !delimiter.value) return;

  try {
    if (isRegex.value) new RegExp(delimiter.value);
    const transform = {
      split: {
        column: column.value,
        delimiter: delimiter.value,
        isRegex: isRegex.value,
        mode: mode.value,
        maxColumns:
          mode.value === 'firstN' || mode.value === 'lastN' ? maxColumns.value : undefined,
        keepOriginal: keepOriginal.value,
      },
    };

    const samples = data!.slice(0, 50);
    const table = aq.from(samples);
    const context = { sources, models };
    const result = applyTransform(table, transform, columns, context);

    const resultColumns = result.columnNames();
    const newCols = resultColumns.filter((c: string) => c.startsWith(`${column.value}_`));

    // Show only affected columns: original (if kept or marked as removed) + new columns
    const previewColumns = keepOriginal.value
      ? [column.value, ...newCols]
      : [column.value, ...newCols];
    const fullRows = result.objects();

    // Get original column values from source data for showing removed state
    const previewRows = fullRows.map((row: any, idx: number) => {
      const sourceRow = samples[idx];
      const previewRow: any = {};

      // Include original column (mark as removed if not keeping)
      if (!keepOriginal.value) {
        previewRow[column.value] = sourceRow[column.value];
        previewRow._removedColumns = [column.value];
      } else {
        previewRow[column.value] = row[column.value];
      }

      // Include new columns
      for (const newCol of newCols) {
        previewRow[newCol] = row[newCol];
      }

      return previewRow;
    });

    DialogStore.previewState.title.value = 'Split Preview';
    DialogStore.previewState.stats.value = keepOriginal.value
      ? `${newCols.length} new columns created`
      : `Original column removed, ${newCols.length} new columns created`;
    DialogStore.previewState.columns.value = previewColumns;
    DialogStore.previewState.newColumns.value = newCols;
    DialogStore.previewState.rows.value = previewRows;
  } catch (error: any) {
    state.error.value = error.message;
    clearPreview();
  }
}

export function clearPreview() {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
}

export async function applySplitTransform(callbacks: any) {
  const state = DialogStore.splitState;
  const { column, delimiter, mode, maxColumns, keepOriginal, isRegex } = state;
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  if (!column.value) {
    await NotificationHandlers.alert.call(null as any, 'Please select a column');
    return;
  }
  if (!delimiter.value) {
    await NotificationHandlers.alert.call(null as any, 'Please enter a delimiter');
    return;
  }

  if (callbacks.onTransformStart) callbacks.onTransformStart('Splitting column...');
  try {
    const splitTransform = {
      split: {
        column: column.value,
        delimiter: delimiter.value,
        isRegex: isRegex.value,
        mode: mode.value,
        maxColumns:
          mode.value === 'firstN' || mode.value === 'lastN' ? maxColumns.value : undefined,
        keepOriginal: keepOriginal.value,
      },
    };
    let table = aq.from(data!);
    const context = { sources, models };
    let result = applyTransform(table, splitTransform, columns, context);

    const newColumns = result
      .columnNames()
      .filter((name: string) => name.startsWith(`${column.value}_`));
    const hasTypesStep = newColumns.length > 0;

    await StepService.applyStepResult(splitTransform, result, {
      ...callbacks,
      closeDialogAfter: !hasTypesStep,
    });

    if (hasTypesStep) {
      const typeSpecs: Record<string, string> = {};
      const currentData = AppStore.currentData.value;
      for (const colName of newColumns) {
        const sampleValues = currentData!.slice(0, 100).map((row) => row[colName]);
        const inferredType = SchemaEngine.inferType(sampleValues);
        typeSpecs[colName] = inferredType;
      }
      const typesTransform = { types: typeSpecs as Record<string, ColumnType> };
      await StepService.runTransform('Auto-Type Split Columns', typesTransform, callbacks);
    }
  } catch (error: any) {
    console.error('Split transform error:', error);
    await NotificationHandlers.alert.call(null as any, 'Error applying split: ' + error.message);
  } finally {
    if (callbacks.onTransformEnd) callbacks.onTransformEnd();
  }
}
