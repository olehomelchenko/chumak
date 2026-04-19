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

  describe('let bindings', () => {
    it('should parse a single-binding let', () => {
      const ast = parseExpression('let x = 1 in x + 2');
      expect(ast.type).toBe('LetExpression');
      expect(ast.bindings).toHaveLength(1);
      expect(ast.bindings![0].name).toBe('x');
      expect(ast.bindings![0].value.type).toBe('Literal');
      expect(ast.bindings![0].value.value).toBe(1);
      expect(ast.body?.type).toBe('BinaryExpression');
      expect(ast.body?.operator).toBe('+');
    });

    it('should parse multiple sequential bindings', () => {
      const ast = parseExpression('let x = 1, y = x + 1 in x + y');
      expect(ast.type).toBe('LetExpression');
      expect(ast.bindings).toHaveLength(2);
      expect(ast.bindings![0].name).toBe('x');
      expect(ast.bindings![1].name).toBe('y');
      expect(ast.bindings![1].value.type).toBe('BinaryExpression');
    });

    it('should parse nested let expressions', () => {
      const ast = parseExpression('let x = let y = 1 in y + 1 in x * 2');
      expect(ast.type).toBe('LetExpression');
      expect(ast.bindings![0].value.type).toBe('LetExpression');
      expect(ast.body?.type).toBe('BinaryExpression');
    });

    it('should parse let with bracketed column references', () => {
      const ast = parseExpression('let x = trim([Name]) in x');
      expect(ast.type).toBe('LetExpression');
      expect(ast.bindings![0].value.type).toBe('CallExpression');
      expect(ast.bindings![0].value.arguments![0].name).toBe('Name');
    });

    it('should parse let with function call in body', () => {
      const ast = parseExpression('let x = [Name] in if(len(x) > 0, x, "unknown")');
      expect(ast.type).toBe('LetExpression');
      expect(ast.body?.type).toBe('CallExpression');
      expect(ast.body?.callee?.name).toBe('if');
    });

    it('should throw when let is missing in keyword', () => {
      expect(() => parseExpression('let x = 1')).toThrow();
    });

    it('should throw when let is missing binding value', () => {
      expect(() => parseExpression('let x = in x')).toThrow();
    });

    it('should throw when let is missing body', () => {
      expect(() => parseExpression('let x = 1 in')).toThrow();
    });
  });
});
