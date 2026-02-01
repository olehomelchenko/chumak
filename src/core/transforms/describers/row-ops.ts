export function describeSliceRows(transform: any): string | null {
  if (!transform.sliceRows) return null;
  const { count, mode } = transform.sliceRows;
  const modeLabels: Record<string, string> = {
    first: 'Keep first',
    last: 'Keep last',
    removeFirst: 'Remove first',
    removeLast: 'Remove last',
  };
  return `${modeLabels[mode] || mode} ${count} row${count !== 1 ? 's' : ''}`;
}

export function describeAddIndex(transform: any): string | null {
  if (!transform.addIndex) return null;
  return `Add Index: ${transform.addIndex.columnName}`;
}

export function describeDedupe(transform: any): string | null {
  if (!transform.dedupe) return null;
  const cols = transform.dedupe.columns;
  const mode = transform.dedupe.mode || 'remove';
  const colInfo =
    !cols || cols.length === 0
      ? 'all columns'
      : cols.length === 1
        ? `"${cols[0]}"`
        : `${cols.length} columns`;
  if (mode === 'keep') {
    return `Keep only duplicates: by ${colInfo}`;
  }
  return `Remove duplicates: by ${colInfo}`;
}

export function describeSample(transform: any): string | null {
  if (!transform.sample) return null;
  const { count, seed } = transform.sample;
  return seed !== undefined ? `Sample: ${count} rows (seed: ${seed})` : `Sample: ${count} rows`;
}

export const rowOpsDescribers = {
  sliceRows: describeSliceRows,
  addIndex: describeAddIndex,
  dedupe: describeDedupe,
  sample: describeSample,
};
