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
  });
});
