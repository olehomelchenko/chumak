import { Diagnostic } from '@codemirror/lint';
import { KNOWN_TRANSFORM_KEYS } from '../../core/transforms';
import { parseExpression } from '../../core/expression-parser';
import { validateAST } from '../../core/ast-validator';

/**
 * Validate an expression string and return an error message if invalid.
 * Uses empty schema since we don't have column context in the linter.
 * Ignores "unknown-column" errors since we can't validate column names here.
 */
function validateExpression(expr: string): string | null {
  if (!expr || typeof expr !== 'string') {
    return null; // Skip non-string values
  }

  try {
    const ast = parseExpression(expr);
    const result = validateAST(ast, []); // Empty schema - can't validate column names
    if (!result.valid && result.error) {
      // Ignore column-not-found errors - we don't have schema context here
      if (result.error.type === 'unknown-column') {
        return null;
      }
      return result.error.message;
    }
    return null;
  } catch (e: any) {
    return e.message || 'Invalid expression syntax';
  }
}

/**
 * Find the position of a string value in the JSON content.
 * Returns the position after the opening quote.
 */
function findExpressionPosition(content: string, expr: string, afterKey?: string): number {
  // Try to find the expression value in context
  if (afterKey) {
    const keyPattern = new RegExp(`"${afterKey}"\\s*:\\s*"`, 'g');
    const match = keyPattern.exec(content);
    if (match) {
      return match.index + match[0].length;
    }
  }

  // Fallback: find the quoted expression
  const escaped = expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`"${escaped}"`);
  const match = content.match(pattern);
  return match?.index ? match.index + 1 : 0;
}

interface StepExpressionError {
  stepIndex: number;
  field: string;
  error: string;
  expr: string;
  jsonKey: string;
}

/**
 * Shared generator that validates expressions in filter, derive, and conditional steps.
 * Yields errors with enough context for each consumer to format its own output.
 */
function* validateStepExpressions(steps: any[]): Generator<StepExpressionError> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || typeof step !== 'object') continue;

    if (step.filter && typeof step.filter === 'string') {
      const error = validateExpression(step.filter);
      if (error)
        yield { stepIndex: i, field: 'filter', error, expr: step.filter, jsonKey: 'filter' };
    }

    if (step.derive && typeof step.derive === 'object') {
      for (const [colName, expr] of Object.entries(step.derive)) {
        if (typeof expr === 'string') {
          const error = validateExpression(expr);
          if (error)
            yield { stepIndex: i, field: `derive "${colName}"`, error, expr, jsonKey: colName };
        }
      }
    }

    if (step.conditional) {
      const { conditions, else: elseExpr } = step.conditional;
      if (Array.isArray(conditions)) {
        for (let j = 0; j < conditions.length; j++) {
          const cond = conditions[j];
          if (cond.when && typeof cond.when === 'string') {
            const error = validateExpression(cond.when);
            if (error)
              yield {
                stepIndex: i,
                field: `condition ${j + 1} "when"`,
                error,
                expr: cond.when,
                jsonKey: 'when',
              };
          }
          if (cond.then && typeof cond.then === 'string') {
            const error = validateExpression(cond.then);
            if (error)
              yield {
                stepIndex: i,
                field: `condition ${j + 1} "then"`,
                error,
                expr: cond.then,
                jsonKey: 'then',
              };
          }
        }
      }
      if (elseExpr && typeof elseExpr === 'string') {
        const error = validateExpression(elseExpr);
        if (error) yield { stepIndex: i, field: '"else"', error, expr: elseExpr, jsonKey: 'else' };
      }
    }
  }
}

/**
 * Validates JSON content against the transform schema.
 * Returns CodeMirror diagnostics for inline error display.
 */
