import { DialogStore } from '../../stores/DialogStore';
import { StepService } from '../../services/StepService';
import i18n from '../../../i18n';

/**
 * Handlers for Spread transform dialog
 */

export async function applySpreadTransform(callbacks: any) {
  const column = DialogStore.spreadState.column.value;
  const limit = DialogStore.spreadState.limit.value;
  const keepOriginal = DialogStore.spreadState.keepOriginal.value;

  if (!column || column.trim() === '') {
    await callbacks.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
    return;
  }

  if (limit !== undefined && limit <= 0) {
    await callbacks.onError?.(i18n.t('validation.invalid.spreadLimit', { ns: 'errors' }));
    return;
  }

  const transform: any = {
    spread: {
      column,
      keepOriginal,
    },
  };

  if (limit !== undefined) {
    transform.spread.limit = limit;
  }

  await StepService.runTransform('Spread', transform, callbacks);
}
