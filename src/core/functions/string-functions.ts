/**
 * String functions for AST interpreter
 *
 * @category Text
 */

/**
 * @category Text
 * @description Converts text to uppercase
 * @param value - Text value
 * @returns Uppercase string, or null if input is null
 * @example upper(name)
 * @example upper("john doe") -> "JOHN DOE"
 */
export const upper = (value: any) => {
  if (value == null) return null;
  return String(value).toUpperCase();
};

/**
 * @category Text
 * @description Converts text to lowercase
 * @param value - Text value
 * @returns Lowercase string, or null if input is null
 * @example lower(name)
 * @example lower("JOHN DOE") -> "john doe"
 */
export const lower = (value: any) => {
  if (value == null) return null;
  return String(value).toLowerCase();
};

/**
 * @category Text
 * @description Converts text to title case (capitalizes first letter of each word)
 * @param value - Text value
 * @returns Title case string, or null if input is null
 * @example titlecase(name)
 * @example titlecase("john doe") -> "John Doe"
 */
export const titlecase = (value: any) => {
  if (value == null) return null;
  const str = String(value);
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * @category Text
 * @description Removes leading and trailing whitespace
 * @param value - Text value
 * @returns Trimmed string, or null if input is null
 * @example trim(padded)
 * @example trim("  hello  ") -> "hello"
 */
export const trim = (value: any) => {
  if (value == null) return null;
  return String(value).trim();
};

/**
 * @category Text
 * @description Extracts a substring from text
 * @param value - Text value
 * @param start - Start index (0-based)
 * @param length - Optional length of substring
 * @returns Substring, or null if input is null
 * @example substring(name, 5)
 * @example substring("John Doe", 0, 4) -> "John"
 */
export const substring = (value: any, start: number, length?: number) => {
  if (value == null) return null;
  const str = String(value);
  const startIdx = Math.max(0, Math.floor(start));
  if (length === undefined) {
    return str.substring(startIdx);
  }
  const len = Math.max(0, Math.floor(length));
  return str.substring(startIdx, startIdx + len);
};

/**
 * @category Text
 * @description Returns the length of a string
 * @param value - Text value
 * @returns String length as number, or null if input is null
 * @example len(name)
 * @example len("John Doe") -> 8
 */
export const len = (value: any) => {
  if (value == null) return null;
  // Uses JavaScript's string length which counts UTF-16 code units
  // This means surrogate pairs (emojis, etc.) count as 2
  return String(value).length;
};

/**
 * @category Text
 * @description Splits text by delimiter and returns segment at index
 * @param value - Text value to split
 * @param delimiter - Delimiter string
 * @param index - Index of segment to return (default: 0, use -1 for last segment)
 * @returns Segment at index, or null if index is out of bounds
 * @example split("a,b,c", ",")
 * @example split("a,b,c", ",", 2) -> "c"
 * @example split("a,b,c", ",", -1) -> "c"
 */
export const split = (value: any, delimiter: any, index = 0) => {
  if (value == null) return null;
  const str = String(value);
  const delim = delimiter != null ? String(delimiter) : '';
  const parts = str.split(delim);
  // Handle negative index (count from end: -1 = last, -2 = second-to-last, etc.)
  const idx = index < 0 ? parts.length + index : index;
  if (idx < 0 || idx >= parts.length) return null;
  return parts[idx];
};

// String comparison functions (case-sensitive)

/**
 * @category Text
 * @description Tests if two values are equal (case-sensitive)
 * @param value1 - First value
 * @param value2 - Second value
 * @returns true if equal, false otherwise
 * @example equals(name, "Alice")
 * @example equals("Alice", "alice") -> false
 */
export const equals = (value1: any, value2: any) => {
  if (value1 == null || value2 == null) return false;
  return String(value1) === String(value2);
};

/**
 * @category Text
 * @description Tests if text contains a substring (case-sensitive)
 * @param value - Text value
 * @param substring - Substring to search for
 * @returns true if substring is found, false otherwise
 * @example contains(code, "ABC")
 * @example contains("ABCDEF", "BCD") -> true
 */
export const contains = (value: any, substr: any) => {
  if (value == null || substr == null) return false;
  return String(value).includes(String(substr));
};

/**
 * @category Text
 * @description Tests if text starts with a prefix (case-sensitive)
 * @param value - Text value
 * @param prefix - Prefix to check for
 * @returns true if text starts with prefix, false otherwise
 * @example starts_with(code, "AB")
 * @example starts_with("ABCDEF", "ABC") -> true
 */
export const starts_with = (value: any, prefix: any) => {
  if (value == null || prefix == null) return false;
  return String(value).startsWith(String(prefix));
};

/**
 * @category Text
 * @description Tests if text ends with a suffix (case-sensitive)
 * @param value - Text value
 * @param suffix - Suffix to check for
 * @returns true if text ends with suffix, false otherwise
 * @example ends_with(file, ".csv")
 * @example ends_with("data.csv", ".csv") -> true
 */
export const ends_with = (value: any, suffix: any) => {
  if (value == null || suffix == null) return false;
  return String(value).endsWith(String(suffix));
};

// Case-insensitive comparison functions

/**
 * @category Text
 * @description Tests if two values are equal (case-insensitive)
 * @param value1 - First value
 * @param value2 - Second value
 * @returns true if equal (ignoring case), false otherwise
 * @example equals_ci(name, "alice")
 * @example equals_ci("Alice", "ALICE") -> true
 */
export const equals_ci = (value1: any, value2: any) => {
  if (value1 == null || value2 == null) return false;
  return String(value1).toLowerCase() === String(value2).toLowerCase();
};

/**
 * @category Text
 * @description Tests if text contains a substring (case-insensitive)
 * @param value - Text value
 * @param substring - Substring to search for
 * @returns true if substring is found (ignoring case), false otherwise
 * @example contains_ci(code, "abc")
 * @example contains_ci("ABCDEF", "bcd") -> true
 */
export const contains_ci = (value: any, substr: any) => {
  if (value == null || substr == null) return false;
  return String(value).toLowerCase().includes(String(substr).toLowerCase());
};

/**
 * @category Text
 * @description Tests if text starts with a prefix (case-insensitive)
 * @param value - Text value
 * @param prefix - Prefix to check for
 * @returns true if text starts with prefix (ignoring case), false otherwise
 * @example starts_with_ci(code, "ab")
 * @example starts_with_ci("ABCDEF", "abc") -> true
 */
export const starts_with_ci = (value: any, prefix: any) => {
  if (value == null || prefix == null) return false;
  return String(value).toLowerCase().startsWith(String(prefix).toLowerCase());
};

/**
 * @category Text
 * @description Tests if text ends with a suffix (case-insensitive)
 * @param value - Text value
 * @param suffix - Suffix to check for
 * @returns true if text ends with suffix (ignoring case), false otherwise
 * @example ends_with_ci(file, ".CSV")
 * @example ends_with_ci("data.csv", ".CSV") -> true
 */
export const ends_with_ci = (value: any, suffix: any) => {
  if (value == null || suffix == null) return false;
  return String(value).toLowerCase().endsWith(String(suffix).toLowerCase());
};

export const stringFunctions = {
  upper,
  lower,
  titlecase,
  trim,
  substring,
  len,
  split,
  equals,
  contains,
  starts_with,
  ends_with,
  equals_ci,
  contains_ci,
  starts_with_ci,
  ends_with_ci,
};