export function lintTransformJson(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // 1. Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    // Try to extract position from error message
    const posMatch = e.message.match(/position\s+(\d+)/i);
    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;

    diagnostics.push({
      from: Math.min(pos, content.length),
      to: Math.min(pos + 1, content.length),
      severity: 'error',
      message: `JSON syntax error: ${e.message}`,
    });
    return diagnostics;
  }

  // 2. Validate root structure
  if (!parsed || typeof parsed !== 'object') {
    diagnostics.push({
      from: 0,
      to: content.length,
      severity: 'error',
      message: 'Root must be an object',
    });
    return diagnostics;
  }

  if (!('transforms' in parsed)) {
    diagnostics.push({
      from: 0,
      to: Math.min(20, content.length),
      severity: 'error',
      message: 'Missing required "transforms" property',
    });
    return diagnostics;
  }

  if (!Array.isArray(parsed.transforms)) {
    // Find position of "transforms" in the source
    const transformsMatch = content.match(/"transforms"\s*:/);
    const pos = transformsMatch?.index ?? 0;
    diagnostics.push({
      from: pos,
      to: pos + 12,
      severity: 'error',
      message: '"transforms" must be an array',
    });
    return diagnostics;
  }

  // 3. Validate each transform step
  parsed.transforms.forEach((step: any, index: number) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      diagnostics.push({
        from: 0,
        to: content.length,
        severity: 'error',
        message: `Step ${index + 1}: must be an object`,
      });
      return;
    }

    const keys = Object.keys(step).filter((k) => k !== '__v');

    if (keys.length === 0) {
      diagnostics.push({
        from: 0,
        to: content.length,
        severity: 'warning',
        message: `Step ${index + 1}: empty transform (no operation specified)`,
      });
      return;
    }

    // Check for unknown transform keys
    for (const key of keys) {
      if (!KNOWN_TRANSFORM_KEYS.includes(key)) {
        // Try to find this key in the source for better positioning
        const keyRegex = new RegExp(`"${key}"\\s*:`);
        const match = content.match(keyRegex);
        const pos = match?.index ?? 0;

        diagnostics.push({
          from: pos,
          to: pos + key.length + 2,
          severity: 'warning',
          message: `Step ${index + 1}: unknown transform "${key}"`,
        });
      }
    }
  });

  // Validate expressions in filter, derive, and conditional transforms
  for (const { stepIndex, field, error, expr, jsonKey } of validateStepExpressions(
    parsed.transforms
  )) {
    const pos = findExpressionPosition(content, expr, jsonKey);
    diagnostics.push({
      from: pos,
      to: pos + expr.length,
      severity: 'error',
      message: `Step ${stepIndex + 1} ${field}: ${error}`,
    });
  }

  return diagnostics;
}

/**
 * Validate an array of step objects loaded from storage.
 * Returns a list of warning strings (empty if all valid).
 * Used to validate workflows loaded from IndexedDB.
 */
export function validateSteps(steps: any[]): string[] {
  const warnings: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      warnings.push(`Step ${i + 1}: not a valid object`);
      continue;
    }

    const keys = Object.keys(step).filter((k) => k !== '__v');

    // Check for unknown transform keys
    for (const key of keys) {
      if (!KNOWN_TRANSFORM_KEYS.includes(key)) {
        warnings.push(`Step ${i + 1}: unknown transform "${key}"`);
      }
    }
  }

  // Validate expressions
  for (const { stepIndex, field, error } of validateStepExpressions(steps)) {
    warnings.push(`Step ${stepIndex + 1} ${field}: ${error}`);
  }

  return warnings;
}

/**
 * Get the error message suitable for the Apply button state.
 * Returns null if valid, error string if invalid.
 */
export function getTransformJsonError(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed?.transforms)) {
      return 'JSON must contain a "transforms" array';
    }

    for (const { stepIndex, field, error } of validateStepExpressions(parsed.transforms)) {
      return `Step ${stepIndex + 1} ${field}: ${error}`;
    }

    return null;
  } catch (e: any) {
    return e.message;
  }
}
