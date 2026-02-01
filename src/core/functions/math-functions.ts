/**
 * Math functions for AST interpreter
 *
 * @category Math
 */

/**
 * @category Math
 * @description Returns the absolute value of a number
 * @param value - Numeric value
 * @returns Absolute value, or null if input is null/invalid
 * @example abs(-5)
 * @example abs(-5) -> 5
 */
export const abs = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.abs(num);
};

/**
 * @category Math
 * @description Returns the base raised to the power of the exponent
 * @param base - The base number
 * @param exponent - The exponent
 * @returns Base raised to the power of exponent, or null if invalid
 * @example pow(2, 3) -> 8
 */
export const pow = (base: any, exponent: any) => {
  if (base == null || exponent == null) return null;
  const b = Number(base);
  const e = Number(exponent);
  return isNaN(b) || isNaN(e) ? null : Math.pow(b, e);
};

/**
 * @category Math
 * @description Returns the square root of a number
 * @param value - Numeric value
 * @returns Square root, or null if number is negative or invalid
 * @example sqrt(16) -> 4
 */
export const sqrt = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num < 0 ? null : Math.sqrt(num);
};

/**
 * @category Math
 * @description Returns the cube root of a number
 * @param value - Numeric value
 * @returns Cube root, or null if invalid
 * @example cbrt(27) -> 3
 */
export const cbrt = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.cbrt(num);
};

/**
 * @category Math
 * @description Returns e raised to the power of the value
 * @param value - Numeric value
 * @returns e^value, or null if invalid
 * @example exp(1) -> 2.71828...
 */
export const exp = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.exp(num);
};

/**
 * @category Math
 * @description Returns the natural logarithm (base e) of a number
 * @param value - Numeric value
 * @returns Natural logarithm, or null if value <= 0 or invalid
 * @example ln(2.71828) -> 1
 */
export const ln = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num <= 0 ? null : Math.log(num);
};

/**
 * @category Math
 * @description Returns the base 10 logarithm of a number
 * @param value - Numeric value
 * @returns Base 10 logarithm, or null if value <= 0 or invalid
 * @example log10(100) -> 2
 */
export const log10 = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num <= 0 ? null : Math.log10(num);
};

/**
 * @category Math
 * @description Returns the base 2 logarithm of a number
 * @param value - Numeric value
 * @returns Base 2 logarithm, or null if value <= 0 or invalid
 * @example log2(8) -> 3
 */
export const log2 = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num <= 0 ? null : Math.log2(num);
};

/**
 * @category Math
 * @description Returns the sine of an angle (in radians)
 * @param value - Angle in radians
 * @returns Sine of the angle, or null if invalid
 * @example sin(pi() / 2) -> 1
 */
export const sin = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.sin(num);
};

/**
 * @category Math
 * @description Returns the cosine of an angle (in radians)
 * @param value - Angle in radians
 * @returns Cosine of the angle, or null if invalid
 * @example cos(0) -> 1
 */
export const cos = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.cos(num);
};

/**
 * @category Math
 * @description Returns the tangent of an angle (in radians)
 * @param value - Angle in radians
 * @returns Tangent of the angle, or null if invalid
 * @example tan(0) -> 0
 */
export const tan = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.tan(num);
};

/**
 * @category Math
 * @description Returns the arcsine (in radians) of a number
 * @param value - Number between -1 and 1
 * @returns Arcsine in radians, or null if value is outside [-1, 1] or invalid
 * @example asin(1) -> 1.57079...
 */
export const asin = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num < -1 || num > 1 ? null : Math.asin(num);
};

/**
 * @category Math
 * @description Returns the arccosine (in radians) of a number
 * @param value - Number between -1 and 1
 * @returns Arccosine in radians, or null if value is outside [-1, 1] or invalid
 * @example acos(1) -> 0
 */
export const acos = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) || num < -1 || num > 1 ? null : Math.acos(num);
};

/**
 * @category Math
 * @description Returns the arctangent (in radians) of a number
 * @param value - Numeric value
 * @returns Arctangent in radians, or null if invalid
 * @example atan(0) -> 0
 */
export const atan = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.atan(num);
};

