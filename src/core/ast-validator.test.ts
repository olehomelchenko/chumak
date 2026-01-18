import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { validateAST } from './ast-validator';

describe('AST Validator', () => {
  const testSchema = ['sales', 'revenue', 'cost', 'region', 'status', 'active'];

  describe('validateAST()', () => {
    it('should validate simple identifier', () => {
      const ast = parseExpression('sales');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate numeric literal', () => {
      const ast = parseExpression('1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate string literal', () => {
      const ast = parseExpression('"North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate simple comparison', () => {
      const ast = parseExpression('sales > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate equality check', () => {
      const ast = parseExpression('region == "North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate logical AND', () => {
      const ast = parseExpression('sales > 1000 && region == "North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate logical OR', () => {
      const ast = parseExpression('status == "active" || status == "pending"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate logical NOT', () => {
      const ast = parseExpression('!active');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    // Word-form boolean operators (beginner-friendly syntax)
    it('should validate word-form "and" operator', () => {
      const ast = parseExpression('sales > 1000 and region == "North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate word-form "or" operator', () => {
      const ast = parseExpression('status == "active" or status == "pending"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate word-form "not" operator', () => {
      const ast = parseExpression('not active');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate mixed word-form and symbolic operators', () => {
      const ast = parseExpression('(sales > 1000 and region == "North") or !active');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate complex nested word-form expression', () => {
      const ast = parseExpression('(sales > 1000 or revenue > 500) and not active');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate arithmetic operators', () => {
      const ast = parseExpression('revenue - cost');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate all arithmetic operators', () => {
      const operators = ['+', '-', '*', '/', '%'];
      operators.forEach((op) => {
        const ast = parseExpression(`revenue ${op} cost`);
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all comparison operators', () => {
      const operators = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='];
      operators.forEach((op) => {
        const ast = parseExpression(`sales ${op} 1000`);
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all unary operators', () => {
      const ast1 = parseExpression('!active');
      const result1 = validateAST(ast1, testSchema);
      expect(result1.valid).toBe(true);

      const ast2 = parseExpression('-sales');
      const result2 = validateAST(ast2, testSchema);
      expect(result2.valid).toBe(true);

      const ast3 = parseExpression('+sales');
      const result3 = validateAST(ast3, testSchema);
      expect(result3.valid).toBe(true);
    });

    it('should validate complex nested expression', () => {
      const ast = parseExpression('(sales > 1000 && region == "North") || status == "VIP"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate grouped expression', () => {
      const ast = parseExpression('(revenue - cost) / revenue * 100');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject unknown column', () => {
      const ast = parseExpression('unknownColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('unknown-column');
      expect(result.error?.message).toContain('unknownColumn');
    });

    it('should reject disallowed node type', () => {
      const invalidAst = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'window' },
        property: { type: 'Identifier', name: 'location' },
      };
      // @ts-ignore
      const result = validateAST(invalidAst, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('disallowed-node-type');
    });

    it('should provide column name in error for unknown column', () => {
      const ast = parseExpression('badColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('unknown-column');
      expect(result.error).toHaveProperty('columnName');
      expect(result.error?.columnName).toBe('badColumn');
    });

    it('should provide available columns in error', () => {
      const ast = parseExpression('badColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toHaveProperty('availableColumns');
      expect(result.error?.availableColumns).toEqual(testSchema);
    });

    it('should reject unknown column in nested expression', () => {
      const ast = parseExpression('sales > 1000 && unknownColumn == "test"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('unknown-column');
    });

    it('should validate with empty schema', () => {
      const ast = parseExpression('1000');
      const result = validateAST(ast, []);
      expect(result.valid).toBe(true);
    });

    it('should reject identifier with empty schema', () => {
      const ast = parseExpression('sales');
      const result = validateAST(ast, []);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('unknown-column');
    });

    it('should handle null AST gracefully', () => {
      // @ts-ignore
      const result = validateAST(null, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toContain('Invalid AST node');
    });

    it('should include position in error', () => {
      const ast = parseExpression('sales > 1000 && unknownColumn == "test"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).toBe(false);
      expect(result.error).toHaveProperty('position');
    });

    describe('function calls', () => {
      it('should allow regexp_match with 2 arguments', () => {
        const ast = parseExpression('regexp_match(region, "^N")');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow regexp_extract with 2 arguments', () => {
        const ast = parseExpression('regexp_extract(region, "([A-Z]+)")');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow regexp_extract with 3 arguments (group)', () => {
        const ast = parseExpression('regexp_extract(region, "([A-Z]+)", 1)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject unknown function', () => {
        const ast = parseExpression('alert("xss")');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('unknown-function');
        expect(result.error?.message).toContain('alert');
      });

      it('should reject regexp_match with too few arguments', () => {
        const ast = parseExpression('regexp_match(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
        expect(result.error?.message).toContain('2');
      });

      it('should reject invalid regex pattern', () => {
        const ast = parseExpression('regexp_match(region, "[unclosed")');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('invalid-regex');
        expect(result.error?.message).toContain('Invalid');
      });
    });

    describe('date function validation', () => {
      const dateSchema = ['order_date', 'created_at', 'start_date', 'end_date'];

      it('should allow year with 1 argument', () => {
        const ast = parseExpression('year(order_date)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow all date extraction functions with 1 argument', () => {
        const functions = [
          'year',
          'month',
          'day',
          'hour',
          'minute',
          'second',
          'weekday',
          'week',
          'quarter',
        ];
        functions.forEach((fn) => {
          const ast = parseExpression(`${fn}(order_date)`);
          const result = validateAST(ast, dateSchema);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject date extraction functions with wrong arity', () => {
        const ast = parseExpression('year()');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });

      it('should allow today with 0 arguments', () => {
        const ast = parseExpression('today()');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow now with 0 arguments', () => {
        const ast = parseExpression('now()');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject today with arguments', () => {
        const ast = parseExpression('today(order_date)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });

      it('should allow days_between with 2 arguments', () => {
        const ast = parseExpression('days_between(start_date, end_date)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject days_between with wrong arity', () => {
        const ast = parseExpression('days_between(start_date)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });

      it('should allow date_add with 3 arguments', () => {
        const ast = parseExpression('date_add(order_date, 7, "days")');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject date_add with wrong arity', () => {
        const ast = parseExpression('date_add(order_date, 7)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });

      it('should allow date_trunc with 2 arguments', () => {
        const ast = parseExpression('date_trunc(created_at, "month")');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow format_date with 2 arguments', () => {
        const ast = parseExpression('format_date(order_date, "YYYY-MM-DD")');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(true);
      });

      it('should validate column references in date functions', () => {
        const ast = parseExpression('year(unknown_column)');
        const result = validateAST(ast, dateSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('unknown-column');
      });
    });

    describe('string function validation', () => {
      it('should allow upper with 1 argument', () => {
        const ast = parseExpression('upper(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow lower with 1 argument', () => {
        const ast = parseExpression('lower(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow trim with 1 argument', () => {
        const ast = parseExpression('trim(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow substring with 2 arguments', () => {
        const ast = parseExpression('substring(region, 0)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow substring with 3 arguments', () => {
        const ast = parseExpression('substring(region, 0, 3)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject substring with wrong arity', () => {
        const ast = parseExpression('substring(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });
    });

    describe('math function validation', () => {
      it('should allow abs with 1 argument', () => {
        const ast = parseExpression('abs(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow round with 1 argument', () => {
        const ast = parseExpression('round(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow round with 2 arguments', () => {
        const ast = parseExpression('round(sales, 2)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow floor with 1 argument', () => {
        const ast = parseExpression('floor(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow ceil with 1 argument', () => {
        const ast = parseExpression('ceil(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow min with multiple arguments', () => {
        const ast = parseExpression('min(sales, revenue, cost)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow max with multiple arguments', () => {
        const ast = parseExpression('max(sales, revenue, cost)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow min with 1 argument', () => {
        const ast = parseExpression('min(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });
    });

    describe('type conversion function validation', () => {
      it('should allow parse_int with 1 argument', () => {
        const ast = parseExpression('parse_int(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow parse_float with 1 argument', () => {
        const ast = parseExpression('parse_float(region)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should allow is_nan with 1 argument', () => {
        const ast = parseExpression('is_nan(sales)');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(true);
      });

      it('should reject type conversion functions with wrong arity', () => {
        const ast = parseExpression('parse_int()');
        const result = validateAST(ast, testSchema);
        expect(result.valid).toBe(false);
        expect(result.error?.type).toBe('wrong-arity');
      });
    });
  });
});
