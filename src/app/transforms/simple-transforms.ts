import type { ChumakApp } from '../../chumak-app';

export async function applySortTransform(this: ChumakApp) {
  const { field, order } = this.sortDialogState;
  if (!field) {
    await this.alert('Please select a column to sort by');
    return;
  }
  await this.runTransform('Sort', { sort: { field, order } });
}

export async function applySliceRowsTransform(this: ChumakApp) {
  const { count, mode } = this.sliceRowsDialogState;
  if (!count || count <= 0) {
    await this.alert('Please enter a valid number of rows');
    return;
  }
  await this.runTransform('Slice Rows', { sliceRows: { count, mode } });
}

export async function applyIndexTransform(this: ChumakApp) {
  const { columnName, startFrom } = this.indexDialogState;
  if (!columnName || columnName.trim() === '') {
    await this.alert('Please enter a column name');
    return;
  }
  await this.runTransform('Add Index', {
    addIndex: { columnName: columnName.trim(), startFrom: startFrom ?? 1 },
  });
}

export async function applyReplaceTransform(this: ChumakApp) {
  const { column, findValue, replaceValue } = this.replaceDialogState;
  if (!column) {
    await this.alert('Please select a column');
    return;
  }
  if (findValue === undefined || findValue === null) {
    if (!(await this.confirm('Replace null/empty values?'))) return;
  }

  const transform = {
    replace: {
      column: column,
      find: findValue,
      replace: replaceValue === '' ? null : replaceValue,
    },
  };
  await this.runTransform('Replace', transform);
}
