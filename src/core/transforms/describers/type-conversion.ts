export function describeTypes(transform: any): string | null {
  if (!transform.types) return null;
  const count = Object.keys(transform.types).length;
  return `Detect types: ${count} column${count !== 1 ? 's' : ''}`;
}

export const typeDescribers = {
  types: describeTypes,
};
