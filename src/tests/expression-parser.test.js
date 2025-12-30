/**
 * Tests for expression-parser.js
 */

describe('Expression Parser', () => {
  describe('parseExpression()', () => {
    it('should parse simple identifier', () => {
      const ast = parseExpression('sales');
      expect(ast.type).to.equal('Identifier');
      expect(ast.name).to.equal('sales');
    });

    it('should parse numeric literal', () => {
      const ast = parseExpression('1000');
      expect(ast.type).to.equal('Literal');
      expect(ast.value).to.equal(1000);
    });

    it('should parse string literal', () => {
      const ast = parseExpression('"North"');
      expect(ast.type).to.equal('Literal');
      expect(ast.value).to.equal('North');
    });

    it('should parse simple comparison', () => {
      const ast = parseExpression('sales > 1000');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('>');
      expect(ast.left.name).to.equal('sales');
      expect(ast.right.value).to.equal(1000);
    });

    it('should parse equality check', () => {
      const ast = parseExpression('region == "North"');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('==');
      expect(ast.left.name).to.equal('region');
      expect(ast.right.value).to.equal('North');
    });

    it('should parse logical AND', () => {
      const ast = parseExpression('sales > 1000 && region == "North"');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('&&');
    });

    it('should parse logical OR', () => {
      const ast = parseExpression('status == "active" || status == "pending"');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('||');
    });

    it('should parse logical NOT', () => {
      const ast = parseExpression('!active');
      expect(ast.type).to.equal('UnaryExpression');
      expect(ast.operator).to.equal('!');
      expect(ast.argument.name).to.equal('active');
    });

    it('should parse arithmetic expression', () => {
      const ast = parseExpression('revenue - cost');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('-');
      expect(ast.left.name).to.equal('revenue');
      expect(ast.right.name).to.equal('cost');
    });

    it('should parse nested arithmetic', () => {
      const ast = parseExpression('(revenue - cost) / revenue * 100');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('*');
    });

    it('should parse grouped expression', () => {
      const ast = parseExpression('(sales > 1000)');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('>');
    });

    it('should handle multiple operators with correct precedence', () => {
      const ast = parseExpression('a + b * c');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('+');
      expect(ast.right.operator).to.equal('*');
    });

    it('should trim whitespace from expression', () => {
      const ast = parseExpression('  sales > 1000  ');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('>');
    });

    it('should throw error for empty string', () => {
      expect(() => parseExpression('')).to.throw('Expression must be a non-empty string');
    });

    it('should throw error for null', () => {
      expect(() => parseExpression(null)).to.throw('Expression must be a non-empty string');
    });

    it('should throw error for undefined', () => {
      expect(() => parseExpression(undefined)).to.throw('Expression must be a non-empty string');
    });

    it('should throw error for non-string', () => {
      expect(() => parseExpression(123)).to.throw('Expression must be a non-empty string');
    });

    it('should throw error with position for invalid syntax', () => {
      try {
        parseExpression('sales > > 1000');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.have.property('message');
        expect(error).to.have.property('position');
        expect(error).to.have.property('expression');
      }
    });

    it('should throw error for unclosed string', () => {
      try {
        parseExpression('region == "North');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.have.property('message');
        expect(error).to.have.property('position');
      }
    });

    it('should parse complex nested expression', () => {
      const ast = parseExpression('(sales > 1000 && region == "North") || status == "VIP"');
      expect(ast.type).to.equal('BinaryExpression');
      expect(ast.operator).to.equal('||');
    });
  });
});
