import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from './transforms';

describe('Transform Engine - Window Operations', () => {
  // Helper to create test data with dates for meaningful ordering
  function createTestTable() {
    return (aq as any).from([
      { date: '2024-01-01', category: 'A', value: 10 },
      { date: '2024-01-02', category: 'A', value: 20 },
      { date: '2024-01-03', category: 'A', value: 30 },
      { date: '2024-01-01', category: 'B', value: 100 },
      { date: '2024-01-02', category: 'B', value: 200 },
    ]);
  }

  describe('applyTransform() - WINDOW', () => {
    it('should apply lag function', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { prev_value: "op.lag('value', 1)" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      // First row should have undefined prev_value
      expect(rows[0].prev_value).toBeUndefined();
      // Second row should have first row's value
      expect(rows[1].prev_value).toBe(10);
    });

    it('should apply lead function', () => {
      // Use a simpler table with unique dates for predictable ordering
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { next_value: "op.lead('value', 1)" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      // Last row should have undefined next_value
      expect(rows[rows.length - 1].next_value).toBeUndefined();
      // First row should have second row's value
      expect(rows[0].next_value).toBe(20);
      // Second row should have third row's value
      expect(rows[1].next_value).toBe(30);
    });

    it('should apply row_number function', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { row_num: 'op.row_number()' },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      expect(rows[0].row_num).toBe(1);
      expect(rows[1].row_num).toBe(2);
      expect(rows[rows.length - 1].row_num).toBe(5);
    });

    it('should apply rank function', () => {
      // Create table with ties for ranking
      const table = (aq as any).from([{ score: 100 }, { score: 90 }, { score: 90 }, { score: 80 }]);
      const transform = {
        window: {
          orderBy: [{ field: 'score', order: 'desc' as const }],
          derive: { rank: 'op.rank()' },
        },
      };

      const result = applyTransform(table, transform, ['score']);
      const rows = result.objects();

      expect(rows[0].rank).toBe(1); // score 100
      expect(rows[1].rank).toBe(2); // score 90
      expect(rows[2].rank).toBe(2); // score 90 (tie)
      expect(rows[3].rank).toBe(4); // score 80 (gap due to ties)
    });

    it('should apply dense_rank function', () => {
      const table = (aq as any).from([{ score: 100 }, { score: 90 }, { score: 90 }, { score: 80 }]);
      const transform = {
        window: {
          orderBy: [{ field: 'score', order: 'desc' as const }],
          derive: { dense_rank: 'op.dense_rank()' },
        },
      };

      const result = applyTransform(table, transform, ['score']);
      const rows = result.objects();

      expect(rows[0].dense_rank).toBe(1); // score 100
      expect(rows[1].dense_rank).toBe(2); // score 90
      expect(rows[2].dense_rank).toBe(2); // score 90 (tie)
      expect(rows[3].dense_rank).toBe(3); // score 80 (no gap)
    });

    it('should apply window function with partitioning', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          partitionBy: ['category'],
          derive: { row_num: 'op.row_number()' },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      // Row numbers should restart for each category
      const catARows = rows.filter((r: any) => r.category === 'A');
      const catBRows = rows.filter((r: any) => r.category === 'B');

      expect(catARows[0].row_num).toBe(1);
      expect(catARows[1].row_num).toBe(2);
      expect(catARows[2].row_num).toBe(3);

      expect(catBRows[0].row_num).toBe(1);
      expect(catBRows[1].row_num).toBe(2);
    });

    it('should apply partitioned lag function', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          partitionBy: ['category'],
          derive: { prev_value: "op.lag('value', 1)" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      // Within each category, lag should work independently
      const catARows = rows.filter((r: any) => r.category === 'A');
      const catBRows = rows.filter((r: any) => r.category === 'B');

      // First row in each partition has undefined lag
      expect(catARows[0].prev_value).toBeUndefined();
      expect(catBRows[0].prev_value).toBeUndefined();

      // Subsequent rows have previous value within partition
      expect(catARows[1].prev_value).toBe(10);
      expect(catARows[2].prev_value).toBe(20);
      expect(catBRows[1].prev_value).toBe(100);
    });

    it('should apply multiple window functions', () => {
      // Use a simpler table with unique dates for predictable ordering
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: {
            prev_value: "op.lag('value', 1)",
            next_value: "op.lead('value', 1)",
            row_num: 'op.row_number()',
          },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].row_num).toBe(1);
      expect(rows[0].prev_value).toBeUndefined();
      expect(rows[0].next_value).toBe(20);

      expect(rows[1].row_num).toBe(2);
      expect(rows[1].prev_value).toBe(10);
      expect(rows[1].next_value).toBe(30);
    });

    it('should handle lag with custom offset', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { two_back: "op.lag('value', 2)" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      expect(rows[0].two_back).toBeUndefined();
      expect(rows[1].two_back).toBeUndefined();
      expect(rows[2].two_back).toBe(10); // 2 rows back from row 3
    });

    it('should handle descending order', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'desc' as const }],
          derive: { row_num: 'op.row_number()' },
        },
      };

      const result = applyTransform(table, transform, ['date', 'category', 'value']);
      const rows = result.objects();

      // With descending order, row 1 should be 2024-01-03
      const row1 = rows.find((r: any) => r.row_num === 1);
      expect(row1.date).toBe('2024-01-03');
    });

    it('should throw on invalid expression', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { bad: 'invalid expression' },
        },
      };

      expect(() => applyTransform(table, transform, ['date', 'category', 'value'])).toThrow(
        'Invalid window expression'
      );
    });

    it('should throw on disallowed function', () => {
      const table = createTestTable();
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { bad: 'op.sum(value)' },
        },
      };

      expect(() => applyTransform(table, transform, ['date', 'category', 'value'])).toThrow(
        'Unknown or disallowed window function'
      );
    });
  });

  describe('describeTransform() - WINDOW', () => {
    it('should describe window transform', () => {
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { prev_value: "op.lag('value', 1)" },
        },
      };

      const desc = describeTransform(transform);
      expect(desc).toBe('Window (1 column, by date)');
    });

    it('should describe window transform with partitioning', () => {
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          partitionBy: ['category', 'region'],
          derive: {
            prev_value: "op.lag('value', 1)",
            row_num: 'op.row_number()',
          },
        },
      };

      const desc = describeTransform(transform);
      expect(desc).toBe('Window (2 columns, by date, partitioned by 2 columns)');
    });

    it('should handle single partition column', () => {
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          partitionBy: ['category'],
          derive: { row_num: 'op.row_number()' },
        },
      };

      const desc = describeTransform(transform);
      expect(desc).toBe('Window (1 column, by date, partitioned by 1 column)');
    });
  });
});
