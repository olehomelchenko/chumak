/**
 * DuckDB-backed EDA calculations.
 *
 * Computes numeric stats (percentiles, mean, std) and categorical stats
 * (top-N frequencies) via SQL in a Web Worker. Falls back to the JS EDAEngine
 * if DuckDB is unavailable.
 */

import type { NumericStats, CategoricalStat } from '../../core/eda-engine';
import { EDAEngine } from '../../core/eda-engine';
import { DuckDBService } from './DuckDBService';

/**
 * Compute numeric statistics via DuckDB SQL.
 * Expects clean numeric values (no nulls, no errors, no NaN).
 */
async function calculateNumericStatsDuckDB(
  values: number[]
): Promise<Partial<NumericStats> | null> {
  if (values.length === 0) return {};

  const data = values.map((v) => ({ v }));

  const sql = `
    SELECT
      MIN(v) AS min,
      MAX(v) AS max,
      AVG(v) AS mean,
      MEDIAN(v) AS median,
      QUANTILE_CONT(v, 0.25) AS p25,
      QUANTILE_CONT(v, 0.75) AS p75,
      STDDEV_POP(v) AS std
    FROM input
  `;

  const result = await DuckDBService.execute(data, sql);
  if (!result || result.data.length === 0) return null;

  const row = result.data[0];
  const mean = Number(row.mean);
  const std = Number(row.std);
  const min = Number(row.min);
  const max = Number(row.max);
  const median = Number(row.median);
  const p25 = Number(row.p25);
  const p75 = Number(row.p75);
  const meanMinus3Sigma = mean - 3 * std;
  const meanPlus3Sigma = mean + 3 * std;

  return {
    min: EDAEngine.formatNumber(min),
    max: EDAEngine.formatNumber(max),
    mean: EDAEngine.formatNumber(mean),
    median: EDAEngine.formatNumber(median),
    p25: EDAEngine.formatNumber(p25),
    p75: EDAEngine.formatNumber(p75),
    std: EDAEngine.formatNumber(std),
    meanMinus3Sigma: EDAEngine.formatNumber(meanMinus3Sigma),
    meanPlus3Sigma: EDAEngine.formatNumber(meanPlus3Sigma),
    raw: { min, max, mean, median, p25, p75, std, meanMinus3Sigma, meanPlus3Sigma },
  };
}

/**
 * Compute categorical frequency stats via DuckDB SQL.
 * Expects clean non-null values (nulls/errors counted separately in JS).
 */
async function calculateCategoricalStatsDuckDB(
  values: any[],
  totalCount: number,
  nullCount: number,
  errorCount: number
): Promise<{ topValues: CategoricalStat[] } | null> {
  if (values.length === 0 && nullCount === 0) return { topValues: [] };

  const data = values.map((v) => ({ v: String(v) }));

  // Get top 5 + count of "other"
  const sql = `
    WITH freq AS (
      SELECT v, COUNT(*) AS cnt
      FROM input
      GROUP BY v
      ORDER BY cnt DESC
    ),
    ranked AS (
      SELECT v, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC, v) AS rn,
             COUNT(*) OVER () AS total_categories
      FROM freq
    )
    SELECT v, cnt, rn, total_categories FROM ranked WHERE rn <= 5
    UNION ALL
    SELECT '__OTHER__' AS v, SUM(cnt) AS cnt, 6 AS rn,
           (SELECT total_categories FROM ranked LIMIT 1)
    FROM ranked WHERE rn > 5
    ORDER BY rn
  `;

  const result = await DuckDBService.execute(data, sql);
  if (!result) return null;

  const topValues: CategoricalStat[] = [];
  let otherCategories = 0;

  for (const row of result.data) {
    const count = Number(row.cnt);
    const totalCategories = Number(row.total_categories);

    if (row.v === '__OTHER__') {
      if (count > 0) {
        otherCategories = totalCategories - 5;
        topValues.push({
          value: `Other (${otherCategories})`,
          count,
          percentage: ((count / totalCount) * 100).toFixed(1),
          rawPercentage: (count / totalCount) * 100,
          isOther: true,
        });
      }
    } else {
      topValues.push({
        value: String(row.v),
        count,
        percentage: ((count / totalCount) * 100).toFixed(1),
        rawPercentage: (count / totalCount) * 100,
      });
    }
  }

  if (nullCount > 0) {
    topValues.push({
      value: '(null)',
      count: nullCount,
      percentage: ((nullCount / totalCount) * 100).toFixed(1),
      rawPercentage: (nullCount / totalCount) * 100,
      isNull: true,
    });
  }

  if (errorCount > 0) {
    topValues.push({
      value: 'Error',
      count: errorCount,
      percentage: ((errorCount / totalCount) * 100).toFixed(1),
      rawPercentage: (errorCount / totalCount) * 100,
      isError: true,
    });
  }

  return { topValues };
}

export const DuckDBEdaEngine = {
  calculateNumericStats: calculateNumericStatsDuckDB,
  calculateCategoricalStats: calculateCategoricalStatsDuckDB,
};
