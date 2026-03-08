import i18n from '../../../i18n/core';

export function describeAggregate(transform: any): string | null {
  if (!transform.aggregate) return null;
  const { groupby, rollup } = transform.aggregate;
  const groupCount = groupby && groupby.length > 0 ? groupby.length : 0;
  const aggs = Object.keys(rollup).length;
  const groupLabel =
    groupCount > 0
      ? i18n.t('transforms:aggregate.groupByColumns', { count: groupCount })
      : i18n.t('transforms:aggregate.allRows');
  return i18n.t('transforms:aggregate.groupBy', { groupLabel, count: aggs });
}

export function describeDescribe(transform: any): string | null {
  if (!transform.describe) return null;
  const { columns } = transform.describe;
  return i18n.t('transforms:describe.summary', { count: columns.length });
}

export const aggregateDescribers = {
  aggregate: describeAggregate,
  describe: describeDescribe,
};
