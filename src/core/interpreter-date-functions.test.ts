import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { interpretAST, parseToDate } from './ast-interpreter';

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

describe('parseToDate - ISO DateTime handling', () => {
  it('should extract date from UTC ISO datetime string (regression test)', () => {
    // This is the specific bug: "2011-12-31T22:00:00.000Z" should parse as 2011-12-31
    const result = parseToDate('2011-12-31T22:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2011);
    expect(result?.getMonth()).toBe(11); // December (0-indexed)
    expect(result?.getDate()).toBe(31);
  });

  it('should preserve time components for non-UTC datetime strings', () => {
    // Datetime strings WITHOUT Z should preserve the full datetime
    const result = parseToDate('2012-01-01T10:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2012);
    expect(result?.getMonth()).toBe(0); // January
    expect(result?.getDate()).toBe(1);
    expect(result?.getHours()).toBe(10);
    expect(result?.getMinutes()).toBe(30);
  });

  it('should extract only date from UTC datetime strings ending in Z', () => {
    // Datetime strings WITH Z (from toISOString()) should extract only the date
    const result = parseToDate('2012-01-01T10:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2012);
    expect(result?.getMonth()).toBe(0); // January
    expect(result?.getDate()).toBe(1);
    // Time should be midnight (local) since we extracted only the date
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });

  it('should handle plain YYYY-MM-DD format', () => {
    const result = parseToDate('2012-01-01');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2012);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(1);
  });

  it('should handle Date objects', () => {
    const date = new Date(2012, 0, 1);
    const result = parseToDate(date);
    expect(result).toBe(date);
  });

  it('should return null for invalid input', () => {
    expect(parseToDate(null)).toBe(null);
    expect(parseToDate(undefined)).toBe(null);
    expect(parseToDate('')).toBe(null);
    expect(parseToDate('invalid')).toBe(null);
  });

  it('should demonstrate the timezone bug is fixed', () => {
    // Before the fix: "2011-12-31T22:00:00.000Z" would parse and display
    // as Dec 31 in some timezones or Jan 1 in others depending on local time
    // After the fix: we extract just the date portion (2011-12-31)
    const utcString = '2011-12-31T22:00:00.000Z';
    const result = parseToDate(utcString);

    // Should always be Dec 31, regardless of local timezone
    expect(result?.getDate()).toBe(31);
    expect(result?.getMonth()).toBe(11); // December
    expect(result?.getFullYear()).toBe(2011);
  });
});
