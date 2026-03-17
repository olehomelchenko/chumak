import i18n from '../../../i18n/core';
import { AGGREGATE_FUNCTIONS } from '../window-constants';

export function describeWindow(transform: any): string | null {
  if (!transform.window) return null;
  const { orderBy, partitionBy, derive, frames } = transform.window;

  const colCount = Object.keys(derive).length;
  const orderField = orderBy?.[0]?.field || i18n.t('transforms:window.defaultOrder');
  const partitionText =
    partitionBy && partitionBy.length > 0
      ? i18n.t('transforms:window.partitioned', { count: partitionBy.length })
      : '';

  // Detect if any rolling (non-cumulative) frames are used
  const hasRolling =
    frames && Object.values(frames).some((f: any) => f && (f[0] !== null || f[1] !== 0));

  // Detect if aggregate functions are used
  const expressions = Object.values(derive) as string[];
  const hasAggregates = expressions.some((expr) => {
    const match = expr.match(/^op\.(\w+)/);
    return match && AGGREGATE_FUNCTIONS.includes(match[1]);
  });

  let modeText = '';
  if (hasAggregates) {
    modeText = hasRolling
      ? i18n.t('transforms:window.rolling')
      : i18n.t('transforms:window.cumulative');
  }

  return i18n.t('transforms:window.window', {
    count: colCount,
    orderField,
    partitionText,
    modeText,
  });
}

export const windowDescribers = {
  window: describeWindow,
};
