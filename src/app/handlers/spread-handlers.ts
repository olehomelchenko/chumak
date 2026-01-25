import { DialogStore } from '../stores/DialogStore';
import { StepService } from '../services/StepService';

/**
 * Handlers for Spread transform dialog
 */

export async function applySpreadTransform(callbacks: any) {
  const column = DialogStore.spreadState.column.value;
  const limit = DialogStore.spreadState.limit.value;
  const keepOriginal = DialogStore.spreadState.keepOriginal.value;

  if (!column || column.trim() === '') {
    await callbacks.onError?.('Please select a column to spread');
    return;
  }

  if (limit !== undefined && limit <= 0) {
    await callbacks.onError?.('Limit must be greater than 0');
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
