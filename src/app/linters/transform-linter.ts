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

    // Validate expressions in filter, derive, and conditional transforms
    if (step.filter && typeof step.filter === 'string') {
      const error = validateExpression(step.filter);
      if (error) {
        const pos = findExpressionPosition(content, step.filter, 'filter');
        diagnostics.push({
          from: pos,
          to: pos + step.filter.length,
          severity: 'error',
          message: `Step ${index + 1} filter: ${error}`,
        });
      }
    }

    if (step.derive && typeof step.derive === 'object') {
      for (const [colName, expr] of Object.entries(step.derive)) {
        if (typeof expr === 'string') {
          const error = validateExpression(expr);
          if (error) {
            const pos = findExpressionPosition(content, expr, colName);
            diagnostics.push({
              from: pos,
              to: pos + expr.length,
              severity: 'error',
              message: `Step ${index + 1} derive "${colName}": ${error}`,
            });
          }
        }
      }
    }

    if (step.conditional) {
      const { conditions, else: elseExpr } = step.conditional;
      if (Array.isArray(conditions)) {
        conditions.forEach((cond: any, condIndex: number) => {
          if (cond.when && typeof cond.when === 'string') {
            const error = validateExpression(cond.when);
            if (error) {
              const pos = findExpressionPosition(content, cond.when, 'when');
              diagnostics.push({
                from: pos,
                to: pos + cond.when.length,
                severity: 'error',
                message: `Step ${index + 1} condition ${condIndex + 1} "when": ${error}`,
              });
            }
          }
          if (cond.then && typeof cond.then === 'string') {
            const error = validateExpression(cond.then);
            if (error) {
              const pos = findExpressionPosition(content, cond.then, 'then');
              diagnostics.push({
                from: pos,
                to: pos + cond.then.length,
                severity: 'error',
                message: `Step ${index + 1} condition ${condIndex + 1} "then": ${error}`,
              });
            }
          }
        });
      }
      if (elseExpr && typeof elseExpr === 'string') {
        const error = validateExpression(elseExpr);
        if (error) {
          const pos = findExpressionPosition(content, elseExpr, 'else');
          diagnostics.push({
            from: pos,
            to: pos + elseExpr.length,
            severity: 'error',
            message: `Step ${index + 1} "else": ${error}`,
          });
        }
      }
    }
  });

  return diagnostics;
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

    // Validate expressions in each transform
    for (let i = 0; i < parsed.transforms.length; i++) {
      const step = parsed.transforms[i];
      if (!step || typeof step !== 'object') continue;

      // Validate filter expression
      if (step.filter && typeof step.filter === 'string') {
        const error = validateExpression(step.filter);
        if (error) {
          return `Step ${i + 1} filter: ${error}`;
        }
      }

      // Validate derive expressions
      if (step.derive && typeof step.derive === 'object') {
        for (const [colName, expr] of Object.entries(step.derive)) {
          if (typeof expr === 'string') {
            const error = validateExpression(expr);
            if (error) {
              return `Step ${i + 1} derive "${colName}": ${error}`;
            }
          }
        }
      }

      // Validate conditional expressions
      if (step.conditional) {
        const { conditions, else: elseExpr } = step.conditional;
        if (Array.isArray(conditions)) {
          for (let j = 0; j < conditions.length; j++) {
            const cond = conditions[j];
            if (cond.when && typeof cond.when === 'string') {
              const error = validateExpression(cond.when);
              if (error) {
                return `Step ${i + 1} condition ${j + 1} "when": ${error}`;
              }
            }
            if (cond.then && typeof cond.then === 'string') {
              const error = validateExpression(cond.then);
              if (error) {
                return `Step ${i + 1} condition ${j + 1} "then": ${error}`;
              }
            }
          }
        }
        if (elseExpr && typeof elseExpr === 'string') {
          const error = validateExpression(elseExpr);
          if (error) {
            return `Step ${i + 1} "else": ${error}`;
          }
        }
      }
    }

    return null;
  } catch (e: any) {
    return e.message;
  }
}
