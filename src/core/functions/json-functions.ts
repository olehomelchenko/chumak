/**
 * JSON functions for AST interpreter
 *
 * @category JSON
 */

/**
 * @category JSON
 * @description Tests if a string contains valid JSON
 * @param value - String value to test
 * @returns true if valid JSON, false otherwise, null if input is null
 * @example is_json('{"name": "Alice"}')
 * @example is_json('{"valid": true}') -> true
 * @example is_json('invalid') -> false
 */
export const is_json = (value: any) => {
  if (value == null) return null;
  try {
    JSON.parse(String(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * @category JSON
 * @description Parses JSON string and extracts value at specified path
 * @param value - String containing JSON
 * @param path - Dot-notation path (e.g., "user.name" or "items.0.price")
 * @returns Extracted value, or null if path not found or JSON invalid
 * @example json_extract('{"name":"Alice"}', "name")
 * @example json_extract('{"name":"Alice"}', "name") -> "Alice"
 * @example json_extract('{"user":{"email":"a@b.com"}}', "user.email") -> "a@b.com"
 * @example json_extract('{"items":[{"price":10}]}', "items.0.price") -> 10
 */
export const json_extract = (value: any, path: any) => {
  if (value == null || path == null) return null;
  try {
    const obj = JSON.parse(String(value));
    const pathParts = String(path).split('.');
    let result: any = obj;
    for (const part of pathParts) {
      if (result == null) return null;
      // Check if part is numeric (array index)
      const index = Number(part);
      if (!isNaN(index) && Array.isArray(result)) {
        result = result[index];
      } else {
        result = result[part];
      }
    }
    return result === undefined ? null : result;
  } catch {
    return null;
  }
};

/**
 * @category JSON
 * @description Returns an array of top-level keys from a JSON object string
 * @param value - String containing a JSON object
 * @returns Array of key names, or null if not a JSON object or input is null
 * @example json_keys('{"name":"Alice","age":30}')
 * @example json_keys('{"name":"Alice","age":30}') -> ["name","age"]
 * @example json_keys('[1,2,3]') -> null
 */
export const json_keys = (value: any) => {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(String(value));
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.keys(parsed);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * @category JSON
 * @description Returns the length of a JSON array string
 * @param value - String containing a JSON array
 * @returns Length of the array, or null if not a JSON array or input is null
 * @example json_array_length('[1,2,3]')
 * @example json_array_length('[1,2,3]') -> 3
 * @example json_array_length('{"a":1}') -> null
 */
export const json_array_length = (value: any) => {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * @category JSON
 * @description Returns the JSON type of the top-level value in a JSON string
 * @param value - String containing valid JSON
 * @returns One of "object", "array", "string", "number", "boolean", "null", or null if invalid
 * @example json_type('{"a":1}')
 * @example json_type('{"a":1}') -> "object"
 * @example json_type('[1,2]') -> "array"
 * @example json_type('"hello"') -> "string"
 */
export const json_type = (value: any) => {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(String(value));
    if (parsed === null) return 'null';
    if (Array.isArray(parsed)) return 'array';
    return typeof parsed;
  } catch {
    return null;
  }
};

/**
 * @category JSON
 * @description Converts any value to its JSON string representation
 * @param value - Any value to stringify
 * @returns JSON string representation
 * @example json_stringify(42)
 * @example json_stringify(42) -> "42"
 * @example json_stringify("hello") -> "\"hello\""
 */
export const json_stringify = (value: any) => {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const jsonFunctions = {
  is_json,
  json_extract,
  json_keys,
  json_array_length,
  json_type,
  json_stringify,
};
