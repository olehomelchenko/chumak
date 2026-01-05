/**
 * Tests for ast-validator.js
 */

describe('AST Validator', () => {
  const testSchema = ['sales', 'revenue', 'cost', 'region', 'status', 'active'];

  describe('validateAST()', () => {
    it('should validate simple identifier', () => {
      const ast = parseExpression('sales');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate numeric literal', () => {
      const ast = parseExpression('1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate string literal', () => {
      const ast = parseExpression('"North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate simple comparison', () => {
      const ast = parseExpression('sales > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate equality check', () => {
      const ast = parseExpression('region == "North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate logical AND', () => {
      const ast = parseExpression('sales > 1000 && region == "North"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate logical OR', () => {
      const ast = parseExpression('status == "active" || status == "pending"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate logical NOT', () => {
      const ast = parseExpression('!active');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate arithmetic operators', () => {
      const ast = parseExpression('revenue - cost');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate all arithmetic operators', () => {
      const operators = ['+', '-', '*', '/', '%'];
      operators.forEach((op) => {
        const ast = parseExpression(`revenue ${op} cost`);
        const result = validateAST(ast, testSchema);
        expect(result.valid).to.be.true;
      });
    });

    it('should validate all comparison operators', () => {
      const operators = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='];
      operators.forEach((op) => {
        const ast = parseExpression(`sales ${op} 1000`);
        const result = validateAST(ast, testSchema);
        expect(result.valid).to.be.true;
      });
    });

    it('should validate all unary operators', () => {
      const ast1 = parseExpression('!active');
      const result1 = validateAST(ast1, testSchema);
      expect(result1.valid).to.be.true;

      const ast2 = parseExpression('-sales');
      const result2 = validateAST(ast2, testSchema);
      expect(result2.valid).to.be.true;

      const ast3 = parseExpression('+sales');
      const result3 = validateAST(ast3, testSchema);
      expect(result3.valid).to.be.true;
    });

    it('should validate complex nested expression', () => {
      const ast = parseExpression('(sales > 1000 && region == "North") || status == "VIP"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate grouped expression', () => {
      const ast = parseExpression('(revenue - cost) / revenue * 100');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should reject unknown column', () => {
      const ast = parseExpression('unknownColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
      expect(result.error.message).to.include('unknownColumn');
    });

    it('should reject disallowed node type', () => {
      // Try to create a disallowed node type manually
      // (jsep won't create these, but we test the validator)
      const invalidAst = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'alert' },
        arguments: [],
      };
      const result = validateAST(invalidAst, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('disallowed-node-type');
    });

    it('should provide column name in error for unknown column', () => {
      const ast = parseExpression('badColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
      expect(result.error).to.have.property('columnName');
      expect(result.error.columnName).to.equal('badColumn');
    });

    it('should provide available columns in error', () => {
      const ast = parseExpression('badColumn > 1000');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error).to.have.property('availableColumns');
      expect(result.error.availableColumns).to.deep.equal(testSchema);
    });

    it('should reject unknown column in nested expression', () => {
      const ast = parseExpression('sales > 1000 && unknownColumn == "test"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    it('should validate with empty schema', () => {
      const ast = parseExpression('1000');
      const result = validateAST(ast, []);
      expect(result.valid).to.be.true;
    });

    it('should reject identifier with empty schema', () => {
      const ast = parseExpression('sales');
      const result = validateAST(ast, []);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    it('should handle null AST gracefully', () => {
      const result = validateAST(null, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.message).to.include('Invalid AST node');
    });

    it('should handle undefined AST gracefully', () => {
      const result = validateAST(undefined, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.message).to.include('Invalid AST node');
    });

    it('should include position in error', () => {
      const ast = parseExpression('sales > 1000 && unknownColumn == "test"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error).to.have.property('position');
    });

    it('should validate deeply nested expression', () => {
      const ast = parseExpression(
        '((sales > 1000 && region == "North") || (status == "VIP" && active)) && revenue > 5000'
      );
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should reject unknown column deep in nested expression', () => {
      const ast = parseExpression(
        '((sales > 1000 && region == "North") || (unknownStatus == "VIP" && active)) && revenue > 5000'
      );
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    it('should validate expression with only literals', () => {
      const ast = parseExpression('1 + 2');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate boolean literals', () => {
      // jsep doesn't parse true/false as Literal, they're Identifiers
      // But we can construct the AST manually
      const ast = {
        type: 'Literal',
        value: true,
        raw: 'true',
      };
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate null literal', () => {
      const ast = {
        type: 'Literal',
        value: null,
        raw: 'null',
      };
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    // Phase 2: Ternary operator validation
    it('should validate ternary expression', () => {
      const ast = parseExpression('sales > 1000 ? "high" : "low"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate nested ternary expression', () => {
      const ast = parseExpression('sales > 1000 ? revenue : cost');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should reject unknown column in ternary test', () => {
      const ast = parseExpression('unknownCol > 1000 ? "high" : "low"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    it('should reject unknown column in ternary consequent', () => {
      const ast = parseExpression('sales > 1000 ? unknownCol : "low"');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    it('should reject unknown column in ternary alternate', () => {
      const ast = parseExpression('sales > 1000 ? "high" : unknownCol');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });

    // Phase 2: Nullish coalescing validation
    it('should validate nullish coalescing expression', () => {
      const ast = parseExpression('sales ?? 0');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should validate chained nullish coalescing', () => {
      const ast = parseExpression('sales ?? revenue ?? cost');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.true;
    });

    it('should reject unknown column in nullish coalescing', () => {
      const ast = parseExpression('unknownCol ?? 0');
      const result = validateAST(ast, testSchema);
      expect(result.valid).to.be.false;
      expect(result.error.type).to.equal('unknown-column');
    });
  });
});
