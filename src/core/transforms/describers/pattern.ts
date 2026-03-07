import i18n from '../../../i18n/core';

export function describeSelectPattern(transform: any): string | null {
  if (!transform.selectPattern) return null;
  const { pattern, matchType } = transform.selectPattern;
  return i18n.t('transforms:pattern.select', { matchType, pattern });
}

export function describeRemovePattern(transform: any): string | null {
  if (!transform.removePattern) return null;
  const { pattern, matchType } = transform.removePattern;
  return i18n.t('transforms:pattern.remove', { matchType, pattern });
}

export const patternDescribers = {
  selectPattern: describeSelectPattern,
  removePattern: describeRemovePattern,
};
