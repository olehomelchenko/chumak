/**
 * Syto EDA Engine
 *
 * Provides statistical analysis and data profiling for columns.
 */

import { isConversionError } from './type-converter';

export interface CategoricalStat {
  value: string;
  count: number;
  percentage: string;
  rawPercentage: number;
  isOther?: boolean;
  isNull?: boolean;
  isError?: boolean;
}

export interface NumericStats {
  min: string;
  max: string;
  mean: string;
  median: string;
  p25: string;
  p75: string;
  std: string;
  meanMinus3Sigma: string;
  meanPlus3Sigma: string;
  raw: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p25: number;
    p75: number;
    std: number;
    meanMinus3Sigma: number;
    meanPlus3Sigma: number;
  };
}

export interface BaseStats {
  column: string;
  type: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: string;
  errorCount: number;
  errorPercentage: string;
  uniqueCount: number;
  uniquePercentage: string;
}

export type EDAStats = BaseStats & (NumericStats | { topValues: CategoricalStat[] });

export interface ChartDefaults {
  numericTreatment: 'numeric' | 'categorical';
  chartView: 'boxplot' | 'histogram';
  dateTreatment: 'temporal' | 'categorical';
}

/**
 * Select smart default chart view/treatment based on column type and EDA stats.
 *
 * Rules (from Voyager-inspired recommendation):
 * - Integer with few unique values (< 10): treat as categorical (bar chart, not histogram)
 * - Skewed numeric (|mean − median| > std): default to histogram (shows shape)
 * - Sparse dates (few distinct values relative to row count): treat as categorical
 * - Otherwise: standard defaults (boxplot for numeric, temporal for dates)
 */
export function selectChartDefaults(stats: EDAStats): ChartDefaults {
  const isNumeric = ['number', 'integer', 'float'].includes(stats.type);
  const isDate = ['date', 'datetime'].includes(stats.type);

  let numericTreatment: 'numeric' | 'categorical' = 'numeric';
  let chartView: 'boxplot' | 'histogram' = 'boxplot';
  let dateTreatment: 'temporal' | 'categorical' = 'temporal';

  if (isNumeric && 'raw' in stats && stats.raw) {
    // Few unique values → looks categorical (e.g. rating 1-5, status codes)
    if (stats.uniqueCount < 10) {
      numericTreatment = 'categorical';
    } else {
      // Skewed distribution → histogram shows the shape better than boxplot
      const { mean, median, std } = stats.raw;
      if (std > 0 && Math.abs(mean - median) > std) {
        chartView = 'histogram';
      }
    }
  }

  if (isDate) {
    // Sparse dates (few distinct values or low unique ratio) → categorical is more informative
    const validCount = stats.totalCount - stats.nullCount - stats.errorCount;
    if (validCount > 0 && (stats.uniqueCount < 15 || stats.uniqueCount / validCount < 0.1)) {
      dateTreatment = 'categorical';
    }
  }

  return { numericTreatment, chartView, dateTreatment };
}

export interface ColumnQuality {
  nullPct: number;
  errorPct: number;
}

/**
 * Single-pass scan of all columns for null/error percentages.
 * Lightweight — no sorting, no percentiles, just counts.
 */
export function scanColumnQuality(
  data: any[] | null,
  columns: string[]
): Record<string, ColumnQuality> {
  if (!data || data.length === 0 || columns.length === 0) return {};

  const totalCount = data.length;
  const nullCounts: Record<string, number> = {};
  const errorCounts: Record<string, number> = {};

  for (const col of columns) {
    nullCounts[col] = 0;
    errorCounts[col] = 0;
  }

  for (const row of data) {
    for (const col of columns) {
      const v = row[col];
      if (isConversionError(v)) {
        errorCounts[col]++;
      } else if (v === null || v === undefined || v === '') {
        nullCounts[col]++;
      }
    }
  }

  const result: Record<string, ColumnQuality> = {};
  for (const col of columns) {
    const nullPct = (nullCounts[col] / totalCount) * 100;
    const errorPct = (errorCounts[col] / totalCount) * 100;
    if (nullPct > 0 || errorPct > 0) {
      result[col] = { nullPct, errorPct };
    }
  }

  return result;
}

export function extractColumnValues(data: any[], column: string) {
  const nonNullValues: any[] = [];
  let errorCount = 0;
  let nullCount = 0;

  for (const row of data) {
    const v = row[column];
    if (isConversionError(v)) {
      errorCount++;
    } else if (v === null || v === undefined || v === '') {
      nullCount++;
    } else {
      nonNullValues.push(v);
    }
  }

  return { totalCount: data.length, errorCount, nullCount, nonNullValues };
}

export function createBaseStats(
  column: string,
  type: string,
  totalCount: number,
  nullCount: number,
  errorCount: number,
  uniqueCount: number
): BaseStats {
  return {
    column,
    type,
    totalCount,
    nullCount,
    nullPercentage: ((nullCount / totalCount) * 100).toFixed(1),
    errorCount,
    errorPercentage: ((errorCount / totalCount) * 100).toFixed(1),
    uniqueCount,
    uniquePercentage: ((uniqueCount / totalCount) * 100).toFixed(1),
  };
}

