/**
 * Type conversion functions for AST interpreter
 *
 * @category Conversion
 */

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

export const typeFunctions = {
  parse_int,
  parse_float,
  is_nan,
};
