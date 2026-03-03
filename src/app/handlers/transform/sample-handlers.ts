import { DialogStore } from '../../stores/DialogStore';
import { StepService } from '../../services/StepService';
import i18n from '../../../i18n';

/**
 * Handlers for Sample transform dialog
 */

export async function applySampleTransform(callbacks: any) {
  const count = DialogStore.sampleState.count.value;
  const seed = DialogStore.sampleState.seed.value;

  if (count <= 0) {
    await callbacks.onError?.(i18n.t('validation.invalid.sampleSize', { ns: 'errors' }));
    return;
  }

  // If no seed is provided, generate a random one for full reproducibility in the JSON
  const finalSeed = seed !== undefined && !isNaN(seed) ? seed : Math.floor(Math.random() * 1000000);

  const transform = {
    sample: {
      count,
      seed: finalSeed,
    },
  };

  await StepService.runTransform('Sample', transform, callbacks);
}
