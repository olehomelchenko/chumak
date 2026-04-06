/**
 * Column dialog states
 *
 * Column-focused operations: spread, unroll, type-conversion, merge.
 * (column-editor, split, dedupe migrated to useDialogState)
 */

export { spreadState, resetSpreadState } from './spread-state';
export { unrollState, resetUnrollState } from './unroll-state';
export { typeConversionState, resetTypeConversionState } from './type-conversion-state';
export { mergeState, resetMergeState } from './merge-state';
