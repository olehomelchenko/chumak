import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { interpretAST, parseToDate } from './ast-interpreter';

describe('AST Interpreter', () => {
  const row = {
    sales: 1500,
    region: 'North',
    active: true,
    revenue: 5000,
    cost: 3000,
    nullVal: null,
    emptyStr: '',
  };

  it('should evaluate literals', () => {
    expect(interpretAST(parseExpression('100'), row)).toBe(100);
    expect(interpretAST(parseExpression('"hello"'), row)).toBe('hello');
    expect(interpretAST(parseExpression('true'), row)).toBe(true);
  });

  it('should evaluate identifiers', () => {
    expect(interpretAST(parseExpression('sales'), row)).toBe(1500);
    expect(interpretAST(parseExpression('region'), row)).toBe('North');
  });

  it('should evaluate binary expressions', () => {
    expect(interpretAST(parseExpression('sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales + 500'), row)).toBe(2000);
    expect(interpretAST(parseExpression('revenue - cost'), row)).toBe(2000);
    expect(interpretAST(parseExpression('region == "North"'), row)).toBe(true);
  });

  it('should evaluate logical expressions', () => {
    expect(interpretAST(parseExpression('active && sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('active || sales < 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('!active'), row)).toBe(false);
  });

  // Word-form boolean operators (beginner-friendly syntax)
  it('should evaluate word-form "and" operator', () => {
    expect(interpretAST(parseExpression('active and sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('active and sales < 1000'), row)).toBe(false);
  });

  it('should evaluate word-form "or" operator', () => {
    expect(interpretAST(parseExpression('active or sales < 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales < 1000 or revenue < 1000'), row)).toBe(false);
  });

  it('should evaluate word-form "not" operator', () => {
    expect(interpretAST(parseExpression('not active'), row)).toBe(false);
    expect(interpretAST(parseExpression('not (sales < 1000)'), row)).toBe(true);
  });

  it('should short-circuit "and" operator', () => {
    // When left is false, right should not be evaluated
    expect(interpretAST(parseExpression('sales < 1000 and region'), row)).toBe(false);
  });

  it('should short-circuit "or" operator', () => {
    // When left is true, right should not be evaluated
    expect(interpretAST(parseExpression('active or nullVal'), row)).toBe(true);
  });

  it('should handle complex word-form expressions', () => {
    expect(
      interpretAST(parseExpression('(sales > 1000 and active) or region == "South"'), row)
    ).toBe(true);
    expect(interpretAST(parseExpression('not active or sales > 1000'), row)).toBe(true);
    expect(interpretAST(parseExpression('not (sales < 1000) and region == "North"'), row)).toBe(
      true
    );
  });

  it('should handle nullish coalescing', () => {
    expect(interpretAST(parseExpression('nullVal ?? 0'), row)).toBe(0);
    expect(interpretAST(parseExpression('sales ?? 0'), row)).toBe(1500);
  });

  it('should handle ternary expressions', () => {
    expect(interpretAST(parseExpression('sales > 1000 ? "high" : "low"'), row)).toBe('high');
    expect(interpretAST(parseExpression('sales < 1000 ? "high" : "low"'), row)).toBe('low');
  });

  it('should evaluate whitelisted functions', () => {
    expect(interpretAST(parseExpression('regexp_match(region, "^N")'), row)).toBe(true);
    expect(interpretAST(parseExpression('regexp_match(region, "^S")'), row)).toBe(false);
    expect(interpretAST(parseExpression('regexp_extract(region, "(No)")'), row)).toBe('No');
  });

  it('should propagate nulls in arithmetic', () => {
    expect(interpretAST(parseExpression('nullVal + 100'), row)).toBe(null);
  });

  it('should allow null comparisons', () => {
    expect(interpretAST(parseExpression('nullVal == null'), row)).toBe(true);
    expect(interpretAST(parseExpression('sales != null'), row)).toBe(true);
  });
});

describe('Date Functions', () => {
  const dateRow = {
    date_str: '2024-06-15',
    datetime_str: '2024-06-15T14:30:45',
    null_date: null,
    invalid_date: 'not-a-date',
    empty_str: '',
    start_date: '2024-01-01',
    end_date: '2024-01-10',
  };

  describe('year()', () => {
    it('should extract year from ISO date string', () => {
      expect(interpretAST(parseExpression('year(date_str)'), dateRow)).toBe(2024);
    });

    it('should extract year from datetime string', () => {
      expect(interpretAST(parseExpression('year(datetime_str)'), dateRow)).toBe(2024);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('year(null_date)'), dateRow)).toBe(null);
    });

    it('should return null for invalid date', () => {
      expect(interpretAST(parseExpression('year(invalid_date)'), dateRow)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(interpretAST(parseExpression('year(empty_str)'), dateRow)).toBe(null);
    });
  });

  describe('month()', () => {
    it('should return 1-12 (not 0-11)', () => {
      expect(interpretAST(parseExpression('month(date_str)'), dateRow)).toBe(6);
    });

    it('should handle January correctly', () => {
      expect(interpretAST(parseExpression('month(d)'), { d: '2024-01-15' })).toBe(1);
    });

    it('should handle December correctly', () => {
      expect(interpretAST(parseExpression('month(d)'), { d: '2024-12-15' })).toBe(12);
    });
  });

  describe('day()', () => {
    it('should extract day of month', () => {
      expect(interpretAST(parseExpression('day(date_str)'), dateRow)).toBe(15);
    });

    it('should handle first day of month', () => {
      expect(interpretAST(parseExpression('day(d)'), { d: '2024-06-01' })).toBe(1);
    });

    it('should handle last day of month', () => {
      expect(interpretAST(parseExpression('day(d)'), { d: '2024-06-30' })).toBe(30);
    });
  });

  describe('hour(), minute(), second()', () => {
    it('should extract time components', () => {
      expect(interpretAST(parseExpression('hour(datetime_str)'), dateRow)).toBe(14);
      expect(interpretAST(parseExpression('minute(datetime_str)'), dateRow)).toBe(30);
      expect(interpretAST(parseExpression('second(datetime_str)'), dateRow)).toBe(45);
    });

    it('should return consistent values for date without time', () => {
      // Date-only strings are parsed at midnight local time
      const hour = interpretAST(parseExpression('hour(date_str)'), dateRow);
      const minute = interpretAST(parseExpression('minute(date_str)'), dateRow);
      const second = interpretAST(parseExpression('second(date_str)'), dateRow);
      expect(typeof hour).toBe('number');
      expect(typeof minute).toBe('number');
      expect(typeof second).toBe('number');
      expect(minute).toBe(0);
      expect(second).toBe(0);
    });
  });

  describe('weekday()', () => {
    it('should return Monday=0 format', () => {
      // 2024-06-17 is a Monday
      expect(interpretAST(parseExpression('weekday(d)'), { d: '2024-06-17' })).toBe(0);
    });

    it('should handle Tuesday correctly', () => {
      expect(interpretAST(parseExpression('weekday(d)'), { d: '2024-06-18' })).toBe(1);
    });

    it('should handle Saturday correctly', () => {
      // 2024-06-15 is a Saturday
      expect(interpretAST(parseExpression('weekday(date_str)'), dateRow)).toBe(5);
    });

    it('should handle Sunday correctly', () => {
      expect(interpretAST(parseExpression('weekday(d)'), { d: '2024-06-16' })).toBe(6);
    });
  });

  describe('week()', () => {
    it('should return ISO week number', () => {
      // 2024-01-01 is Monday of week 1
      expect(interpretAST(parseExpression('week(d)'), { d: '2024-01-01' })).toBe(1);
    });

    it('should handle week 2', () => {
      expect(interpretAST(parseExpression('week(d)'), { d: '2024-01-08' })).toBe(2);
    });

    it('should handle mid-year week', () => {
      // 2024-06-15 is in week 24
      expect(interpretAST(parseExpression('week(date_str)'), dateRow)).toBe(24);
    });
  });

  describe('quarter()', () => {
    it('should return quarter 1-4', () => {
      expect(interpretAST(parseExpression('quarter(date_str)'), dateRow)).toBe(2);
    });

    it('should handle Q1 boundary', () => {
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-03-31' })).toBe(1);
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-04-01' })).toBe(2);
    });

    it('should handle all quarters', () => {
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-01-15' })).toBe(1);
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-05-15' })).toBe(2);
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-08-15' })).toBe(3);
      expect(interpretAST(parseExpression('quarter(d)'), { d: '2024-11-15' })).toBe(4);
    });
  });

  describe('today() and now()', () => {
    it('should return current date as YYYY-MM-DD string', () => {
      const result = interpretAST(parseExpression('today()'), {});
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return current datetime as ISO string', () => {
      const result = interpretAST(parseExpression('now()'), {});
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('days_between()', () => {
    it('should calculate positive difference', () => {
      expect(interpretAST(parseExpression('days_between(start_date, end_date)'), dateRow)).toBe(9);
    });

    it('should calculate negative difference', () => {
      expect(interpretAST(parseExpression('days_between(end_date, start_date)'), dateRow)).toBe(-9);
    });

    it('should return 0 for same date', () => {
      expect(interpretAST(parseExpression('days_between(start_date, start_date)'), dateRow)).toBe(
        0
      );
    });

    it('should return null if either date is null', () => {
      expect(interpretAST(parseExpression('days_between(start_date, null_date)'), dateRow)).toBe(
        null
      );
      expect(interpretAST(parseExpression('days_between(null_date, end_date)'), dateRow)).toBe(
        null
      );
    });
  });

  describe('date_add()', () => {
    it('should add days', () => {
      const result = interpretAST(parseExpression('date_add(start_date, 10, "days")'), dateRow);
      expect(result).toContain('2024-01-11');
    });

    it('should subtract days with negative amount', () => {
      const result = interpretAST(parseExpression('date_add(end_date, -5, "days")'), dateRow);
      expect(result).toContain('2024-01-05');
    });

    it('should add months', () => {
      const result = interpretAST(parseExpression('date_add(start_date, 2, "months")'), dateRow);
      expect(result).toContain('2024-03-01');
    });

    it('should add years', () => {
      const result = interpretAST(parseExpression('date_add(start_date, 1, "year")'), dateRow);
      expect(result).toContain('2025-01-01');
    });

    it('should support singular and plural units', () => {
      const result1 = interpretAST(parseExpression('date_add(start_date, 1, "day")'), dateRow);
      const result2 = interpretAST(parseExpression('date_add(start_date, 1, "days")'), dateRow);
      expect(result1).toContain('2024-01-02');
      expect(result2).toContain('2024-01-02');
    });

    it('should return error for unknown unit', () => {
      const result = interpretAST(parseExpression('date_add(start_date, 1, "weeks")'), dateRow);
      expect(result).toEqual({ type: 'error', message: 'Unknown unit: weeks' });
    });

    it('should return null for null date', () => {
      expect(interpretAST(parseExpression('date_add(null_date, 1, "days")'), dateRow)).toBe(null);
    });
  });

  describe('date_trunc()', () => {
    it('should truncate to year - returns start of year', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "year")'), dateRow);
      // Use parseToDate instead of native new Date() to ensure local TZ consistency
      const parsed = parseToDate(result)!;
      expect(parsed.getMonth()).toBe(0); // January
      expect(parsed.getDate()).toBe(1);
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
      expect(parsed.getSeconds()).toBe(0);
    });

    it('should truncate to month - returns start of month', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "month")'), dateRow);
      const parsed = parseToDate(result)!;
      expect(parsed.getDate()).toBe(1);
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
    });

    it('should truncate to day - returns start of day', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "day")'), dateRow);
      const parsed = parseToDate(result)!;
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
      expect(parsed.getSeconds()).toBe(0);
    });

    it('should truncate to hour - zeroes minutes and seconds', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "hour")'), dateRow);
      const parsed = parseToDate(result)!;
      expect(parsed.getMinutes()).toBe(0);
      expect(parsed.getSeconds()).toBe(0);
    });

    it('should truncate to minute - zeroes seconds', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "minute")'), dateRow);
      const parsed = parseToDate(result)!;
      expect(parsed.getSeconds()).toBe(0);
    });

    it('should return error for unknown unit', () => {
      const result = interpretAST(parseExpression('date_trunc(datetime_str, "century")'), dateRow);
      expect(result).toEqual({ type: 'error', message: 'Unknown truncation unit: century' });
    });

    it('should return null for null date', () => {
      expect(interpretAST(parseExpression('date_trunc(null_date, "day")'), dateRow)).toBe(null);
    });
  });

  describe('format_date()', () => {
    it('should format with YYYY-MM-DD', () => {
      const result = interpretAST(
        parseExpression('format_date(datetime_str, "YYYY-MM-DD")'),
        dateRow
      );
      expect(result).toBe('2024-06-15');
    });

    it('should format with DD/MM/YYYY', () => {
      const result = interpretAST(
        parseExpression('format_date(datetime_str, "DD/MM/YYYY")'),
        dateRow
      );
      expect(result).toBe('15/06/2024');
    });

    it('should format with time components', () => {
      const result = interpretAST(
        parseExpression('format_date(datetime_str, "HH:mm:ss")'),
        dateRow
      );
      expect(result).toBe('14:30:45');
    });

    it('should format with mixed tokens', () => {
      const result = interpretAST(
        parseExpression('format_date(datetime_str, "YYYY/MM/DD HH:mm")'),
        dateRow
      );
      expect(result).toBe('2024/06/15 14:30');
    });

    it('should preserve literal characters', () => {
      const result = interpretAST(parseExpression('format_date(date_str, "Year: YYYY")'), dateRow);
      expect(result).toBe('Year: 2024');
    });

    it('should handle short tokens (M, D, H, m, s)', () => {
      const result = interpretAST(parseExpression('format_date(d, "M/D/YYYY")'), {
        d: '2024-06-05',
      });
      expect(result).toBe('6/5/2024');
    });

    it('should handle YY (2-digit year)', () => {
      const result = interpretAST(parseExpression('format_date(date_str, "DD-MM-YY")'), dateRow);
      expect(result).toBe('15-06-24');
    });

    it('should return null for null date', () => {
      expect(interpretAST(parseExpression('format_date(null_date, "YYYY-MM-DD")'), dateRow)).toBe(
        null
      );
    });

    it('should return null for non-string format', () => {
      expect(
        interpretAST(parseExpression('format_date(date_str, 123)'), { ...dateRow, fmt: 123 })
      ).toBe(null);
    });
  });
});

