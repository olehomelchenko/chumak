import type { SytoApp } from '../../syto-app';
import * as aq from 'arquero';
import { applyTransform } from '../../core/transforms';
import { SchemaEngine } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';

export function detectDelimiter(this: SytoApp, column: string) {
  if (!column || !this.currentData || this.currentData.length === 0) return null;
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
  const sampleSize = Math.min(100, this.currentData.length);
  const sample = this.currentData.slice(0, sampleSize);
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

export function debouncedUpdateSplitPreview(this: SytoApp) {
  if (this._previewDebounceTimer) clearTimeout(this._previewDebounceTimer);
  this._previewDebounceTimer = setTimeout(() => {
    this.updateSplitPreview();
    this._previewDebounceTimer = null;
  }, 150);
}

export function selectSplitColumn(this: SytoApp, col: string) {
  this.splitDialogState.column = col;
  const detected = this.detectDelimiter(col);
  if (detected) {
    this.splitDialogState.delimiter = detected.char;
    this.splitDialogState.isRegex = detected.isRegex;
    this.splitDialogState.autoDetectedDelimiter = detected.name;
  } else {
    this.splitDialogState.autoDetectedDelimiter = null;
  }
  this.updateSplitPreview();
}

export function updateSplitPreview(this: SytoApp) {
  const { column, delimiter, mode, maxColumns, keepOriginal, isRegex } = this.splitDialogState;
  this.splitDialogState.error = null;
  this.clearPreview();

  if (!column || !delimiter) return;

  try {
    if (isRegex) new RegExp(delimiter);
    const transform = {
      split: {
        column,
        delimiter,
        isRegex,
        mode,
        maxColumns: mode === 'firstN' || mode === 'lastN' ? maxColumns : undefined,
        keepOriginal,
      },
    };

    const samples = this.currentData!.slice(0, 50);
    const table = aq.from(samples);
    const context = { sources: this.sources, models: this.models };
    const result = applyTransform(table, transform, this.columns, context);

    const resultColumns = result.columnNames();
    const newCols = resultColumns.filter((c: string) => c.startsWith(`${column}_`));

    // Show only affected columns: original (if kept or marked as removed) + new columns
    const previewColumns = keepOriginal ? [column, ...newCols] : [column, ...newCols];
    const fullRows = result.objects();

    // Get original column values from source data for showing removed state
    const previewRows = fullRows.map((row: any, idx: number) => {
      const sourceRow = samples[idx];
      const previewRow: any = {};

      // Include original column (mark as removed if not keeping)
      if (!keepOriginal) {
        previewRow[column] = sourceRow[column];
        previewRow._removedColumns = [column];
      } else {
        previewRow[column] = row[column];
      }

      // Include new columns
      for (const newCol of newCols) {
        previewRow[newCol] = row[newCol];
      }

      return previewRow;
    });

    DialogStore.previewState.title.value = 'Split Preview';
    DialogStore.previewState.stats.value = keepOriginal
      ? `${newCols.length} new columns created`
      : `Original column removed, ${newCols.length} new columns created`;
    DialogStore.previewState.columns.value = previewColumns;
    DialogStore.previewState.newColumns.value = newCols;
    DialogStore.previewState.rows.value = previewRows;
  } catch (error: any) {
    this.splitDialogState.error = error.message;
    this.clearPreview();
  }
}

export async function applySplitTransform(this: SytoApp) {
  const { column, delimiter, mode, maxColumns, keepOriginal, isRegex } = this.splitDialogState;
  if (!column) {
    await this.alert('Please select a column');
    return;
  }
  if (!delimiter) {
    await this.alert('Please enter a delimiter');
    return;
  }

  await this.startTransformation('Splitting column...');
  try {
    const splitTransform = {
      split: {
        column,
        delimiter,
        isRegex,
        mode,
        maxColumns: mode === 'firstN' || mode === 'lastN' ? maxColumns : undefined,
        keepOriginal,
      },
    };
    let table = aq.from(this.currentData!);
    const context = { sources: this.sources, models: this.models };
    let result = applyTransform(table, splitTransform, this.columns, context);

    const newColumns = result.columnNames().filter((name: string) => name.startsWith(`${column}_`));
    const hasTypesStep = newColumns.length > 0;

    await this.applyStepResult(splitTransform, result, !hasTypesStep);

    if (hasTypesStep) {
      const typeSpecs: Record<string, string> = {};
      for (const colName of newColumns) {
        const sampleValues = this.currentData!.slice(0, 100).map((row) => row[colName]);
        const inferredType = SchemaEngine.inferType(sampleValues);
        typeSpecs[colName] = inferredType;
      }
      const typesTransform = { types: typeSpecs };
      await this.applyStepResult(typesTransform, this.currentData!, true);
    }
  } catch (error: any) {
    console.error('Split transform error:', error);
    await this.alert('Error applying split: ' + error.message);
  } finally {
    this.endTransformation();
  }
}
