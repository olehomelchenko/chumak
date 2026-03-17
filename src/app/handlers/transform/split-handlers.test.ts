import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole } from '../test-utils';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepServiceFull()
);
vi.mock('../preview-engine', async () =>
  (await import('../test-utils')).MockFactories.previewEngine()
);
vi.mock('../validation-engine', async () =>
  (await import('../test-utils')).MockFactories.validationEngineRegex()
);

import { detectDelimiter, applySplitTransform } from './split-handlers';

describe('split-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('detectDelimiter', () => {
    it('returns null for empty column', () => {
      expect(detectDelimiter('')).toBeNull();
    });

    it('returns null when no data', () => {
      AppStore.currentData.value = null;
      expect(detectDelimiter('name')).toBeNull();
    });

    it('returns null for empty data array', () => {
      AppStore.currentData.value = [];
      expect(detectDelimiter('name')).toBeNull();
    });

    it('detects comma delimiter', () => {
      AppStore.currentData.value = [
        { tags: 'a,b,c' },
        { tags: 'd,e,f' },
        { tags: 'g,h' },
        { tags: 'i,j,k' },
        { tags: 'l,m,n' },
      ];

      const result = detectDelimiter('tags');

      expect(result).not.toBeNull();
      expect(result!.char).toBe(',');
    });

    it('detects pipe delimiter', () => {
      AppStore.currentData.value = [
        { col: 'a|b|c' },
        { col: 'd|e|f' },
        { col: 'g|h|i' },
        { col: 'j|k|l' },
        { col: 'm|n|o' },
      ];

      const result = detectDelimiter('col');

      expect(result).not.toBeNull();
      expect(result!.char).toBe('|');
    });

    it('detects semicolon delimiter', () => {
      AppStore.currentData.value = [
        { col: 'a;b;c' },
        { col: 'd;e;f' },
        { col: 'g;h;i' },
        { col: 'j;k;l' },
        { col: 'm;n;o' },
      ];

      const result = detectDelimiter('col');

      expect(result).not.toBeNull();
      expect(result!.char).toBe(';');
    });

    it('returns null when no consistent delimiter found', () => {
      AppStore.currentData.value = [{ col: 'hello' }, { col: 'world' }, { col: 'test' }];

      const result = detectDelimiter('col');

      expect(result).toBeNull();
    });

    it('handles null values in column data', () => {
      AppStore.currentData.value = [
        { col: 'a,b' },
        { col: null },
        { col: 'c,d' },
        { col: 'e,f' },
        { col: 'g,h' },
      ];

      const result = detectDelimiter('col');
      // Should still detect comma even with nulls
      expect(result).not.toBeNull();
    });
  });

  describe('applySplitTransform', () => {
    it('errors when no column selected', async () => {
      DialogStore.splitState.column.value = '';
      DialogStore.splitState.delimiter.value = ',';
      const callbacks = { onError: vi.fn() };

      await applySplitTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a column');
    });

    it('errors when no delimiter entered', async () => {
      DialogStore.splitState.column.value = 'tags';
      DialogStore.splitState.delimiter.value = '';
      const callbacks = { onError: vi.fn() };

      await applySplitTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a delimiter');
    });
  });
});