describe('String Functions', () => {
  const row = {
    name: 'Hello World',
    padded: '  trimmed  ',
    empty: '',
    nullVal: null,
  };

  describe('upper()', () => {
    it('should convert to uppercase', () => {
      expect(interpretAST(parseExpression('upper(name)'), row)).toBe('HELLO WORLD');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('upper(nullVal)'), row)).toBe(null);
    });

    it('should handle empty string', () => {
      expect(interpretAST(parseExpression('upper(empty)'), row)).toBe('');
    });
  });

  describe('lower()', () => {
    it('should convert to lowercase', () => {
      expect(interpretAST(parseExpression('lower(name)'), row)).toBe('hello world');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('lower(nullVal)'), row)).toBe(null);
    });
  });

  describe('trim()', () => {
    it('should remove leading and trailing whitespace', () => {
      expect(interpretAST(parseExpression('trim(padded)'), row)).toBe('trimmed');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('trim(nullVal)'), row)).toBe(null);
    });

    it('should handle string without whitespace', () => {
      expect(interpretAST(parseExpression('trim(name)'), row)).toBe('Hello World');
    });
  });

  describe('substring()', () => {
    it('should extract substring with start and length', () => {
      expect(interpretAST(parseExpression('substring(name, 0, 5)'), row)).toBe('Hello');
    });

    it('should extract from start to end when no length', () => {
      expect(interpretAST(parseExpression('substring(name, 6)'), row)).toBe('World');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('substring(nullVal, 0, 5)'), row)).toBe(null);
    });

    it('should handle start beyond string length', () => {
      expect(interpretAST(parseExpression('substring(name, 100)'), row)).toBe('');
    });

    it('should handle negative start as 0', () => {
      expect(interpretAST(parseExpression('substring(name, -5, 5)'), row)).toBe('Hello');
    });
  });
});

