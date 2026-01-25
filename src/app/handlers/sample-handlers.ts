import { DialogStore } from '../stores/DialogStore';
import { StepService } from '../services/StepService';

/**
 * Handlers for Sample transform dialog
 */

export async function applySampleTransform(callbacks: any) {
  const count = DialogStore.sampleState.count.value;
  const seed = DialogStore.sampleState.seed.value;

  if (count <= 0) {
    await callbacks.onError?.('Please enter a valid sample size greater than 0');
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
