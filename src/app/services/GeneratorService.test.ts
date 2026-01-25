import { describe, it, expect } from 'vitest';
import { GeneratorService } from './GeneratorService';

describe('GeneratorService', () => {
  describe('Integer Sequence Generator', () => {
    it('should generate an integer sequence starting from 1', () => {
      const result = GeneratorService.generate(5, [
        {
          name: 'id',
          type: 'integerSequence',
          config: { type: 'integerSequence', start: 1, step: 1 },
        },
      ]);

      expect(result.columns).toEqual([{ name: 'id', type: 'integer' }]);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].id).toBe(1);
      expect(result.data[4].id).toBe(5);
    });

    it('should generate an integer sequence with custom step', () => {
      const result = GeneratorService.generate(3, [
        {
          name: 'value',
          type: 'integerSequence',
          config: { type: 'integerSequence', start: 10, step: 5 },
        },
      ]);

      expect(result.data[0].value).toBe(10);
      expect(result.data[1].value).toBe(15);
      expect(result.data[2].value).toBe(20);
    });
  });

  describe('Date Sequence Generator', () => {
    it('should generate a date sequence by days', () => {
      const result = GeneratorService.generate(3, [
        {
          name: 'date',
          type: 'dateSequence',
          config: { type: 'dateSequence', start: '2024-01-01', increment: 1, unit: 'days' },
        },
      ]);

      expect(result.columns[0].type).toBe('date');
      expect(result.data[0].date).toBe('2024-01-01');
      expect(result.data[1].date).toBe('2024-01-02');
      expect(result.data[2].date).toBe('2024-01-03');
    });

    it('should generate a date sequence by months', () => {
      const result = GeneratorService.generate(3, [
        {
          name: 'month',
          type: 'dateSequence',
          config: { type: 'dateSequence', start: '2024-01-15', increment: 1, unit: 'months' },
        },
      ]);

      expect(result.data[0].month).toBe('2024-01-15');
      expect(result.data[1].month).toBe('2024-02-15');
      expect(result.data[2].month).toBe('2024-03-15');
    });
  });

  describe('Random Number Generator', () => {
    it('should generate random integers within range', () => {
      const result = GeneratorService.generate(10, [
        {
          name: 'value',
          type: 'randomNumber',
          config: { type: 'randomNumber', min: 1, max: 100, decimals: 0 },
        },
      ]);

      expect(result.columns[0].type).toBe('integer');
      result.data.forEach((row) => {
        expect(row.value).toBeGreaterThanOrEqual(1);
        expect(row.value).toBeLessThanOrEqual(100);
        expect(Number.isInteger(row.value)).toBe(true);
      });
    });

    it('should generate random floats with decimals', () => {
      const result = GeneratorService.generate(10, [
        {
          name: 'price',
          type: 'randomNumber',
          config: { type: 'randomNumber', min: 0, max: 100, decimals: 2 },
        },
      ]);

      expect(result.columns[0].type).toBe('float');
      result.data.forEach((row) => {
        expect(row.price).toBeGreaterThanOrEqual(0);
        expect(row.price).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Random Boolean Generator', () => {
    it('should generate random booleans', () => {
      const result = GeneratorService.generate(100, [
        {
          name: 'active',
          type: 'randomBoolean',
          config: { type: 'randomBoolean', trueProbability: 0.5 },
        },
      ]);

      expect(result.columns[0].type).toBe('boolean');
      result.data.forEach((row) => {
        expect(typeof row.active).toBe('boolean');
      });

      // With 100 samples and 50% probability, we should have some true and some false
      const trueCount = result.data.filter((row) => row.active).length;
      expect(trueCount).toBeGreaterThan(0);
      expect(trueCount).toBeLessThan(100);
    });
  });

  describe('Random Date Generator', () => {
    it('should generate random dates within range', () => {
      const result = GeneratorService.generate(10, [
        {
          name: 'date',
          type: 'randomDate',
          config: { type: 'randomDate', from: '2024-01-01', to: '2024-12-31' },
        },
      ]);

      expect(result.columns[0].type).toBe('date');
      result.data.forEach((row) => {
        expect(typeof row.date).toBe('string');
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(row.date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
      });
    });
  });

  describe('Random Category Generator', () => {
    it('should generate random categories from provided values', () => {
      const result = GeneratorService.generate(10, [
        {
          name: 'region',
          type: 'randomCategory',
          config: { type: 'randomCategory', values: ['North', 'South', 'East', 'West'] },
        },
      ]);

      expect(result.columns[0].type).toBe('string');
      result.data.forEach((row) => {
        expect(['North', 'South', 'East', 'West']).toContain(row.region);
      });
    });
  });

  describe('Multiple Columns', () => {
    it('should generate multiple columns simultaneously', () => {
      const result = GeneratorService.generate(5, [
        {
          name: 'id',
          type: 'integerSequence',
          config: { type: 'integerSequence', start: 1, step: 1 },
        },
        {
          name: 'date',
          type: 'dateSequence',
          config: { type: 'dateSequence', start: '2024-01-01', increment: 1, unit: 'days' },
        },
        {
          name: 'sales',
          type: 'randomNumber',
          config: { type: 'randomNumber', min: 100, max: 1000, decimals: 2 },
        },
      ]);

      expect(result.columns).toHaveLength(3);
      expect(result.data).toHaveLength(5);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('date');
      expect(result.data[0]).toHaveProperty('sales');
    });
  });

  describe('Validation', () => {
    it('should throw error for empty column name', () => {
      const error = GeneratorService.validateGenerator({
        name: '',
        type: 'integerSequence',
        config: { type: 'integerSequence', start: 1, step: 1 },
      });

      expect(error).toBe('Column name cannot be empty');
    });

    it('should throw error for zero step in integer sequence', () => {
      const error = GeneratorService.validateGenerator({
        name: 'id',
        type: 'integerSequence',
        config: { type: 'integerSequence', start: 1, step: 0 },
      });

      expect(error).toBe('Step cannot be zero');
    });

    it('should throw error for min >= max in random number', () => {
      const error = GeneratorService.validateGenerator({
        name: 'value',
        type: 'randomNumber',
        config: { type: 'randomNumber', min: 100, max: 50, decimals: 0 },
      });

      expect(error).toBe('Min must be less than max');
    });

    it('should throw error for empty category values', () => {
      const error = GeneratorService.validateGenerator({
        name: 'category',
        type: 'randomCategory',
        config: { type: 'randomCategory', values: [] },
      });

      expect(error).toBe('At least one category value is required');
    });
  });
});
