import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';

export const sampleState = {
  count: signal(100),
  seed: signal<number | undefined>(undefined),
};

export function resetSampleState() {
  sampleState.count.value = 100;
  sampleState.seed.value = undefined;
}

registerResetFunction(resetSampleState);
