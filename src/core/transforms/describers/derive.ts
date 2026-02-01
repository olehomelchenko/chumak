export function describeDerive(transform: any): string | null {
  if (!transform.derive) return null;
  const names = Object.keys(transform.derive);
  return `Derive: ${names.join(', ')}`;
}

export const deriveDescribers = {
  derive: describeDerive,
};
