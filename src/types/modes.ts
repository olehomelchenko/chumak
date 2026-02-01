/**
 * Dialog mode types
 *
 * Centralized type definitions for dialog modes and options.
 * These were previously scattered across component files.
 */

// Slice rows dialog modes
export type SliceMode = 'first' | 'last' | 'removeFirst' | 'removeLast';

// Filter preview modes
export type FilterPreviewMode = 'all' | 'matching';

// Unpivot/fold dialog modes
export type UnpivotMode = 'keep' | 'fold';

// Split column modes
export type SplitMode = 'spread' | 'left' | 'right' | 'firstN' | 'lastN';

// Date operation types
export type DateOperation = 'extract' | 'truncate';

// Pivot aggregation functions
export type PivotAggregation = 'sum' | 'mean' | 'count' | 'min' | 'max' | 'any';

// Join operation types
export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross' | 'semi' | 'anti' | 'lookup';

// Join target (source or model reference)
export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

// Pattern matching types
export type PatternMatchType = 'prefix' | 'suffix' | 'contains' | 'regex';

// Dedupe modes
export type DedupeMode = 'remove' | 'keep';

// Impute strategies
export type ImputeStrategy =
  | 'constant'
  | 'mean'
  | 'median'
  | 'min'
  | 'max'
  | 'forwardFill'
  | 'backwardFill'
  | 'linearInterpolation';

// Column editor modes
export type ColumnEditorMode = 'list' | 'text' | 'pattern';
export type ColumnEditorTextSubMode = 'rename' | 'reorder' | 'select';
export type ColumnEditorPatternMode = 'include' | 'exclude';
export type ColumnEditorPatternMatchType = 'prefix' | 'suffix' | 'exact' | 'contains' | 'regex';
export type ColumnEditorPatternOperationMode = 'select' | 'remove' | 'rename';

// Settings theme
export type Theme = 'syto' | 'blues';

// Import header mode
export type HeaderMode = 'first-row' | 'auto-generate' | 'manual';
