import { TransformStep } from '../schema-engine';
import type { Source, Model } from '../../app/types';

/**
 * Options for pattern-based column matching
 */
export interface MatchOptions {
  pattern: string;
  matchType: 'prefix' | 'suffix' | 'exact' | 'contains' | 'regex';
  mode: 'include' | 'exclude';
}

/**
 * Context for multi-table operations (joins, concat, union)
 */
export interface TransformContext {
  sources: Source[];
  models: Model[];
}

/**
 * Extended transform step that includes all transform types
 * (superset of schema-engine's TransformStep)
 */
export interface FullTransformStep extends TransformStep {
  sliceRows?: { count: number; mode: 'first' | 'last' | 'removeFirst' | 'removeLast' };
  addIndex?: { columnName: string; startFrom?: number };
  impute?: {
    column: string;
    strategy:
      | 'constant'
      | 'mean'
      | 'median'
      | 'min'
      | 'max'
      | 'forwardFill'
      | 'backwardFill'
      | 'linearInterpolation';
    value?: any;
    includeEmptyString?: boolean;
  };
  selectPattern?: {
    pattern: string;
    matchType: 'prefix' | 'suffix' | 'contains' | 'regex';
    include?: string[];
  };
  removePattern?: {
    pattern: string;
    matchType: 'prefix' | 'suffix' | 'contains' | 'regex';
  };
  conditional?: {
    column: string;
    conditions: Array<{ when: string; then: string }>;
    else: string;
  };
  renamePattern?: {
    find: string;
    replace: string;
    regex?: boolean;
  };
  sample?: { count: number; seed?: number };
  semijoin?: { right: string; on: [string, string][] };
  antijoin?: { right: string; on: [string, string][] };
  lookup?: { right: string; on: [string, string][]; values: string[] };
  spread?: { column: string; limit?: number; keepOriginal?: boolean };
  unroll?: { column: string; indices?: boolean; keepOriginal?: boolean };
}

/**
 * List of known transform keys (future-proofing: unknown transforms are skipped with warning)
 */
export const KNOWN_TRANSFORM_KEYS: readonly string[] = [
  'select',
  'remove',
  'rename',
  'derive',
  'filter',
  'sort',
  'replace',
  'dedupe',
  'join',
  'concat',
  'union',
  'import',
  'types',
  'aggregate',
  'fold',
  'pivot',
  'split',
  'sliceRows',
  'addIndex',
  'impute',
  'selectPattern',
  'removePattern',
  'conditional',
  'renamePattern',
  'sample',
  'semijoin',
  'antijoin',
  'lookup',
  'spread',
  'unroll',
] as const;
