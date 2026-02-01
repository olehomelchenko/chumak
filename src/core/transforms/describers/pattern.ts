export function describeSelectPattern(transform: any): string | null {
  if (!transform.selectPattern) return null;
  const { pattern, matchType } = transform.selectPattern;
  return `Select pattern: ${matchType} "${pattern}"`;
}

export function describeRemovePattern(transform: any): string | null {
  if (!transform.removePattern) return null;
  const { pattern, matchType } = transform.removePattern;
  return `Remove pattern: ${matchType} "${pattern}"`;
}

export const patternDescribers = {
  selectPattern: describeSelectPattern,
  removePattern: describeRemovePattern,
};
