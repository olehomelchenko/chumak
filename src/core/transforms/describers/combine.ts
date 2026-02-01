export function describeConcat(transform: any, rightName: string | null): string | null {
  if (!transform.concat) return null;
  const name = rightName || (transform.concat.with.startsWith('mdl_') ? 'model' : 'source');
  return `Concat: ${name}`;
}

export function describeUnion(transform: any, rightName: string | null): string | null {
  if (!transform.union) return null;
  const name = rightName || (transform.union.with.startsWith('mdl_') ? 'model' : 'source');
  return `Union: ${name}`;
}

export const combineDescribers = {
  concat: describeConcat,
  union: describeUnion,
};
