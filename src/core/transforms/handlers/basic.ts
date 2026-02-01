import * as aq from 'arquero';
import type { FullTransformStep } from '../types';

export function handleSelect(table: any, transform: FullTransformStep): any {
  return table.select(...transform.select!);
}

export function handleRemove(table: any, transform: FullTransformStep): any {
  return table.select((aq as any).not(...transform.remove!));
}

export function handleRename(table: any, transform: FullTransformStep): any {
  return table.rename(transform.rename);
}

export function handleSort(table: any, transform: FullTransformStep): any {
  const { field, order } = transform.sort!;
  return order === 'desc' ? table.orderby((aq as any).desc(field)) : table.orderby(field);
}

export function handleRenamePattern(table: any, transform: FullTransformStep): any {
  const { find, replace: replacement, regex } = transform.renamePattern!;
  const columns = table.columnNames();
  const renameMap: Record<string, string> = {};

  for (const col of columns) {
    let newName: string;
    if (regex) {
      try {
        const regexObj = new RegExp(find);
        newName = col.replace(regexObj, replacement);
      } catch (e) {
        // Invalid regex - skip this column
        continue;
      }
    } else {
      newName = col.replace(find, replacement);
    }

    if (newName !== col) {
      renameMap[col] = newName;
    }
  }

  return Object.keys(renameMap).length > 0 ? table.rename(renameMap) : table;
}

export const basicHandlers = {
  select: handleSelect,
  remove: handleRemove,
  rename: handleRename,
  sort: handleSort,
  renamePattern: handleRenamePattern,
};
