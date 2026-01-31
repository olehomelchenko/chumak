import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from './preview-engine';

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

// Preview engine instance for dedupe operations
const dedupePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const currentData = AppStore.currentData.value;
    if (!currentData || currentData.length === 0) {
      DialogStore.dedupeState.duplicateCount.value = 0;
      return null;
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

    return {
      title: mode.value === 'keep' ? 'Keep Duplicates Preview' : 'Remove Duplicates Preview',
      stats: statsText,
      columns: columns.length > 0 ? columns : AppStore.columns.value.slice(0, 5),
      newColumns: [],
      rows: previewRows,
    };
  },
});

export function debouncedUpdateDedupePreview() {
  dedupePreview.trigger();
}

export function updateDedupePreview() {
  dedupePreview.compute();
}

// Re-export clearPreview from preview-engine
export { clearPreview };

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

export async function applyDedupeTransform(callbacks: any) {
  const { mode } = DialogStore.dedupeState;
  const columns = getDedupeColumns();
  const opName = mode.value === 'keep' ? 'Keep Duplicates' : 'Remove Duplicates';
  await StepService.runTransform(opName, { dedupe: { columns, mode: mode.value } }, callbacks);
}
