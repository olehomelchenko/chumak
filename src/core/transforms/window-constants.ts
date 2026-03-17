/** Aggregate functions that can be used as cumulative/rolling in window context */
export const AGGREGATE_FUNCTIONS = [
  'sum',
  'mean',
  'min',
  'max',
  'count',
  'product',
  'median',
  'mode',
  'stdev',
  'variance',
];

/** Window/aggregate functions that require a source column (all except count, ranking, etc.) */
export const COLUMN_REQUIRED_FUNCTIONS = [
  'lag',
  'lead',
  'first_value',
  'last_value',
  'nth_value',
  'fill_down',
  'fill_up',
  'sum',
  'mean',
  'min',
  'max',
  'product',
  'median',
  'mode',
  'stdev',
  'variance',
];
