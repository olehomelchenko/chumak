import { basicHandlers } from './basic';
import { patternHandlers } from './pattern';
import { filterHandlers } from './filter';
import { deriveHandlers } from './derive';
import { rowOpsHandlers } from './row-ops';
import { typeHandlers } from './type-conversion';
import { imputeHandlers } from './impute';
import { reshapeHandlers } from './reshape';
import { joinHandlers } from './join';
import { combineHandlers } from './combine';
import { aggregateHandlers } from './aggregate';
import { windowHandlers } from './window';

import type { FullTransformStep, TransformContext } from '../types';

/**
 * Handler function signature for transform operations
 */
export type TransformHandler = (
  table: any,
  transform: FullTransformStep,
  schema: string[],
  context: TransformContext | null
) => any;

/**
 * Aggregated map of all transform handlers by key
 */
export const TRANSFORM_HANDLERS: Record<string, TransformHandler> = {
  // Basic handlers
  select: basicHandlers.select,
  remove: basicHandlers.remove,
  rename: basicHandlers.rename,
  sort: basicHandlers.sort,
  renamePattern: basicHandlers.renamePattern,

  // Pattern handlers
  selectPattern: patternHandlers.selectPattern,
  removePattern: patternHandlers.removePattern,

  // Filter handlers
  filter: filterHandlers.filter,
  conditional: filterHandlers.conditional,
  replace: filterHandlers.replace,

  // Derive handlers
  derive: deriveHandlers.derive,

  // Row operations handlers
  sliceRows: rowOpsHandlers.sliceRows,
  addIndex: rowOpsHandlers.addIndex,
  dedupe: rowOpsHandlers.dedupe,
  sample: rowOpsHandlers.sample,
  removeRows: rowOpsHandlers.removeRows,
  keepRows: rowOpsHandlers.keepRows,

  // Type conversion handlers
  types: typeHandlers.types,

  // Imputation handlers
  impute: imputeHandlers.impute,

  // Reshape handlers
  fold: reshapeHandlers.fold,
  pivot: reshapeHandlers.pivot,
  split: reshapeHandlers.split,
  spread: reshapeHandlers.spread,
  unroll: reshapeHandlers.unroll,

  // Join handlers
  join: joinHandlers.join,
  semijoin: joinHandlers.semijoin,
  antijoin: joinHandlers.antijoin,
  lookup: joinHandlers.lookup,

  // Combine handlers
  concat: combineHandlers.concat,
  union: combineHandlers.union,

  // Aggregate handlers
  aggregate: aggregateHandlers.aggregate,

  // Window handlers
  window: windowHandlers.window,
};
