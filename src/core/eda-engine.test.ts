/**
 * Unit Tests for EDA Engine
 *
 * Tests statistical calculations including standard deviation, 3-sigma bounds,
 * and null handling in categorical statistics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EDAEngine, selectChartDefaults, scanColumnQuality, EDAStats } from './eda-engine';

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

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

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

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

      const lastItem = result.topValues[result.topValues.length - 1];
      expect(lastItem.isNull).toBe(true);
    });

    it('should calculate percentages based on totalCount including nulls', () => {
      const values = ['a', 'a', 'b'];
      const totalCount = 5; // 3 non-null + 2 nulls
      const nullCount = 2;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

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

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

      const nullItem = result.topValues.find((item) => item.isNull);
      expect(nullItem).toBeUndefined();
    });

    it('should handle empty values array with nulls', () => {
      const values: any[] = [];
      const totalCount = 5;
      const nullCount = 5;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

      expect(result.topValues.length).toBe(1);
      expect(result.topValues[0].isNull).toBe(true);
      expect(result.topValues[0].count).toBe(5);
    });

    it('should handle empty values and no nulls', () => {
      const values: any[] = [];
      const totalCount = 0;
      const nullCount = 0;

      const result = EDAEngine.calculateCategoricalStats(values, totalCount, nullCount, 0);

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

    it('should count errors separately from nulls', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const data = [
        { col: 'a' },
        { col: 'b' },
        { col: null },
        { col: errorObj },
        { col: 'a' },
        { col: errorObj },
      ];

      const stats = EDAEngine.calculateStats(data, 'col', 'string');

      expect(stats).toBeDefined();
      expect(stats?.errorCount).toBe(2);
      expect(stats?.errorPercentage).toBe('33.3'); // 2/6 * 100
      expect(stats?.nullCount).toBe(1);
      expect(stats?.nullPercentage).toBe('16.7'); // 1/6 * 100
    });

    it('should include errors in categorical stats topValues', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const data = [{ col: 'a' }, { col: 'b' }, { col: errorObj }, { col: errorObj }];

      const stats = EDAEngine.calculateStats(data, 'col', 'string');

      expect(stats).toBeDefined();
      if (stats && 'topValues' in stats) {
        const errorItem = stats.topValues.find((item) => item.isError);
        expect(errorItem).toBeDefined();
        expect(errorItem?.value).toBe('Error');
        expect(errorItem?.count).toBe(2);
        expect(errorItem?.percentage).toBe('50.0'); // 2/4 * 100
        // Errors should be at the end
        expect(stats.topValues[stats.topValues.length - 1].isError).toBe(true);
      }
    });

    it('should place errors after nulls in categorical stats', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const data = [{ col: 'a' }, { col: null }, { col: errorObj }];

      const stats = EDAEngine.calculateStats(data, 'col', 'string');

      expect(stats).toBeDefined();
      if (stats && 'topValues' in stats) {
        const nullIndex = stats.topValues.findIndex((item) => item.isNull);
        const errorIndex = stats.topValues.findIndex((item) => item.isError);
        expect(nullIndex).toBeGreaterThan(-1);
        expect(errorIndex).toBeGreaterThan(-1);
        expect(errorIndex).toBeGreaterThan(nullIndex);
      }
    });

    it('should exclude errors from numeric calculations', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const data = [{ col: 10 }, { col: 20 }, { col: errorObj }, { col: 30 }, { col: errorObj }];

      const stats = EDAEngine.calculateStats(data, 'col', 'number');

      expect(stats).toBeDefined();
      expect(stats?.errorCount).toBe(2);
      if (stats && 'mean' in stats) {
        // Mean should be calculated only from valid numbers: (10 + 20 + 30) / 3 = 20
        expect(parseFloat(stats.mean)).toBe(20);
        expect(stats.raw?.mean).toBe(20);
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

  describe('calculateCategoricalOverlay', () => {
    it('should compute frequency stats for numeric data', () => {
      const data = [{ x: 1 }, { x: 2 }, { x: 1 }, { x: 3 }, { x: 1 }];
      const result = EDAEngine.calculateCategoricalOverlay(data, 'x');

      expect(result.topValues).toBeDefined();
      expect(result.topValues.length).toBeGreaterThan(0);

      const item1 = result.topValues.find((v) => v.value === '1');
      expect(item1).toBeDefined();
      expect(item1?.count).toBe(3);
    });

    it('should handle nulls and errors', () => {
      const errorObj = { type: 'error', message: 'bad' };
      const data = [{ x: 'a' }, { x: null }, { x: errorObj }, { x: 'a' }];
      const result = EDAEngine.calculateCategoricalOverlay(data, 'x');

      const nullItem = result.topValues.find((v) => v.isNull);
      expect(nullItem).toBeDefined();
      expect(nullItem?.count).toBe(1);

      const errorItem = result.topValues.find((v) => v.isError);
      expect(errorItem).toBeDefined();
      expect(errorItem?.count).toBe(1);
    });
  });

  describe('selectChartDefaults', () => {
    function makeNumericStats(
      overrides: Partial<{
        uniqueCount: number;
        mean: number;
        median: number;
        std: number;
        totalCount: number;
        nullCount: number;
        errorCount: number;
      }>
    ): EDAStats {
      const {
        uniqueCount = 100,
        mean = 50,
        median = 50,
        std = 10,
        totalCount = 1000,
        nullCount = 0,
        errorCount = 0,
      } = overrides;
      return {
        column: 'test',
        type: 'number',
        totalCount,
        nullCount,
        nullPercentage: '0',
        errorCount,
        errorPercentage: '0',
        uniqueCount,
        uniquePercentage: '10',
        min: '0',
        max: '100',
        mean: String(mean),
        median: String(median),
        p25: '25',
        p75: '75',
        std: String(std),
        meanMinus3Sigma: '0',
        meanPlus3Sigma: '100',
        raw: {
          min: 0,
          max: 100,
          mean,
          median,
          p25: 25,
          p75: 75,
          std,
          meanMinus3Sigma: mean - 3 * std,
          meanPlus3Sigma: mean + 3 * std,
        },
      };
    }

    function makeDateStats(
      overrides: Partial<{ uniqueCount: number; totalCount: number; nullCount: number }>
    ): EDAStats {
      const { uniqueCount = 100, totalCount = 1000, nullCount = 0 } = overrides;
      return {
        column: 'test',
        type: 'date',
        totalCount,
        nullCount,
        nullPercentage: '0',
        errorCount: 0,
        errorPercentage: '0',
        uniqueCount,
        uniquePercentage: String((uniqueCount / totalCount) * 100),
        topValues: [],
      };
    }

    function makeCategoricalStats(): EDAStats {
      return {
        column: 'test',
        type: 'string',
        totalCount: 100,
        nullCount: 0,
        nullPercentage: '0',
        errorCount: 0,
        errorPercentage: '0',
        uniqueCount: 20,
        uniquePercentage: '20',
        topValues: [],
      };
    }

    it('should default numeric to boxplot', () => {
      const defaults = selectChartDefaults(makeNumericStats({}));
      expect(defaults.numericTreatment).toBe('numeric');
      expect(defaults.chartView).toBe('boxplot');
    });

    it('should treat numeric with few unique values as categorical', () => {
      const defaults = selectChartDefaults(makeNumericStats({ uniqueCount: 5 }));
      expect(defaults.numericTreatment).toBe('categorical');
    });

    it('should default to histogram for skewed numeric', () => {
      // mean=80, median=20, std=15 → |80-20|=60 > 15 → skewed
      const defaults = selectChartDefaults(makeNumericStats({ mean: 80, median: 20, std: 15 }));
      expect(defaults.numericTreatment).toBe('numeric');
      expect(defaults.chartView).toBe('histogram');
    });

    it('should not detect skew when symmetric', () => {
      // mean=50, median=50, std=10 → |0| < 10 → not skewed
      const defaults = selectChartDefaults(makeNumericStats({ mean: 50, median: 50, std: 10 }));
      expect(defaults.chartView).toBe('boxplot');
    });

    it('should default date to temporal', () => {
      const defaults = selectChartDefaults(makeDateStats({ uniqueCount: 500 }));
      expect(defaults.dateTreatment).toBe('temporal');
    });

    it('should treat sparse dates as categorical', () => {
      const defaults = selectChartDefaults(makeDateStats({ uniqueCount: 8, totalCount: 1000 }));
      expect(defaults.dateTreatment).toBe('categorical');
    });

    it('should treat low-ratio dates as categorical', () => {
      // 50 unique out of 1000 → 5% < 10% threshold
      const defaults = selectChartDefaults(makeDateStats({ uniqueCount: 50, totalCount: 1000 }));
      expect(defaults.dateTreatment).toBe('categorical');
    });

    it('should return standard defaults for string columns', () => {
      const defaults = selectChartDefaults(makeCategoricalStats());
      expect(defaults.numericTreatment).toBe('numeric');
      expect(defaults.chartView).toBe('boxplot');
      expect(defaults.dateTreatment).toBe('temporal');
    });
  });

  describe('scanColumnQuality', () => {
    it('should return empty for null/empty data', () => {
      expect(scanColumnQuality(null, ['a'])).toEqual({});
      expect(scanColumnQuality([], ['a'])).toEqual({});
      expect(scanColumnQuality([{ a: 1 }], [])).toEqual({});
    });

    it('should detect null and undefined values', () => {
      const data = [{ a: 1 }, { a: null }, { a: undefined }, { a: '' }, { a: 2 }];
      const result = scanColumnQuality(data, ['a']);
      expect(result.a).toBeDefined();
      expect(result.a.nullPct).toBe(60); // 3 out of 5
      expect(result.a.errorPct).toBe(0);
    });

    it('should detect conversion errors', () => {
      const err = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const data = [{ a: 1 }, { a: err }, { a: 2 }, { a: err }];
      const result = scanColumnQuality(data, ['a']);
      expect(result.a.errorPct).toBe(50);
      expect(result.a.nullPct).toBe(0);
    });

    it('should count errors and nulls separately', () => {
      const err = { type: 'error', message: 'bad' };
      const data = [{ a: err }, { a: null }, { a: 1 }, { a: '' }];
      const result = scanColumnQuality(data, ['a']);
      expect(result.a.errorPct).toBe(25);
      expect(result.a.nullPct).toBe(50);
    });

    it('should omit clean columns from result', () => {
      const data = [
        { a: 1, b: null },
        { a: 2, b: 3 },
      ];
      const result = scanColumnQuality(data, ['a', 'b']);
      expect(result.a).toBeUndefined();
      expect(result.b).toBeDefined();
      expect(result.b.nullPct).toBe(50);
    });

    it('should scan multiple columns independently', () => {
      const err = { type: 'error', message: 'bad' };
      const data = [
        { x: 1, y: null },
        { x: err, y: 2 },
        { x: 3, y: null },
      ];
      const result = scanColumnQuality(data, ['x', 'y']);
      expect(result.x.errorPct).toBeCloseTo(33.33, 1);
      expect(result.y.nullPct).toBeCloseTo(66.67, 1);
    });
  });
});