describe('Math Functions', () => {
  const row = {
    positive: 42.7,
    negative: -15.3,
    integer: 100,
    zero: 0,
    nullVal: null,
    notANumber: 'abc',
  };

  describe('abs()', () => {
    it('should return absolute value of positive', () => {
      expect(interpretAST(parseExpression('abs(positive)'), row)).toBe(42.7);
    });

    it('should return absolute value of negative', () => {
      expect(interpretAST(parseExpression('abs(negative)'), row)).toBe(15.3);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('abs(nullVal)'), row)).toBe(null);
    });

    it('should return null for non-numeric string', () => {
      expect(interpretAST(parseExpression('abs(notANumber)'), row)).toBe(null);
    });
  });

  describe('round()', () => {
    it('should round to integer by default', () => {
      expect(interpretAST(parseExpression('round(positive)'), row)).toBe(43);
    });

    it('should round to specified decimals', () => {
      expect(interpretAST(parseExpression('round(positive, 1)'), row)).toBe(42.7);
    });

    it('should handle negative numbers', () => {
      expect(interpretAST(parseExpression('round(negative)'), row)).toBe(-15);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('round(nullVal)'), row)).toBe(null);
    });
  });

  describe('floor()', () => {
    it('should round down positive', () => {
      expect(interpretAST(parseExpression('floor(positive)'), row)).toBe(42);
    });

    it('should round down negative (towards negative infinity)', () => {
      expect(interpretAST(parseExpression('floor(negative)'), row)).toBe(-16);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('floor(nullVal)'), row)).toBe(null);
    });
  });

  describe('ceil()', () => {
    it('should round up positive', () => {
      expect(interpretAST(parseExpression('ceil(positive)'), row)).toBe(43);
    });

    it('should round up negative (towards positive infinity)', () => {
      expect(interpretAST(parseExpression('ceil(negative)'), row)).toBe(-15);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('ceil(nullVal)'), row)).toBe(null);
    });
  });

  describe('min()', () => {
    it('should return minimum of multiple values', () => {
      expect(interpretAST(parseExpression('min(positive, negative, integer)'), row)).toBe(-15.3);
    });

    it('should return single value', () => {
      expect(interpretAST(parseExpression('min(positive)'), row)).toBe(42.7);
    });

    it('should ignore null values', () => {
      expect(interpretAST(parseExpression('min(positive, nullVal, negative)'), row)).toBe(-15.3);
    });

    it('should return null if all values are null', () => {
      expect(interpretAST(parseExpression('min(nullVal)'), row)).toBe(null);
    });
  });

  describe('max()', () => {
    it('should return maximum of multiple values', () => {
      expect(interpretAST(parseExpression('max(positive, negative, integer)'), row)).toBe(100);
    });

    it('should return single value', () => {
      expect(interpretAST(parseExpression('max(positive)'), row)).toBe(42.7);
    });

    it('should ignore null values', () => {
      expect(interpretAST(parseExpression('max(positive, nullVal, integer)'), row)).toBe(100);
    });
  });
});

