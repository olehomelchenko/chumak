import i18n from '../../../i18n';

export function describeSliceRows(transform: any): string | null {
  if (!transform.sliceRows) return null;
  const { count, mode } = transform.sliceRows;
  return i18n.t(`transforms:rowOps.sliceRows.${mode}` as any, { count });
}

export function describeAddIndex(transform: any): string | null {
  if (!transform.addIndex) return null;
  return i18n.t('transforms:rowOps.addIndex', { columnName: transform.addIndex.columnName });
}

export function describeDedupe(transform: any): string | null {
  if (!transform.dedupe) return null;
  const cols = transform.dedupe.columns;
  const mode = transform.dedupe.mode || 'remove';
  const colInfo =
    !cols || cols.length === 0
      ? i18n.t('transforms:rowOps.dedupe.allColumns')
      : cols.length === 1
        ? `"${cols[0]}"`
        : i18n.t('transforms:basic.select', { count: cols.length });

  return i18n.t(`transforms:rowOps.dedupe.${mode}` as any, { columns: colInfo });
}

export function describeSample(transform: any): string | null {
  if (!transform.sample) return null;
  const { count, seed } = transform.sample;
  if (seed !== undefined) {
    return i18n.t('transforms:rowOps.sampleWithSeed', { count, seed });
  }
  return i18n.t('transforms:rowOps.sample', { count });
}

export function describeRemoveRows(transform: any): string | null {
  if (!transform.removeRows) return null;
  const count = transform.removeRows.indices.length;
  return i18n.t('transforms:rowOps.removeRows', { count });
}

export function describeKeepRows(transform: any): string | null {
  if (!transform.keepRows) return null;
  const count = transform.keepRows.indices.length;
  return i18n.t('transforms:rowOps.keepRows', { count });
}

export function describePromoteHeader(transform: any): string | null {
  if (!transform.promoteHeader) return null;
  const { skipRows } = transform.promoteHeader;
  return i18n.t('transforms:rowOps.promoteHeader' as any, { row: skipRows + 1 });
}

export const rowOpsDescribers = {
  sliceRows: describeSliceRows,
  addIndex: describeAddIndex,
  dedupe: describeDedupe,
  sample: describeSample,
  removeRows: describeRemoveRows,
  keepRows: describeKeepRows,
  promoteHeader: describePromoteHeader,
};
