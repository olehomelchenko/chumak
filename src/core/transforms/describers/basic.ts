import i18n from '../../../i18n/core';

export function describeSelect(transform: any): string | null {
  if (!transform.select) return null;
  const count = transform.select.length;
  return i18n.t('transforms:basic.select', { count });
}

export function describeRemove(transform: any): string | null {
  if (!transform.remove) return null;
  const count = transform.remove.length;
  return i18n.t('transforms:basic.remove', { count });
}

export function describeRename(transform: any): string | null {
  if (!transform.rename) return null;
  const count = Object.keys(transform.rename).length;
  return i18n.t('transforms:basic.rename', { count });
}

export function describeSort(transform: any): string | null {
  if (!transform.sort) return null;
  const fields = Array.isArray(transform.sort) ? transform.sort : [transform.sort];
  const parts = fields.map((f: any) => `${f.field} ${f.order === 'desc' ? '\u2193' : '\u2191'}`);
  return i18n.t('transforms:basic.sort', { fields: parts.join(', ') });
}

export function describeRenamePattern(transform: any): string | null {
  if (!transform.renamePattern) return null;
  const { find, replace: replacement, regex } = transform.renamePattern;
  const mode = regex ? 'regex' : 'text';
  return i18n.t('transforms:basic.renamePattern', { mode, find, replace: replacement });
}

export const basicDescribers = {
  select: describeSelect,
  remove: describeRemove,
  rename: describeRename,
  sort: describeSort,
  renamePattern: describeRenamePattern,
};