describe('Type Conversion Functions', () => {
  const row = {
    intStr: '42',
    floatStr: '3.14',
    invalid: 'abc',
    empty: '',
    nullVal: null,
    numericVal: 123,
    nanVal: NaN,
  };

  describe('parse_int()', () => {
    it('should parse integer string', () => {
      expect(interpretAST(parseExpression('parse_int(intStr)'), row)).toBe(42);
    });

    it('should parse float string to integer', () => {
      expect(interpretAST(parseExpression('parse_int(floatStr)'), row)).toBe(3);
    });

    it('should return null for invalid string', () => {
      expect(interpretAST(parseExpression('parse_int(invalid)'), row)).toBe(null);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('parse_int(nullVal)'), row)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(interpretAST(parseExpression('parse_int(empty)'), row)).toBe(null);
    });
  });

  describe('parse_float()', () => {
    it('should parse float string', () => {
      expect(interpretAST(parseExpression('parse_float(floatStr)'), row)).toBe(3.14);
    });

    it('should parse integer string as float', () => {
      expect(interpretAST(parseExpression('parse_float(intStr)'), row)).toBe(42);
    });

    it('should return null for invalid string', () => {
      expect(interpretAST(parseExpression('parse_float(invalid)'), row)).toBe(null);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('parse_float(nullVal)'), row)).toBe(null);
    });
  });

  describe('is_nan()', () => {
    it('should return true for NaN', () => {
      expect(interpretAST(parseExpression('is_nan(nanVal)'), row)).toBe(true);
    });

    it('should return true for non-numeric string', () => {
      expect(interpretAST(parseExpression('is_nan(invalid)'), row)).toBe(true);
    });

    it('should return false for valid number', () => {
      expect(interpretAST(parseExpression('is_nan(numericVal)'), row)).toBe(false);
    });

    it('should return false for numeric string', () => {
      expect(interpretAST(parseExpression('is_nan(intStr)'), row)).toBe(false);
    });

    it('should return false for null (null is not NaN)', () => {
      expect(interpretAST(parseExpression('is_nan(nullVal)'), row)).toBe(false);
    });
  });
});

