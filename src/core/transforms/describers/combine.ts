import i18n from '../../../i18n/core';

export function describeConcat(transform: any, rightName: string | null): string | null {
  if (!transform.concat) return null;
  const name =
    rightName ||
    (transform.concat.with.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  return i18n.t('transforms:combine.concat', { name });
}

export function describeUnion(transform: any, rightName: string | null): string | null {
  if (!transform.union) return null;
  const name =
    rightName ||
    (transform.union.with.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  return i18n.t('transforms:combine.union', { name });
}

export const combineDescribers = {
  concat: describeConcat,
  union: describeUnion,
};
