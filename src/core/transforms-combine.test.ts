import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from './transforms';

describe('Transform Engine - Combine Operations', () => {
  // Helper to create test data
  function createTestTable() {
    return (aq as any).from([
      { sales: 1000, revenue: 5000, cost: 3000, region: 'North', status: 'active' },
      { sales: 1500, revenue: 7000, cost: 4000, region: 'South', status: 'active' },
      { sales: 800, revenue: 4000, cost: 2500, region: 'North', status: 'pending' },
      { sales: 2000, revenue: 10000, cost: 6000, region: 'East', status: 'active' },
      { sales: 500, revenue: 3000, cost: 2000, region: 'West', status: 'inactive' },
    ]);
  }

  describe('applyTransform() - CONCAT', () => {
    it('should concat with another model', () => {
      const table1 = (aq as any).from([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const models = [
        {
          id: 'mdl_other',
          name: 'Other Model',
          data: [
            { id: 3, name: 'Charlie' },
            { id: 4, name: 'Diana' },
          ],
        },
      ];

      const context = {
        sources: [],
        models: models,
      };

      const transform = { concat: { with: 'mdl_other' } };
      const result = applyTransform(table1, transform, ['id', 'name'], context);
      const rows = result.objects();

      expect(rows.length).toBe(4);
      expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
      expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
    });

    it('should concat with a source', () => {
      const table1 = (aq as any).from([{ id: 1, name: 'A' }]);

      const sources = [
        {
          id: 'src_1',
          name: 'Source',
          data: [
            { id: 2, name: 'B' },
            { id: 3, name: 'C' },
          ],
        },
      ];

      const context = {
        sources: sources,
        models: [],
      };

      const transform = { concat: { with: 'src_1' } };
      const result = applyTransform(table1, transform, ['id', 'name'], context);
      const rows = result.objects();

      expect(rows.length).toBe(3);
      expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('should throw error when concat target not found', () => {
      const table = createTestTable();
      const transform = { concat: { with: 'nonexistent' } };

      expect(() => {
        applyTransform(table, transform, ['sales'], { sources: [], models: [] });
      }).toThrow("Concat target with ID 'nonexistent' not found");
    });

    it('should handle concat with mismatched columns', () => {
      const table1 = (aq as any).from([{ a: 1, b: 2 }]);

      const models = [
        {
          id: 'mdl_other',
          name: 'Other',
          data: [{ c: 3 }], // Different columns
        },
      ];

      const context = {
        sources: [],
        models: models,
      };

      const transform = { concat: { with: 'mdl_other' } };
      const result = applyTransform(table1, transform, ['a', 'b'], context);
      const rows = result.objects();
      const columns = result.columnNames();

      // Concat stacks rows - columns depend on Arquero's behavior
      // At minimum, should have rows from both tables
      expect(rows.length).toBe(2);
      expect(columns.length).toBeGreaterThan(0);
    });
  });

  describe('applyTransform() - UNION', () => {
    it('should union with another model (removes duplicates)', () => {
      const table1 = (aq as any).from([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const models = [
        {
          id: 'mdl_other',
          name: 'Other Model',
          data: [
            { id: 2, name: 'Bob' }, // Duplicate
            { id: 3, name: 'Charlie' },
          ],
        },
      ];

      const context = {
        sources: [],
        models: models,
      };

      const transform = { union: { with: 'mdl_other' } };
      const result = applyTransform(table1, transform, ['id', 'name'], context);
      const rows = result.objects();

      expect(rows.length).toBe(3); // Duplicate removed
      expect(rows.map((r) => r.id).sort()).toEqual([1, 2, 3]);
    });

    it('should union with a source', () => {
      const table1 = (aq as any).from([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);

      const sources = [
        {
          id: 'src_1',
          name: 'Source',
          data: [
            { id: 3, name: 'C' },
            { id: 4, name: 'D' },
          ],
        },
      ];

      const context = {
        sources: sources,
        models: [],
      };

      const transform = { union: { with: 'src_1' } };
      const result = applyTransform(table1, transform, ['id', 'name'], context);
      const rows = result.objects();

      expect(rows.length).toBe(4);
      expect(rows.map((r) => r.id).sort()).toEqual([1, 2, 3, 4]);
    });

    it('should throw error when union target not found', () => {
      const table = createTestTable();
      const transform = { union: { with: 'nonexistent' } };

      expect(() => {
        applyTransform(table, transform, ['sales'], { sources: [], models: [] });
      }).toThrow("Union target with ID 'nonexistent' not found");
    });

    it('should handle union with all duplicate rows', () => {
      const table1 = (aq as any).from([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);

      const models = [
        {
          id: 'mdl_other',
          name: 'Other',
          data: [
            { id: 1, name: 'A' },
            { id: 2, name: 'B' },
          ],
        },
      ];

      const context = {
        sources: [],
        models: models,
      };

      const transform = { union: { with: 'mdl_other' } };
      const result = applyTransform(table1, transform, ['id', 'name'], context);
      const rows = result.objects();

      expect(rows.length).toBe(2); // All duplicates removed
      expect(rows.map((r) => r.id).sort()).toEqual([1, 2]);
    });
  });

  describe('applyTransform() - SAMPLE', () => {
    it('should sample random rows without seed', () => {
      const table = (aq as any).from([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 },
        { id: 9 },
        { id: 10 },
      ]);
      const transform = { sample: { count: 3 } };
      const result = applyTransform(table, transform, ['id']);

      expect(result.numRows()).toBe(3);
      const rows = result.objects();
      // All sampled ids should be from original data
      rows.forEach((r) => {
        expect(r.id).toBeGreaterThanOrEqual(1);
        expect(r.id).toBeLessThanOrEqual(10);
      });
    });

    it('should sample deterministically with seed', () => {
      const table = (aq as any).from([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 },
        { id: 9 },
        { id: 10 },
      ]);
      const transform = { sample: { count: 3, seed: 42 } };

      // Run twice with same seed
      const result1 = applyTransform(table, transform, ['id']);
      const result2 = applyTransform(table, transform, ['id']);

      expect(result1.numRows()).toBe(3);
      expect(result2.numRows()).toBe(3);

      // Same seed should produce same results
      const rows1 = result1.objects().map((r) => r.id);
      const rows2 = result2.objects().map((r) => r.id);
      expect(rows1).toEqual(rows2);
    });

    it('should handle count larger than table size', () => {
      const table = (aq as any).from([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const transform = { sample: { count: 10 } };
      const result = applyTransform(table, transform, ['id']);

      // Should return all rows
      expect(result.numRows()).toBe(3);
    });

    it('should return empty table when sampling from empty table', () => {
      const table = (aq as any).from([]);
      const transform = { sample: { count: 5 } };
      const result = applyTransform(table, transform, []);

      expect(result.numRows()).toBe(0);
    });
  });

  describe('describeTransform() - Sample', () => {
    it('should describe sample transform', () => {
      expect(describeTransform({ sample: { count: 100 } })).toBe('Sample: 100 rows');
      expect(describeTransform({ sample: { count: 50, seed: 42 } })).toBe(
        'Sample: 50 rows (seed: 42)'
      );
    });
  });
});
