import { Signal } from '@preact/signals';
import { parseExpression, ASTNode } from '../../core/expression-parser';
import { validateAST } from '../../core/ast-validator';
import { formatError, FormattableError } from '../../core/error-formatter';
import i18n from '../../i18n';

/**
 * Result of expression validation with parsed AST for further use.
 */
export interface ExpressionValidationResult {
  valid: boolean;
  error: string | null;
  ast: ASTNode | null;
}

/**
 * Result of regex pattern validation.
 */
export interface RegexValidationResult {
  valid: boolean;
  error: string | null;
  regex: RegExp | null;
}

/**
 * Options for expression validation.
 */
export interface ExpressionValidationOptions {
  /**
   * If true, empty expressions are considered valid (returns null error).
   * @default true
   */
  allowEmpty?: boolean;

  /**
   * Signal to store the error message.
   * If provided, error is written directly to this signal.
   */
  errorSignal?: Signal<string | null>;
}

/**
 * Options for regex validation.
 */
export interface RegexValidationOptions {
  /**
   * If true, empty patterns are considered valid.
   * @default true
   */
  allowEmpty?: boolean;

  /**
   * Regex flags to use when constructing the RegExp.
   * @default ''
   */
  flags?: string;

  /**
   * Signal to store the error message.
   */
  errorSignal?: Signal<string | null>;

  /**
   * Custom error message prefix.
   * @default 'Invalid pattern'
   */
  errorPrefix?: string;
}

/**
 * Validates an expression against the provided column schema.
 *
 * This is the unified entry point for expression validation, replacing
 * duplicate implementations in filter-handlers.ts and derive-handlers.ts.
 *
 * @example
 * // Simple usage - returns validation result
 * const result = validateExpression('age > 18', ['name', 'age', 'city']);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * @example
 * // With signal binding - error is written to signal automatically
 * validateExpression(
 *   expression.value,
 *   AppStore.columns.value,
 *   { errorSignal: error }
 * );
 */
export function validateExpression(
  expression: string,
  columns: string[],
  options: ExpressionValidationOptions = {}
): ExpressionValidationResult {
  const { allowEmpty = true, errorSignal } = options;
  const trimmed = expression.trim();

  // Handle empty expression
  if (!trimmed) {
    if (errorSignal) errorSignal.value = null;
    return {
      valid: allowEmpty,
      error: allowEmpty ? null : i18n.t('validation.invalid.expression', { ns: 'errors' }),
      ast: null,
    };
  }

  try {
    // Parse expression into AST
    const ast = parseExpression(trimmed);

    // Validate AST against schema
    const validation = validateAST(ast, columns);

    if (validation.error) {
      const errorMessage = formatError(validation.error, trimmed);
      if (errorSignal) errorSignal.value = errorMessage;
      return { valid: false, error: errorMessage, ast: null };
    }

    if (errorSignal) errorSignal.value = null;
    return { valid: true, error: null, ast };
  } catch (error) {
    const errorMessage = formatError(error as FormattableError, trimmed);
    if (errorSignal) errorSignal.value = errorMessage;
    return { valid: false, error: errorMessage, ast: null };
  }
}

/**
 * Validates expression and returns whether it's valid.
 * Convenience wrapper for simple validation checks.
 */
export function isExpressionValid(expression: string, columns: string[]): boolean {
  return validateExpression(expression, columns).valid;
}

/**
 * Validates a regex pattern.
 *
 * This is the unified entry point for regex validation, replacing
 * duplicate implementations across regexp-handlers, pattern-handlers,
 * and split-handlers.
 *
 * @example
 * // Simple usage
 * const result = validateRegexPattern('[a-z]+');
 * if (result.valid) {
 *   const matches = someString.match(result.regex!);
 * }
 *
 * @example
 * // With signal binding
 * validateRegexPattern(pattern, {
 *   errorSignal: myErrorSignal
 * });
 */
export function validateRegexPattern(
  pattern: string,
  options: RegexValidationOptions = {}
): RegexValidationResult {
  const { allowEmpty = true, flags = '', errorSignal } = options;

  // Handle empty pattern
  if (!pattern) {
    if (errorSignal) errorSignal.value = null;
    return {
      valid: allowEmpty,
      error: allowEmpty ? null : i18n.t('validation.required.pattern', { ns: 'errors' }),
      regex: null,
    };
  }

  try {
    const regex = new RegExp(pattern, flags);
    if (errorSignal) errorSignal.value = null;
    return { valid: true, error: null, regex };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const errorMessage = `${i18n.t('validation.invalid.pattern', { ns: 'errors' })}: ${message}`;
    if (errorSignal) errorSignal.value = errorMessage;
    return { valid: false, error: errorMessage, regex: null };
  }
}

/**
 * Validates regex pattern and returns whether it's valid.
 * Convenience wrapper for simple validation checks.
 */
export function isRegexValid(pattern: string, flags?: string): boolean {
  return validateRegexPattern(pattern, { flags }).valid;
}
