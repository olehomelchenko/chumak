/**
 * Aggregate dialog states
 *
 * Aggregation operations: aggregate, pivot, fold.
 */

export { foldState, resetFoldState } from './fold-state';
export { aggregateState, resetAggregateState, type Aggregation } from './aggregate-state';
export { pivotState, resetPivotState, type PivotOptions } from './pivot-state';
