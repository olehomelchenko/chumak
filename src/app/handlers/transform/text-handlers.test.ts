/**
 * Unit Tests for Text Handlers
 *
 * Tests text transformation operations including case changes and trim.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, suppressConsole } from '../test-utils';
import * as TextHandlers from './text-handlers';
import type { Model, DataRow } from '../../types';

describe('text-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  const testTextData = {
    columns: ['id', 'name', 'email', 'age'],
    rows: [
      { id: 1, name: '  Alice Smith  ', email: 'alice@example.com', age: 30 },
      { id: 2, name: 'bob jones', email: 'BOB@EXAMPLE.COM', age: 25 },
      { id: 3, name: 'CAROL WILLIAMS', email: 'carol@Example.Com', age: 35 },
    ] as DataRow[],
  };

  beforeEach(() => {
    resetStores();
    setTestData(testTextData);
    consoleSpy = suppressConsole();

    // Initialize text state
    const state = DialogStore.textState;
    state.column.value = '';
    state.operations.value = [];
    state.removeOrigin.value = false;

    // Set up schema with string columns
    const testModel: Model = {
      id: 'model-1',
      name: 'Test Model',
      sourceId: 'source-1',
      steps: [],
      schema: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'age', type: 'number' },
      ],
      data: testTextData.rows,
    };

    AppStore.activeModel.value = testModel;
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('getTextColumns', () => {
    it('returns only string columns', () => {
      const textColumns = TextHandlers.getTextColumns();

      expect(textColumns).toContain('name');
      expect(textColumns).toContain('email');
      expect(textColumns).not.toContain('id');
      expect(textColumns).not.toContain('age');
    });

    it('returns empty array when no schema', () => {
      AppStore.activeModel.value = null;

      const textColumns = TextHandlers.getTextColumns();

      expect(textColumns).toEqual([]);
    });
  });

  describe('getTextOperations', () => {
    it('returns list of text operations', () => {
      const operations = TextHandlers.getTextOperations();

      expect(operations.length).toBeGreaterThan(0);
      expect(operations.find((op) => op.value === 'uppercase')).toBeDefined();
      expect(operations.find((op) => op.value === 'lowercase')).toBeDefined();
      expect(operations.find((op) => op.value === 'titlecase')).toBeDefined();
      expect(operations.find((op) => op.value === 'trim')).toBeDefined();
    });

    it('includes labels for each operation', () => {
      const operations = TextHandlers.getTextOperations();
      const uppercaseOp = operations.find((op) => op.value === 'uppercase');

      expect(uppercaseOp?.label).toBe('Uppercase');
    });
  });

  describe('getCaseOperations', () => {
    it('returns only case operations (excludes trim)', () => {
      const caseOps = TextHandlers.getCaseOperations();

      expect(caseOps.find((op) => op.value === 'uppercase')).toBeDefined();
      expect(caseOps.find((op) => op.value === 'lowercase')).toBeDefined();
      expect(caseOps.find((op) => op.value === 'titlecase')).toBeDefined();
      expect(caseOps.find((op) => op.value === 'trim')).toBeUndefined();
    });
  });

  describe('setCaseOperation', () => {
    it('sets case operation when null passed', () => {
      DialogStore.textState.operations.value = ['uppercase', 'trim'];

      TextHandlers.setCaseOperation(null);

      expect(DialogStore.textState.operations.value).toContain('trim');
      expect(DialogStore.textState.operations.value).not.toContain('uppercase');
    });

    it('replaces existing case operation', () => {
      DialogStore.textState.operations.value = ['uppercase', 'trim'];

      TextHandlers.setCaseOperation('lowercase');

      expect(DialogStore.textState.operations.value).toContain('lowercase');
      expect(DialogStore.textState.operations.value).toContain('trim');
      expect(DialogStore.textState.operations.value).not.toContain('uppercase');
    });

    it('adds case operation when none exists', () => {
      DialogStore.textState.operations.value = ['trim'];

      TextHandlers.setCaseOperation('titlecase');

      expect(DialogStore.textState.operations.value).toContain('titlecase');
      expect(DialogStore.textState.operations.value).toContain('trim');
    });

    it('removes all case operations when setting new one', () => {
      DialogStore.textState.operations.value = ['uppercase', 'lowercase', 'titlecase'];

      TextHandlers.setCaseOperation('uppercase');

      const ops = DialogStore.textState.operations.value;
      expect(ops.filter((op) => op === 'uppercase').length).toBe(1);
      expect(ops.filter((op) => op === 'lowercase').length).toBe(0);
      expect(ops.filter((op) => op === 'titlecase').length).toBe(0);
    });
  });

  describe('setTrimOperation', () => {
    it('adds trim when enabled', () => {
      DialogStore.textState.operations.value = ['uppercase'];

      TextHandlers.setTrimOperation(true);

      expect(DialogStore.textState.operations.value).toContain('trim');
      expect(DialogStore.textState.operations.value).toContain('uppercase');
    });

    it('does not duplicate trim', () => {
      DialogStore.textState.operations.value = ['trim', 'uppercase'];

      TextHandlers.setTrimOperation(true);

      const ops = DialogStore.textState.operations.value;
      expect(ops.filter((op) => op === 'trim').length).toBe(1);
    });

    it('removes trim when disabled', () => {
      DialogStore.textState.operations.value = ['trim', 'uppercase'];

      TextHandlers.setTrimOperation(false);

      expect(DialogStore.textState.operations.value).not.toContain('trim');
      expect(DialogStore.textState.operations.value).toContain('uppercase');
    });

    it('does nothing when trim not present and disabled', () => {
      DialogStore.textState.operations.value = ['uppercase'];

      TextHandlers.setTrimOperation(false);

      expect(DialogStore.textState.operations.value).toEqual(['uppercase']);
    });
  });

  describe('updatePreview', () => {
    it('updates preview state with text results', () => {
      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = ['uppercase'];

      TextHandlers.updatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toContain('Uppercase');
      expect(preview.columns.value).toContain('name');
      expect(preview.newColumns.value).toContain('name_text');
    });

    it('does not update preview when no column selected', () => {
      DialogStore.textState.column.value = '';
      DialogStore.textState.operations.value = ['uppercase'];

      TextHandlers.updatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
    });

    it('does not update preview when no operations selected', () => {
      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = [];

      TextHandlers.updatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
    });

    it('combines multiple operations in title', () => {
      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = ['trim', 'uppercase'];

      TextHandlers.updatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toContain('Trim');
      expect(preview.title.value).toContain('Uppercase');
    });
  });

  describe('getTextOperationPreview', () => {
    it('returns dash when no column selected', () => {
      DialogStore.textState.column.value = '';

      const preview = TextHandlers.getTextOperationPreview('uppercase');

      expect(preview).toBe('—');
    });

    it('returns dash when no data', () => {
      DialogStore.textState.column.value = 'name';
      AppStore.currentData.value = [];

      const preview = TextHandlers.getTextOperationPreview('uppercase');

      expect(preview).toBe('—');
    });

    it('returns uppercase result', () => {
      DialogStore.textState.column.value = 'name';

      const preview = TextHandlers.getTextOperationPreview('uppercase');

      expect(preview).toBe('  ALICE SMITH  ');
    });

    it('returns lowercase result', () => {
      DialogStore.textState.column.value = 'email';
      // Use row with uppercase email
      AppStore.currentData.value = [testTextData.rows[1]]; // Bob's row with BOB@EXAMPLE.COM

      const preview = TextHandlers.getTextOperationPreview('lowercase');

      expect(preview).toBe('bob@example.com');
    });

    it('returns titlecase result', () => {
      DialogStore.textState.column.value = 'name';
      // Use row with lowercase name
      AppStore.currentData.value = [testTextData.rows[1]]; // bob jones

      const preview = TextHandlers.getTextOperationPreview('titlecase');

      expect(preview).toBe('Bob Jones');
    });

    it('returns trimmed result', () => {
      DialogStore.textState.column.value = 'name';

      const preview = TextHandlers.getTextOperationPreview('trim');

      expect(preview).toBe('Alice Smith');
    });

    it('returns dash for unknown operation', () => {
      DialogStore.textState.column.value = 'name';

      const preview = TextHandlers.getTextOperationPreview('unknown');

      expect(preview).toBe('—');
    });

    it('skips null/empty values', () => {
      DialogStore.textState.column.value = 'name';
      AppStore.currentData.value = [
        { name: '', email: '' },
        { name: '   ', email: '' },
        { name: 'test', email: '' },
      ];

      const preview = TextHandlers.getTextOperationPreview('uppercase');

      expect(preview).toBe('TEST');
    });
  });

  describe('applyTextTransform', () => {
    const createMockCallbacks = () => ({
      onError: vi.fn(),
      onDialogClose: vi.fn(),
      onSuccess: vi.fn(),
    });

    it('calls onError when no column selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.textState.column.value = '';

      await TextHandlers.applyTextTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Please select a source column');
    });

    it('calls onError when no operations selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = [];

      await TextHandlers.applyTextTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Please select at least one operation');
    });
  });

  describe('debouncedUpdatePreview', () => {
    it('triggers preview update after debounce', () => {
      vi.useFakeTimers();

      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = ['uppercase'];

      TextHandlers.debouncedUpdatePreview();

      // Preview should update after debounce
      vi.advanceTimersByTime(200);

      const preview = DialogStore.previewState;
      expect(preview.title.value).toContain('Uppercase');

      vi.useRealTimers();
    });
  });

  describe('clearPreview', () => {
    it('clears preview state', () => {
      // First set up preview
      DialogStore.textState.column.value = 'name';
      DialogStore.textState.operations.value = ['uppercase'];
      TextHandlers.updatePreview();

      // Verify preview is set
      expect(DialogStore.previewState.title.value).not.toBe('');

      // Clear it
      TextHandlers.clearPreview();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.rows.value).toEqual([]);
    });
  });
});