describe('String Functions - split()', () => {
  const row = {
    fullName: 'Alice Smith',
    filename: 'document.backup.csv',
    tags: 'red,green,blue',
    single: 'word',
    empty: '',
    nullVal: null,
  };

  it('should split string and return segment at index', () => {
    expect(interpretAST(parseExpression("split(fullName, ' ', 0)"), row)).toBe('Alice');
    expect(interpretAST(parseExpression("split(fullName, ' ', 1)"), row)).toBe('Smith');
  });

  it('should handle negative index (from end)', () => {
    expect(interpretAST(parseExpression("split(filename, '.', -1)"), row)).toBe('csv');
    expect(interpretAST(parseExpression("split(filename, '.', -2)"), row)).toBe('backup');
  });

  it('should return null for out-of-bounds index', () => {
    expect(interpretAST(parseExpression("split(fullName, ' ', 5)"), row)).toBe(null);
    expect(interpretAST(parseExpression("split(fullName, ' ', -5)"), row)).toBe(null);
  });

  it('should return null for null input', () => {
    expect(interpretAST(parseExpression("split(nullVal, ',', 0)"), row)).toBe(null);
  });

  it('should handle default index (0)', () => {
    expect(interpretAST(parseExpression("split(tags, ',')"), row)).toBe('red');
  });

  it('should handle empty delimiter', () => {
    expect(interpretAST(parseExpression("split('abc', '', 0)"), {})).toBe('a');
    expect(interpretAST(parseExpression("split('abc', '', 1)"), {})).toBe('b');
  });
});

