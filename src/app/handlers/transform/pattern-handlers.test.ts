import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);
vi.mock('../validation-engine', async () =>
  (await import('../test-utils')).MockFactories.validationEngineRegex()
);

import {
  applySelectPatternTransform,
  applyRemovePatternTransform,
  applyRenamePatternTransform,
} from './pattern-handlers';
import { StepService } from '../../services/StepService';
import { validateRegexPattern } from '../validation-engine';

describe('pattern-handlers', () => {
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

  describe('applySelectPatternTransform', () => {
    it('errors when pattern is empty', async () => {
      DialogStore.selectPatternState.pattern.value = '';
      const callbacks = { onError: vi.fn() };

      await applySelectPatternTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a pattern');
    });

    it('errors when pattern is whitespace', async () => {
      DialogStore.selectPatternState.pattern.value = '   ';
      const callbacks = { onError: vi.fn() };

      await applySelectPatternTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a pattern');
    });

    it('validates regex when matchType is regex', async () => {
      DialogStore.selectPatternState.pattern.value = '[invalid';
      DialogStore.selectPatternState.matchType.value = 'regex';
      vi.mocked(validateRegexPattern).mockReturnValueOnce({
        valid: false,
        error: 'Invalid regex pattern: Unterminated character class',
      });
      const callbacks = { onError: vi.fn() };

      await applySelectPatternTransform(callbacks);

      expect(validateRegexPattern).toHaveBeenCalledWith('[invalid');
      expect(DialogStore.selectPatternState.error.value).toBe(
        'Invalid regex pattern: Unterminated character class'
      );
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('runs transform with correct shape', async () => {
      DialogStore.selectPatternState.pattern.value = 'age_*';
      DialogStore.selectPatternState.matchType.value = 'glob';
      DialogStore.selectPatternState.include.value = [];
      const callbacks = { onError: vi.fn() };

      await applySelectPatternTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Select Pattern',
        {
          selectPattern: {
            pattern: 'age_*',
            matchType: 'glob',
            include: undefined,
          },
        },
        callbacks
      );
    });

    it('includes include list when non-empty', async () => {
      DialogStore.selectPatternState.pattern.value = 'test';
      DialogStore.selectPatternState.matchType.value = 'contains';
      DialogStore.selectPatternState.include.value = ['name', 'age'];
      const callbacks = { onError: vi.fn() };

      await applySelectPatternTransform(callbacks);

      const transform = vi.mocked(StepService.runTransform).mock.calls[0][1] as any;
      expect(transform.selectPattern.include).toEqual(['name', 'age']);
    });
  });

  describe('applyRemovePatternTransform', () => {
    it('errors when pattern is empty', async () => {
      DialogStore.removePatternState.pattern.value = '';
      const callbacks = { onError: vi.fn() };

      await applyRemovePatternTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a pattern');
    });

    it('validates regex when matchType is regex', async () => {
      DialogStore.removePatternState.pattern.value = '(unclosed';
      DialogStore.removePatternState.matchType.value = 'regex';
      vi.mocked(validateRegexPattern).mockReturnValueOnce({
        valid: false,
        error: 'Invalid regex',
      });
      const callbacks = { onError: vi.fn() };

      await applyRemovePatternTransform(callbacks);

      expect(DialogStore.removePatternState.error.value).toBe('Invalid regex');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('runs transform with correct shape', async () => {
      DialogStore.removePatternState.pattern.value = 'temp_*';
      DialogStore.removePatternState.matchType.value = 'glob';
      const callbacks = { onError: vi.fn() };

      await applyRemovePatternTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Remove Pattern',
        {
          removePattern: {
            pattern: 'temp_*',
            matchType: 'glob',
          },
        },
        callbacks
      );
    });
  });

  describe('applyRenamePatternTransform', () => {
    it('errors when find pattern is empty', async () => {
      DialogStore.renamePatternState.find.value = '';
      const callbacks = { onError: vi.fn() };

      await applyRenamePatternTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a find pattern');
    });

    it('validates regex when enabled', async () => {
      DialogStore.renamePatternState.find.value = '[bad';
      DialogStore.renamePatternState.replace.value = 'good';
      DialogStore.renamePatternState.regex.value = true;
      vi.mocked(validateRegexPattern).mockReturnValueOnce({
        valid: false,
        error: 'Invalid regex pattern: bad pattern',
      });
      const callbacks = { onError: vi.fn() };

      await applyRenamePatternTransform(callbacks);

      expect(DialogStore.renamePatternState.error.value).toBe('Invalid regex pattern: bad pattern');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('runs transform with correct shape', async () => {
      DialogStore.renamePatternState.find.value = 'old_';
      DialogStore.renamePatternState.replace.value = 'new_';
      DialogStore.renamePatternState.regex.value = false;
      const callbacks = { onError: vi.fn() };

      await applyRenamePatternTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Rename Pattern',
        {
          renamePattern: {
            find: 'old_',
            replace: 'new_',
            regex: false,
          },
        },
        callbacks
      );
    });
  });
});
