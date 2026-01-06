import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { interpretAST } from './ast-interpreter';

describe('AST Interpreter', () => {
  const row = {
    sales: 1500,
    region: 'North',
    active: true,
    revenue: 5000,
    cost: 3000,
    nullVal: null,
    emptyStr: ''
  };

  it('should evaluate literals', () => {
    expect(interpretAST(parseExpression('100'), row)).toBe(100);
    expect(interpretAST(parseExpression('"hello"'), row)).toBe('hello');
    expect(interpretAST(parseExpression('true'), row)).toBe(true);
  });

  it('should evaluate identifiers', () => {
    expect(interpretAST(parseExpression('sales'), row)).toBe(1500);
    expect(interpretAST(parseExpression('region'), row)).toBe('North');
  });

  it('should evaluate binary expressions', () => {
    expect(interpretAST(parseExpression('sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales + 500'), row)).toBe(2000);
    expect(interpretAST(parseExpression('revenue - cost'), row)).toBe(2000);
    expect(interpretAST(parseExpression('region == "North"'), row)).toBe(true);
  });

  it('should evaluate logical expressions', () => {
    expect(interpretAST(parseExpression('active && sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('active || sales < 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('!active'), row)).toBe(false);
  });

  it('should handle nullish coalescing', () => {
    expect(interpretAST(parseExpression('nullVal ?? 0'), row)).toBe(0);
    expect(interpretAST(parseExpression('sales ?? 0'), row)).toBe(1500);
  });

  it('should handle ternary expressions', () => {
    expect(interpretAST(parseExpression('sales > 1000 ? "high" : "low"'), row)).toBe('high');
    expect(interpretAST(parseExpression('sales < 1000 ? "high" : "low"'), row)).toBe('low');
  });

  it('should evaluate whitelisted functions', () => {
    expect(interpretAST(parseExpression('regexp_match(region, "^N")'), row)).toBe(true);
    expect(interpretAST(parseExpression('regexp_match(region, "^S")'), row)).toBe(false);
    expect(interpretAST(parseExpression('regexp_extract(region, "(No)")'), row)).toBe('No');
  });

  it('should propagate nulls in arithmetic', () => {
    expect(interpretAST(parseExpression('nullVal + 100'), row)).toBe(null);
  });

  it('should allow null comparisons', () => {
    expect(interpretAST(parseExpression('nullVal == null'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales != null'), row)).toBe(true);
  });
});
