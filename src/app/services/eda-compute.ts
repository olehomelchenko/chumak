/**
 * EDA computation dispatcher — routes to DuckDB or JS engine based on settings.
 *
 * Null/error extraction always runs in JS (since ConversionError objects are
 * JS-only). Only the heavy computation (percentiles, frequencies) is offloaded
 * to DuckDB when enabled.
 */

import {
  EDAEngine,
  extractColumnValues,
  createBaseStats,
  type EDAStats,
} from '../../core/eda-engine';
import { DuckDBEdaEngine } from './DuckDBEdaEngine';
import { DuckDBService } from './DuckDBService';
import { AppStore } from '../stores/AppStore';

function isDuckDBEnabled(): boolean {
  return AppStore.uxSettings.value.experimental?.engine === 'duckdb' && DuckDBService.isAvailable();
}

export async function computeEdaStats(
  data: any[],
  column: string,
  type: string
): Promise<EDAStats | null> {
  if (!data || data.length === 0) return null;

  const { totalCount, errorCount, nullCount, nonNullValues } = extractColumnValues(data, column);
  const uniqueValues = new Set(nonNullValues);

  const normalizedType = type === 'float' || type === 'integer' ? 'number' : type;

  const baseStats = createBaseStats(
    column,
    normalizedType,
    totalCount,
    nullCount,
    errorCount,
    uniqueValues.size
  );

  const isNumeric = type === 'number' || type === 'integer' || type === 'float';

  if (isDuckDBEnabled()) {
    try {
      if (isNumeric) {
        const numericValues = nonNullValues
          .filter((v) => {
            const num = Number(v);
            return !isNaN(num) && isFinite(num);
          })
          .map((v) => Number(v));

        const stats = await DuckDBEdaEngine.calculateNumericStats(numericValues);
        if (stats) {
          if (import.meta.env.DEV) console.log('[DuckDB] EDA numeric stats computed via SQL');
          return { ...baseStats, ...stats } as EDAStats;
        }
      } else {
        const stats = await DuckDBEdaEngine.calculateCategoricalStats(
          nonNullValues,
          totalCount,
          nullCount,
          errorCount
        );
        if (stats) {
          if (import.meta.env.DEV) console.log('[DuckDB] EDA categorical stats computed via SQL');
          return { ...baseStats, ...stats } as EDAStats;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[DuckDB] EDA stats failed, falling back to Arquero:', error);
      }
    }
  }

  // Fallback: JS engine
  return EDAEngine.calculateStats(data, column, type);
}

export async function computeCategoricalOverlay(
  data: any[],
  column: string
): Promise<{ topValues: import('../../core/eda-engine').CategoricalStat[] }> {
  if (isDuckDBEnabled()) {
    try {
      const { nonNullValues, totalCount, nullCount, errorCount } = extractColumnValues(
        data,
        column
      );
      const result = await DuckDBEdaEngine.calculateCategoricalStats(
        nonNullValues,
        totalCount,
        nullCount,
        errorCount
      );
      if (result) {
        if (import.meta.env.DEV) console.log('[DuckDB] EDA categorical overlay computed via SQL');
        return result;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[DuckDB] EDA overlay failed, falling back to Arquero:', error);
      }
    }
  }

  return EDAEngine.calculateCategoricalOverlay(data, column);
}
