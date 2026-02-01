import * as aq from 'arquero';
import type { FullTransformStep } from '../types';
import { matchColumnPattern } from '../utils';

export function handleSelectPattern(table: any, transform: FullTransformStep): any {
  const { pattern, matchType, include } = transform.selectPattern!;
  const columns = table.columnNames();
  const matched = matchColumnPattern(columns, { pattern, matchType, mode: 'include' });
  const finalColumns = include ? [...new Set([...matched, ...include])] : matched;
  return finalColumns.length > 0 ? table.select(...finalColumns) : table;
}

export function handleRemovePattern(table: any, transform: FullTransformStep): any {
  const { pattern, matchType } = transform.removePattern!;
  const columns = table.columnNames();
  const matched = matchColumnPattern(columns, { pattern, matchType, mode: 'include' });
  return matched.length > 0 ? table.select((aq as any).not(...matched)) : table;
}

export const patternHandlers = {
  selectPattern: handleSelectPattern,
  removePattern: handleRemovePattern,
};
