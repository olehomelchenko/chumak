import type { MatchOptions, TransformContext, FullTransformStep } from './types';
import { KNOWN_TRANSFORM_KEYS } from './types';
import * as aq from 'arquero';

/**
 * Match columns based on pattern (prefix/suffix/exact/contains/regex)
 */
export function matchColumnPattern(columns: string[], options: MatchOptions): string[] {
  const { pattern, matchType, mode } = options;

  if (!pattern || pattern.trim() === '') {
    return mode === 'include' ? [...columns] : [];
  }

  let matched: string[] = [];

  if (matchType === 'prefix') {
    matched = columns.filter((col) => col.startsWith(pattern));
  } else if (matchType === 'suffix') {
    matched = columns.filter((col) => col.endsWith(pattern));
  } else if (matchType === 'exact') {
    matched = columns.filter((col) => col === pattern);
  } else if (matchType === 'contains') {
    matched = columns.filter((col) => col.includes(pattern));
  } else if (matchType === 'regex') {
    try {
      const regex = new RegExp(pattern);
      matched = columns.filter((col) => regex.test(col));
    } catch (e) {
      // Invalid regex - return empty array
      return mode === 'include' ? [] : [...columns];
    }
  }

  if (mode === 'include') {
    return matched;
  } else {
    return columns.filter((col) => !matched.includes(col));
  }
}

/**
 * Check if a transform step has any unknown transform keys
 * @returns The unknown key if found, null otherwise
 */
export function getUnknownTransformKey(transform: FullTransformStep): string | null {
  const keys = Object.keys(transform).filter((k) => k !== '__v'); // Ignore version field
  const unknownKey = keys.find((k) => !KNOWN_TRANSFORM_KEYS.includes(k as any));
  return unknownKey || null;
}

/**
 * Check if a column contains JSON strings that need parsing for spread/unroll operations
 */
export function checkIfNeedsJsonParsing(table: any, column: string): boolean {
  const firstRow = table.objects({ limit: 1 })[0];
  if (!firstRow || !(column in firstRow)) {
    return false;
  }
  const value = firstRow[column];
  // Check if it's a string that starts with '[' (likely a JSON array)
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolve a table from context by ID (for join/concat/union operations)
 */
export function resolveTableFromContext(
  context: TransformContext | null,
  targetId: string,
  operationName: string
): any {
  // Try to find as a model first
  const targetModel = context?.models.find((m: any) => m.id === targetId);
  if (targetModel) {
    return (aq as any).from(targetModel.data);
  }

  // Fall back to source
  const targetSource = context?.sources.find((s: any) => s.id === targetId);
  if (targetSource) {
    return (aq as any).from(targetSource.data);
  }

  throw new Error(`${operationName} target with ID '${targetId}' not found`);
}
