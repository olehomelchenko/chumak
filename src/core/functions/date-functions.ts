/**
 * Date functions for AST interpreter
 *
 * @category Date
 */

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

// Date extraction - Phase 1

/**
 * @category Date
 * @description Extracts the year from a date value
 * @param value - Date value or date string
 * @returns Year as number (e.g., 2024), or null if invalid
 * @example year(order_date)
 * @example year("2024-01-15") -> 2024
 */
export const year = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getFullYear() : null;
};

/**
 * @category Date
 * @description Extracts the month from a date value
 * @param value - Date value or date string
 * @returns Month as number (1-12), or null if invalid
 * @example month(created_at)
 * @example month("2024-03-15") -> 3
 */
export const month = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getMonth() + 1 : null; // 1-12 instead of 0-11
};

/**
 * @category Date
 * @description Extracts the day of month from a date value
 * @param value - Date value or date string
 * @returns Day as number (1-31), or null if invalid
 * @example day(birth_date)
 * @example day("2024-01-15") -> 15
 */
export const day = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getDate() : null;
};

/**
 * @category Date
 * @description Extracts the hour from a datetime value
 * @param value - Datetime value or datetime string
 * @returns Hour as number (0-23), or null if invalid
 * @example hour(timestamp)
 * @example hour("2024-01-15T14:30:00") -> 14
 */
export const hour = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getHours() : null;
};

/**
 * @category Date
 * @description Extracts the minute from a datetime value
 * @param value - Datetime value or datetime string
 * @returns Minute as number (0-59), or null if invalid
 * @example minute(timestamp)
 * @example minute("2024-01-15T14:30:00") -> 30
 */
export const minute = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getMinutes() : null;
};

/**
 * @category Date
 * @description Extracts the second from a datetime value
 * @param value - Datetime value or datetime string
 * @returns Second as number (0-59), or null if invalid
 * @example second(timestamp)
 * @example second("2024-01-15T14:30:45") -> 45
 */
export const second = (value: any) => {
  const date = parseToDate(value);
  return date ? date.getSeconds() : null;
};

// Date extraction - Phase 2

/**
 * @category Date
 * @description Returns the day of week (ISO 8601: 0=Monday, 6=Sunday)
 * @param value - Date value or date string
 * @returns Day of week as number (0-6), or null if invalid
 * @example weekday(date)
 * @example weekday("2024-01-15") -> 0 // Monday
 */
export const weekday = (value: any) => {
  const date = parseToDate(value);
  if (!date) return null;
  // Convert JS Sunday=0 to Monday=0 (ISO 8601)
  return (date.getDay() + 6) % 7;
};

/**
 * @category Date
 * @description Returns the ISO week number of the year
 * @param value - Date value or date string
 * @returns Week number (1-53), or null if invalid
 * @example week(order_date)
 * @example week("2024-01-15") -> 3
 */
export const week = (value: any) => {
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
};

/**
 * @category Date
 * @description Returns the quarter of the year
 * @param value - Date value or date string
 * @returns Quarter as number (1-4), or null if invalid
 * @example quarter(sale_date)
 * @example quarter("2024-03-15") -> 1
 */
export const quarter = (value: any) => {
  const date = parseToDate(value);
  if (!date) return null;
  return Math.floor(date.getMonth() / 3) + 1;
};

// Date utilities - Phase 3

/**
 * @category Date
 * @description Returns the current date in YYYY-MM-DD format
 * @returns Current date as string
 * @example order_date == today()
 * @example today() -> "2024-01-15"
 */
export const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * @category Date
 * @description Returns the current datetime in ISO format
 * @returns Current datetime as string
 * @example created_at < now()
 * @example now() -> "2024-01-15T14:30:45"
 */
export const now = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Date arithmetic - Phase 4

/**
 * @category Date
 * @description Calculates the number of days between two dates
 * @param date1 - Start date
 * @param date2 - End date
 * @returns Number of days from date1 to date2, or null if either date is invalid
 * @example days_between(start, end)
 * @example days_between("2024-01-01", "2024-01-15") -> 14
 */
export const days_between = (date1: any, date2: any) => {
  const d1 = parseToDate(date1);
  const d2 = parseToDate(date2);
  if (!d1 || !d2) return null;
  // Use UTC to avoid DST issues
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / 86400000);
};

/**
 * @category Date
 * @description Adds a time interval to a date
 * @param value - Date value or date string
 * @param amount - Number of units to add (can be negative)
 * @param unit - Time unit: "days", "months", "years", "hours", "minutes", "seconds"
 * @returns New date/datetime as string, or null if invalid
 * @example date_add(order_date, 30, "days")
 * @example date_add("2024-01-15", 2, "months") -> "2024-03-15"
 */
