import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import {
  extractExpressionTokens,
  extractTokensFromText,
  computeTokens,
  EMPTY_TOKENS,
} from './expression-token-extractor';

const columns = ['revenue', 'cost', 'price', 'name', 'quantity', 'order_date', 'First Name'];

function extract(expr: string, knownColumns = columns) {
  const ast = parseExpression(expr);
  return extractExpressionTokens(ast, knownColumns);
}

describe('extractExpressionTokens', () => {
  it('extracts columns from arithmetic', () => {
    const result = extract('revenue - cost');
    expect(result.columns).toEqual(['revenue', 'cost']);
    expect(result.functions).toEqual([]);
  });

  it('extracts functions and columns from nested calls', () => {
    const result = extract('round(revenue / len(name), 2)');
    expect(result.functions).toEqual(['round', 'len']);
    expect(result.columns).toEqual(['revenue', 'name']);
  });

  it('deduplicates repeated column references', () => {
    const result = extract('price * price');
    expect(result.columns).toEqual(['price']);
  });

  it('deduplicates repeated function calls', () => {
    const result = extract('round(revenue, 2) + round(cost, 2)');
    expect(result.functions).toEqual(['round']);
    expect(result.columns).toEqual(['revenue', 'cost']);
  });

  it('handles ternary expressions', () => {
    const result = extract('revenue > 0 ? revenue : cost');
    expect(result.columns).toEqual(['revenue', 'cost']);
  });

  it('handles bracket column names', () => {
    const result = extract('[First Name]', [...columns]);
    expect(result.columns).toEqual(['First Name']);
  });

  it('skips unknown identifiers not in knownColumns', () => {
    const result = extract('unknownCol + revenue');
    expect(result.columns).toEqual(['revenue']);
  });

  it('returns empty arrays for literals only', () => {
    const result = extract('42');
    expect(result.functions).toEqual([]);
    expect(result.columns).toEqual([]);
  });

  it('handles string literals without matching them as columns', () => {
    const result = extract('"revenue"');
    expect(result.columns).toEqual([]);
  });

  it('handles unary expressions', () => {
    const result = extract('!revenue');
    // 'not' unary operator — revenue identifier under argument
    expect(result.columns).toEqual(['revenue']);
  });

  it('handles logical operators', () => {
    const result = extract('revenue > 0 && cost < 100');
    expect(result.columns).toEqual(['revenue', 'cost']);
  });

  it('preserves first-appearance order for functions', () => {
    const result = extract('len(name) + round(revenue, 2)');
    expect(result.functions).toEqual(['len', 'round']);
  });

  it('handles complex nested expression', () => {
    const result = extract('round(abs(revenue - cost) / revenue * 100, 2)');
    expect(result.functions).toEqual(['round', 'abs']);
    expect(result.columns).toEqual(['revenue', 'cost']);
  });

  it('handles date function on column', () => {
    const result = extract('year(order_date) == 2024');
    expect(result.functions).toEqual(['year']);
    expect(result.columns).toEqual(['order_date']);
  });
});

describe('extractTokensFromText', () => {
  it('extracts function from incomplete call', () => {
    const result = extractTokensFromText('json_extract(', columns);
    expect(result.functions).toEqual(['json_extract']);
  });

  it('extracts function and column from partial expression', () => {
    const result = extractTokensFromText('round(revenue /', columns);
    expect(result.functions).toEqual(['round']);
    expect(result.columns).toEqual(['revenue']);
  });

  it('extracts column from bare identifier', () => {
    const result = extractTokensFromText('revenue +', columns);
    expect(result.columns).toEqual(['revenue']);
  });

  it('extracts bracketed column names', () => {
    const result = extractTokensFromText('[First Name] +', columns);
    expect(result.columns).toEqual(['First Name']);
  });

  it('skips unknown identifiers', () => {
    const result = extractTokensFromText('unknown_func(foo +', columns);
    expect(result.functions).toEqual([]);
    expect(result.columns).toEqual([]);
  });

  it('deduplicates repeated tokens', () => {
    const result = extractTokensFromText('round(revenue) + round(revenue)', columns);
    expect(result.functions).toEqual(['round']);
    expect(result.columns).toEqual(['revenue']);
  });

  it('extracts multiple functions from nested incomplete expression', () => {
    const result = extractTokensFromText('round(abs(revenue -', columns);
    expect(result.functions).toEqual(['round', 'abs']);
    expect(result.columns).toEqual(['revenue']);
  });

  it('returns empty for empty string', () => {
    const result = extractTokensFromText('', columns);
    expect(result.functions).toEqual([]);
    expect(result.columns).toEqual([]);
  });
});

describe('computeTokens', () => {
  it('returns EMPTY_TOKENS for empty/whitespace input', () => {
    expect(computeTokens('', columns)).toBe(EMPTY_TOKENS);
    expect(computeTokens('   ', columns)).toBe(EMPTY_TOKENS);
  });

  it('uses AST extraction for valid expressions', () => {
    const result = computeTokens('round(revenue, 2)', columns);
    expect(result.functions).toEqual(['round']);
    expect(result.columns).toEqual(['revenue']);
  });

  it('falls back to text extraction for invalid expressions', () => {
    const result = computeTokens('round(revenue /', columns);
    expect(result.functions).toEqual(['round']);
    expect(result.columns).toEqual(['revenue']);
  });
});
