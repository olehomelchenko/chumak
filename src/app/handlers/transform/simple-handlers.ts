import * as aq from 'arquero';
import { DialogStore } from '../../stores/DialogStore';
import { applyTransform } from '../../../core/transforms';
import { StepService } from '../../services/StepService';

export async function applySortTransform(callbacks: any) {
  const field = DialogStore.sortState.field.value;
  const order = DialogStore.sortState.order.value;
  if (!field) {
    await callbacks.onError?.('Please select a column to sort by');
    return;
  }
  await StepService.runTransform('Sort', { sort: { field, order } }, callbacks);
}

export async function applySliceRowsTransform(callbacks: any) {
  const { count, mode } = DialogStore.sliceRowsState;
  if (!count.value || count.value <= 0) {
    await callbacks.onError?.('Please enter a valid number of rows');
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
    await callbacks.onError?.('Please enter a column name');
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

export async function applyReplaceTransform(callbacks: any, app?: any) {
  const { column, findValue, replaceValue, isRegex } = DialogStore.replaceState;
  if (!column.value) {
    await callbacks.onError?.('Please select a column');
    return;
  }
  if (!isRegex.value && (findValue.value === undefined || findValue.value === null)) {
    if (app) {
      const confirmed = await app.confirm('Replace null/empty values?');
      if (!confirmed) return;
    }
  }
  if (isRegex.value && !findValue.value) {
    await callbacks.onError?.('Please enter a regex pattern');
    return;
  }

  const transform = {
    replace: {
      column: column.value,
      find: findValue.value,
      replace: replaceValue.value === '' ? null : replaceValue.value,
      isRegex: isRegex.value,
    },
  };
  await StepService.runTransform(
    isRegex.value ? 'Replace (Regex)' : 'Replace',
    transform,
    callbacks
  );
}

export async function applyImputeTransform(callbacks: any) {
  const { column, strategy, value, includeEmptyString } = DialogStore.imputeState;
  if (!column.value) {
    await callbacks.onError?.('Please select a column');
    return;
  }

  const transform = {
    impute: {
      column: column.value,
      strategy: strategy.value,
      value: strategy.value === 'constant' ? value.value : undefined,
      includeEmptyString: includeEmptyString.value,
    },
  };

  await StepService.runTransform('Impute', transform, callbacks);
}

export function updateImputePreview() {
  const { strategy, value, includeEmptyString, previewRows } = DialogStore.imputeState;

  try {
    // Fixed mock dataset for educational preview
    const mockData = [
      { val: 10 },
      { val: null },
      { val: 30 },
      { val: null },
      { val: 50 },
      { val: 60 },
      { val: '' },
      { val: 80 },
    ];

    const sampleTable = aq.from(mockData);

    const transform = {
      impute: {
        column: 'val',
        strategy: strategy.value,
        value: strategy.value === 'constant' ? value.value : undefined,
        includeEmptyString: includeEmptyString.value,
      },
    };

    const resultTable = applyTransform(sampleTable, transform, ['val']);
    const resultRows = resultTable.objects();

    // Combine for side-by-side preview
    const combined = mockData.map((orig: any, i: number) => {
      const resVal = resultRows[i] ? resultRows[i].val : orig.val;
      return {
        _index: i,
        original: orig.val,
        imputed: resVal,
        isImputed: orig.val !== resVal,
      };
    });

    previewRows.value = combined;
  } catch (e) {
    console.error('Impute preview error:', e);
    previewRows.value = null;
  }
}
