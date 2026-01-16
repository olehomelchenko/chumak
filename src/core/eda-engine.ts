/**
 * Chumak EDA Engine
 *
 * Provides statistical analysis and data profiling for columns.
 */

export interface CategoricalStat {
  value: string;
  count: number;
  percentage: string;
  rawPercentage: number;
  isOther?: boolean;
}

export interface NumericStats {
  min: string;
  max: string;
  mean: string;
  median: string;
  p25: string;
  p75: string;
  raw: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p25: number;
    p75: number;
  };
}

export interface BaseStats {
  column: string;
  type: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: string;
  uniqueCount: number;
  uniquePercentage: string;
}

export type EDAStats = BaseStats & (NumericStats | { topValues: CategoricalStat[] });

export const EDAEngine = {
  /**
   * Calculate summary statistics for a column
   */
  calculateStats(data: any[], column: string, type: string): EDAStats | null {
    if (!data || data.length === 0) return null;

    const values = data.map((row) => row[column]);
    const totalCount = values.length;
    const nullCount = values.filter((v) => v === null || v === undefined || v === '').length;
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues);

    // Normalize numeric types: 'float' and 'integer' -> 'number' for EDA stats
    const normalizedType = type === 'float' || type === 'integer' ? 'number' : type;

    const baseStats: BaseStats = {
      column,
      type: normalizedType,
      totalCount,
      nullCount,
      nullPercentage: ((nullCount / totalCount) * 100).toFixed(1),
      uniqueCount: uniqueValues.size,
      uniquePercentage: ((uniqueValues.size / totalCount) * 100).toFixed(1),
    };

    if (type === 'number' || type === 'integer' || type === 'float') {
      return { ...baseStats, ...this.calculateNumericStats(nonNullValues) } as EDAStats;
    } else {
      return { ...baseStats, ...this.calculateCategoricalStats(nonNullValues) } as EDAStats;
    }
  },

  /**
   * Calculate numeric statistics
   */
  calculateNumericStats(values: number[]): Partial<NumericStats> {
    if (values.length === 0) return {};

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    const median = this.getPercentile(sorted, 0.5);
    const p25 = this.getPercentile(sorted, 0.25);
    const p75 = this.getPercentile(sorted, 0.75);

    return {
      min: this.formatNumber(min),
      max: this.formatNumber(max),
      mean: this.formatNumber(mean),
      median: this.formatNumber(median),
      p25: this.formatNumber(p25),
      p75: this.formatNumber(p75),
      raw: { min, max, mean, median, p25, p75 },
    };
  },

  /**
   * Calculate categorical statistics (frequencies)
   */
  calculateCategoricalStats(values: any[]): { topValues: CategoricalStat[] } {
    if (values.length === 0) return { topValues: [] };

    const frequencies: Record<string, number> = {};
    values.forEach((v) => {
      const key = String(v);
      frequencies[key] = (frequencies[key] || 0) + 1;
    });

    const sortedFreqs: CategoricalStat[] = Object.entries(frequencies)
      .map(([value, count]) => ({
        value,
        count,
        percentage: ((count / values.length) * 100).toFixed(1),
        rawPercentage: (count / values.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const top5 = sortedFreqs.slice(0, 5);
    const remaining = sortedFreqs.slice(5);

    if (remaining.length > 0) {
      const otherCount = remaining.reduce((sum, item) => sum + item.count, 0);
      const otherPercentage = ((otherCount / values.length) * 100).toFixed(1);
      top5.push({
        value: `Other (${remaining.length})`,
        count: otherCount,
        percentage: otherPercentage,
        rawPercentage: (otherCount / values.length) * 100,
        isOther: true,
      });
    }

    return {
      topValues: top5,
    };
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
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  },
};
