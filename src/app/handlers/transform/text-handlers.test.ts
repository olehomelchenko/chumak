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
      expect(operations.find((op) => op.value === 'trim')).toBeDefined();
    });
  });

  describe('getCaseOperations', () => {
    it('returns only case operations (excludes trim)', () => {
      const caseOps = TextHandlers.getCaseOperations();
      expect(caseOps.find((op) => op.value === 'uppercase')).toBeDefined();
      expect(caseOps.find((op) => op.value === 'trim')).toBeUndefined();
    });
  });

  describe('buildTextExpression', () => {
    it('applies trim first then case', () => {
      const expr = TextHandlers.buildTextExpression('name', ['trim', 'uppercase']);
      expect(expr).toBe('upper(trim(name))');
    });

    it('applies only case when no trim', () => {
      const expr = TextHandlers.buildTextExpression('name', ['lowercase']);
      expect(expr).toBe('lower(name)');
    });

    it('applies only trim when no case', () => {
      const expr = TextHandlers.buildTextExpression('name', ['trim']);
      expect(expr).toBe('trim(name)');
    });

    it('returns column ref when no operations', () => {
      const expr = TextHandlers.buildTextExpression('name', []);
      expect(expr).toBe('name');
    });
  });

  describe('computeTextPreview', () => {
    it('returns null when no column', () => {
      expect(TextHandlers.computeTextPreview('', ['uppercase'])).toBeNull();
    });

    it('returns null when no operations', () => {
      expect(TextHandlers.computeTextPreview('name', [])).toBeNull();
    });

    it('generates uppercase preview', () => {
      const result = TextHandlers.computeTextPreview('name', ['uppercase']);
      expect(result).not.toBeNull();
      expect(result!.title).toContain('Uppercase');
      expect(result!.columns).toContain('name');
      expect(result!.newColumns).toContain('name_text');
    });

    it('combines multiple operations in title', () => {
      const result = TextHandlers.computeTextPreview('name', ['trim', 'uppercase']);
      expect(result!.title).toContain('Trim');
      expect(result!.title).toContain('Uppercase');
    });
  });

  describe('getTextOperationPreview', () => {
    it('returns dash when no column', () => {
      expect(TextHandlers.getTextOperationPreview('uppercase', '')).toBe('—');
    });

    it('returns dash when no data', () => {
      AppStore.currentData.value = [];
      expect(TextHandlers.getTextOperationPreview('uppercase', 'name')).toBe('—');
    });

    it('returns uppercase result', () => {
      const preview = TextHandlers.getTextOperationPreview('uppercase', 'name');
      expect(preview).toBe('  ALICE SMITH  ');
    });

    it('returns lowercase result', () => {
      AppStore.currentData.value = [testTextData.rows[1]];
      const preview = TextHandlers.getTextOperationPreview('lowercase', 'email');
      expect(preview).toBe('bob@example.com');
    });

    it('returns titlecase result', () => {
      AppStore.currentData.value = [testTextData.rows[1]];
      const preview = TextHandlers.getTextOperationPreview('titlecase', 'name');
      expect(preview).toBe('Bob Jones');
    });

    it('returns trimmed result', () => {
      const preview = TextHandlers.getTextOperationPreview('trim', 'name');
      expect(preview).toBe('Alice Smith');
    });

    it('returns dash for unknown operation', () => {
      expect(TextHandlers.getTextOperationPreview('unknown', 'name')).toBe('—');
    });

    it('skips null/empty values', () => {
      AppStore.currentData.value = [
        { name: '', email: '' },
        { name: '   ', email: '' },
        { name: 'test', email: '' },
      ];
      const preview = TextHandlers.getTextOperationPreview('uppercase', 'name');
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
      DialogStore.activeDialogState.value = {
        column: '',
        operations: ['uppercase'],
        removeOrigin: false,
      };
      await TextHandlers.applyTextTransform(callbacks);
      expect(callbacks.onError).toHaveBeenCalledWith('Select a source column');
    });

    it('calls onError when no operations selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.activeDialogState.value = { column: 'name', operations: [], removeOrigin: false };
      await TextHandlers.applyTextTransform(callbacks);
      expect(callbacks.onError).toHaveBeenCalledWith('Select at least one operation');
    });
  });
});
