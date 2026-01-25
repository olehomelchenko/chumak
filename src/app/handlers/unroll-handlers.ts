import { DialogStore } from '../stores/DialogStore';
import { StepService } from '../services/StepService';

/**
 * Handlers for Unroll transform dialog
 */

export async function applyUnrollTransform(callbacks: any) {
  const column = DialogStore.unrollState.column.value;
  const indices = DialogStore.unrollState.indices.value;
  const keepOriginal = DialogStore.unrollState.keepOriginal.value;

  if (!column || column.trim() === '') {
    await callbacks.onError?.('Please select a column to unroll');
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
