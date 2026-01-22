import { describe, it, expect } from 'vitest';
import { convertDatesForStorage } from './storage';

/**
 * Date serialization tests
 * These tests verify that Date objects are properly converted to YYYY-MM-DD strings
 * to avoid timezone conversion issues during persistence.
 */

describe('Storage - Date Serialization Function', () => {
  describe('convertDatesForStorage', () => {
    it('should convert Date objects to YYYY-MM-DD strings', () => {
      const testDate = new Date(2012, 0, 1); // January 1, 2012 (local time)
      const data = { date: testDate };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.date).toBe('2012-01-01');
    });

    it('should handle dates at end of year', () => {
      const data = { date: new Date(2024, 11, 31) }; // Dec 31, 2024

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.date).toBe('2024-12-31');
    });

    it('should preserve date without timezone conversion', () => {
      // This is the key test: Jan 1, 2012 should stay as 2012-01-01
      // NOT be converted to 2011-12-31 due to UTC timezone shift
      const data = { date: new Date(2012, 0, 1) };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.date).toBe('2012-01-01');
      expect(deserialized.date).not.toContain('2011-12-31');
      expect(deserialized.date).not.toContain('T');
    });

    it('should handle dates with time components by extracting just the date', () => {
      const data = {
        midnight: new Date(2012, 0, 1, 0, 0, 0),
        noon: new Date(2012, 0, 1, 12, 0, 0),
        evening: new Date(2012, 0, 1, 23, 59, 59),
      };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      // All should be the same date (time is dropped)
      expect(deserialized.midnight).toBe('2012-01-01');
      expect(deserialized.noon).toBe('2012-01-01');
      expect(deserialized.evening).toBe('2012-01-01');
    });

    it('should handle nested Date objects', () => {
      const data = {
        user: {
          name: 'Test',
          birthdate: new Date(1990, 5, 15),
        },
        records: [{ date: new Date(2020, 0, 1) }, { date: new Date(2021, 11, 31) }],
      };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.user.birthdate).toBe('1990-06-15');
      expect(deserialized.records[0].date).toBe('2020-01-01');
      expect(deserialized.records[1].date).toBe('2021-12-31');
    });

    it('should preserve non-date values', () => {
      const data = {
        string: 'hello',
        number: 42,
        float: 3.14,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { key: 'value' },
      };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.string).toBe('hello');
      expect(deserialized.number).toBe(42);
      expect(deserialized.float).toBe(3.14);
      expect(deserialized.boolean).toBe(true);
      expect(deserialized.null).toBe(null);
      expect(deserialized.array).toEqual([1, 2, 3]);
      expect(deserialized.object).toEqual({ key: 'value' });
    });

    it('should handle arrays of dates', () => {
      const data = {
        dates: [new Date(2012, 0, 1), new Date(2012, 0, 2), new Date(2012, 0, 3)],
      };

      const converted = convertDatesForStorage(data);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.dates).toEqual(['2012-01-01', '2012-01-02', '2012-01-03']);
    });
  });

  describe('Regression test for reported bug', () => {
    it('should NOT convert 2012-01-01 to 2011-12-31 when serializing', () => {
      // This is the specific regression: date in Kyiv timezone (UTC+2)
      // was being serialized as 2011-12-31T22:00:00.000Z
      const model = {
        data: [
          { date_column: new Date(2012, 0, 1) }, // Jan 1, 2012 local midnight
        ],
      };

      const converted = convertDatesForStorage(model);
      const serialized = JSON.stringify(converted);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data[0].date_column).toBe('2012-01-01');
      expect(deserialized.data[0].date_column).not.toContain('2011-12-31');
      expect(deserialized.data[0].date_column).not.toContain('T22:00:00');
      expect(deserialized.data[0].date_column).not.toContain('Z');
    });

    it('should compare: default JSON.stringify vs convertDatesForStorage', () => {
      const date = new Date(2012, 0, 1); // Jan 1, 2012 local

      // Default JSON.stringify uses toISOString() which converts to UTC
      const defaultSerialized = JSON.parse(JSON.stringify({ date }));

      // convertDatesForStorage preserves local date
      const converted = convertDatesForStorage({ date });
      const customSerialized = JSON.parse(JSON.stringify(converted));

      // Default will have timezone conversion (will vary by system timezone)
      // Custom will always be YYYY-MM-DD
      expect(customSerialized.date).toBe('2012-01-01');
      expect(customSerialized.date).not.toContain('T');
      expect(customSerialized.date).not.toContain('Z');

      // Demonstrate that default has the problem
      expect(typeof defaultSerialized.date).toBe('string');
      expect(defaultSerialized.date).toContain('T');
    });
  });
});
