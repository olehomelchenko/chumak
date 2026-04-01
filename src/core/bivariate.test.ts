import { describe, it, expect } from 'vitest';
import { suggestBivariatePairings, BivariateSuggestion } from './bivariate';
import type { ColumnSchema } from './schema-engine';

const columns: ColumnSchema[] = [
  { name: 'revenue', type: 'float' },
  { name: 'cost', type: 'float' },
  { name: 'region', type: 'string' },
  { name: 'category', type: 'string' },
  { name: 'order_date', type: 'date' },
  { name: 'active', type: 'boolean' },
  { name: 'metadata', type: 'json' },
];

describe('suggestBivariatePairings', () => {
  it('should suggest pairings for a numeric column', () => {
    const suggestions = suggestBivariatePairings('revenue', 'float', columns);

    // Categorical partners first (grouped-bar), then numeric (scatter), then temporal (line)
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(suggestions.length).toBeGreaterThan(0);

    const types = suggestions.map((s) => s.chartType);
    expect(types).toContain('grouped-bar'); // region or category
    expect(types).toContain('scatter'); // cost
    expect(types).toContain('line-temporal'); // order_date
  });

  it('should prioritize categorical partners for numeric columns', () => {
    const suggestions = suggestBivariatePairings('revenue', 'float', columns);

    // First suggestions should be categorical (grouped-bar)
    expect(suggestions[0].chartType).toBe('grouped-bar');
    expect(['region', 'category', 'active']).toContain(suggestions[0].partnerColumn);
  });

  it('should suggest pairings for a categorical column', () => {
    const suggestions = suggestBivariatePairings('region', 'string', columns);

    const types = suggestions.map((s) => s.chartType);
    expect(types).toContain('grouped-bar'); // numeric partners
    expect(types).toContain('heatmap'); // other string columns
  });

  it('should suggest pairings for a temporal column', () => {
    const suggestions = suggestBivariatePairings('order_date', 'date', columns);

    const types = suggestions.map((s) => s.chartType);
    expect(types).toContain('line-temporal'); // numeric partners
    expect(types).toContain('grouped-bar'); // categorical partners
  });

  it('should not include the selected column in suggestions', () => {
    const suggestions = suggestBivariatePairings('revenue', 'float', columns);
    const partnerNames = suggestions.map((s) => s.partnerColumn);
    expect(partnerNames).not.toContain('revenue');
  });

  it('should respect maxSuggestions limit', () => {
    const suggestions = suggestBivariatePairings('revenue', 'float', columns, 2);
    expect(suggestions.length).toBe(2);
  });

  it('should return empty for json type', () => {
    const suggestions = suggestBivariatePairings('metadata', 'json', columns);
    expect(suggestions).toEqual([]);
  });

  it('should return empty when no compatible partners exist', () => {
    const singleColumn: ColumnSchema[] = [{ name: 'x', type: 'float' }];
    const suggestions = suggestBivariatePairings('x', 'float', singleColumn);
    expect(suggestions).toEqual([]);
  });

  it('should handle boolean as categorical', () => {
    const suggestions = suggestBivariatePairings('revenue', 'float', columns);
    const partners = suggestions.map((s) => s.partnerColumn);
    expect(partners).toContain('active'); // boolean treated as categorical
  });

  it('should not suggest temporal × temporal', () => {
    const temporalColumns: ColumnSchema[] = [
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'datetime' },
      { name: 'name', type: 'string' },
    ];
    const suggestions = suggestBivariatePairings('start_date', 'date', temporalColumns);
    const partners = suggestions.map((s) => s.partnerColumn);
    expect(partners).not.toContain('end_date');
  });
});
