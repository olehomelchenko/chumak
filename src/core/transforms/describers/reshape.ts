import i18n from '../../../i18n/core';

export function describeFold(transform: any): string | null {
  if (!transform.fold) return null;
  const { columns, as } = transform.fold;
  const count = columns.length;

  if (as && as.length === 2) {
    return i18n.t('transforms:reshape.foldWithAs', { count, as: `${as[0]}, ${as[1]}` });
  }

  return i18n.t('transforms:reshape.fold', { count });
}

export function describePivot(transform: any): string | null {
  if (!transform.pivot) return null;
  const { keys, values, aggregation } = transform.pivot;
  return i18n.t('transforms:reshape.pivot', { aggregation, values, keys });
}

export function describeSplit(transform: any): string | null {
  if (!transform.split) return null;
  return i18n.t('transforms:reshape.split', { column: transform.split.column });
}

export function describeSpread(transform: any): string | null {
  if (!transform.spread) return null;
  const { column, limit } = transform.spread;
  if (limit !== undefined) {
    return i18n.t('transforms:reshape.spreadWithLimit', { column, limit });
  }
  return i18n.t('transforms:reshape.spread', { column });
}

export function describeUnroll(transform: any): string | null {
  if (!transform.unroll) return null;
  const { column, indices } = transform.unroll;
  if (indices) {
    return i18n.t('transforms:reshape.unrollWithIndices', { column });
  }
  return i18n.t('transforms:reshape.unroll', { column });
}

export const reshapeDescribers = {
  fold: describeFold,
  pivot: describePivot,
  split: describeSplit,
  spread: describeSpread,
  unroll: describeUnroll,
};