export const date_add = (value: any, amount: number, unit: string) => {
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
  // If it's a date-level addition, return a date string, otherwise datetime
  if (['day', 'days', 'month', 'months', 'year', 'years'].includes(unitLower)) {
    return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
  }
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(
    result.getDate()
  )}T${pad(result.getHours())}:${pad(result.getMinutes())}:${pad(result.getSeconds())}`;
};

/**
 * @category Date
 * @description Truncates a date to the start of a time period
 * @param value - Date value or date string
 * @param unit - Truncation unit: "year", "quarter", "month", "week", "day", "hour", "minute", "second"
 * @returns Truncated date/datetime as string, or null if invalid
 * @example date_trunc(timestamp, "month")
 * @example date_trunc("2024-01-15", "month") -> "2024-01-01"
 */
export const date_trunc = (value: any, unit: string) => {
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
};

/**
 * @category Date
 * @description Formats a date using a custom format string
 * @param value - Date value or date string
 * @param format - Format string using tokens (YYYY, MM, DD, HH, mm, ss, etc.)
 * @returns Formatted date string, or null if invalid
 * @example format_date(date, "DD/MM/YYYY")
 * @example format_date("2024-01-15", "MM/DD/YYYY") -> "01/15/2024"
 */
export const format_date = (value: any, format: string) => {
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
};

/**
 * Token definitions for parse_date: maps format tokens to regex patterns and component names.
 * Sorted by length descending to match longest tokens first (e.g., YYYY before YY).
 */
const PARSE_TOKENS: Array<{ token: string; pattern: string; component: string }> = [
  { token: 'YYYY', pattern: '(\\d{4})', component: 'year' },
  { token: 'MM', pattern: '(\\d{2})', component: 'month' },
  { token: 'DD', pattern: '(\\d{2})', component: 'day' },
  { token: 'HH', pattern: '(\\d{2})', component: 'hour' },
  { token: 'mm', pattern: '(\\d{2})', component: 'minute' },
  { token: 'ss', pattern: '(\\d{2})', component: 'second' },
  { token: 'YY', pattern: '(\\d{2})', component: 'shortYear' },
  { token: 'M', pattern: '(\\d{1,2})', component: 'month' },
  { token: 'D', pattern: '(\\d{1,2})', component: 'day' },
  { token: 'H', pattern: '(\\d{1,2})', component: 'hour' },
  { token: 'm', pattern: '(\\d{1,2})', component: 'minute' },
  { token: 's', pattern: '(\\d{1,2})', component: 'second' },
];

/**
 * @category Date
 * @description Parses a date string using a custom format pattern
 * @param value - String value to parse
 * @param format - Format string using tokens (YYYY, MM, DD, HH, mm, ss, YY, M, D, H, m, s)
 * @returns Parsed date as ISO string ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"), or null if invalid
 * @example parse_date(date_col, "DD/MM/YYYY")
 * @example parse_date("15/06/2024", "DD/MM/YYYY") -> "2024-06-15"
 */
export const parse_date = (value: any, format: any): string | null => {
  if (value == null || typeof format !== 'string') return null;
  const input = String(value).trim();
  if (input === '') return null;

  // Walk the format string, replacing tokens with capture groups and escaping literals
  let regexStr = '';
  const components: string[] = [];
  let pos = 0;

  while (pos < format.length) {
    let matched = false;
    for (const { token, pattern, component } of PARSE_TOKENS) {
      if (format.substring(pos, pos + token.length) === token) {
        regexStr += pattern;
        components.push(component);
        pos += token.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      regexStr += format[pos].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      pos++;
    }
  }

  let regex: RegExp;
  try {
    regex = new RegExp('^' + regexStr + '$');
  } catch {
    return null;
  }

  const match = input.match(regex);
  if (!match) return null;

  // Extract components from capture groups
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let hour: number | null = null;
  let minute: number | null = null;
  let second: number | null = null;
  let hasTime = false;

  for (let i = 0; i < components.length; i++) {
    const val = parseInt(match[i + 1], 10);
    switch (components[i]) {
      case 'year':
        year = val;
        break;
      case 'shortYear':
        year = val <= 69 ? 2000 + val : 1900 + val;
        break;
      case 'month':
        month = val;
        break;
      case 'day':
        day = val;
        break;
      case 'hour':
        hour = val;
        hasTime = true;
        break;
      case 'minute':
        minute = val;
        hasTime = true;
        break;
      case 'second':
        second = val;
        hasTime = true;
        break;
    }
  }

  // Validate required components
  if (year == null || month == null || day == null) return null;

  // Validate ranges
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour != null && (hour < 0 || hour > 23)) return null;
  if (minute != null && (minute < 0 || minute > 59)) return null;
  if (second != null && (second < 0 || second > 59)) return null;

  // Validate day against month (basic check)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;

  const pad = (n: number, len: number = 2) => String(n).padStart(len, '0');

  if (hasTime) {
    return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}T${pad(hour ?? 0)}:${pad(minute ?? 0)}:${pad(second ?? 0)}`;
  }
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
};

export const dateFunctions = {
  year,
  month,
  day,
  hour,
  minute,
  second,
  weekday,
  week,
  quarter,
  today,
  now,
  days_between,
  date_add,
  date_trunc,
  format_date,
  parse_date,
};
