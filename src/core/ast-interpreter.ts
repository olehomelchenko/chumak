import { ASTNode } from './expression-parser';

/**
 * Syto AST Interpreter - Safe expression evaluation
 */

const BINARY_OPS: Record<string, (l: any, r: any) => any> = {
  '+': (l, r) => l + r,
  '-': (l, r) => l - r,
  '*': (l, r) => l * r,
  '/': (l, r) => l / r,
  '%': (l, r) => l % r,
  '>': (l, r) => l > r,
  '<': (l, r) => l < r,
  '>=': (l, r) => l >= r,
  '<=': (l, r) => l <= r,
  '==': (l, r) => l == r,
  '===': (l, r) => l === r,
  '!=': (l, r) => l != r,
  '!==': (l, r) => l !== r,
};

const UNARY_OPS: Record<string, (a: any) => any> = {
  '!': (a) => !a,
  not: (a) => !a, // Word-form alternative to !
  '-': (a) => -a,
  '+': (a) => +a,
};

const NULL_COMPARISON_OPS = new Set(['==', '===', '!=', '!==']);

/**
 * Parse input to Date object, handling multiple input formats
 */
export function parseToDate(value: any): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // ISO Date only (YYYY-MM-DD) - forced to local midnight to avoid UTC shift
    // by default JS parses YYYY-MM-DD as UTC which is inconsistent with other formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    // ISO DateTime with UTC indicator (YYYY-MM-DDTHH:MM:SS...Z)
    // Extract just the date part to avoid timezone conversion issues
    // This handles legacy data that was serialized with toISOString() which always ends with Z
    // We only do this for UTC strings (ending in Z) to avoid breaking legitimate datetime strings
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(trimmed)) {
      const datePart = trimmed.split('T')[0];
      const [y, m, d] = datePart.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

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

const FUNCTION_IMPLS: Record<string, (...args: any[]) => any> = {
  /**
   * @category Regex
   * @description Tests if a value matches a regular expression pattern
   * @param value - Text value to test
   * @param pattern - Regular expression pattern (use (?i) prefix for case-insensitive)
   * @returns true if pattern matches, false otherwise, null if value is null
   * @example regexp_match(email, "@gmail\\.com$")
   * @example regexp_match(name, "(?i)john") // Case-insensitive
   */
  regexp_match: (value, pattern) => {
    if (value == null) return null;
    try {
      const { pattern: p, flags } = parseRegexFlags(pattern);
      return new RegExp(p, flags).test(String(value));
    } catch (e: any) {
      return { type: 'error', message: e.message };
    }
  },
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
  regexp_extract: (value, pattern, group = 0) => {
    if (value == null) return null;
    try {
      const { pattern: p, flags } = parseRegexFlags(pattern);
      const match = String(value).match(new RegExp(p, flags));
      if (!match) return null;
      return match[group] ?? null;
    } catch (e: any) {
      return { type: 'error', message: e.message };
    }
  },
  /**
   * @category Regex
   * @description Replaces text matching a regular expression pattern
   * @param value - Text value to perform replacement on
   * @param pattern - Regular expression pattern to match
   * @param replacement - Replacement string (supports $1, $2, etc. for capture groups)
   * @returns Text with replacements made, or null if value is null
   * @example regexp_replace(phone, "(\\d{3})-(\\d{4})", "($1) $2")
   * @example regexp_replace(text, "(?i)hello", "Hi") // Case-insensitive replacement
   * @example regexp_replace("foo bar foo", "foo", "baz") → "baz bar baz"
   */
  regexp_replace: (value, pattern, replacement) => {
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
  },

  // Date extraction - Phase 1
  /**
   * @category Date
   * @description Extracts the year from a date value
   * @param value - Date value or date string
   * @returns Year as number (e.g., 2024), or null if invalid
   * @example year(order_date)
   * @example year("2024-01-15") → 2024
   */
  year: (value) => {
    const date = parseToDate(value);
    return date ? date.getFullYear() : null;
  },
  /**
   * @category Date
   * @description Extracts the month from a date value
   * @param value - Date value or date string
   * @returns Month as number (1-12), or null if invalid
   * @example month(created_at)
   * @example month("2024-03-15") → 3
   */
  month: (value) => {
    const date = parseToDate(value);
    return date ? date.getMonth() + 1 : null; // 1-12 instead of 0-11
  },
  /**
   * @category Date
   * @description Extracts the day of month from a date value
   * @param value - Date value or date string
   * @returns Day as number (1-31), or null if invalid
   * @example day(birth_date)
   * @example day("2024-01-15") → 15
   */
  day: (value) => {
    const date = parseToDate(value);
    return date ? date.getDate() : null;
  },
  /**
   * @category Date
   * @description Extracts the hour from a datetime value
   * @param value - Datetime value or datetime string
   * @returns Hour as number (0-23), or null if invalid
   * @example hour(timestamp)
   * @example hour("2024-01-15T14:30:00") → 14
   */
  hour: (value) => {
    const date = parseToDate(value);
    return date ? date.getHours() : null;
  },
  /**
   * @category Date
   * @description Extracts the minute from a datetime value
   * @param value - Datetime value or datetime string
   * @returns Minute as number (0-59), or null if invalid
   * @example minute(timestamp)
   * @example minute("2024-01-15T14:30:00") → 30
   */
  minute: (value) => {
    const date = parseToDate(value);
    return date ? date.getMinutes() : null;
  },
  /**
   * @category Date
   * @description Extracts the second from a datetime value
   * @param value - Datetime value or datetime string
   * @returns Second as number (0-59), or null if invalid
   * @example second(timestamp)
   * @example second("2024-01-15T14:30:45") → 45
   */
  second: (value) => {
    const date = parseToDate(value);
    return date ? date.getSeconds() : null;
  },

  // Date extraction - Phase 2
  /**
   * @category Date
   * @description Returns the day of week (ISO 8601: 0=Monday, 6=Sunday)
   * @param value - Date value or date string
   * @returns Day of week as number (0-6), or null if invalid
   * @example weekday(date)
   * @example weekday("2024-01-15") → 0 // Monday
   */
  weekday: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    // Convert JS Sunday=0 to Monday=0 (ISO 8601)
    return (date.getDay() + 6) % 7;
  },
  /**
   * @category Date
   * @description Returns the ISO week number of the year
   * @param value - Date value or date string
   * @returns Week number (1-53), or null if invalid
   * @example week(order_date)
   * @example week("2024-01-15") → 3
   */
  week: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    // ISO week calculation
    const target = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7; // Monday = 0
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  },
  /**
   * @category Date
   * @description Returns the quarter of the year
   * @param value - Date value or date string
   * @returns Quarter as number (1-4), or null if invalid
   * @example quarter(sale_date)
   * @example quarter("2024-03-15") → 1
   */
  quarter: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    return Math.floor(date.getMonth() / 3) + 1;
  },

  // Date utilities - Phase 3
  /**
   * @category Date
   * @description Returns the current date in YYYY-MM-DD format
   * @returns Current date as string
   * @example order_date == today()
   * @example today() → "2024-01-15"
   */
  today: () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  /**
   * @category Date
   * @description Returns the current datetime in ISO format
   * @returns Current datetime as string
   * @example created_at < now()
   * @example now() → "2024-01-15T14:30:45"
   */
  now: () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  // Date arithmetic - Phase 4
  /**
   * @category Date
   * @description Calculates the number of days between two dates
   * @param date1 - Start date
   * @param date2 - End date
   * @returns Number of days from date1 to date2, or null if either date is invalid
   * @example days_between(start, end)
   * @example days_between("2024-01-01", "2024-01-15") → 14
   */
  days_between: (date1, date2) => {
    const d1 = parseToDate(date1);
    const d2 = parseToDate(date2);
    if (!d1 || !d2) return null;
    // Use UTC to avoid DST issues
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / 86400000);
  },
  /**
   * @category Date
   * @description Adds a time interval to a date
   * @param value - Date value or date string
   * @param amount - Number of units to add (can be negative)
   * @param unit - Time unit: "days", "months", "years", "hours", "minutes", "seconds"
   * @returns New date/datetime as string, or null if invalid
   * @example date_add(order_date, 30, "days")
   * @example date_add("2024-01-15", 2, "months") → "2024-03-15"
   */
  date_add: (value, amount, unit) => {
    const date = parseToDate(value);
    if (!date || typeof amount !== 'number') return null;

    const result = new Date(date);
    const unitLower = String(unit).toLowerCase();

    switch (unitLower) {
      case 'day':
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'month':
      case 'months':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'year':
      case 'years':
        result.setFullYear(result.getFullYear() + amount);
        break;
      case 'hour':
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'minute':
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'second':
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      default:
        return { type: 'error', message: `Unknown unit: ${unit}` };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const resultDate = new Date(result);
    // If it's a date-level addition, return a date string, otherwise datetime
    if (['day', 'days', 'month', 'months', 'year', 'years'].includes(unitLower)) {
      return `${resultDate.getFullYear()}-${pad(resultDate.getMonth() + 1)}-${pad(
        resultDate.getDate()
      )}`;
    }
    return `${resultDate.getFullYear()}-${pad(resultDate.getMonth() + 1)}-${pad(
      resultDate.getDate()
    )}T${pad(resultDate.getHours())}:${pad(resultDate.getMinutes())}:${pad(
      resultDate.getSeconds()
    )}`;
  },
  /**
   * @category Date
   * @description Truncates a date to the start of a time period
   * @param value - Date value or date string
   * @param unit - Truncation unit: "year", "quarter", "month", "week", "day", "hour", "minute", "second"
   * @returns Truncated date/datetime as string, or null if invalid
   * @example date_trunc(timestamp, "month")
   * @example date_trunc("2024-01-15", "month") → "2024-01-01"
   */
  date_trunc: (value, unit) => {
    const date = parseToDate(value);
    if (!date) return null;

    const result = new Date(date);
    const unitLower = String(unit).toLowerCase();

    switch (unitLower) {
      case 'year':
        result.setMonth(0, 1);
        result.setHours(0, 0, 0, 0);
        break;
      case 'quarter': {
        const quarter = Math.floor(result.getMonth() / 3);
        result.setMonth(quarter * 3, 1);
        result.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        break;
      case 'week': {
        const day = result.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // Adjust to previous Monday
        result.setDate(result.getDate() + diff);
        result.setHours(0, 0, 0, 0);
        break;
      }
      case 'day':
        result.setHours(0, 0, 0, 0);
        break;
      case 'hour':
        result.setMinutes(0, 0, 0);
        break;
      case 'minute':
        result.setSeconds(0, 0);
        break;
      case 'second':
        result.setMilliseconds(0);
        break;
      default:
        return { type: 'error', message: `Unknown truncation unit: ${unit}` };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    if (['year', 'quarter', 'month', 'week', 'day'].includes(unitLower)) {
      return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
    }
    return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(
      result.getHours()
    )}:${pad(result.getMinutes())}:${pad(result.getSeconds())}`;
  },
  /**
   * @category Date
   * @description Formats a date using a custom format string
   * @param value - Date value or date string
   * @param format - Format string using tokens (YYYY, MM, DD, HH, mm, ss, etc.)
   * @returns Formatted date string, or null if invalid
   * @example format_date(date, "DD/MM/YYYY")
   * @example format_date("2024-01-15", "MM/DD/YYYY") → "01/15/2024"
   */
  format_date: (value, format) => {
    const date = parseToDate(value);
    if (!date || typeof format !== 'string') return null;

    const pad = (n: number, len: number = 2) => String(n).padStart(len, '0');

    const tokens: Record<string, string> = {
      YYYY: String(date.getFullYear()),
      YY: String(date.getFullYear()).slice(-2),
      MM: pad(date.getMonth() + 1),
      M: String(date.getMonth() + 1),
      DD: pad(date.getDate()),
      D: String(date.getDate()),
      HH: pad(date.getHours()),
      H: String(date.getHours()),
      mm: pad(date.getMinutes()),
      m: String(date.getMinutes()),
      ss: pad(date.getSeconds()),
      s: String(date.getSeconds()),
    };

    // Replace tokens in order of specificity (longest first)
    let result = format;
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);
    for (const token of sortedTokens) {
      result = result.split(token).join(tokens[token]);
    }

    return result;
  },

  // String functions
  /**
   * @category Text
   * @description Converts text to uppercase
   * @param value - Text value
   * @returns Uppercase string, or null if input is null
   * @example upper(name)
   * @example upper("john doe") → "JOHN DOE"
   */
  upper: (value) => {
    if (value == null) return null;
    return String(value).toUpperCase();
  },
  /**
   * @category Text
   * @description Converts text to lowercase
   * @param value - Text value
   * @returns Lowercase string, or null if input is null
   * @example lower(name)
   * @example lower("JOHN DOE") → "john doe"
   */
  lower: (value) => {
    if (value == null) return null;
    return String(value).toLowerCase();
  },
  /**
   * @category Text
   * @description Converts text to title case (capitalizes first letter of each word)
   * @param value - Text value
   * @returns Title case string, or null if input is null
   * @example titlecase(name)
   * @example titlecase("john doe") → "John Doe"
   */
  titlecase: (value) => {
    if (value == null) return null;
    const str = String(value);
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },
  /**
   * @category Text
   * @description Removes leading and trailing whitespace
   * @param value - Text value
   * @returns Trimmed string, or null if input is null
   * @example trim(padded)
   * @example trim("  hello  ") → "hello"
   */
  trim: (value) => {
    if (value == null) return null;
    return String(value).trim();
  },
  /**
   * @category Text
   * @description Extracts a substring from text
   * @param value - Text value
   * @param start - Start index (0-based)
   * @param length - Optional length of substring
   * @returns Substring, or null if input is null
   * @example substring(name, 5)
   * @example substring("John Doe", 0, 4) → "John"
   */
  substring: (value, start, length) => {
    if (value == null) return null;
    const str = String(value);
    const startIdx = Math.max(0, Math.floor(start));
    if (length === undefined) {
      return str.substring(startIdx);
    }
    const len = Math.max(0, Math.floor(length));
    return str.substring(startIdx, startIdx + len);
  },
  /**
   * @category Text
   * @description Returns the length of a string
   * @param value - Text value
   * @returns String length as number, or null if input is null
   * @example len(name)
   * @example len("John Doe") → 8
   */
  len: (value) => {
    if (value == null) return null;
    // Uses JavaScript's string length which counts UTF-16 code units
    // This means surrogate pairs (emojis, etc.) count as 2
    return String(value).length;
  },
  /**
   * @category Text
   * @description Splits text by delimiter and returns segment at index
   * @param value - Text value to split
   * @param delimiter - Delimiter string
   * @param index - Index of segment to return (default: 0, use -1 for last segment)
   * @returns Segment at index, or null if index is out of bounds
   * @example split("a,b,c", ",")
   * @example split("a,b,c", ",", 2) → "c"
   * @example split("a,b,c", ",", -1) → "c"
   */
  split: (value, delimiter, index = 0) => {
    if (value == null) return null;
    const str = String(value);
    const delim = delimiter != null ? String(delimiter) : '';
    const parts = str.split(delim);
    // Handle negative index (count from end: -1 = last, -2 = second-to-last, etc.)
    const idx = index < 0 ? parts.length + index : index;
    if (idx < 0 || idx >= parts.length) return null;
    return parts[idx];
  },

  // String comparison functions (case-sensitive)
  /**
   * @category Text
   * @description Tests if two values are equal (case-sensitive)
   * @param value1 - First value
   * @param value2 - Second value
   * @returns true if equal, false otherwise
   * @example equals(name, "Alice")
   * @example equals("Alice", "alice") → false
   */
  equals: (value1, value2) => {
    if (value1 == null || value2 == null) return false;
    return String(value1) === String(value2);
  },
  /**
   * @category Text
   * @description Tests if text contains a substring (case-sensitive)
   * @param value - Text value
   * @param substring - Substring to search for
   * @returns true if substring is found, false otherwise
   * @example contains(code, "ABC")
   * @example contains("ABCDEF", "BCD") → true
   */
  contains: (value, substring) => {
    if (value == null || substring == null) return false;
    return String(value).includes(String(substring));
  },
  /**
   * @category Text
   * @description Tests if text starts with a prefix (case-sensitive)
   * @param value - Text value
   * @param prefix - Prefix to check for
   * @returns true if text starts with prefix, false otherwise
   * @example starts_with(code, "AB")
   * @example starts_with("ABCDEF", "ABC") → true
   */
  starts_with: (value, prefix) => {
    if (value == null || prefix == null) return false;
    return String(value).startsWith(String(prefix));
  },
  /**
   * @category Text
   * @description Tests if text ends with a suffix (case-sensitive)
   * @param value - Text value
   * @param suffix - Suffix to check for
   * @returns true if text ends with suffix, false otherwise
   * @example ends_with(file, ".csv")
   * @example ends_with("data.csv", ".csv") → true
   */
  ends_with: (value, suffix) => {
    if (value == null || suffix == null) return false;
    return String(value).endsWith(String(suffix));
  },

  // Case-insensitive comparison functions
  /**
   * @category Text
   * @description Tests if two values are equal (case-insensitive)
   * @param value1 - First value
   * @param value2 - Second value
   * @returns true if equal (ignoring case), false otherwise
   * @example equals_ci(name, "alice")
   * @example equals_ci("Alice", "ALICE") → true
   */
  equals_ci: (value1, value2) => {
    if (value1 == null || value2 == null) return false;
    return String(value1).toLowerCase() === String(value2).toLowerCase();
  },
  /**
   * @category Text
   * @description Tests if text contains a substring (case-insensitive)
   * @param value - Text value
   * @param substring - Substring to search for
   * @returns true if substring is found (ignoring case), false otherwise
   * @example contains_ci(code, "abc")
   * @example contains_ci("ABCDEF", "bcd") → true
   */
  contains_ci: (value, substring) => {
    if (value == null || substring == null) return false;
    return String(value).toLowerCase().includes(String(substring).toLowerCase());
  },
  /**
   * @category Text
   * @description Tests if text starts with a prefix (case-insensitive)
   * @param value - Text value
   * @param prefix - Prefix to check for
   * @returns true if text starts with prefix (ignoring case), false otherwise
   * @example starts_with_ci(code, "ab")
   * @example starts_with_ci("ABCDEF", "abc") → true
   */
  starts_with_ci: (value, prefix) => {
    if (value == null || prefix == null) return false;
    return String(value).toLowerCase().startsWith(String(prefix).toLowerCase());
  },
  /**
   * @category Text
   * @description Tests if text ends with a suffix (case-insensitive)
   * @param value - Text value
   * @param suffix - Suffix to check for
   * @returns true if text ends with suffix (ignoring case), false otherwise
   * @example ends_with_ci(file, ".CSV")
   * @example ends_with_ci("data.csv", ".CSV") → true
   */
  ends_with_ci: (value, suffix) => {
    if (value == null || suffix == null) return false;
    return String(value).toLowerCase().endsWith(String(suffix).toLowerCase());
  },

  // Math functions
  /**
   * @category Math
   * @description Returns the absolute value of a number
   * @param value - Numeric value
   * @returns Absolute value, or null if input is null/invalid
   * @example abs(-5)
   * @example abs(-5) → 5
   */
  abs: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.abs(num);
  },
  /**
   * @category Math
   * @description Rounds a number to specified decimal places
   * @param value - Numeric value
   * @param decimals - Number of decimal places (default: 0)
   * @returns Rounded number, or null if input is null/invalid
   * @example round(3.7)
   * @example round(3.14159, 2) → 3.14
   */
  round: (value, decimals = 0) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    const factor = Math.pow(10, Math.floor(decimals));
    return Math.round(num * factor) / factor;
  },
  /**
   * @category Math
   * @description Rounds a number down to the nearest integer
   * @param value - Numeric value
   * @returns Floored number, or null if input is null/invalid
   * @example floor(3.9)
   * @example floor(3.9) → 3
   */
  floor: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.floor(num);
  },
  /**
   * @category Math
   * @description Rounds a number up to the nearest integer
   * @param value - Numeric value
   * @returns Ceiled number, or null if input is null/invalid
   * @example ceil(3.1)
   * @example ceil(3.1) → 4
   */
  ceil: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.ceil(num);
  },
  /**
   * @category Math
   * @description Returns the minimum value from a list of numbers
   * @param args - Variable number of numeric values
   * @returns Minimum value, or null if all inputs are null/invalid
   * @example min(price, cost, 100)
   * @example min(10, 5, 20) → 5
   */
  min: (...args) => {
    const nums = args
      .filter((v) => v != null)
      .map(Number)
      .filter((n) => !isNaN(n));
    return nums.length === 0 ? null : Math.min(...nums);
  },
  /**
   * @category Math
   * @description Returns the maximum value from a list of numbers
   * @param args - Variable number of numeric values
   * @returns Maximum value, or null if all inputs are null/invalid
   * @example max(price, cost)
   * @example max(10, 5, 20) → 20
   */
  max: (...args) => {
    const nums = args
      .filter((v) => v != null)
      .map(Number)
      .filter((n) => !isNaN(n));
    return nums.length === 0 ? null : Math.max(...nums);
  },

  // Type conversion
  /**
   * @category Conversion
   * @description Parses a value as an integer
   * @param value - Value to parse
   * @returns Integer value, or null if parsing fails
   * @example parse_int("42")
   * @example parse_int("42") → 42
   */
  parse_int: (value) => {
    if (value == null) return null;
    const result = parseInt(String(value), 10);
    return isNaN(result) ? null : result;
  },
  /**
   * @category Conversion
   * @description Parses a value as a floating-point number
   * @param value - Value to parse
   * @returns Float value, or null if parsing fails
   * @example parse_float("3.14")
   * @example parse_float("3.14") → 3.14
   */
  parse_float: (value) => {
    if (value == null) return null;
    const result = parseFloat(String(value));
    return isNaN(result) ? null : result;
  },
  /**
   * @category Conversion
   * @description Tests if a value is not a valid number
   * @param value - Value to test
   * @returns true if value is NaN, false otherwise
   * @example is_nan("abc")
   * @example is_nan("abc") → true
   */
  is_nan: (value) => {
    if (value == null) return false;
    return Number.isNaN(Number(value));
  },

  // JSON functions
  /**
   * @category JSON
   * @description Tests if a string contains valid JSON
   * @param value - String value to test
   * @returns true if valid JSON, false otherwise, null if input is null
   * @example is_json('{"name": "Alice"}')
   * @example is_json('{"valid": true}') → true
   * @example is_json('invalid') → false
   */
  is_json: (value) => {
    if (value == null) return null;
    try {
      JSON.parse(String(value));
      return true;
    } catch {
      return false;
    }
  },
  /**
   * @category JSON
   * @description Parses JSON string and extracts value at specified path
   * @param value - String containing JSON
   * @param path - Dot-notation path (e.g., "user.name" or "items.0.price")
   * @returns Extracted value, or null if path not found or JSON invalid
   * @example json_extract('{"name":"Alice"}', "name")
   * @example json_extract('{"name":"Alice"}', "name") → "Alice"
   * @example json_extract('{"user":{"email":"a@b.com"}}', "user.email") → "a@b.com"
   * @example json_extract('{"items":[{"price":10}]}', "items.0.price") → 10
   */
  json_extract: (value, path) => {
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
  },
};

export function interpretAST(ast: ASTNode, rowData: Record<string, any>): any {
  return evaluateNode(ast, rowData);
}

function evaluateNode(node: ASTNode, rowData: Record<string, any>): any {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      if (node.name && !Object.prototype.hasOwnProperty.call(rowData, node.name)) {
        throw new Error(`Column '${node.name}' not found in row data`);
      }
      return node.name ? rowData[node.name] : undefined;

    case 'BinaryExpression':
    case 'LogicalExpression': {
      // Short-circuit evaluation for && and 'and'
      if (node.operator === '&&' || node.operator === 'and') {
        const left = evaluateNode(node.left!, rowData);
        return left ? evaluateNode(node.right!, rowData) : left;
      }
      // Short-circuit evaluation for || and 'or'
      if (node.operator === '||' || node.operator === 'or') {
        const left = evaluateNode(node.left!, rowData);
        return left ? left : evaluateNode(node.right!, rowData);
      }
      if (node.operator === '??') {
        const left = evaluateNode(node.left!, rowData);
        return left !== null && left !== undefined ? left : evaluateNode(node.right!, rowData);
      }

      const left = evaluateNode(node.left!, rowData);
      const right = evaluateNode(node.right!, rowData);

      // Handle date comparisons
      const isComparison = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='].includes(
        node.operator!
      );
      if (isComparison && (left instanceof Date || right instanceof Date)) {
        const ld = parseToDate(left);
        const rd = parseToDate(right);
        if (ld && rd) {
          const lv = ld.getTime();
          const rv = rd.getTime();
          switch (node.operator) {
            case '>':
              return lv > rv;
            case '<':
              return lv < rv;
            case '>=':
              return lv >= rv;
            case '<=':
              return lv <= rv;
            case '==':
            case '===':
              return lv === rv;
            case '!=':
            case '!==':
              return lv !== rv;
          }
        }
      }

      if (
        node.operator &&
        (left == null || right == null) &&
        !NULL_COMPARISON_OPS.has(node.operator)
      ) {
        return null;
      }

      const op = BINARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown operator: ${node.operator}`);
      return op(left, right);
    }

    case 'UnaryExpression': {
      const arg = evaluateNode(node.argument!, rowData);
      const op = UNARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown unary operator: ${node.operator}`);
      return op(arg);
    }

    case 'ConditionalExpression': {
      const test = evaluateNode(node.test!, rowData);
      return test
        ? evaluateNode(node.consequent!, rowData)
        : evaluateNode(node.alternate!, rowData);
    }

    case 'CallExpression': {
      const fnName = node.callee!.name!;
      const fn = FUNCTION_IMPLS[fnName];
      if (!fn) {
        throw new Error(`Unknown function: ${fnName}`);
      }
      const args = (node.arguments || []).map((arg) => evaluateNode(arg, rowData));
      return fn(...args);
    }

    default:
      throw new Error(`Cannot interpret node type: ${node.type}`);
  }
}
