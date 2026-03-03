import { DialogStore } from '../../stores/DialogStore';
import { StepService } from '../../services/StepService';
import i18n from '../../../i18n';

/**
 * Handlers for Unroll transform dialog
 */

export async function applyUnrollTransform(callbacks: any) {
  const column = DialogStore.unrollState.column.value;
  const indices = DialogStore.unrollState.indices.value;
  const keepOriginal = DialogStore.unrollState.keepOriginal.value;

  if (!column || column.trim() === '') {
    await callbacks.onError?.(i18n.t('validation.selection.unrollColumn', { ns: 'errors' }));
    return;
  }

  const transform: any = {
    unroll: {
      column,
      keepOriginal,
    },
  };

  if (indices) {
    transform.unroll.indices = true;
  }

  await StepService.runTransform('Unroll', transform, callbacks);
}
