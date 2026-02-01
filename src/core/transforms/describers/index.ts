import { basicDescribers } from './basic';
import { patternDescribers } from './pattern';
import { filterDescribers } from './filter';
import { deriveDescribers } from './derive';
import { rowOpsDescribers } from './row-ops';
import { typeDescribers } from './type-conversion';
import { imputeDescribers } from './impute';
import { reshapeDescribers } from './reshape';
import { joinDescribers } from './join';
import { combineDescribers } from './combine';
import { aggregateDescribers } from './aggregate';
import { importDescribers } from './import';

/**
 * Describer function signature
 */
export type TransformDescriber = (transform: any, rightName: string | null) => string | null;

/**
 * Aggregated map of all transform describers by key
 */
export const TRANSFORM_DESCRIBERS: Record<string, TransformDescriber> = {
  // Import describers
  import: importDescribers.import,

  // Basic describers
  select: basicDescribers.select,
  remove: basicDescribers.remove,
  rename: basicDescribers.rename,
  sort: basicDescribers.sort,
  renamePattern: basicDescribers.renamePattern,

  // Pattern describers
  selectPattern: patternDescribers.selectPattern,
  removePattern: patternDescribers.removePattern,

  // Filter describers
  filter: filterDescribers.filter,
  conditional: filterDescribers.conditional,
  replace: filterDescribers.replace,

  // Derive describers
  derive: deriveDescribers.derive,

  // Row operations describers
  sliceRows: rowOpsDescribers.sliceRows,
  addIndex: rowOpsDescribers.addIndex,
  dedupe: rowOpsDescribers.dedupe,
  sample: rowOpsDescribers.sample,

  // Type conversion describers
  types: typeDescribers.types,

  // Imputation describers
  impute: imputeDescribers.impute,

  // Reshape describers
  fold: reshapeDescribers.fold,
  pivot: reshapeDescribers.pivot,
  split: reshapeDescribers.split,
  spread: reshapeDescribers.spread,
  unroll: reshapeDescribers.unroll,

  // Join describers
  join: joinDescribers.join,
  semijoin: joinDescribers.semijoin,
  antijoin: joinDescribers.antijoin,
  lookup: joinDescribers.lookup,

  // Combine describers
  concat: combineDescribers.concat,
  union: combineDescribers.union,

  // Aggregate describers
  aggregate: aggregateDescribers.aggregate,
};
