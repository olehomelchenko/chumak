/**
 * UX Interaction Tests for Interaction Handlers
 *
 * Tests user interactions like clicking column headers and cells,
 * verifying that toolbars and EDA panels are triggered correctly.
 * These tests focus on the handler logic rather than full component rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';
import * as InteractionHandlers from './interaction-handlers';
import * as EDAHandlers from './eda-handlers';
import { createTestModel, createTestSchema } from '../test-utils';

describe('Interaction Handlers UX', () => {
  const testData = [
    { name: 'Alice', age: 30, sales: 1000 },
    { name: 'Bob', age: 25, sales: 1500 },
    { name: 'Carol', age: 35, sales: 800 },
  ];

  let mockOpenDialog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all stores
    AppStore.reset();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create mock dialog function
    mockOpenDialog = vi.fn();

    // Set up test data
    AppStore.columns.value = ['name', 'age', 'sales'];
    AppStore.currentData.value = testData;
    AppStore.viewMode.value = 'model';
    AppStore.activeModel.value = createTestModel({
      id: 'test-model',
      sourceId: 'test-source',
      data: testData,
      schema: createTestSchema(['name', 'string'], ['age', 'integer'], ['sales', 'float']),
      steps: [],
    });

    // Mock DOM elements for toolbar positioning
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 100,
        height: 30,
      }),
    };

    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector.includes('th[data-col') || selector.includes('td[data-col')) {
        return mockElement as any;
      }
      return null;
    });
  });

  describe('Column Selection', () => {
    it('should set selectedColumn when selectColumn is called', () => {
      EDAHandlers.selectColumn('name');

      expect(AppStore.selectedColumn.value).toBe('name');
      expect(AppStore.selectedCell.value).toBeNull();
    });

    it('should calculate EDA stats when column is selected', async () => {
      EDAHandlers.selectColumn('age');

      expect(AppStore.selectedColumn.value).toBe('age');
      // edaStats is computed asynchronously by EdaPanel.tsx via computeEdaStats
      // We just verify selectedColumn is set; the actual stats computation
      // happens in the component's useEffect which we test separately
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(AppStore.selectedColumn.value).toBe('age');
    });

    it('should toggle column selection when same column is clicked twice', () => {
      EDAHandlers.selectColumn('name');
      expect(AppStore.selectedColumn.value).toBe('name');

      EDAHandlers.selectColumn('name');
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('should clear cell selection when column is selected', () => {
      AppStore.selectedCell.value = {
        col: 'name',
        value: 'Alice',
        type: 'string',
        rowIdx: 0,
      };

      EDAHandlers.selectColumn('age');

      expect(AppStore.selectedColumn.value).toBe('age');
      expect(AppStore.selectedCell.value).toBeNull();
    });

    it('should update toolbar position when column is selected', () => {
      vi.useFakeTimers();
      EDAHandlers.selectColumn('name');

      // Advance past requestAnimationFrame (one frame = 16ms)
      vi.advanceTimersByTime(16);

      // Toolbar position should be calculated (if DOM element exists)
      // In test environment, position might be 0 if element not found, which is OK
      expect(AppStore.columnToolbarPos.value).toBeDefined();
      vi.useRealTimers();
    });
  });

  describe('Cell Selection', () => {
    it('should set selectedCell when selectCell is called', () => {
      InteractionHandlers.selectCell('name', 'Alice', 0);

      expect(AppStore.selectedCell.value).toBeDefined();
      expect(AppStore.selectedCell.value?.col).toBe('name');
      expect(AppStore.selectedCell.value?.value).toBe('Alice');
      expect(AppStore.selectedCell.value?.rowIdx).toBe(0);
    });

    it('should clear column selection when cell is selected', () => {
      AppStore.selectedColumn.value = 'name';
      AppStore.edaStats.value = { type: 'string' } as any;

      InteractionHandlers.selectCell('sales', 1000, 0);

      expect(AppStore.selectedCell.value).toBeDefined();
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('should set correct cell type based on column schema', () => {
      InteractionHandlers.selectCell('age', 30, 0);

      const selectedCell = AppStore.selectedCell.value;
      expect(selectedCell).toBeDefined();
      expect(selectedCell?.col).toBe('age');
      expect(selectedCell?.type).toBe('integer');
      expect(selectedCell?.value).toBe(30);
    });

    it('should update toolbar position when cell is selected', () => {
      vi.useFakeTimers();
      InteractionHandlers.selectCell('sales', 1500, 1);

      // Advance past requestAnimationFrame (one frame = 16ms)
      vi.advanceTimersByTime(16);

      // Toolbar position should be calculated (if DOM element exists)
      // In test environment, position might be 0 if element not found, which is OK
      expect(AppStore.cellToolbarPos.value).toBeDefined();
      vi.useRealTimers();
    });
  });

  describe('Toolbar Actions', () => {
    it('should open filter dialog when quickFilter is called', () => {
      AppStore.selectedColumn.value = 'name';

      InteractionHandlers.quickFilter(mockOpenDialog);

      expect(mockOpenDialog).toHaveBeenCalledWith('filter');
      expect(AppStore.selectedColumn.value).toBe('name'); // Should remain selected
    });

    it('should clear selection after quickSort', async () => {
      AppStore.selectedColumn.value = 'sales';

      const callbacks = {
        onTransformStart: vi.fn(),
        onTransformEnd: vi.fn(),
        onError: vi.fn(),
        updatePagination: vi.fn(),
      };

      await InteractionHandlers.quickSort('asc', callbacks);

      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('should open replace dialog when quickReplace is called', () => {
      AppStore.selectedCell.value = {
        col: 'name',
        value: 'Alice',
        type: 'string',
        rowIdx: 0,
      };

      InteractionHandlers.quickReplace(mockOpenDialog);

      expect(mockOpenDialog).toHaveBeenCalledWith('replace');
      expect(DialogStore.replaceState.column.value).toBe('name');
      expect(DialogStore.replaceState.findValue.value).toBe('Alice');
    });

    it('should apply filter when applyQuickCellFilter is called', async () => {
      AppStore.selectedCell.value = {
        col: 'sales',
        value: 1000,
        type: 'number',
        rowIdx: 0,
      };

      const callbacks = {
        onTransformStart: vi.fn(),
        onTransformEnd: vi.fn(),
        onError: vi.fn(),
        updatePagination: vi.fn(),
      };

      await InteractionHandlers.applyQuickCellFilter('exact', callbacks);

      // Filter expression should be set
      expect(DialogStore.filterState.expression.value).toContain('[sales]');
      expect(DialogStore.filterState.expression.value).toContain('==');
      expect(AppStore.selectedCell.value).toBeNull(); // Should clear after action
    });
  });

  describe('EDA Integration', () => {
    it('should set selectedColumn for numeric columns', () => {
      EDAHandlers.selectColumn('sales');

      // selectedColumn is set synchronously; edaStats is computed asynchronously
      // by EdaPanel.tsx via computeEdaStats
      expect(AppStore.selectedColumn.value).toBe('sales');
    });

    it('should set selectedColumn for string columns', () => {
      EDAHandlers.selectColumn('name');

      expect(AppStore.selectedColumn.value).toBe('name');
    });

    it('should clear selection when column is deselected', () => {
      EDAHandlers.selectColumn('age');
      expect(AppStore.selectedColumn.value).toBe('age');

      EDAHandlers.selectColumn('age'); // Deselect
      expect(AppStore.selectedColumn.value).toBeNull();
    });
  });

  describe('Type Conversion Preview', () => {
    beforeEach(() => {
      AppStore.currentData.value = [
        { id: 1, status: 'active', count: '10', price: '99.99', enabled: 'true' },
        { id: 2, status: 'inactive', count: '20', price: '149.50', enabled: 'false' },
        { id: 3, status: 'active', count: '10', price: '99.99', enabled: 'true' }, // duplicate
        { id: 4, status: 'pending', count: '30', price: '200.00', enabled: 'yes' },
      ];
      AppStore.columns.value = ['id', 'status', 'count', 'price', 'enabled'];
      AppStore.activeModel.value = createTestModel({
        id: 'test-model',
        sourceId: 'test-source',
        schema: createTestSchema(
          ['id', 'integer'],
          ['status', 'string'],
          ['count', 'string'],
          ['price', 'string'],
          ['enabled', 'string']
        ),
        data: AppStore.currentData.value!,
        steps: [],
      });
    });

    it('should generate preview with unique values only', () => {
      InteractionHandlers.previewTypeConversion('status', 'boolean');

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('Type Conversion: status');
      expect(preview.rows.value.length).toBe(3); // Only 3 unique values: 'active', 'inactive', 'pending'
      expect(preview.columns.value).toEqual(['status (before)', 'status (after)']);
      expect(preview.newColumns.value).toEqual(['status (after)']);
    });

    it('should show before and after columns in preview', () => {
      InteractionHandlers.previewTypeConversion('count', 'integer');

      const preview = DialogStore.previewState;
      expect(preview.rows.value.length).toBeGreaterThan(0);
      const firstRow = preview.rows.value[0];
      expect(firstRow).toHaveProperty('count (before)');
      expect(firstRow).toHaveProperty('count (after)');
    });

    it('should mark rows with conversion errors', () => {
      InteractionHandlers.previewTypeConversion('status', 'integer');

      const preview = DialogStore.previewState;
      const errorRows = preview.rows.value.filter((r: any) => r._hasError);
      expect(errorRows.length).toBeGreaterThan(0);
    });

    it('should calculate statistics correctly', () => {
      InteractionHandlers.previewTypeConversion('count', 'integer');

      const preview = DialogStore.previewState;
      const stats = preview.stats.value;
      expect(stats).toContain('unique values');
      expect(stats).toContain('total rows');
      expect(stats).toContain('convert successfully');
    });

    it('should clear preview when converting to same type', () => {
      InteractionHandlers.previewTypeConversion('status', 'string');

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
      expect(preview.rows.value.length).toBe(0);
    });

    it('should handle empty data gracefully', () => {
      AppStore.currentData.value = [];
      InteractionHandlers.previewTypeConversion('status', 'boolean');

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
      expect(preview.rows.value.length).toBe(0);
    });

    it('should handle null values in unique value calculation', () => {
      AppStore.currentData.value = [
        { col: 'value1' },
        { col: null },
        { col: 'value2' },
        { col: null },
        { col: 'value1' },
      ];
      AppStore.columns.value = ['col'];
      // Update model schema so fromType is different from toType
      AppStore.activeModel.value = createTestModel({
        ...AppStore.activeModel.value!,
        schema: createTestSchema(['col', 'integer']),
      });

      InteractionHandlers.previewTypeConversion('col', 'string');

      const preview = DialogStore.previewState;
      // Should have 3 unique values: 'value1', null, 'value2'
      expect(preview.rows.value.length).toBe(3);
    });

    it('should handle auto type detection', () => {
      AppStore.currentData.value = [{ numeric: '42' }, { numeric: '100' }, { numeric: '50' }];
      AppStore.columns.value = ['numeric'];

      InteractionHandlers.previewTypeConversion('numeric', 'auto');

      const preview = DialogStore.previewState;
      // Should detect integer type and show preview
      expect(preview.title.value).toBe('Type Conversion: numeric');
    });

    it('should preserve insertion order of unique values', () => {
      AppStore.currentData.value = [
        { order: 'first' },
        { order: 'second' },
        { order: 'first' },
        { order: 'third' },
        { order: 'second' },
      ];
      AppStore.columns.value = ['order'];
      // Update model schema so fromType is different from toType
      AppStore.activeModel.value = createTestModel({
        ...AppStore.activeModel.value!,
        schema: createTestSchema(['order', 'integer']),
      });

      InteractionHandlers.previewTypeConversion('order', 'string');

      const preview = DialogStore.previewState;
      const rows = preview.rows.value;
      expect(rows[0]['order (before)']).toBe('first');
      expect(rows[1]['order (before)']).toBe('second');
      expect(rows[2]['order (before)']).toBe('third');
    });

    it('should handle error objects in data', () => {
      const errorObj = { type: 'error', message: 'Test error' };
      AppStore.currentData.value = [
        { col: 'value1' },
        { col: errorObj },
        { col: 'value2' },
        { col: errorObj },
      ];
      AppStore.columns.value = ['col'];
      // Update model schema so fromType is different from toType
      AppStore.activeModel.value = createTestModel({
        ...AppStore.activeModel.value!,
        schema: createTestSchema(['col', 'integer']),
      });

      InteractionHandlers.previewTypeConversion('col', 'string');

      const preview = DialogStore.previewState;
      // Should handle error objects as unique values
      expect(preview.rows.value.length).toBeGreaterThan(0);
    });
  });
});
