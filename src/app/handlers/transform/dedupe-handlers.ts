import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import type { DedupeMode } from '../../../types/modes';

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
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const mode = state.mode as DedupeMode;
  const useAllColumns = state.useAllColumns as boolean;
  const selectedColumns = state.selectedColumns as boolean[];

  const columns = useAllColumns ? [] : AppStore.columns.value.filter((_, i) => selectedColumns[i]);

  const opName = mode === 'keep' ? 'Keep Duplicates' : 'Remove Duplicates';
  await StepService.runTransform(opName, { dedupe: { columns, mode } }, callbacks);
}
