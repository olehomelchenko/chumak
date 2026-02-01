/**
 * Regex functions for AST interpreter
 *
 * @category Regex
 */

function parseRegexFlags(pattern: string) {
  const flagMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
  if (flagMatch) {
    return {
      pattern: pattern.slice(flagMatch[0].length),
      flags: flagMatch[1],
    };
  }
  return { pattern, flags: '' };
}

/**
 * @category Regex
 * @description Tests if a value matches a regular expression pattern
 * @param value - Text value to test
 * @param pattern - Regular expression pattern (use (?i) prefix for case-insensitive)
 * @returns true if pattern matches, false otherwise, null if value is null
 * @example regexp_match(email, "@gmail\\.com$")
 * @example regexp_match(name, "(?i)john") // Case-insensitive
 */
export const regexp_match = (value: any, pattern: string) => {
  if (value == null) return null;
  try {
    const { pattern: p, flags } = parseRegexFlags(pattern);
    return new RegExp(p, flags).test(String(value));
  } catch (e: any) {
    return { type: 'error', message: e.message };
  }
};

/**
 * @category Regex
 * @description Extracts text matching a regular expression pattern
 * @param value - Text value to extract from
 * @param pattern - Regular expression pattern
 * @param group - Capture group index (default: 0 for full match)
 * @returns Matched text or null if no match
 * @example regexp_extract(phone, "\\d{3}-\\d{4}")
 * @example regexp_extract(name, "(\\w+) (\\w+)", 1) // First capture group
 */
export const regexp_extract = (value: any, pattern: string, group = 0) => {
  if (value == null) return null;
  try {
    const { pattern: p, flags } = parseRegexFlags(pattern);
    const match = String(value).match(new RegExp(p, flags));
    if (!match) return null;
    return match[group] ?? null;
  } catch (e: any) {
    return { type: 'error', message: e.message };
  }
};

/**
 * @category Regex
 * @description Replaces text matching a regular expression pattern
 * @param value - Text value to perform replacement on
 * @param pattern - Regular expression pattern to match
 * @param replacement - Replacement string (supports $1, $2, etc. for capture groups)
 * @returns Text with replacements made, or null if value is null
 * @example regexp_replace(phone, "(\\d{3})-(\\d{4})", "($1) $2")
 * @example regexp_replace(text, "(?i)hello", "Hi") // Case-insensitive replacement
 * @example regexp_replace("foo bar foo", "foo", "baz") -> "baz bar baz"
 */
export const regexp_replace = (value: any, pattern: string, replacement: any) => {
  if (value == null) return null;
  if (replacement == null) replacement = '';
  try {
    const { pattern: p, flags } = parseRegexFlags(pattern);
    // Add 'g' flag for global replacement if not already present
    const finalFlags = flags.includes('g') ? flags : flags + 'g';
    return String(value).replace(new RegExp(p, finalFlags), String(replacement));
  } catch (e: any) {
    return { type: 'error', message: e.message };
  }
};

export const regexFunctions = {
  regexp_match,
  regexp_extract,
  regexp_replace,
};
