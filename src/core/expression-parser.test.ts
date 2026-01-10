import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';

describe('Expression Parser', () => {
  describe('parseExpression()', () => {
    it('should parse simple identifier', () => {
      const ast = parseExpression('sales');
      expect(ast.type).toBe('Identifier');
      expect(ast.name).toBe('sales');
    });

    it('should parse numeric literal', () => {
      const ast = parseExpression('1000');
      expect(ast.type).toBe('Literal');
      expect(ast.value).toBe(1000);
    });

    it('should parse string literal', () => {
      const ast = parseExpression('"North"');
      expect(ast.type).toBe('Literal');
      expect(ast.value).toBe('North');
    });

    it('should parse simple comparison', () => {
      const ast = parseExpression('sales > 1000');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('>');
      expect(ast.left?.name).toBe('sales');
      expect(ast.right?.value).toBe(1000);
    });

    it('should parse equality check', () => {
      const ast = parseExpression('region == "North"');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('==');
      expect(ast.left?.name).toBe('region');
      expect(ast.right?.value).toBe('North');
    });

    it('should parse logical AND', () => {
      const ast = parseExpression('sales > 1000 && region == "North"');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('&&');
    });

    it('should parse logical OR', () => {
      const ast = parseExpression('status == "active" || status == "pending"');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('||');
    });

    it('should parse logical NOT', () => {
      const ast = parseExpression('!active');
      expect(ast.type).toBe('UnaryExpression');
      expect(ast.operator).toBe('!');
      expect(ast.argument?.name).toBe('active');
    });

    it('should parse arithmetic expression', () => {
      const ast = parseExpression('revenue - cost');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('-');
      expect(ast.left?.name).toBe('revenue');
      expect(ast.right?.name).toBe('cost');
    });

    it('should parse nested arithmetic', () => {
      const ast = parseExpression('(revenue - cost) / revenue * 100');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('*');
    });

    it('should parse grouped expression', () => {
      const ast = parseExpression('(sales > 1000)');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('>');
    });

    it('should handle multiple operators with correct precedence', () => {
      const ast = parseExpression('a + b * c');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('+');
      expect(ast.right?.operator).toBe('*');
    });

    it('should trim whitespace from expression', () => {
      const ast = parseExpression('  sales > 1000  ');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('>');
    });

    it('should throw error for empty string', () => {
      expect(() => parseExpression('')).toThrow('Expression must be a non-empty string');
    });

    it('should throw error for null', () => {
      // @ts-ignore
      expect(() => parseExpression(null)).toThrow('Expression must be a non-empty string');
    });

    it('should throw error for undefined', () => {
      // @ts-ignore
      expect(() => parseExpression(undefined)).toThrow('Expression must be a non-empty string');
    });

    it('should throw error for non-string', () => {
      // @ts-ignore
      expect(() => parseExpression(123)).toThrow('Expression must be a non-empty string');
    });

    it('should throw error with position for invalid syntax', () => {
      try {
        parseExpression('sales > > 1000');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('position');
        expect(error).toHaveProperty('expression');
      }
    });

    it('should throw error for unclosed string', () => {
      try {
        parseExpression('region == "North');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('position');
      }
    });

    it('should parse complex nested expression', () => {
      const ast = parseExpression('(sales > 1000 && region == "North") || status == "VIP"');
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('||');
    });
  });
});
