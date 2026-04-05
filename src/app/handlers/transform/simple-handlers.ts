import * as aq from 'arquero';
import { DialogStore } from '../../stores/DialogStore';
import { applyTransform } from '../../../core/transforms';
import { StepService } from '../../services/StepService';
import { confirm } from '../core/notification-handlers';
import i18n from '../../../i18n';

export async function applyReplaceTransform(callbacks: any) {
  const { column, findMode, findValue, replaceValue, isRegex } = DialogStore.replaceState;
  const mode = findMode.value;
  if (!column.value) {
    await callbacks.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
    return;
  }
  if (mode === 'value') {
    if (!isRegex.value && (findValue.value === undefined || findValue.value === null)) {
      const confirmed = await confirm(
        i18n.t('confirms.replaceNulls', { ns: 'common' }),
        undefined,
        i18n.t('buttons.replace', { ns: 'common' })
      );
      if (!confirmed) return;
    }
    if (isRegex.value && !findValue.value) {
      await callbacks.onError?.(i18n.t('validation.required.regexPattern', { ns: 'errors' }));
      return;
    }
  }

  const transform = {
    replace: {
      column: column.value,
      find: mode === 'value' ? findValue.value : null,
      replace: replaceValue.value === '' ? null : replaceValue.value,
      isRegex: mode === 'value' ? isRegex.value : false,
      matchMode: mode !== 'value' ? mode : undefined,
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
