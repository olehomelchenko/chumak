/**
 * Unit Tests for EDA Engine
 *
 * Tests statistical calculations including standard deviation, 3-sigma bounds,
 * and null handling in categorical statistics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EDAEngine } from './eda-engine';

describe('EDA Engine', () => {
  describe('calculateNumericStats', () => {
    it('should calculate standard deviation', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = EDAEngine.calculateNumericStats(values);

      expect(stats.raw?.std).toBeDefined();
      expect(stats.std).toBeDefined();
      // For [1,2,3,4,5], mean=3, variance=2, std≈1.414
      expect(stats.raw?.std).toBeCloseTo(1.414, 2);
    });

    it('should calculate 3-sigma bounds', () => {
      const values = [10, 20, 30, 40, 50];
      const stats = EDAEngine.calculateNumericStats(values);

      expect(stats.raw?.meanMinus3Sigma).toBeDefined();
      expect(stats.raw?.meanPlus3Sigma).toBeDefined();
      expect(stats.meanMinus3Sigma).toBeDefined();
      expect(stats.meanPlus3Sigma).toBeDefined();

      // Mean = 30, std ≈ 14.14, so mean-3σ ≈ -12.42, mean+3σ ≈ 72.42
      expect(stats.raw?.meanMinus3Sigma).toBeCloseTo(-12.42, 1);
      expect(stats.raw?.meanPlus3Sigma).toBeCloseTo(72.42, 1);
    });

    it('should include std and 3-sigma in formatted output', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = EDAEngine.calculateNumericStats(values);

      expect(stats.std).toBeTypeOf('string');
      expect(stats.meanMinus3Sigma).toBeTypeOf('string');
      expect(stats.meanPlus3Sigma).toBeTypeOf('string');
    });

    it('should handle empty array', () => {
      const stats = EDAEngine.calculateNumericStats([]);
      expect(stats).toEqual({});
    });

    it('should calculate all numeric stats including std and 3-sigma', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = EDAEngine.calculateNumericStats(values);

      expect(stats.min).toBeDefined();
      expect(stats.max).toBeDefined();
      expect(stats.mean).toBeDefined();
      expect(stats.median).toBeDefined();
      expect(stats.p25).toBeDefined();
      expect(stats.p75).toBeDefined();
      expect(stats.std).toBeDefined();
      expect(stats.meanMinus3Sigma).toBeDefined();
      expect(stats.meanPlus3Sigma).toBeDefined();
      expect(stats.raw?.std).toBeDefined();
      expect(stats.raw?.meanMinus3Sigma).toBeDefined();
      expect(stats.raw?.meanPlus3Sigma).toBeDefined();
    });
  });

  describe('calculateCategoricalStats with nulls', () => {
    it('should include nulls as separate category', () => {
      const values = ['a', 'b', 'a', 'b', 'c'];
      const totalCount = 8; // 5 non-null + 3 nulls
      const nullCount = 3;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      expect(result.topValues).toBeDefined();
      const nullItem = result.topValues.find((item) => item.isNull);
      expect(nullItem).toBeDefined();
      expect(nullItem?.value).toBe('(null)');
      expect(nullItem?.count).toBe(3);
      expect(nullItem?.percentage).toBe('37.5'); // 3/8 * 100
    });

    it('should place nulls at the end of the array', () => {
      const values = ['a', 'b', 'c'];
      const totalCount = 5; // 3 non-null + 2 nulls
      const nullCount = 2;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      const lastItem = result.topValues[result.topValues.length - 1];
      expect(lastItem.isNull).toBe(true);
    });

    it('should calculate percentages based on totalCount including nulls', () => {
      const values = ['a', 'a', 'b'];
      const totalCount = 5; // 3 non-null + 2 nulls
      const nullCount = 2;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      // 'a' appears 2 times out of 5 total
      const aItem = result.topValues.find((item) => item.value === 'a');
      expect(aItem?.percentage).toBe('40.0'); // 2/5 * 100

      // nulls appear 2 times out of 5 total
      const nullItem = result.topValues.find((item) => item.isNull);
      expect(nullItem?.percentage).toBe('40.0'); // 2/5 * 100
    });

    it('should not include null category when nullCount is 0', () => {
      const values = ['a', 'b', 'c'];
      const totalCount = 3;
      const nullCount = 0;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      const nullItem = result.topValues.find((item) => item.isNull);
      expect(nullItem).toBeUndefined();
    });

    it('should handle empty values array with nulls', () => {
      const values: any[] = [];
      const totalCount = 5;
      const nullCount = 5;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      expect(result.topValues.length).toBe(1);
      expect(result.topValues[0].isNull).toBe(true);
      expect(result.topValues[0].count).toBe(5);
    });

    it('should handle empty values and no nulls', () => {
      const values: any[] = [];
      const totalCount = 0;
      const nullCount = 0;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount);

      expect(result.topValues).toEqual([]);
    });
  });

  describe('calculateStats integration', () => {
    it('should pass totalCount and nullCount to calculateCategoricalStats', () => {
      const data = [{ col: 'a' }, { col: 'b' }, { col: null }, { col: 'a' }, { col: null }];

      const stats = EDAEngine.calculateStats(data, 'col', 'string');

      expect(stats).toBeDefined();
      if (stats && 'topValues' in stats) {
        const nullItem = stats.topValues.find((item) => item.isNull);
        expect(nullItem).toBeDefined();
        expect(nullItem?.count).toBe(2);
      }
    });

    it('should calculate numeric stats with std and 3-sigma', () => {
      const data = [{ col: 10 }, { col: 20 }, { col: 30 }, { col: 40 }, { col: 50 }];

      const stats = EDAEngine.calculateStats(data, 'col', 'number');

      expect(stats).toBeDefined();
      if (stats && 'std' in stats) {
        expect(stats.std).toBeDefined();
        expect(stats.meanMinus3Sigma).toBeDefined();
        expect(stats.meanPlus3Sigma).toBeDefined();
        expect(stats.raw?.std).toBeDefined();
        expect(stats.raw?.meanMinus3Sigma).toBeDefined();
        expect(stats.raw?.meanPlus3Sigma).toBeDefined();
      }
    });
  });
});
