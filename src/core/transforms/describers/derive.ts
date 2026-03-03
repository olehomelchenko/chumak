import i18n from '../../../i18n';

export function describeDerive(transform: any): string | null {
  if (!transform.derive) return null;
  const names = Object.keys(transform.derive);
  return i18n.t('transforms:derive.derive', { columns: names.join(', ') });
}

export const deriveDescribers = {
  derive: describeDerive,
};
