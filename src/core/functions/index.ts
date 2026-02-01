/**
 * Expression function implementations
 *
 * This module aggregates all function implementations for the AST interpreter.
 * Functions are organized by category for maintainability.
 */

import { regexFunctions } from './regex-functions';
import { dateFunctions } from './date-functions';
import { stringFunctions } from './string-functions';
import { mathFunctions } from './math-functions';
import { typeFunctions } from './type-functions';
import { jsonFunctions } from './json-functions';

// Re-export parseToDate for backward compatibility
export { parseToDate } from './date-functions';

/**
 * All builtin function implementations for the expression interpreter.
 * Maps function names to their implementations.
 */
export const FUNCTION_IMPLS: Record<string, (...args: any[]) => any> = {
  ...regexFunctions,
  ...dateFunctions,
  ...stringFunctions,
  ...mathFunctions,
  ...typeFunctions,
  ...jsonFunctions,
};
