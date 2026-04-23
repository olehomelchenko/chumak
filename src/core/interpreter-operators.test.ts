import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { interpretAST } from './ast-interpreter';
import { isConversionError } from './type-converter';

describe('AST Interpreter - Operators', () => {
  const row = {
    sales: 1500,
    region: 'North',
    active: true,
    revenue: 5000,
    cost: 3000,
    nullVal: null,
    emptyStr: '',
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

  // Word-form boolean operators (beginner-friendly syntax)
  it('should evaluate word-form "and" operator', () => {
    expect(interpretAST(parseExpression('active and sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('active and sales < 1000'), row)).toBe(false);
  });

  it('should evaluate word-form "or" operator', () => {
    expect(interpretAST(parseExpression('active or sales < 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales < 1000 or revenue < 1000'), row)).toBe(false);
  });

  it('should evaluate word-form "not" operator', () => {
    expect(interpretAST(parseExpression('not active'), row)).toBe(false);
    expect(interpretAST(parseExpression('not (sales < 1000)'), row)).toBe(true);
  });

  it('should short-circuit "and" operator', () => {
    // When left is false, right should not be evaluated
    expect(interpretAST(parseExpression('sales < 1000 and region'), row)).toBe(false);
  });

  it('should short-circuit "or" operator', () => {
    // When left is true, right should not be evaluated
    expect(interpretAST(parseExpression('active or nullVal'), row)).toBe(true);
  });

  it('should handle complex word-form expressions', () => {
    expect(
      interpretAST(parseExpression('(sales > 1000 and active) or region == "South"'), row)
    ).toBe(true);
    expect(interpretAST(parseExpression('not active or sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('not (sales < 1000) and region == "North"'), row)).toBe(
      true
    );
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

describe('AST Interpreter - Error Propagation', () => {
  const errorObj = {
    type: 'error' as const,
    message: 'Cannot convert "abc" to integer',
    toString: () => 'Error',
    valueOf: () => 'Error',
  };
  const errorObj2 = {
    type: 'error' as const,
    message: 'Cannot convert "xyz" to integer',
    toString: () => 'Error',
    valueOf: () => 'Error',
  };
  const row = {
    sales: 1500,
    errCol: errorObj,
    errCol2: errorObj2,
    nullVal: null,
    active: true,
  };

  it('should propagate error through arithmetic (+)', () => {
    const result = interpretAST(parseExpression('errCol + 100'), row);
    expect(isConversionError(result)).toBe(true);
    expect(result.message).toBe('Cannot convert "abc" to integer');
  });

  it('should propagate error through arithmetic (-)', () => {
    expect(isConversionError(interpretAST(parseExpression('errCol - 50'), row))).toBe(true);
  });

  it('should propagate error through arithmetic (*)', () => {
    expect(isConversionError(interpretAST(parseExpression('errCol * 2'), row))).toBe(true);
  });

  it('should propagate error through arithmetic (/)', () => {
    expect(isConversionError(interpretAST(parseExpression('errCol / 10'), row))).toBe(true);
  });

  it('should propagate error through comparisons', () => {
    expect(isConversionError(interpretAST(parseExpression('errCol > 10'), row))).toBe(true);
    expect(isConversionError(interpretAST(parseExpression('errCol == 10'), row))).toBe(true);
    expect(isConversionError(interpretAST(parseExpression('errCol != 10'), row))).toBe(true);
  });

  it('should propagate right-side error', () => {
    const result = interpretAST(parseExpression('100 + errCol'), row);
    expect(isConversionError(result)).toBe(true);
  });

  it('left error takes precedence over right error', () => {
    const result = interpretAST(parseExpression('errCol + errCol2'), row);
    expect(isConversionError(result)).toBe(true);
    expect(result.message).toBe('Cannot convert "abc" to integer');
  });

  it('?? should treat error as missing', () => {
    expect(interpretAST(parseExpression('errCol ?? 0'), row)).toBe(0);
  });

  it('?? should pass through valid values', () => {
    expect(interpretAST(parseExpression('sales ?? 0'), row)).toBe(1500);
  });

  it('?? should chain: null then error then fallback', () => {
    expect(interpretAST(parseExpression('nullVal ?? errCol ?? 42'), row)).toBe(42);
  });

  it('should propagate error through && (left error)', () => {
    const result = interpretAST(parseExpression('errCol && true'), row);
    expect(isConversionError(result)).toBe(true);
  });

  it('should propagate error through || (left error)', () => {
    const result = interpretAST(parseExpression('errCol || true'), row);
    expect(isConversionError(result)).toBe(true);
  });

  it('should propagate error through word-form and/or', () => {
    expect(isConversionError(interpretAST(parseExpression('errCol and true'), row))).toBe(true);
    expect(isConversionError(interpretAST(parseExpression('errCol or false'), row))).toBe(true);
  });

  it('should propagate error through unary -', () => {
    expect(isConversionError(interpretAST(parseExpression('-errCol'), row))).toBe(true);
  });

  it('should propagate error through unary !', () => {
    expect(isConversionError(interpretAST(parseExpression('!errCol'), row))).toBe(true);
  });

  it('should propagate error through unary not', () => {
    expect(isConversionError(interpretAST(parseExpression('not errCol'), row))).toBe(true);
  });

  it('should propagate error through ternary test', () => {
    const result = interpretAST(parseExpression('errCol ? "yes" : "no"'), row);
    expect(isConversionError(result)).toBe(true);
  });

  it('should not propagate error from ternary branches when test is valid', () => {
    const result = interpretAST(parseExpression('active ? errCol : "no"'), row);
    expect(isConversionError(result)).toBe(true);
    expect(result.message).toBe('Cannot convert "abc" to integer');
  });

  it('should not affect normal operations', () => {
    expect(interpretAST(parseExpression('sales + 100'), row)).toBe(1600);
    expect(interpretAST(parseExpression('active && sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('nullVal ?? 0'), row)).toBe(0);
  });
});

// These tests CHARACTERISE the current interpreter behaviour on numeric edges.
// They pass native JS semantics through unchanged. If any of these surprise
// you, the contract is worth a decision — don't just change the test.
describe('AST Interpreter - Numeric Edge Cases', () => {
  const row = {
    a: 1,
    zero: 0,
    negZero: -0,
    big: Number.MAX_SAFE_INTEGER,
    inf: Infinity,
    ninf: -Infinity,
    nan: NaN,
  };

  describe('division by zero', () => {
    it('positive / 0 returns Infinity', () => {
      expect(interpretAST(parseExpression('a / zero'), row)).toBe(Infinity);
      expect(interpretAST(parseExpression('1 / 0'), row)).toBe(Infinity);
    });

    it('negative / 0 returns -Infinity', () => {
      expect(interpretAST(parseExpression('-a / zero'), row)).toBe(-Infinity);
    });

    it('0 / 0 returns NaN', () => {
      expect(interpretAST(parseExpression('zero / zero'), row)).toBe(NaN);
    });

    it('modulo by zero returns NaN', () => {
      expect(interpretAST(parseExpression('a % zero'), row)).toBe(NaN);
    });
  });

  describe('NaN propagation and comparison', () => {
    it('NaN arithmetic yields NaN', () => {
      expect(interpretAST(parseExpression('nan + 1'), row)).toBe(NaN);
      expect(interpretAST(parseExpression('nan * 0'), row)).toBe(NaN);
    });

    it('NaN == NaN is false (native JS)', () => {
      expect(interpretAST(parseExpression('nan == nan'), row)).toBe(false);
      expect(interpretAST(parseExpression('nan === nan'), row)).toBe(false);
    });

    it('NaN != NaN is true', () => {
      expect(interpretAST(parseExpression('nan != nan'), row)).toBe(true);
    });

    it('NaN comparisons are always false', () => {
      expect(interpretAST(parseExpression('nan > 0'), row)).toBe(false);
      expect(interpretAST(parseExpression('nan < 0'), row)).toBe(false);
      expect(interpretAST(parseExpression('nan >= nan'), row)).toBe(false);
    });
  });

  describe('Infinity arithmetic', () => {
    it('Infinity + finite = Infinity', () => {
      expect(interpretAST(parseExpression('inf + 1'), row)).toBe(Infinity);
    });

    it('Infinity - Infinity = NaN', () => {
      expect(interpretAST(parseExpression('inf - inf'), row)).toBe(NaN);
    });

    it('Infinity * 0 = NaN', () => {
      expect(interpretAST(parseExpression('inf * zero'), row)).toBe(NaN);
    });

    it('-Infinity < Infinity', () => {
      expect(interpretAST(parseExpression('ninf < inf'), row)).toBe(true);
    });

    it('Infinity == Infinity', () => {
      expect(interpretAST(parseExpression('inf == inf'), row)).toBe(true);
    });
  });

  describe('signed zero', () => {
    it('-0 == 0 (loose and strict)', () => {
      expect(interpretAST(parseExpression('negZero == zero'), row)).toBe(true);
      expect(interpretAST(parseExpression('negZero === zero'), row)).toBe(true);
    });

    it('-0 is not less than 0', () => {
      expect(interpretAST(parseExpression('negZero < zero'), row)).toBe(false);
    });
  });

  describe('large numbers', () => {
    it('MAX_SAFE_INTEGER + 1 loses precision (native JS)', () => {
      // 2^53 and 2^53+1 are indistinguishable as JS numbers
      const result = interpretAST(parseExpression('big + 1'), row);
      expect(result).toBe(Number.MAX_SAFE_INTEGER + 1);
      expect(result === Number.MAX_SAFE_INTEGER + 2).toBe(true); // surprising but correct
    });
  });
});
