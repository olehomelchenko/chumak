import { TransformStep } from '../schema-engine';

/**
 * Options for pattern-based column matching
 */
export interface MatchOptions {
  pattern: string;
  matchType: 'prefix' | 'suffix' | 'exact' | 'contains' | 'regex';
  mode: 'include' | 'exclude';
}

/**
 * Minimal interface for entities that hold tabular data (sources, models).
 * Keeps core decoupled from app-layer type definitions.
 */
export interface DataEntity {
  id: string;
  data: any[];
}

/**
 * Context for multi-table operations (joins, concat, union)
 */
export interface TransformContext {
  sources: DataEntity[];
  models: DataEntity[];
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
  window?: {
    orderBy: Array<{ field: string; order: 'asc' | 'desc' }>;
    partitionBy?: string[];
    derive: Record<string, string>;
    frames?: Record<string, [number | null, number | null]>;
  };
  promoteHeader?: { skipRows: number };
  describe?: { columns: string[] };
}

/**
 * Multi-model reference paths: transform keys and fields that reference other models/sources.
 * Used by DependencyService.extractReferencedIds() and v2 export/import name translation.
 */
export const MULTI_MODEL_REFERENCE_PATHS = [
  { key: 'join', field: 'right' },
  { key: 'concat', field: 'with' },
  { key: 'union', field: 'with' },
  { key: 'semijoin', field: 'right' },
  { key: 'antijoin', field: 'right' },
  { key: 'lookup', field: 'right' },
] as const;

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
  'window',
  'removeRows',
  'keepRows',
  'promoteHeader',
  'describe',
] as const;
