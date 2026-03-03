import i18n from '../../../i18n';

export function describeTypes(transform: any): string | null {
  if (!transform.types) return null;
  const count = Object.keys(transform.types).length;
  return i18n.t('transforms:types.detectTypes', { count });
}

export const typeDescribers = {
  types: describeTypes,
};
