/**
 * Bivariate Chart Suggestions
 *
 * Given a selected column, suggests pairings with other columns
 * and the best chart type for each pairing.
 */

import type { ColumnType, ColumnSchema } from './schema-engine';

export type BivariateChartType = 'scatter' | 'grouped-bar' | 'line-temporal' | 'heatmap';

export interface BivariateSuggestion {
  partnerColumn: string;
  partnerType: ColumnType;
  chartType: BivariateChartType;
}

type TypeCategory = 'numeric' | 'categorical' | 'temporal';

function categorize(type: ColumnType): TypeCategory | null {
  if (type === 'integer' || type === 'float') return 'numeric';
  if (type === 'string' || type === 'boolean') return 'categorical';
  if (type === 'date' || type === 'datetime') return 'temporal';
  return null; // json or unknown
}

/** Chart type lookup: [selected category][partner category] */
const CHART_TYPE_MAP: Record<TypeCategory, Partial<Record<TypeCategory, BivariateChartType>>> = {
  numeric: {
    numeric: 'scatter',
    categorical: 'grouped-bar',
    temporal: 'line-temporal',
  },
  categorical: {
    numeric: 'grouped-bar',
    categorical: 'heatmap',
    temporal: 'grouped-bar',
  },
  temporal: {
    numeric: 'line-temporal',
    categorical: 'grouped-bar',
    temporal: undefined, // temporal × temporal not useful
  },
};

/** Priority order for partner types (most informative pairings first) */
const PARTNER_PRIORITY: Record<TypeCategory, TypeCategory[]> = {
  numeric: ['categorical', 'numeric', 'temporal'],
  categorical: ['numeric', 'categorical', 'temporal'],
  temporal: ['numeric', 'categorical'],
};

/**
 * Suggest bivariate chart pairings for a selected column.
 *
 * Returns up to `maxSuggestions` suggestions, prioritized by partner type
 * relevance and column position (earlier columns first as a stable tiebreaker).
 */
export function suggestBivariatePairings(
  selectedColumn: string,
  selectedType: ColumnType,
  allColumns: ColumnSchema[],
  maxSuggestions = 5
): BivariateSuggestion[] {
  const selectedCategory = categorize(selectedType);
  if (!selectedCategory) return [];

  const priorities = PARTNER_PRIORITY[selectedCategory];
  const suggestions: BivariateSuggestion[] = [];

  for (const targetCategory of priorities) {
    for (const col of allColumns) {
      if (col.name === selectedColumn) continue;
      const partnerCategory = categorize(col.type);
      if (partnerCategory !== targetCategory) continue;

      const chartType = CHART_TYPE_MAP[selectedCategory][partnerCategory];
      if (!chartType) continue;

      suggestions.push({
        partnerColumn: col.name,
        partnerType: col.type,
        chartType,
      });

      if (suggestions.length >= maxSuggestions) return suggestions;
    }
  }

  return suggestions;
}
