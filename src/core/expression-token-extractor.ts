import { parseExpression, type ASTNode } from './expression-parser';
import { ALLOWED_FUNCTIONS } from './ast-validator';

export interface ExpressionTokens {
  functions: string[];
  columns: string[];
}

export const EMPTY_TOKENS: ExpressionTokens = { functions: [], columns: [] };

/**
 * Parse an expression and extract tokens, falling back to text-based extraction on parse failure.
 */
export function computeTokens(expression: string, knownColumns: string[]): ExpressionTokens {
  const trimmed = expression.trim();
  if (!trimmed) return EMPTY_TOKENS;

  try {
    const ast = parseExpression(trimmed);
    return extractExpressionTokens(ast, knownColumns);
  } catch {
    return extractTokensFromText(trimmed, knownColumns);
  }
}

/**
 * Walk a parsed AST and return deduplicated function names and column references.
 * Column names are only included if they appear in knownColumns.
 */
export function extractExpressionTokens(ast: ASTNode, knownColumns: string[]): ExpressionTokens {
  const columnSet = new Set(knownColumns);
  const funcsSeen = new Set<string>();
  const colsSeen = new Set<string>();
  const functions: string[] = [];
  const columns: string[] = [];

  function walk(node: ASTNode | undefined | null): void {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'CallExpression':
        if (node.callee?.type === 'Identifier' && node.callee.name) {
          const name = node.callee.name;
          if (!funcsSeen.has(name)) {
            funcsSeen.add(name);
            functions.push(name);
          }
        }
        if (node.arguments) {
          for (const arg of node.arguments) {
            walk(arg);
          }
        }
        break;

      case 'Identifier':
        if (node.name && columnSet.has(node.name) && !colsSeen.has(node.name)) {
          colsSeen.add(node.name);
          columns.push(node.name);
        }
        break;

      case 'BinaryExpression':
      case 'LogicalExpression':
        walk(node.left);
        walk(node.right);
        break;

      case 'UnaryExpression':
        walk(node.argument);
        break;

      case 'ConditionalExpression':
        walk(node.test);
        walk(node.consequent);
        walk(node.alternate);
        break;

      case 'MemberExpression':
        walk(node.object);
        break;

      case 'ArrayExpression':
        if (node.elements) {
          for (const el of node.elements) {
            walk(el);
          }
        }
        break;

      case 'Compound':
        if (node.body) {
          for (const child of node.body) {
            walk(child);
          }
        }
        break;

      case 'Literal':
        break;
    }
  }

  walk(ast);
  return { functions, columns };
}

/**
 * Best-effort token extraction from raw expression text.
 * Used as fallback when the expression fails to parse (e.g. incomplete input).
 * Matches `identifier(` patterns against allowed functions, and bare identifiers
 * or `[Bracketed Name]` against known columns.
 */
export function extractTokensFromText(
  expression: string,
  knownColumns: string[]
): ExpressionTokens {
  const columnSet = new Set(knownColumns);
  const funcsSeen = new Set<string>();
  const colsSeen = new Set<string>();
  const functions: string[] = [];
  const columns: string[] = [];

  // Match function calls: word followed by (
  const funcPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = funcPattern.exec(expression)) !== null) {
    const name = m[1];
    if (ALLOWED_FUNCTIONS[name] && !funcsSeen.has(name)) {
      funcsSeen.add(name);
      functions.push(name);
    }
  }

  // Match bracketed column names: [Column Name]
  const bracketPattern = /\[([^\]]+)\]/g;
  while ((m = bracketPattern.exec(expression)) !== null) {
    const name = m[1];
    if (columnSet.has(name) && !colsSeen.has(name)) {
      colsSeen.add(name);
      columns.push(name);
    }
  }

  // Match bare identifiers (not followed by open paren, so not functions)
  const identPattern = /\b([a-zA-Z_]\w*)\b(?!\s*\()/g;
  while ((m = identPattern.exec(expression)) !== null) {
    const name = m[1];
    if (columnSet.has(name) && !colsSeen.has(name)) {
      colsSeen.add(name);
      columns.push(name);
    }
  }

  return { functions, columns };
}
