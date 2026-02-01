export function describeAggregate(transform: any): string | null {
  if (!transform.aggregate) return null;
  const { groupby, rollup } = transform.aggregate;
  const groupCount = groupby && groupby.length > 0 ? groupby.length : 0;
  const aggs = Object.keys(rollup).length;
  const groupLabel =
    groupCount > 0 ? `${groupCount} column${groupCount !== 1 ? 's' : ''}` : 'all rows';
  return `Group by (${groupLabel}), ${aggs} summar${aggs !== 1 ? 'ies' : 'y'}`;
}

export const aggregateDescribers = {
  aggregate: describeAggregate,
};
