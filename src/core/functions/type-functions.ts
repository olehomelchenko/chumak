/**
 * Type conversion functions for AST interpreter
 *
 * @category Conversion
 */

import { isConversionError } from '../type-converter';

/**
 * @category Conversion
 * @description Parses a value as an integer
 * @param value - Value to parse
 * @returns Integer value, or null if parsing fails
 * @example parse_int("42")
 * @example parse_int("42") -> 42
 */
export const parse_int = (value: any) => {
  if (value == null) return null;
  const result = parseInt(String(value), 10);
  return isNaN(result) ? null : result;
};

/**
 * @category Conversion
 * @description Parses a value as a floating-point number
 * @param value - Value to parse
 * @returns Float value, or null if parsing fails
 * @example parse_float("3.14")
 * @example parse_float("3.14") -> 3.14
 */
export const parse_float = (value: any) => {
  if (value == null) return null;
  const result = parseFloat(String(value));
  return isNaN(result) ? null : result;
};

/**
 * @category Conversion
 * @description Tests if a value is not a valid number
 * @param value - Value to test
 * @returns true if value is NaN, false otherwise
 * @example is_nan("abc")
 * @example is_nan("abc") -> true
 */
export const is_nan = (value: any) => {
  if (value == null) return false;
  return Number.isNaN(Number(value));
};

/**
 * @category Conversion
 * @description Tests if a value is a conversion error
 * @param value - Value to test
 * @returns true if value is an error object, false otherwise
 * @example is_error(price)
 * @example is_error(price) -> true (when price contains a conversion error)
 */
export const is_error = (value: any) => {
  return isConversionError(value);
};

/**
 * @name if
 * @category Conversion
 * @description Returns one of two values based on a condition (if-then-else)
 * @param condition - Expression that evaluates to true or false
 * @param then_value - Value returned when condition is true
 * @param else_value - Value returned when condition is false
 * @returns then_value if condition is truthy, else_value otherwise
 * @example if(age >= 18, "adult", "minor")
 * @example if(score > 90, "A", "B") -> "A" (when score is 95)
 *
 * Note: Both branches are eagerly evaluated (no short-circuit). Use ternary `? :` when branches may error.
 */
const if_ = (condition: any, thenValue: any, elseValue: any) => {
  return condition ? thenValue : elseValue;
};

/**
 * @category Conversion
 * @description Returns the first non-null, non-error value from a list of arguments
 * @param args - Variable number of values to check
 * @returns First non-null/non-undefined/non-error value, or null if all are null/error
 * @example coalesce(preferred_name, first_name, "Unknown")
 * @example coalesce(null, null, "fallback") -> "fallback"
 */
export const coalesce = (...args: any[]) => {
  for (const arg of args) {
    if (arg !== null && arg !== undefined && !isConversionError(arg)) return arg;
  }
  return null;
};

export const typeFunctions: Record<string, (...args: any[]) => any> = {
  parse_int,
  parse_float,
  is_nan,
  is_error,
  if: if_,
  coalesce,
};