export const EDAEngine = {
  /**
   * Calculate summary statistics for a column
   */
  calculateStats(data: any[], column: string, type: string): EDAStats | null {
    if (!data || data.length === 0) return null;

    const { totalCount, errorCount, nullCount, nonNullValues } = extractColumnValues(data, column);
    const uniqueValues = new Set(nonNullValues);

    // Normalize numeric types: 'float' and 'integer' -> 'number' for EDA stats
    const normalizedType = type === 'float' || type === 'integer' ? 'number' : type;

    const baseStats = createBaseStats(
      column,
      normalizedType,
      totalCount,
      nullCount,
      errorCount,
      uniqueValues.size
    );

    if (type === 'number' || type === 'integer' || type === 'float') {
      return { ...baseStats, ...this.calculateNumericStats(nonNullValues) } as EDAStats;
    } else {
      return {
        ...baseStats,
        ...this.calculateCategoricalStats(nonNullValues, totalCount, nullCount, errorCount),
      } as EDAStats;
    }
  },

  /**
   * Calculate numeric statistics
   */
  calculateNumericStats(values: any[]): Partial<NumericStats> {
    if (values.length === 0) return {};

    // Filter out error objects and convert to numbers, filtering out NaN
    const numericValues = values
      .filter((v) => {
        // Skip error objects
        if (isConversionError(v)) return false;
        // Convert to number and check if valid
        const num = Number(v);
        return !isNaN(num) && isFinite(num);
      })
      .map((v) => Number(v));

    if (numericValues.length === 0) return {};

    const sorted = [...numericValues].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    const median = this.getPercentile(sorted, 0.5);
    const p25 = this.getPercentile(sorted, 0.25);
    const p75 = this.getPercentile(sorted, 0.75);

    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const std = Math.sqrt(variance);

    // Calculate 3-sigma bounds
    const meanMinus3Sigma = mean - 3 * std;
    const meanPlus3Sigma = mean + 3 * std;

    return {
      min: this.formatNumber(min),
      max: this.formatNumber(max),
      mean: this.formatNumber(mean),
      median: this.formatNumber(median),
      p25: this.formatNumber(p25),
      p75: this.formatNumber(p75),
      std: this.formatNumber(std),
      meanMinus3Sigma: this.formatNumber(meanMinus3Sigma),
      meanPlus3Sigma: this.formatNumber(meanPlus3Sigma),
      raw: { min, max, mean, median, p25, p75, std, meanMinus3Sigma, meanPlus3Sigma },
    };
  },

  /**
   * Calculate categorical statistics (frequencies)
   */
  calculateCategoricalStats(
    values: any[],
    totalCount: number,
    nullCount: number,
    errorCount: number
  ): { topValues: CategoricalStat[] } {
    if (values.length === 0 && nullCount === 0) return { topValues: [] };

    const frequencies: Record<string, number> = {};
    values.forEach((v) => {
      const key = String(v);
      frequencies[key] = (frequencies[key] || 0) + 1;
    });

    const sortedFreqs: CategoricalStat[] = Object.entries(frequencies)
      .map(([value, count]) => ({
        value,
        count,
        percentage: ((count / totalCount) * 100).toFixed(1),
        rawPercentage: (count / totalCount) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const top5 = sortedFreqs.slice(0, 5);
    const remaining = sortedFreqs.slice(5);

    if (remaining.length > 0) {
      const otherCount = remaining.reduce((sum, item) => sum + item.count, 0);
      const otherPercentage = ((otherCount / totalCount) * 100).toFixed(1);
      top5.push({
        value: `Other (${remaining.length})`,
        count: otherCount,
        percentage: otherPercentage,
        rawPercentage: (otherCount / totalCount) * 100,
        isOther: true,
      });
    }

    // Add nulls as a separate category before errors
    if (nullCount > 0) {
      top5.push({
        value: '(null)',
        count: nullCount,
        percentage: ((nullCount / totalCount) * 100).toFixed(1),
        rawPercentage: (nullCount / totalCount) * 100,
        isNull: true,
      });
    }

    // Add errors as a separate category at the very end (dark error color, last position)
    if (errorCount > 0) {
      top5.push({
        value: 'Error',
        count: errorCount,
        percentage: ((errorCount / totalCount) * 100).toFixed(1),
        rawPercentage: (errorCount / totalCount) * 100,
        isError: true,
      });
    }

    return {
      topValues: top5,
    };
  },

  /**
   * Calculate categorical overlay for any column type (used when treating numeric as categorical)
   */
  calculateCategoricalOverlay(data: any[], column: string): { topValues: CategoricalStat[] } {
    const { nonNullValues, totalCount, nullCount, errorCount } = extractColumnValues(data, column);
    return this.calculateCategoricalStats(nonNullValues, totalCount, nullCount, errorCount);
  },

  /**
   * Get percentile from sorted array
   */
  getPercentile(sorted: number[], p: number): number {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  },

  /**
   * Format number for display
   */
  formatNumber(val: number | null | undefined): string {
    if (val === null || val === undefined) return '-';
    // Handle NaN and Infinity uniformly
    if (isNaN(val) || !isFinite(val)) {
      return 'NaN';
    }
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  },
};
