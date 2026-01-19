import type { SytoApp } from '../../syto-app';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

export function toggleDedupeAllColumns(useAll: boolean) {
  DialogStore.dedupeState.useAllColumns.value = useAll;
  if (useAll) {
    DialogStore.dedupeState.selectedColumns.value = AppStore.columns.value.map(() => true);
  }
  updateDedupePreview();
}

export function toggleDedupeColumn(index: number) {
  const selected = [...DialogStore.dedupeState.selectedColumns.value];
  selected[index] = !selected[index];
  DialogStore.dedupeState.selectedColumns.value = selected;
  updateDedupePreview();
}

export function selectAllForDedupe() {
  DialogStore.dedupeState.selectedColumns.value = AppStore.columns.value.map(() => true);
  updateDedupePreview();
}

export function selectNoneForDedupe() {
  DialogStore.dedupeState.selectedColumns.value = AppStore.columns.value.map(() => false);
  updateDedupePreview();
}

export function getDedupeColumns(): string[] {
  if (DialogStore.dedupeState.useAllColumns.value) {
    return [];
  }
  return AppStore.columns.value.filter((_, i) => DialogStore.dedupeState.selectedColumns.value[i]);
}

export function findDuplicateRows(data: any[], columns: string[]): Set<number> {
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

export function updateDedupePreview() {
  const currentData = AppStore.currentData.value;
  if (!currentData || currentData.length === 0) {
    DialogStore.dedupeState.duplicateCount.value = 0;
    // Clear preview
    DialogStore.previewState.rows.value = [];
    return;
  }

  const { mode } = DialogStore.dedupeState;
  const columns = getDedupeColumns();
  const duplicates = findDuplicateRows(currentData, columns);
  DialogStore.dedupeState.duplicateCount.value = duplicates.size;

  const colInfo =
    columns.length === 0
      ? 'all columns'
      : columns.length === 1
        ? `"${columns[0]}"`
        : `${columns.length} columns`;

  // Show first few duplicates in preview
  const duplicateIndices = Array.from(duplicates).slice(0, 5);
  const previewRows = duplicateIndices.map((i) => currentData[i]);

  let statsText: string;
  if (duplicates.size === 0) {
    statsText = `No duplicates found by ${colInfo}`;
  } else if (mode.value === 'keep') {
    // For 'keep' mode, show how many duplicate rows will be kept
    const totalDuplicateRows = findAllDuplicateRowCount(currentData, columns);
    statsText = `${totalDuplicateRows} row${totalDuplicateRows !== 1 ? 's' : ''} are duplicates (will keep)`;
  } else {
    // For 'remove' mode, show how many will be removed
    statsText = `${duplicates.size} duplicate row${duplicates.size !== 1 ? 's' : ''} will be removed`;
  }

  DialogStore.previewState.title.value =
    mode.value === 'keep' ? 'Keep Duplicates Preview' : 'Remove Duplicates Preview';
  DialogStore.previewState.stats.value = statsText;
  DialogStore.previewState.columns.value =
    columns.length > 0 ? columns : AppStore.columns.value.slice(0, 5);
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = previewRows;
}

export function findAllDuplicateRowCount(data: any[], columns: string[]): number {
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

export async function applyDedupeTransform(this: SytoApp) {
  const { mode } = DialogStore.dedupeState;
  const columns = getDedupeColumns();
  const opName = mode.value === 'keep' ? 'Keep Duplicates' : 'Remove Duplicates';
  await this.runTransform(opName, { dedupe: { columns, mode: mode.value } });
}
