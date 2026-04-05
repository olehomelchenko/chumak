import * as aq from 'arquero';
import { DialogStore } from '../../stores/DialogStore';
import { applyTransform } from '../../../core/transforms';
import { StepService } from '../../services/StepService';
import i18n from '../../../i18n';

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