describe('String Comparison Functions (Case-Sensitive)', () => {
  const row = {
    name: 'Alice',
    code: 'ABC123',
    filename: 'Document.csv',
    nullVal: null,
  };

  describe('equals()', () => {
    it('should compare strings case-sensitively', () => {
      expect(interpretAST(parseExpression('equals(name, "Alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals(name, "alice")'), row)).toBe(false);
      expect(interpretAST(parseExpression('equals(name, "ALICE")'), row)).toBe(false);
      expect(interpretAST(parseExpression('equals(name, "Bob")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('equals(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('contains()', () => {
    it('should check substring case-sensitively', () => {
      expect(interpretAST(parseExpression('contains(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains(code, "abc")'), row)).toBe(false);
      expect(interpretAST(parseExpression('contains(code, "123")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('contains(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('starts_with()', () => {
    it('should check prefix case-sensitively', () => {
      expect(interpretAST(parseExpression('starts_with(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with(code, "abc")'), row)).toBe(false);
      expect(interpretAST(parseExpression('starts_with(code, "AB")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('starts_with(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('ends_with()', () => {
    it('should check suffix case-sensitively', () => {
      expect(interpretAST(parseExpression('ends_with(filename, ".csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with(filename, ".CSV")'), row)).toBe(false);
      expect(interpretAST(parseExpression('ends_with(filename, "csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with(filename, ".txt")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('ends_with(nullVal, "test")'), row)).toBe(false);
    });
  });
});

describe('Case-Insensitive Comparison Functions', () => {
  const row = {
    name: 'Alice',
    code: 'ABC123',
    filename: 'Document.csv',
    nullVal: null,
  };

  describe('equals_ci()', () => {
    it('should compare strings case-insensitively', () => {
      expect(interpretAST(parseExpression('equals_ci(name, "alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "ALICE")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "Alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "Bob")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('equals_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('contains_ci()', () => {
    it('should check substring case-insensitively', () => {
      expect(interpretAST(parseExpression('contains_ci(code, "abc")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains_ci(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains_ci(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('contains_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('starts_with_ci()', () => {
    it('should check prefix case-insensitively', () => {
      expect(interpretAST(parseExpression('starts_with_ci(code, "abc")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with_ci(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with_ci(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('starts_with_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('ends_with_ci()', () => {
    it('should check suffix case-insensitively', () => {
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".CSV")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".txt")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('ends_with_ci(nullVal, "test")'), row)).toBe(false);
    });
  });
});
