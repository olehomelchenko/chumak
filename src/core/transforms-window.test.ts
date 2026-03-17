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

    it('should apply avg_rank function', () => {
      const table = (aq as any).from([{ score: 100 }, { score: 90 }, { score: 90 }, { score: 80 }]);
      const transform = {
        window: {
          orderBy: [{ field: 'score', order: 'desc' as const }],
          derive: { avg_rnk: 'op.avg_rank()' },
        },
      };

      const result = applyTransform(table, transform, ['score']);
      const rows = result.objects();

      expect(rows[0].avg_rnk).toBe(1); // score 100
      expect(rows[1].avg_rnk).toBe(2.5); // score 90 (tied: average of 2 and 3)
      expect(rows[2].avg_rnk).toBe(2.5); // score 90
      expect(rows[3].avg_rnk).toBe(4); // score 80
    });

    it('should apply cume_dist function', () => {
      const table = (aq as any).from([{ score: 100 }, { score: 90 }, { score: 90 }, { score: 80 }]);
      const transform = {
        window: {
          orderBy: [{ field: 'score', order: 'desc' as const }],
          derive: { cdist: 'op.cume_dist()' },
        },
      };

      const result = applyTransform(table, transform, ['score']);
      const rows = result.objects();

      expect(rows[0].cdist).toBe(0.25); // 1/4
      expect(rows[1].cdist).toBe(0.75); // 3/4 (ties share highest position)
      expect(rows[2].cdist).toBe(0.75); // 3/4
      expect(rows[3].cdist).toBe(1); // 4/4
    });

    it('should apply nth_value function', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { second_val: "op.nth_value('value', 2)" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      // nth_value(2) returns the 2nd value in the full window
      expect(rows[0].second_val).toBe(20);
      expect(rows[1].second_val).toBe(20);
      expect(rows[2].second_val).toBe(20);
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
          derive: { bad: 'op.corr(value)' },
        },
      };

      expect(() => applyTransform(table, transform, ['date', 'category', 'value'])).toThrow(
        'Unknown or disallowed window function'
      );
    });
  });

  describe('applyTransform() - WINDOW cumulative aggregates', () => {
    it('should compute cumulative sum', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { cumsum: "op.sum('value')" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].cumsum).toBe(10);
      expect(rows[1].cumsum).toBe(30);
      expect(rows[2].cumsum).toBe(60);
    });

    it('should compute cumulative mean', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { running_avg: "op.mean('value')" },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].running_avg).toBe(10);
      expect(rows[1].running_avg).toBe(15);
      expect(rows[2].running_avg).toBe(20);
    });

    it('should compute cumulative count', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { running_count: 'op.count()' },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].running_count).toBe(1);
      expect(rows[1].running_count).toBe(2);
      expect(rows[2].running_count).toBe(3);
    });

    it('should compute partitioned cumulative sum', () => {
      const table = (aq as any).from([
        { cat: 'A', date: '2024-01-01', value: 10 },
        { cat: 'A', date: '2024-01-02', value: 20 },
        { cat: 'A', date: '2024-01-03', value: 30 },
        { cat: 'B', date: '2024-01-01', value: 100 },
        { cat: 'B', date: '2024-01-02', value: 200 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          partitionBy: ['cat'],
          derive: { cumsum: "op.sum('value')" },
        },
      };

      const result = applyTransform(table, transform, ['cat', 'date', 'value']);
      const rows = result.objects();

      const catA = rows.filter((r: any) => r.cat === 'A');
      const catB = rows.filter((r: any) => r.cat === 'B');

      expect(catA[0].cumsum).toBe(10);
      expect(catA[1].cumsum).toBe(30);
      expect(catA[2].cumsum).toBe(60);

      expect(catB[0].cumsum).toBe(100);
      expect(catB[1].cumsum).toBe(300);
    });
  });

  describe('applyTransform() - WINDOW rolling aggregates (frames)', () => {
    it('should compute rolling sum with frame [-2, 0]', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
        { date: '2024-01-04', value: 40 },
        { date: '2024-01-05', value: 50 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { rolling_sum: "op.sum('value')" },
          frames: { rolling_sum: [-2, 0] as [number, number] },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].rolling_sum).toBe(10); // only row 1
      expect(rows[1].rolling_sum).toBe(30); // rows 1-2
      expect(rows[2].rolling_sum).toBe(60); // rows 1-3
      expect(rows[3].rolling_sum).toBe(90); // rows 2-4
      expect(rows[4].rolling_sum).toBe(120); // rows 3-5
    });

    it('should compute rolling mean with frame [-1, 1] (centered)', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
        { date: '2024-01-04', value: 40 },
        { date: '2024-01-05', value: 50 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { centered_avg: "op.mean('value')" },
          frames: { centered_avg: [-1, 1] as [number, number] },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].centered_avg).toBe(15); // (10+20)/2
      expect(rows[1].centered_avg).toBe(20); // (10+20+30)/3
      expect(rows[2].centered_avg).toBe(30); // (20+30+40)/3
      expect(rows[3].centered_avg).toBe(40); // (30+40+50)/3
      expect(rows[4].centered_avg).toBe(45); // (40+50)/2
    });

    it('should use cumulative default when frames omitted for aggregate functions', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { cumsum: "op.sum('value')" },
          // no frames → cumulative default
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].cumsum).toBe(10);
      expect(rows[1].cumsum).toBe(30);
      expect(rows[2].cumsum).toBe(60);
    });

    it('should support null frame bounds as unbounded', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { cumsum: "op.sum('value')" },
          frames: { cumsum: [null, 0] as [null, number] },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      // null start = unbounded preceding, same as cumulative
      expect(rows[0].cumsum).toBe(10);
      expect(rows[1].cumsum).toBe(30);
      expect(rows[2].cumsum).toBe(60);
    });

    it('should mix window and aggregate functions in same step', () => {
      const table = (aq as any).from([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ]);
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: {
            row_num: 'op.row_number()',
            cumsum: "op.sum('value')",
            prev: "op.lag('value', 1)",
          },
        },
      };

      const result = applyTransform(table, transform, ['date', 'value']);
      const rows = result.objects();

      expect(rows[0].row_num).toBe(1);
      expect(rows[0].cumsum).toBe(10);
      expect(rows[0].prev).toBeUndefined();

      expect(rows[2].row_num).toBe(3);
      expect(rows[2].cumsum).toBe(60);
      expect(rows[2].prev).toBe(20);
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

    it('should describe cumulative aggregate transform', () => {
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { cumsum: "op.sum('value')" },
        },
      };

      const desc = describeTransform(transform);
      expect(desc).toBe('Window cumulative (1 column, by date)');
    });

    it('should describe rolling aggregate transform', () => {
      const transform = {
        window: {
          orderBy: [{ field: 'date', order: 'asc' as const }],
          derive: { rolling_avg: "op.mean('value')" },
          frames: { rolling_avg: [-2, 0] },
        },
      };

      const desc = describeTransform(transform);
      expect(desc).toBe('Window rolling (1 column, by date)');
    });
  });
});
