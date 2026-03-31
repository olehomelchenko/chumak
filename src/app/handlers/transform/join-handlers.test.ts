/**
 * Unit Tests for Join Handlers
 *
 * Tests join-related logic including key pair management, key analysis,
 * target/column resolution, and join type handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, suppressConsole, TestData } from '../test-utils';

vi.mock('../../infrastructure/storage', () => ({
  ensureSourceData: vi.fn().mockImplementation(async (source: any) => source.data || []),
  ensureModelData: vi.fn().mockImplementation(async (model: any) => model.data || []),
}));

import * as JoinHandlers from './join-handlers';

describe('join-handlers', () => {
  beforeEach(() => {
    resetStores();
    suppressConsole();
  });

  describe('addJoinKeyPair', () => {
    it('adds a new empty key pair', () => {
      DialogStore.joinState.keyPairs.value = [[null, null]];

      JoinHandlers.addJoinKeyPair();

      expect(DialogStore.joinState.keyPairs.value).toEqual([
        [null, null],
        [null, null],
      ]);
    });

    it('appends to existing key pairs', () => {
      DialogStore.joinState.keyPairs.value = [
        ['id', 'user_id'],
        ['name', 'user_name'],
      ];

      JoinHandlers.addJoinKeyPair();

      expect(DialogStore.joinState.keyPairs.value).toHaveLength(3);
      expect(DialogStore.joinState.keyPairs.value[2]).toEqual([null, null]);
    });
  });

  describe('removeJoinKeyPair', () => {
    it('removes key pair at specified index', () => {
      DialogStore.joinState.keyPairs.value = [
        ['id', 'user_id'],
        ['name', 'user_name'],
        ['email', 'user_email'],
      ];

      JoinHandlers.removeJoinKeyPair(1);

      expect(DialogStore.joinState.keyPairs.value).toEqual([
        ['id', 'user_id'],
        ['email', 'user_email'],
      ]);
    });

    it('does not remove when only one key pair remains', () => {
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      JoinHandlers.removeJoinKeyPair(0);

      // Should still have one pair
      expect(DialogStore.joinState.keyPairs.value).toHaveLength(1);
      expect(DialogStore.joinState.keyPairs.value[0]).toEqual(['id', 'user_id']);
    });

    it('removes first key pair correctly', () => {
      DialogStore.joinState.keyPairs.value = [
        ['first', 'first_right'],
        ['second', 'second_right'],
      ];

      JoinHandlers.removeJoinKeyPair(0);

      expect(DialogStore.joinState.keyPairs.value).toEqual([['second', 'second_right']]);
    });

    it('removes last key pair correctly', () => {
      DialogStore.joinState.keyPairs.value = [
        ['first', 'first_right'],
        ['second', 'second_right'],
      ];

      JoinHandlers.removeJoinKeyPair(1);

      expect(DialogStore.joinState.keyPairs.value).toEqual([['first', 'first_right']]);
    });
  });

  describe('getTableDataForTarget', () => {
    it('returns empty data for null targetId', async () => {
      const result = await JoinHandlers.getTableDataForTarget('');

      expect(result).toEqual({ data: [], columns: [] });
    });

    it('returns source data when target is a source', async () => {
      const sourceData = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      AppStore.sources.value = [
        {
          id: 'src_1',
          name: 'Users',
          data: sourceData,
          columns: [
            { name: 'id', type: 'number' },
            { name: 'name', type: 'string' },
          ],
        } as any,
      ];

      const result = await JoinHandlers.getTableDataForTarget('src_1');

      expect(result.data).toEqual(sourceData);
      expect(result.columns).toEqual(['id', 'name']);
    });

    it('returns model data when target is a model without steps', async () => {
      const modelData = [
        { product: 'A', price: 100 },
        { product: 'B', price: 200 },
      ];
      AppStore.models.value = [
        {
          id: 'mdl_1',
          name: 'Products',
          sourceId: 'src_1',
          data: modelData,
          steps: [],
          schema: [
            { name: 'product', type: 'string' },
            { name: 'price', type: 'number' },
          ],
        } as any,
      ];

      const result = await JoinHandlers.getTableDataForTarget('mdl_1');

      expect(result.data).toEqual(modelData);
      expect(result.columns).toEqual(['product', 'price']);
    });

    it('returns empty for non-existent target', async () => {
      AppStore.sources.value = [];
      AppStore.models.value = [];

      const result = await JoinHandlers.getTableDataForTarget('non_existent');

      expect(result).toEqual({ data: [], columns: [] });
    });

    it('derives columns from data when schema is missing', async () => {
      const sourceData = [{ a: 1, b: 2, c: 3 }];
      AppStore.sources.value = [
        {
          id: 'src_1',
          name: 'Test',
          data: sourceData,
          columns: null,
        } as any,
      ];

      const result = await JoinHandlers.getTableDataForTarget('src_1');

      expect(result.columns).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getColumnsForTarget', () => {
    it('returns only columns without data', () => {
      AppStore.sources.value = [
        {
          id: 'src_1',
          name: 'Test',
          data: [{ x: 1, y: 2 }],
          columns: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
          ],
        } as any,
      ];

      const columns = JoinHandlers.getColumnsForTarget('src_1');

      expect(columns).toEqual(['x', 'y']);
    });
  });

  describe('analyzeJoinKeys', () => {
    beforeEach(() => {
      // Set up two sources for join analysis
      AppStore.sources.value = [
        {
          id: 'left_src',
          name: 'Left',
          data: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Carol' },
          ],
          columns: [
            { name: 'id', type: 'number' },
            { name: 'name', type: 'string' },
          ],
        } as any,
        {
          id: 'right_src',
          name: 'Right',
          data: [
            { user_id: 1, salary: 50000 },
            { user_id: 2, salary: 60000 },
            { user_id: 4, salary: 70000 },
          ],
          columns: [
            { name: 'user_id', type: 'number' },
            { name: 'salary', type: 'number' },
          ],
        } as any,
      ];
    });

    it('returns empty analysis when left model is not set', () => {
      DialogStore.joinState.leftModel.value = null;
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      JoinHandlers.analyzeJoinKeys();

      expect(DialogStore.joinState.keyPairAnalysis.value).toEqual([]);
    });

    it('returns empty analysis when right model is not set', () => {
      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = null;
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      JoinHandlers.analyzeJoinKeys();

      expect(DialogStore.joinState.keyPairAnalysis.value).toEqual([]);
    });

    it('analyzes key pairs with matching values', async () => {
      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      await JoinHandlers.analyzeJoinKeys();

      const analysis = DialogStore.joinState.keyPairAnalysis.value;
      expect(analysis).toHaveLength(1);

      const keyAnalysis = analysis[0];
      expect(keyAnalysis.leftCol).toBe('id');
      expect(keyAnalysis.rightCol).toBe('user_id');
      expect(keyAnalysis.leftUnique).toBe(3); // 1, 2, 3
      expect(keyAnalysis.rightUnique).toBe(3); // 1, 2, 4
      expect(keyAnalysis.matches).toBe(2); // 1 and 2 match
      expect(keyAnalysis.leftOnly).toBe(1); // 3 only in left
      expect(keyAnalysis.rightOnly).toBe(1); // 4 only in right
    });

    it('returns zeroed analysis for incomplete key pairs', async () => {
      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['id', null]];

      await JoinHandlers.analyzeJoinKeys();

      const analysis = DialogStore.joinState.keyPairAnalysis.value;
      expect(analysis).toHaveLength(1);
      expect(analysis[0].matches).toBe(0);
      expect(analysis[0].leftUnique).toBe(0);
    });

    it('detects duplicate values in columns', async () => {
      AppStore.sources.value = [
        {
          id: 'left_src',
          name: 'Left',
          data: [
            { category: 'A', value: 1 },
            { category: 'A', value: 2 },
            { category: 'B', value: 3 },
          ],
          columns: [{ name: 'category', type: 'string' }],
        } as any,
        {
          id: 'right_src',
          name: 'Right',
          data: [
            { cat: 'A', score: 10 },
            { cat: 'B', score: 20 },
          ],
          columns: [{ name: 'cat', type: 'string' }],
        } as any,
      ];

      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['category', 'cat']];

      await JoinHandlers.analyzeJoinKeys();

      const analysis = DialogStore.joinState.keyPairAnalysis.value[0];
      expect(analysis.leftHasDuplicates).toBe(true);
      expect(analysis.rightHasDuplicates).toBe(false);
    });

    it('handles null values in join columns', async () => {
      AppStore.sources.value = [
        {
          id: 'left_src',
          name: 'Left',
          data: [
            { id: 1, name: 'Alice' },
            { id: null, name: 'Unknown' },
            { id: 2, name: 'Bob' },
          ],
          columns: [{ name: 'id', type: 'number' }],
        } as any,
        {
          id: 'right_src',
          name: 'Right',
          data: [
            { user_id: 1, salary: 50000 },
            { user_id: null, salary: 0 },
          ],
          columns: [{ name: 'user_id', type: 'number' }],
        } as any,
      ];

      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      await JoinHandlers.analyzeJoinKeys();

      const analysis = DialogStore.joinState.keyPairAnalysis.value[0];
      expect(analysis.leftTotalRows).toBe(3);
      expect(analysis.leftNonNullRows).toBe(2);
      expect(analysis.rightTotalRows).toBe(2);
      expect(analysis.rightNonNullRows).toBe(1);
    });

    it('calculates match percentages correctly', async () => {
      AppStore.sources.value = [
        {
          id: 'left_src',
          name: 'Left',
          data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          columns: [{ name: 'id', type: 'number' }],
        } as any,
        {
          id: 'right_src',
          name: 'Right',
          data: [{ user_id: 1 }, { user_id: 2 }],
          columns: [{ name: 'user_id', type: 'number' }],
        } as any,
      ];

      DialogStore.joinState.leftModel.value = 'left_src';
      DialogStore.joinState.rightModel.value = 'right_src';
      DialogStore.joinState.keyPairs.value = [['id', 'user_id']];

      await JoinHandlers.analyzeJoinKeys();

      const analysis = DialogStore.joinState.keyPairAnalysis.value[0];
      expect(analysis.leftMatchPercent).toBe(50); // 2 of 4 match
      expect(analysis.rightMatchPercent).toBe(100); // 2 of 2 match
    });
  });

  describe('onJoinTargetChange', () => {
    beforeEach(() => {
      AppStore.sources.value = [
        {
          id: 'src_1',
          name: 'Test',
          data: [{ a: 1, b: 2 }],
          columns: [
            { name: 'a', type: 'number' },
            { name: 'b', type: 'number' },
          ],
        } as any,
      ];
    });

    it('updates right columns when target changes', () => {
      DialogStore.joinState.rightModel.value = 'src_1';

      JoinHandlers.onJoinTargetChange();

      expect(DialogStore.joinState.rightColumns.value).toEqual(['a', 'b']);
      expect(DialogStore.joinState.selectedRightColumns.value).toEqual(['a', 'b']);
    });

    it('clears columns when target is null', () => {
      DialogStore.joinState.rightModel.value = null;
      DialogStore.joinState.rightColumns.value = ['old', 'columns'];
      DialogStore.joinState.selectedRightColumns.value = ['old'];

      JoinHandlers.onJoinTargetChange();

      expect(DialogStore.joinState.rightColumns.value).toEqual([]);
      expect(DialogStore.joinState.selectedRightColumns.value).toEqual([]);
    });

    it('resets key pairs when target changes', () => {
      DialogStore.joinState.rightModel.value = 'src_1';
      DialogStore.joinState.keyPairs.value = [
        ['id', 'user_id'],
        ['name', 'user_name'],
      ];

      JoinHandlers.onJoinTargetChange();

      expect(DialogStore.joinState.keyPairs.value).toEqual([[null, null]]);
    });

    it('clears preview data when target changes', () => {
      DialogStore.joinState.rightModel.value = 'src_1';
      DialogStore.joinState.previewData.value = { rows: [], columns: [], totalRows: 0 };
      DialogStore.joinState.previewError.value = 'previous error';

      JoinHandlers.onJoinTargetChange();

      expect(DialogStore.joinState.previewData.value).toBeNull();
      expect(DialogStore.joinState.previewError.value).toBeNull();
    });
  });

  describe('onJoinLeftModelChange', () => {
    beforeEach(() => {
      AppStore.sources.value = [
        {
          id: 'src_1',
          name: 'Test',
          data: [{ x: 1, y: 2 }],
          columns: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
          ],
        } as any,
      ];
    });

    it('updates left columns when left model changes', () => {
      DialogStore.joinState.leftModel.value = 'src_1';

      JoinHandlers.onJoinLeftModelChange();

      expect(DialogStore.joinState.leftColumns.value).toEqual(['x', 'y']);
      expect(DialogStore.joinState.selectedLeftColumns.value).toEqual(['x', 'y']);
    });

    it('clears columns when left model is null', () => {
      DialogStore.joinState.leftModel.value = null;
      DialogStore.joinState.leftColumns.value = ['old'];
      DialogStore.joinState.selectedLeftColumns.value = ['old'];

      JoinHandlers.onJoinLeftModelChange();

      expect(DialogStore.joinState.leftColumns.value).toEqual([]);
      expect(DialogStore.joinState.selectedLeftColumns.value).toEqual([]);
    });

    it('resets key pairs when left model changes', () => {
      DialogStore.joinState.leftModel.value = 'src_1';
      DialogStore.joinState.keyPairs.value = [
        ['id', 'user_id'],
        ['name', 'user_name'],
      ];

      JoinHandlers.onJoinLeftModelChange();

      expect(DialogStore.joinState.keyPairs.value).toEqual([[null, null]]);
    });
  });

  describe('DialogStore join state initialization', () => {
    it('has correct default values', () => {
      const state = DialogStore.joinState;

      expect(state.leftModel.value).toBeNull();
      expect(state.rightModel.value).toBeNull();
      expect(state.joinType.value).toBe('left');
      expect(state.keyPairs.value).toEqual([[null, null]]);
      expect(state.suffixes.value).toEqual(['_x', '_y']);
      expect(state.previewData.value).toBeNull();
      expect(state.previewError.value).toBeNull();
      expect(state.isPreviewing.value).toBe(false);
    });
  });
});
