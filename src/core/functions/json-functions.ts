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

export const jsonFunctions = {
  is_json,
  json_extract,
};
