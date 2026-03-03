import * as aq from 'arquero';
import { DialogStore } from '../../stores/DialogStore';
import { applyTransform } from '../../../core/transforms';
import { StepService } from '../../services/StepService';
import { confirm } from '../core/notification-handlers';
import i18n from '../../../i18n';

export async function applySortTransform(callbacks: any) {
  const fields = DialogStore.sortState.fields.value.filter((f) => f.field !== '');
  if (fields.length === 0) {
    await callbacks.onError?.(i18n.t('validation.selection.sortColumn', { ns: 'errors' }));
    return;
  }
  const sort = fields.length === 1 ? fields[0] : fields;
  await StepService.runTransform('Sort', { sort }, callbacks);
}

export async function applySliceRowsTransform(callbacks: any) {
  const { count, mode } = DialogStore.sliceRowsState;
  if (!count.value || count.value <= 0) {
    await callbacks.onError?.(i18n.t('validation.invalid.rowCount', { ns: 'errors' }));
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
    await callbacks.onError?.(i18n.t('validation.required.columnName', { ns: 'errors' }));
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
  const { column, findValue, replaceValue, isRegex } = DialogStore.replaceState;
  if (!column.value) {
    await callbacks.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
    return;
  }
  if (!isRegex.value && (findValue.value === undefined || findValue.value === null)) {
    const confirmed = await confirm(i18n.t('confirms.replaceNulls', { ns: 'common' }));
    if (!confirmed) return;
  }
  if (isRegex.value && !findValue.value) {
    await callbacks.onError?.(i18n.t('validation.required.regexPattern', { ns: 'errors' }));
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
    await callbacks.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
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
