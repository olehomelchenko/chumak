export function describeWindow(transform: any): string | null {
  if (!transform.window) return null;
  const { orderBy, partitionBy, derive } = transform.window;

  const colCount = Object.keys(derive).length;
  const orderField = orderBy?.[0]?.field || 'default order';
  const partitionText =
    partitionBy && partitionBy.length > 0
      ? `, partitioned by ${partitionBy.length} column${partitionBy.length !== 1 ? 's' : ''}`
      : '';

  return `Window (${colCount} column${colCount !== 1 ? 's' : ''}, by ${orderField}${partitionText})`;
}

export const windowDescribers = {
  window: describeWindow,
};
