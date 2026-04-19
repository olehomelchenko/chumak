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

/**
 * Replace bracket notation [ColumnName] only when outside string literals.
 */
function replaceBracketsOutsideStrings(
  expression: string,
  replacer: (match: string, colName: string) => string
): string {
  let result = '';
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      while (j < expression.length) {
        if (expression[j] === '\\' && j + 1 < expression.length) {
          j += 2;
        } else if (expression[j] === quote) {
          j++;
          break;
        } else {
          j++;
        }
      }
      result += expression.slice(i, j);
      i = j;
      continue;
    }

    if (char === '[') {
      const closeBracket = expression.indexOf(']', i);
      if (closeBracket !== -1) {
        const fullMatch = expression.slice(i, closeBracket + 1);
        const innerContent = expression.slice(i + 1, closeBracket);
        result += replacer(fullMatch, innerContent);
        i = closeBracket + 1;
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Parse an expression string into an Abstract Syntax Tree
 */
export function parseExpression(expression: string): ASTNode {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  const colMatches: { placeholder: string; colName: string }[] = [];
  const processedExpr = replaceBracketsOutsideStrings(expression, (match, colName) => {
    const index = colMatches.length;
    let placeholder = `_${index}_`.padEnd(match.length, '_');
    if (placeholder.length > match.length) {
      placeholder = placeholder.substring(0, match.length);
    }
    colMatches.push({ placeholder, colName });
    return placeholder;
  });

  try {
    const ast = jsep(processedExpr.trim()) as ASTNode;

    if (colMatches.length > 0) {
      restoreColumnNames(ast, colMatches);
    }

    return ast;
  } catch (error: any) {
    throw { message: error.message, position: error.index || 0, expression };
  }
}

/**
 * Recursively walk AST and restore column names from placeholders
 */
function restoreColumnNames(node: ASTNode, colMatches: { placeholder: string; colName: string }[]) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'Identifier' && node.name) {
    const match = colMatches.find((m) => m.placeholder === node.name);
    if (match) node.name = match.colName;
  }

  if (node.type === 'LetExpression' && Array.isArray(node.bindings)) {
    for (const binding of node.bindings) {
      const match = colMatches.find((m) => m.placeholder === binding.name);
      if (match) binding.name = match.colName;
    }
  }

  for (const key in node) {
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        child.forEach((c) => restoreColumnNames(c, colMatches));
      } else {
        restoreColumnNames(child as ASTNode, colMatches);
      }
    }
  }
}
