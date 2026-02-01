export function describeJoin(transform: any, rightName: string | null): string | null {
  if (!transform.join) return null;
  const how = transform.join.how || 'inner';
  const name = rightName || (transform.join.right.startsWith('mdl_') ? 'model' : 'source');
  return `Join (${how}): ${name}`;
}

export function describeSemijoin(transform: any, rightName: string | null): string | null {
  if (!transform.semijoin) return null;
  const name = rightName || (transform.semijoin.right.startsWith('mdl_') ? 'model' : 'source');
  return `Semijoin: ${name}`;
}

export function describeAntijoin(transform: any, rightName: string | null): string | null {
  if (!transform.antijoin) return null;
  const name = rightName || (transform.antijoin.right.startsWith('mdl_') ? 'model' : 'source');
  return `Antijoin: ${name}`;
}

export function describeLookup(transform: any, rightName: string | null): string | null {
  if (!transform.lookup) return null;
  const name = rightName || (transform.lookup.right.startsWith('mdl_') ? 'model' : 'source');
  const valCount = transform.lookup.values.length;
  return `Lookup: ${valCount} column${valCount !== 1 ? 's' : ''} from ${name}`;
}

export const joinDescribers = {
  join: describeJoin,
  semijoin: describeSemijoin,
  antijoin: describeAntijoin,
  lookup: describeLookup,
};
