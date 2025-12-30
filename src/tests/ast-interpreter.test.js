/**
 * Tests for ast-interpreter.js
 */

describe('AST Interpreter', () => {
  const testRow = {
    sales: 1500,
    revenue: 10000,
    cost: 7000,
    region: 'North',
    status: 'active',
    active: true,
    price: 99.99,
    quantity: null
  };

  describe('interpretAST()', () => {
    it('should evaluate numeric literal', () => {
      const ast = parseExpression('1000');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(1000);
    });

    it('should evaluate string literal', () => {
      const ast = parseExpression('"North"');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal('North');
    });

    it('should evaluate identifier (column reference)', () => {
      const ast = parseExpression('sales');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(1500);
    });

    it('should evaluate simple comparison (>)', () => {
      const ast = parseExpression('sales > 1000');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate simple comparison (<)', () => {
      const ast = parseExpression('sales < 2000');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate equality (==)', () => {
      const ast = parseExpression('region == "North"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate inequality (!=)', () => {
      const ast = parseExpression('region != "South"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate logical AND (true)', () => {
      const ast = parseExpression('sales > 1000 && region == "North"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate logical AND (false)', () => {
      const ast = parseExpression('sales > 1000 && region == "South"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.false;
    });

    it('should evaluate logical OR (true)', () => {
      const ast = parseExpression('region == "North" || region == "South"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate logical OR (false)', () => {
      const ast = parseExpression('region == "East" || region == "West"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.false;
    });

    it('should short-circuit AND (left false)', () => {
      const ast = parseExpression('sales < 1000 && sales > 0');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.false;
    });

    it('should short-circuit OR (left true)', () => {
      const ast = parseExpression('sales > 1000 || sales < 0');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate logical NOT', () => {
      const ast = parseExpression('!active');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.false;
    });

    it('should evaluate arithmetic addition', () => {
      const ast = parseExpression('sales + 500');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(2000);
    });

    it('should evaluate arithmetic subtraction', () => {
      const ast = parseExpression('revenue - cost');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(3000);
    });

    it('should evaluate arithmetic multiplication', () => {
      const ast = parseExpression('price * 2');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.closeTo(199.98, 0.01);
    });

    it('should evaluate arithmetic division', () => {
      const ast = parseExpression('revenue / 2');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(5000);
    });

    it('should evaluate modulo', () => {
      const ast = parseExpression('sales % 100');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(0);
    });

    it('should evaluate unary minus', () => {
      const ast = parseExpression('-sales');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(-1500);
    });

    it('should evaluate unary plus', () => {
      const ast = parseExpression('+sales');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(1500);
    });

    it('should evaluate complex nested expression', () => {
      const ast = parseExpression('(revenue - cost) / revenue * 100');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(30);
    });

    it('should evaluate deeply nested logical expression', () => {
      const ast = parseExpression('(sales > 1000 && region == "North") || (status == "VIP" && active)');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should propagate null for arithmetic on null', () => {
      const ast = parseExpression('quantity + 10');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.null;
    });

    it('should propagate null for comparison (except == and !=)', () => {
      const ast = parseExpression('quantity > 10');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.null;
    });

    it('should allow == with null', () => {
      const ast = parseExpression('quantity == 5');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.false;
    });

    it('should allow != with null', () => {
      const ast = parseExpression('quantity != 5');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate >= operator', () => {
      const ast = parseExpression('sales >= 1500');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate <= operator', () => {
      const ast = parseExpression('sales <= 1500');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate === operator', () => {
      const ast = parseExpression('sales === 1500');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate !== operator', () => {
      const ast = parseExpression('sales !== 1000');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should handle division by zero', () => {
      const row = { value: 10, zero: 0 };
      const ast = parseExpression('value / zero');
      const result = interpretAST(ast, row);
      expect(result).to.equal(Infinity);
    });

    it('should handle negative division', () => {
      const ast = parseExpression('-revenue / 2');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(-5000);
    });

    it('should evaluate operator precedence correctly', () => {
      const ast = parseExpression('sales + cost * 2');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(15500); // 1500 + (7000 * 2)
    });

    it('should respect grouping parentheses', () => {
      const ast = parseExpression('(sales + cost) * 2');
      const result = interpretAST(ast, testRow);
      expect(result).to.equal(17000); // (1500 + 7000) * 2
    });

    it('should throw error for missing column', () => {
      const ast = parseExpression('unknownColumn');
      expect(() => interpretAST(ast, testRow)).to.throw("Column 'unknownColumn' not found");
    });

    it('should handle boolean column values', () => {
      const ast = parseExpression('active');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should handle string concatenation with +', () => {
      const row = { firstName: 'John', lastName: 'Doe' };
      const ast = parseExpression('firstName');
      const result = interpretAST(ast, row);
      expect(result).to.equal('John');
    });

    it('should evaluate complex condition chain', () => {
      const ast = parseExpression('sales > 1000 && sales < 2000 && region == "North"');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should evaluate mixed AND and OR', () => {
      const ast = parseExpression('sales > 2000 || (sales > 1000 && region == "North")');
      const result = interpretAST(ast, testRow);
      expect(result).to.be.true;
    });

    it('should handle undefined values', () => {
      const row = { value: undefined };
      const ast = parseExpression('value + 10');
      const result = interpretAST(ast, row);
      expect(result).to.be.null;
    });

    it('should handle zero values correctly', () => {
      const row = { value: 0 };
      const ast = parseExpression('value == 0');
      const result = interpretAST(ast, row);
      expect(result).to.be.true;
    });

    it('should handle empty string values', () => {
      const row = { name: '' };
      const ast = parseExpression('name == ""');
      const result = interpretAST(ast, row);
      expect(result).to.be.true;
    });
  });
});
