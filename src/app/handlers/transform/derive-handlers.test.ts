import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole, TestData } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', () => ({
  StepService: {
    runTransform: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../preview-engine', () => ({
  createDebouncedPreview: vi.fn().mockReturnValue({
    trigger: vi.fn(),
    compute: vi.fn(),
  }),
  clearPreview: vi.fn(),
}));

vi.mock('../validation-engine', () => ({
  validateExpression: vi.fn(),
}));

vi.mock('../core/notification-handlers', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(undefined),
  prompt: vi.fn().mockResolvedValue(''),
}));

import { applyDeriveTransform, validateDeriveExpression } from './derive-handlers';
import { confirm } from '../core/notification-handlers';
import { StepService } from '../../services/StepService';
import { validateExpression } from '../validation-engine';

describe('derive-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
    setTestData(TestData.simple);
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('validateDeriveExpression', () => {
    it('delegates to validateExpression with correct args', () => {
      DialogStore.deriveState.expression.value = 'age + 1';

      validateDeriveExpression();

      expect(validateExpression).toHaveBeenCalledWith('age + 1', ['name', 'age', 'city'], {
        errorSignal: DialogStore.deriveState.error,
      });
    });
  });

  describe('applyDeriveTransform', () => {
    it('errors when column name is empty', async () => {
      DialogStore.deriveState.columnName.value = '';
      DialogStore.deriveState.expression.value = 'age + 1';
      const callbacks = { onError: vi.fn() };

      await applyDeriveTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Provide both column name and expression');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('errors when expression is empty', async () => {
      DialogStore.deriveState.columnName.value = 'new_col';
      DialogStore.deriveState.expression.value = '';
      const callbacks = { onError: vi.fn() };

      await applyDeriveTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Provide both column name and expression');
    });

    it('errors when expression has validation error', async () => {
      DialogStore.deriveState.columnName.value = 'new_col';
      DialogStore.deriveState.expression.value = 'invalid!!!';
      DialogStore.deriveState.error.value = 'Parse error';
      const callbacks = { onError: vi.fn() };

      await applyDeriveTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Fix the expression errors before applying');
    });

    it('asks for confirmation when column already exists', async () => {
      DialogStore.deriveState.columnName.value = 'age';
      DialogStore.deriveState.expression.value = 'age + 1';
      DialogStore.deriveState.error.value = null;
      const callbacks = { onError: vi.fn() };
      vi.mocked(confirm).mockResolvedValueOnce(false);

      await applyDeriveTransform(callbacks);

      expect(confirm).toHaveBeenCalledWith(
        'Column "age" already exists. It will be overwritten. Continue?',
        undefined,
        'Overwrite'
      );
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('proceeds with overwrite when confirmed', async () => {
      DialogStore.deriveState.columnName.value = 'age';
      DialogStore.deriveState.expression.value = 'age + 1';
      DialogStore.deriveState.error.value = null;
      const callbacks = { onError: vi.fn() };
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await applyDeriveTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Derive',
        { derive: { age: 'age + 1' } },
        callbacks
      );
    });

    it('runs transform for new column without confirmation', async () => {
      DialogStore.deriveState.columnName.value = 'new_col';
      DialogStore.deriveState.expression.value = 'age * 2';
      DialogStore.deriveState.error.value = null;
      const callbacks = { onError: vi.fn() };

      await applyDeriveTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Derive',
        { derive: { new_col: 'age * 2' } },
        callbacks
      );
    });

    it('proceeds without confirmation for existing column (always confirms)', async () => {
      DialogStore.deriveState.columnName.value = 'age';
      DialogStore.deriveState.expression.value = 'age + 1';
      DialogStore.deriveState.error.value = null;
      const callbacks = { onError: vi.fn() };
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await applyDeriveTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalled();
    });
  });
});
