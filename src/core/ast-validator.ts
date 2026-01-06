import { ASTNode } from './expression-parser';

/**
 * Chumak AST Validator - Security and schema validation
 */

const ALLOWED_NODE_TYPES = new Set([
  'Literal',
  'Identifier',
  'BinaryExpression',
  'LogicalExpression',
  'UnaryExpression',
  'ConditionalExpression',
  'CallExpression',
]);

const ALLOWED_OPS = {
  binary: new Set([
    '+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '===', '!=', '!==', '&&', '||', '??',
  ]),
  logical: new Set(['&&', '||', '??']),
  unary: new Set(['!', '-', '+']),
};

interface FunctionSpec {
  minArgs: number;
  maxArgs: number;
}

const ALLOWED_FUNCTIONS: Record<string, FunctionSpec> = {
  regexp_match: { minArgs: 2, maxArgs: 2 },
  regexp_extract: { minArgs: 2, maxArgs: 3 },
};

export interface ValidationResult {
  valid: boolean;
  error?: {
    message: string;
    position: number;
    type: string;
    [key: string]: any;
  };
}

export function validateAST(ast: ASTNode, schema: string[]): ValidationResult {
  try {
    validateNode(ast, schema);
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: {
        message: error.message,
        position: error.position || 0,
        type: error.type || 'validation-error',
        ...error,
      },
    };
  }
}

function validateNode(node: ASTNode, schema: string[]) {
  if (!node || typeof node !== 'object') {
    throw { message: 'Invalid AST node', position: 0 };
  }

  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    throw {
      message: `Expression type '${node.type}' is not allowed`,
      position: node.start || 0,
      type: 'disallowed-node-type',
    };
  }

  switch (node.type) {
    case 'Literal':
      break;

    case 'Identifier':
      if (node.name && !schema.includes(node.name)) {
        throw {
          message: `Column '${node.name}' not found`,
          position: node.start || 0,
          type: 'unknown-column',
          columnName: node.name,
          availableColumns: schema,
        };
      }
      break;

    case 'BinaryExpression':
    case 'LogicalExpression':
      const opSet = node.type === 'LogicalExpression' ? ALLOWED_OPS.logical : ALLOWED_OPS.binary;
      if (node.operator && !opSet.has(node.operator)) {
        throw {
          message: `Operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator',
        };
      }
      if (node.left) validateNode(node.left, schema);
      if (node.right) validateNode(node.right, schema);
      break;

    case 'UnaryExpression':
      if (node.operator && !ALLOWED_OPS.unary.has(node.operator)) {
        throw {
          message: `Unary operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator',
        };
      }
      if (node.argument) validateNode(node.argument, schema);
      break;

    case 'ConditionalExpression':
      if (node.test) validateNode(node.test, schema);
      if (node.consequent) validateNode(node.consequent, schema);
      if (node.alternate) validateNode(node.alternate, schema);
      break;

    case 'CallExpression':
      validateCallExpression(node, schema);
      break;
  }
}

function validateCallExpression(node: ASTNode, schema: string[]) {
  if (!node.callee || node.callee.type !== 'Identifier') {
    throw {
      message: 'Invalid function call syntax',
      position: node.start || 0,
      type: 'invalid-call',
    };
  }

  const fnName = node.callee.name!;
  const fnSpec = ALLOWED_FUNCTIONS[fnName];

  if (!fnSpec) {
    throw {
      message: `Function '${fnName}' is not allowed`,
      position: node.callee.start || 0,
      type: 'unknown-function',
    };
  }

  const argCount = node.arguments ? node.arguments.length : 0;
  if (argCount < fnSpec.minArgs || argCount > fnSpec.maxArgs) {
    const expected =
      fnSpec.minArgs === fnSpec.maxArgs
        ? `${fnSpec.minArgs}`
        : `${fnSpec.minArgs}-${fnSpec.maxArgs}`;
    throw {
      message: `Function '${fnName}' expects ${expected} arguments, got ${argCount}`,
      position: node.start || 0,
      type: 'wrong-arity',
    };
  }

  if (node.arguments) {
    node.arguments.forEach((arg) => validateNode(arg, schema));
  }

  if (fnName === 'regexp_match' || fnName === 'regexp_extract') {
    const patternArg = node.arguments![1];
    if (patternArg && patternArg.type === 'Literal' && typeof patternArg.value === 'string') {
      validateRegexPattern(patternArg.value, patternArg.start || 0);
    }
  }
}

function parseRegexFlags(pattern: string) {
  const flagMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
  if (flagMatch) {
    return {
      pattern: pattern.slice(flagMatch[0].length),
      flags: flagMatch[1],
    };
  }
  return { pattern, flags: '' };
}

function validateRegexPattern(pattern: string, position: number) {
  try {
    const { pattern: p, flags } = parseRegexFlags(pattern);
    new RegExp(p, flags);
  } catch (e: any) {
    throw {
      message: `Invalid regex pattern: ${e.message}`,
      position,
      type: 'invalid-regex',
    };
  }
}
