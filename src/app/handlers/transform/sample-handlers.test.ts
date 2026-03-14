import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStores } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', () => ({
  StepService: { runTransform: vi.fn().mockResolvedValue(true) },
}));

import { applySampleTransform } from './sample-handlers';
import { StepService } from '../../services/StepService';

describe('sample-handlers', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('applySampleTransform', () => {
    it('calls onError when count is 0', async () => {
      DialogStore.sampleState.count.value = 0;
      const callbacks = { onError: vi.fn().mockResolvedValue(undefined) };

      await applySampleTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a valid sample size greater than 0');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('calls onError when count is negative', async () => {
      DialogStore.sampleState.count.value = -5;
      const callbacks = { onError: vi.fn().mockResolvedValue(undefined) };

      await applySampleTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('calls StepService.runTransform with provided seed', async () => {
      DialogStore.sampleState.count.value = 50;
      DialogStore.sampleState.seed.value = 42;
      const callbacks = { onError: vi.fn() };

      await applySampleTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Sample',
        { sample: { count: 50, seed: 42 } },
        callbacks
      );
    });

    it('generates random seed when none provided', async () => {
      DialogStore.sampleState.count.value = 50;
      DialogStore.sampleState.seed.value = undefined;
      const callbacks = { onError: vi.fn() };

      await applySampleTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalled();
      const transform = vi.mocked(StepService.runTransform).mock.calls[0][1] as any;
      expect(typeof transform.sample.seed).toBe('number');
      expect(transform.sample.seed).toBeGreaterThanOrEqual(0);
    });

    it('generates random seed when seed is NaN', async () => {
      DialogStore.sampleState.count.value = 50;
      DialogStore.sampleState.seed.value = NaN;
      const callbacks = { onError: vi.fn() };

      await applySampleTransform(callbacks);

      const transform = vi.mocked(StepService.runTransform).mock.calls[0][1] as any;
      expect(isNaN(transform.sample.seed)).toBe(false);
    });
  });
});
