import i18n from '../../../i18n/core';

export function describeWindow(transform: any): string | null {
  if (!transform.window) return null;
  const { orderBy, partitionBy, derive } = transform.window;

  const colCount = Object.keys(derive).length;
  const orderField = orderBy?.[0]?.field || i18n.t('transforms:window.defaultOrder');
  const partitionText =
    partitionBy && partitionBy.length > 0
      ? i18n.t('transforms:window.partitioned', { count: partitionBy.length })
      : '';

  return i18n.t('transforms:window.window', { count: colCount, orderField, partitionText });
}

export const windowDescribers = {
  window: describeWindow,
};
