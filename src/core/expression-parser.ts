import jsep from 'jsep';

/**
 * Syto Expression Parser - jsep wrapper
 */

// Configure jsep for nullish coalescing operator
jsep.addBinaryOp('??', 1);

// Configure jsep for word-form boolean operators (beginner-friendly syntax)
// Same precedence as their symbolic equivalents: or=1 (like ||), and=2 (like &&)
jsep.addBinaryOp('or', 1);
jsep.addBinaryOp('and', 2);
jsep.addUnaryOp('not');

export interface LetBinding {
  name: string;
  value: ASTNode;
}

export interface ASTNode {
  type: string;
  name?: string;
  value?: any;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  argument?: ASTNode;
  arguments?: ASTNode[];
  callee?: ASTNode;
  property?: ASTNode;
  object?: ASTNode;
  test?: ASTNode;
  consequent?: ASTNode;
  alternate?: ASTNode;
  bindings?: LetBinding[];
  body?: ASTNode;
  [key: string]: any;
}

// `let NAME = EXPR [, NAME = EXPR]* in BODY` — sequential let* bindings.
// Bound names are scoped to subsequent bindings and the body.
jsep.plugins.register({
  name: 'syto-let',
  init() {
    jsep.hooks.add('gobble-token', function gobbleLet(this: any, env: any) {
      if (env.node) return;
      if (!matchKeyword(this, 'let')) return;

      const bindings: LetBinding[] = [];

      while (true) {
        this.gobbleSpaces();
        const name = this.gobbleIdentifier();
        if (!name || name.type !== 'Identifier') {
          this.throwError('Expected identifier after "let"');
        }

        this.gobbleSpaces();
        if (this.char !== '=' || this.expr.charAt(this.index + 1) === '=') {
          this.throwError('Expected "=" after let binding name');
        }
        this.index++;

        const value = this.gobbleExpression();
        if (!value) {
          this.throwError('Expected expression after "="');
        }

        bindings.push({ name: name.name, value });

        this.gobbleSpaces();
        if (this.char === ',') {
          this.index++;
          continue;
        }
        if (matchKeyword(this, 'in')) break;
        this.throwError('Expected "," or "in" after let binding');
      }

      const body = this.gobbleExpression();
      if (!body) {
        this.throwError('Expected expression after "in"');
      }

      env.node = { type: 'LetExpression', bindings, body };
    });
  },
});

/**
 * Consume a bare keyword (followed by a non-identifier character) if present.
 * Does not advance the cursor on miss.
 */
function matchKeyword(ctx: any, keyword: string): boolean {
  ctx.gobbleSpaces();
  const start = ctx.index;
  for (let i = 0; i < keyword.length; i++) {
    if (ctx.expr.charAt(start + i) !== keyword[i]) return false;
  }
  const after = ctx.expr.charCodeAt(start + keyword.length);
  if (isIdentifierPartCode(after)) return false;
  ctx.index = start + keyword.length;
  return true;
}

function isIdentifierPartCode(code: number): boolean {
  if (Number.isNaN(code)) return false;
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 36 // $
  );
}

// `[Column Name]` — bracketed column reference. Parsed natively by jsep so
// we avoid a string pre-pass and placeholder dance. Emits a plain Identifier
// node with the bracketed text as name, so AST consumers need no changes.
jsep.plugins.register({
  name: 'syto-bracket-column',
  init() {
    jsep.hooks.add('gobble-token', function gobbleBracketColumn(this: any, env: any) {
      if (env.node) return;
      if (this.char !== '[') return;

      const start = this.index;
      this.index++; // consume '['

      const nameStart = this.index;
      while (this.index < this.expr.length && this.expr.charAt(this.index) !== ']') {
        this.index++;
      }

      if (this.index >= this.expr.length) {
        const err: any = new Error('Unclosed column reference — expected "]"');
        err.index = start;
        throw err;
      }

      const name = this.expr.slice(nameStart, this.index);
      if (name === '') {
        const err: any = new Error('Empty column reference "[]"');
        err.index = start;
        throw err;
      }

      this.index++; // consume ']'
      env.node = { type: 'Identifier', name };
    });
  },
});

/**
 * Parse an expression string into an Abstract Syntax Tree
 */
export function parseExpression(expression: string): ASTNode {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  try {
    return jsep(expression.trim()) as ASTNode;
  } catch (error: any) {
    throw { message: error.message, position: error.index || 0, expression };
  }
}