/**
 * @category Math
 * @description Returns the angle (in radians) from the X-axis to a point (x, y)
 * @param y - Y-coordinate
 * @param x - X-coordinate
 * @returns Angle in radians, or null if invalid
 * @example atan2(1, 1) -> 0.78539...
 */
export const atan2 = (y: any, x: any) => {
  if (y == null || x == null) return null;
  const numY = Number(y);
  const numX = Number(x);
  return isNaN(numY) || isNaN(numX) ? null : Math.atan2(numY, numX);
};

/**
 * @category Math
 * @description Converts degrees to radians
 * @param value - Angle in degrees
 * @returns Angle in radians, or null if invalid
 * @example radians(180) -> 3.14159...
 */
export const radians = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : (num * Math.PI) / 180;
};

/**
 * @category Math
 * @description Converts radians to degrees
 * @param value - Angle in radians
 * @returns Angle in degrees, or null if invalid
 * @example degrees(pi()) -> 180
 */
export const degrees = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : (num * 180) / Math.PI;
};

/**
 * @category Math
 * @description Returns the sign of a number, indicating whether it is positive (1), negative (-1), or zero (0)
 * @param value - Numeric value
 * @returns 1, -1, 0, or null if invalid
 * @example sign(-5) -> -1
 */
export const sign = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.sign(num);
};

/**
 * @category Math
 * @description Returns the integer part of a number by removing any fractional digits
 * @param value - Numeric value
 * @returns Integer part, or null if invalid
 * @example trunc(13.37) -> 13
 */
export const trunc = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.trunc(num);
};

/**
 * @category Math
 * @description Returns the value of PI (approximately 3.14159)
 * @returns PI
 * @example pi() -> 3.14159...
 */
export const pi = () => Math.PI;

/**
 * @category Math
 * @description Returns Euler's number E (approximately 2.71828)
 * @returns E
 * @example e() -> 2.71828...
 */
export const e = () => Math.E;

/**
 * @category Math
 * @description Rounds a number to specified decimal places
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Rounded number, or null if input is null/invalid
 * @example round(3.7)
 * @example round(3.14159, 2) -> 3.14
 */
export const round = (value: any, decimals = 0) => {
  if (value == null) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  const factor = Math.pow(10, Math.floor(decimals));
  return Math.round(num * factor) / factor;
};

/**
 * @category Math
 * @description Rounds a number down to the nearest integer
 * @param value - Numeric value
 * @returns Floored number, or null if input is null/invalid
 * @example floor(3.9)
 * @example floor(3.9) -> 3
 */
export const floor = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.floor(num);
};

/**
 * @category Math
 * @description Rounds a number up to the nearest integer
 * @param value - Numeric value
 * @returns Ceiled number, or null if input is null/invalid
 * @example ceil(3.1)
 * @example ceil(3.1) -> 4
 */
export const ceil = (value: any) => {
  if (value == null) return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.ceil(num);
};

/**
 * @category Math
 * @description Returns the minimum value from a list of numbers
 * @param args - Variable number of numeric values
 * @returns Minimum value, or null if all inputs are null/invalid
 * @example min(price, cost, 100)
 * @example min(10, 5, 20) -> 5
 */
export const min = (...args: any[]) => {
  const nums = args
    .filter((v) => v != null)
    .map(Number)
    .filter((n) => !isNaN(n));
  return nums.length === 0 ? null : Math.min(...nums);
};

/**
 * @category Math
 * @description Returns the maximum value from a list of numbers
 * @param args - Variable number of numeric values
 * @returns Maximum value, or null if all inputs are null/invalid
 * @example max(price, cost)
 * @example max(10, 5, 20) -> 20
 */
export const max = (...args: any[]) => {
  const nums = args
    .filter((v) => v != null)
    .map(Number)
    .filter((n) => !isNaN(n));
  return nums.length === 0 ? null : Math.max(...nums);
};

export const mathFunctions = {
  abs,
  pow,
  sqrt,
  cbrt,
  exp,
  ln,
  log10,
  log2,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  atan2,
  radians,
  degrees,
  sign,
  trunc,
  pi,
  e,
  round,
  floor,
  ceil,
  min,
  max,
};
