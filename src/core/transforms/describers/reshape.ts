export function describeFold(transform: any): string | null {
  if (!transform.fold) return null;
  const { columns, as } = transform.fold;
  const count = columns.length;
  let desc = `Unpivot: ${count} column${count !== 1 ? 's' : ''}`;

  if (as && as.length === 2) {
    desc += ` -> ${as[0]}, ${as[1]}`;
  }

  return desc;
}

export function describePivot(transform: any): string | null {
  if (!transform.pivot) return null;
  const { keys, values, aggregation } = transform.pivot;
  return `Pivot: ${aggregation}(${values}) by ${keys}`;
}

export function describeSplit(transform: any): string | null {
  if (!transform.split) return null;
  return `Split: ${transform.split.column}`;
}

export function describeSpread(transform: any): string | null {
  if (!transform.spread) return null;
  const { column, limit } = transform.spread;
  return limit !== undefined ? `Spread: ${column} (max ${limit} cols)` : `Spread: ${column}`;
}

export function describeUnroll(transform: any): string | null {
  if (!transform.unroll) return null;
  const { column, indices } = transform.unroll;
  return indices ? `Unroll: ${column} (with indices)` : `Unroll: ${column}`;
}

export const reshapeDescribers = {
  fold: describeFold,
  pivot: describePivot,
  split: describeSplit,
  spread: describeSpread,
  unroll: describeUnroll,
};
