/**
 * Aggregate dialog states
 *
 * Aggregation operations: aggregate, pivot, fold, window.
 */

export { foldState, resetFoldState } from './fold-state';
export { aggregateState, resetAggregateState, type Aggregation } from './aggregate-state';
export { pivotState, resetPivotState, type PivotOptions } from './pivot-state';
export {
  windowState,
  resetWindowState,
  type WindowFunction,
  type OrderByItem,
} from './window-state';
export { describeState, resetDescribeState } from './describe-state';
