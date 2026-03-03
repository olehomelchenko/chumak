import i18n from '../../../i18n';

export function describeJoin(transform: any, rightName: string | null): string | null {
  if (!transform.join) return null;
  const how = transform.join.how || 'inner';
  const name =
    rightName ||
    (transform.join.right.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  return i18n.t('transforms:join.join', { how, name });
}

export function describeSemijoin(transform: any, rightName: string | null): string | null {
  if (!transform.semijoin) return null;
  const name =
    rightName ||
    (transform.semijoin.right.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  return i18n.t('transforms:join.semijoin', { name });
}

export function describeAntijoin(transform: any, rightName: string | null): string | null {
  if (!transform.antijoin) return null;
  const name =
    rightName ||
    (transform.antijoin.right.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  return i18n.t('transforms:join.antijoin', { name });
}

export function describeLookup(transform: any, rightName: string | null): string | null {
  if (!transform.lookup) return null;
  const name =
    rightName ||
    (transform.lookup.right.startsWith('mdl_')
      ? i18n.t('transforms:join.model')
      : i18n.t('transforms:join.source'));
  const valCount = transform.lookup.values.length;
  return i18n.t('transforms:join.lookup', { count: valCount, name });
}

export const joinDescribers = {
  join: describeJoin,
  semijoin: describeSemijoin,
  antijoin: describeAntijoin,
  lookup: describeLookup,
};
