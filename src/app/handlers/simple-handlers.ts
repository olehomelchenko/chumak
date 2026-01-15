import { DialogStore } from '../stores/DialogStore';
import * as NotificationHandlers from './notification-handlers';
import { StepService } from '../services/StepService';

export async function applySortTransform(callbacks: any) {
  const field = DialogStore.sortState.field.value;
  const order = DialogStore.sortState.order.value;
  if (!field) {
    await NotificationHandlers.alert.call(null as any, 'Please select a column to sort by');
    return;
  }
  await StepService.runTransform('Sort', { sort: { field, order } }, callbacks);
}

export async function applySliceRowsTransform(callbacks: any) {
  const { count, mode } = DialogStore.sliceRowsState;
  if (!count.value || count.value <= 0) {
    await NotificationHandlers.alert.call(null as any, 'Please enter a valid number of rows');
    return;
  }
  await StepService.runTransform(
    'Slice Rows',
    { sliceRows: { count: count.value, mode: mode.value } },
    callbacks
  );
}

export async function applyIndexTransform(callbacks: any) {
  const { columnName, startFrom } = DialogStore.indexState;
  if (!columnName.value || columnName.value.trim() === '') {
    await NotificationHandlers.alert.call(null as any, 'Please enter a column name');
    return;
  }
  await StepService.runTransform(
    'Add Index',
    {
      addIndex: { columnName: columnName.value.trim(), startFrom: startFrom.value ?? 1 },
    },
    callbacks
  );
}

export async function applyReplaceTransform(callbacks: any) {
  const { column, findValue, replaceValue } = DialogStore.replaceState;
  if (!column.value) {
    await NotificationHandlers.alert.call(null as any, 'Please select a column');
    return;
  }
  if (findValue.value === undefined || findValue.value === null) {
    if (!(await NotificationHandlers.confirm.call(null as any, 'Replace null/empty values?')))
      return;
  }

  const transform = {
    replace: {
      column: column.value,
      find: findValue.value,
      replace: replaceValue.value === '' ? null : replaceValue.value,
    },
  };
  await StepService.runTransform('Replace', transform, callbacks);
}
