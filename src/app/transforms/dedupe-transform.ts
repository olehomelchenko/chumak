import type { ChumakApp } from '../../chumak-app';

export function toggleDedupeAllColumns(this: ChumakApp, useAll: boolean) {
  this.dedupeDialogState.useAllColumns = useAll;
  if (useAll) {
    this.dedupeDialogState.selectedColumns = this.columns.map(() => true);
  }
  this.updateDedupePreview();
}

export function toggleDedupeColumn(this: ChumakApp, index: number) {
  this.dedupeDialogState.selectedColumns[index] = !this.dedupeDialogState.selectedColumns[index];
  this.updateDedupePreview();
}

export function selectAllForDedupe(this: ChumakApp) {
  this.dedupeDialogState.selectedColumns = this.columns.map(() => true);
  this.updateDedupePreview();
}

export function selectNoneForDedupe(this: ChumakApp) {
  this.dedupeDialogState.selectedColumns = this.columns.map(() => false);
  this.updateDedupePreview();
}

export function getDedupeColumns(this: ChumakApp): string[] {
  if (this.dedupeDialogState.useAllColumns) {
    return [];
  }
  return this.columns.filter((_, i) => this.dedupeDialogState.selectedColumns[i]);
}

export function findDuplicateRows(this: ChumakApp, data: any[], columns: string[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  const keys = columns.length > 0 ? columns : Object.keys(data[0] || {});

  data.forEach((row, i) => {
    const key = keys
      .map((c) => {
        const v = row[c];
        return v == null ? '\0null\0' : String(v);
      })
      .join('\0');

    if (seen.has(key)) {
      duplicates.add(i);
    } else {
      seen.set(key, i);
    }
  });
  return duplicates;
}

export function updateDedupePreview(this: ChumakApp) {
  if (!this.currentData || this.currentData.length === 0) {
    this.dedupeDialogState.duplicateCount = 0;
    this.clearPreview();
    return;
  }

  const { mode } = this.dedupeDialogState;
  const columns = this.getDedupeColumns();
  const duplicates = this.findDuplicateRows(this.currentData, columns);
  this.dedupeDialogState.duplicateCount = duplicates.size;

  const colInfo =
    columns.length === 0
      ? 'all columns'
      : columns.length === 1
        ? `"${columns[0]}"`
        : `${columns.length} columns`;

  // Show first few duplicates in preview
  const duplicateIndices = Array.from(duplicates).slice(0, 5);
  const previewRows = duplicateIndices.map((i) => this.currentData![i]);

  let statsText: string;
  if (duplicates.size === 0) {
    statsText = `No duplicates found by ${colInfo}`;
  } else if (mode === 'keep') {
    // For 'keep' mode, show how many duplicate rows will be kept
    const totalDuplicateRows = this.findAllDuplicateRowCount(this.currentData, columns);
    statsText = `${totalDuplicateRows} row${totalDuplicateRows !== 1 ? 's' : ''} are duplicates (will keep)`;
  } else {
    // For 'remove' mode, show how many will be removed
    statsText = `${duplicates.size} duplicate row${duplicates.size !== 1 ? 's' : ''} will be removed`;
  }

  this.previewState = {
    title: mode === 'keep' ? 'Keep Duplicates Preview' : 'Remove Duplicates Preview',
    stats: statsText,
    columns: columns.length > 0 ? columns : this.columns.slice(0, 5),
    newColumns: [],
    rows: previewRows,
    _debounceTimer: null,
  };
}

export function findAllDuplicateRowCount(this: ChumakApp, data: any[], columns: string[]): number {
  const seen = new Map<string, number[]>();
  const keys = columns.length > 0 ? columns : Object.keys(data[0] || {});

  data.forEach((row, i) => {
    const key = keys
      .map((c) => {
        const v = row[c];
        return v == null ? '\0null\0' : String(v);
      })
      .join('\0');
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(i);
  });

  let count = 0;
  for (const indices of seen.values()) {
    if (indices.length > 1) {
      count += indices.length;
    }
  }
  return count;
}

export async function applyDedupeTransform(this: ChumakApp) {
  const { mode } = this.dedupeDialogState;
  const columns = this.getDedupeColumns();
  const opName = mode === 'keep' ? 'Keep Duplicates' : 'Remove Duplicates';
  await this.runTransform(opName, { dedupe: { columns, mode } });
}
