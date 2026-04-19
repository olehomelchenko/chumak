import { ASTNode } from './expression-parser';
import { FUNCTION_IMPLS, parseToDate } from './functions';
import { isConversionError } from './type-converter';

// Re-export parseToDate for backward compatibility
export { parseToDate } from './functions';

/**
 * Syto AST Interpreter - Safe expression evaluation
 */

const BINARY_OPS: Record<string, (l: any, r: any) => any> = {
  '+': (l, r) => l + r,
  '-': (l, r) => l - r,
  '*': (l, r) => l * r,
  '/': (l, r) => l / r,
  '%': (l, r) => l % r,
  '>': (l, r) => l > r,
  '<': (l, r) => l < r,
  '>=': (l, r) => l >= r,
  '<=': (l, r) => l <= r,
  '==': (l, r) => l == r,
  '===': (l, r) => l === r,
  '!=': (l, r) => l != r,
  '!==': (l, r) => l !== r,
};

const UNARY_OPS: Record<string, (a: any) => any> = {
  '!': (a) => !a,
  not: (a) => !a, // Word-form alternative to !
  '-': (a) => -a,
  '+': (a) => +a,
};

const NULL_COMPARISON_OPS = new Set(['==', '===', '!=', '!==']);

export function interpretAST(ast: ASTNode, rowData: Record<string, any>): any {
  return evaluateNode(ast, rowData);
}

function evaluateNode(node: ASTNode, rowData: Record<string, any>): any {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      if (node.name && !Object.prototype.hasOwnProperty.call(rowData, node.name)) {
        throw new Error(`Column '${node.name}' not found in row data`);
      }
      return node.name ? rowData[node.name] : undefined;

    case 'BinaryExpression':
    case 'LogicalExpression': {
      // Short-circuit evaluation for && and 'and'
      if (node.operator === '&&' || node.operator === 'and') {
        const left = evaluateNode(node.left!, rowData);
        if (isConversionError(left)) return left;
        return left ? evaluateNode(node.right!, rowData) : left;
      }
      // Short-circuit evaluation for || and 'or'
      if (node.operator === '||' || node.operator === 'or') {
        const left = evaluateNode(node.left!, rowData);
        if (isConversionError(left)) return left;
        return left ? left : evaluateNode(node.right!, rowData);
      }
      // Nullish coalescing: treats errors as missing (like null)
      if (node.operator === '??') {
        const left = evaluateNode(node.left!, rowData);
        return left !== null && left !== undefined && !isConversionError(left)
          ? left
          : evaluateNode(node.right!, rowData);
      }

      const left = evaluateNode(node.left!, rowData);
      const right = evaluateNode(node.right!, rowData);

      // Error propagation: if either operand is a ConversionError, propagate it
      if (isConversionError(left)) return left;
      if (isConversionError(right)) return right;

      // Handle date comparisons
      const isComparison = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='].includes(
        node.operator!
      );
      if (isComparison && (left instanceof Date || right instanceof Date)) {
        const ld = parseToDate(left);
        const rd = parseToDate(right);
        if (ld && rd) {
          const lv = ld.getTime();
          const rv = rd.getTime();
          switch (node.operator) {
            case '>':
              return lv > rv;
            case '<':
              return lv < rv;
            case '>=':
              return lv >= rv;
            case '<=':
              return lv <= rv;
            case '==':
            case '===':
              return lv === rv;
            case '!=':
            case '!==':
              return lv !== rv;
          }
        }
      }

      if (
        node.operator &&
        (left == null || right == null) &&
        !NULL_COMPARISON_OPS.has(node.operator)
      ) {
        return null;
      }

      const op = BINARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown operator: ${node.operator}`);
      return op(left, right);
    }

    case 'UnaryExpression': {
      const arg = evaluateNode(node.argument!, rowData);
      if (isConversionError(arg)) return arg;
      const op = UNARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown unary operator: ${node.operator}`);
      return op(arg);
    }

    case 'ConditionalExpression': {
      const test = evaluateNode(node.test!, rowData);
      if (isConversionError(test)) return test;
      return test
        ? evaluateNode(node.consequent!, rowData)
        : evaluateNode(node.alternate!, rowData);
    }

    case 'CallExpression': {
      const fnName = node.callee!.name!;
      const fn = FUNCTION_IMPLS[fnName];
      if (!fn) {
        throw new Error(`Unknown function: ${fnName}`);
      }
      const args = (node.arguments || []).map((arg) => evaluateNode(arg, rowData));
      return fn(...args);
    }

    case 'LetExpression': {
      // Bindings are assigned as-is — including ConversionError values — so
      // the body can observe them via is_error / coalesce / ?? just like
      // function arguments do.
      let scope = rowData;
      for (const binding of node.bindings!) {
        scope = { ...scope, [binding.name]: evaluateNode(binding.value, scope) };
      }
      return evaluateNode(node.body!, scope);
    }

    default:
      throw new Error(`Cannot interpret node type: ${node.type}`);
  }
}
