import { describe, it, expect } from 'vitest';
import { signal } from '@preact/signals';
import {
  validateExpression,
  validateRegexPattern,
  isExpressionValid,
  isRegexValid,
} from './validation-engine';

describe('validation-engine', () => {
  describe('validateExpression', () => {
    const columns = ['name', 'age', 'city'];

    it('validates a correct expression', () => {
      const result = validateExpression('age > 18', columns);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.ast).not.toBeNull();
    });

    it('validates expression with function calls', () => {
      const result = validateExpression('upper(name)', columns);

      expect(result.valid).toBe(true);
      expect(result.ast).not.toBeNull();
    });

    it('returns error for unknown column', () => {
      const result = validateExpression('unknown_col > 5', columns);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Column 'unknown_col' not found");
      expect(result.ast).toBeNull();
    });

    it('returns error for invalid syntax', () => {
      const result = validateExpression('age >', columns);

      expect(result.valid).toBe(false);
      expect(result.error).not.toBeNull();
      expect(result.ast).toBeNull();
    });

    it('returns error for unknown functions', () => {
      const result = validateExpression('unknown_func(name)', columns);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Function 'unknown_func' is not allowed");
    });

    it('treats empty expression as valid by default', () => {
      const result = validateExpression('', columns);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('treats whitespace-only expression as valid by default', () => {
      const result = validateExpression('   ', columns);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('treats empty expression as invalid when allowEmpty is false', () => {
      const result = validateExpression('', columns, { allowEmpty: false });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression is required');
    });

    it('writes error to provided signal', () => {
      const errorSignal = signal<string | null>(null);

      validateExpression('bad_col > 5', columns, { errorSignal });

      expect(errorSignal.value).toContain("Column 'bad_col' not found");
    });

    it('clears error signal on valid expression', () => {
      const errorSignal = signal<string | null>('previous error');

      validateExpression('age > 5', columns, { errorSignal });

      expect(errorSignal.value).toBeNull();
    });

    it('clears error signal on empty expression', () => {
      const errorSignal = signal<string | null>('previous error');

      validateExpression('', columns, { errorSignal });

      expect(errorSignal.value).toBeNull();
    });

    it('validates complex expressions', () => {
      const result = validateExpression('age > 18 && city == "Boston"', columns);

      expect(result.valid).toBe(true);
    });

    it('validates expressions with column names containing spaces', () => {
      const columnsWithSpaces = ['First Name', 'Last Name'];
      const result = validateExpression('[First Name] == "John"', columnsWithSpaces);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateRegexPattern', () => {
    it('validates a correct regex pattern', () => {
      const result = validateRegexPattern('[a-z]+');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.regex).not.toBeNull();
      expect(result.regex?.source).toBe('[a-z]+');
    });

    it('validates pattern with special characters', () => {
      const result = validateRegexPattern('\\d{3}-\\d{4}');

      expect(result.valid).toBe(true);
      expect(result.regex?.source).toBe('\\d{3}-\\d{4}');
    });

    it('returns error for invalid regex', () => {
      const result = validateRegexPattern('[invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid pattern');
      expect(result.regex).toBeNull();
    });

    it('returns error for invalid quantifier', () => {
      const result = validateRegexPattern('*');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid pattern');
    });

    it('treats empty pattern as valid by default', () => {
      const result = validateRegexPattern('');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('treats empty pattern as invalid when allowEmpty is false', () => {
      const result = validateRegexPattern('', { allowEmpty: false });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Pattern is required');
    });

    it('applies regex flags', () => {
      const result = validateRegexPattern('test', { flags: 'gi' });

      expect(result.valid).toBe(true);
      expect(result.regex?.flags).toBe('gi');
    });

    it('writes error to provided signal', () => {
      const errorSignal = signal<string | null>(null);

      validateRegexPattern('[bad', { errorSignal });

      expect(errorSignal.value).toContain('Invalid pattern');
    });

    it('clears error signal on valid pattern', () => {
      const errorSignal = signal<string | null>('previous error');

      validateRegexPattern('[a-z]+', { errorSignal });

      expect(errorSignal.value).toBeNull();
    });

    it('uses custom error prefix', () => {
      const result = validateRegexPattern('[bad', { errorPrefix: 'Invalid regex' });

      expect(result.error).toContain('Invalid regex:');
    });

    it('returns compiled regex for further use', () => {
      const result = validateRegexPattern('\\d+');

      expect(result.regex?.test('123')).toBe(true);
      expect(result.regex?.test('abc')).toBe(false);
    });
  });

  describe('isExpressionValid', () => {
    it('returns true for valid expression', () => {
      expect(isExpressionValid('age > 18', ['age'])).toBe(true);
    });

    it('returns false for invalid expression', () => {
      expect(isExpressionValid('bad > 5', ['age'])).toBe(false);
    });

    it('returns true for empty expression', () => {
      expect(isExpressionValid('', ['age'])).toBe(true);
    });
  });

  describe('isRegexValid', () => {
    it('returns true for valid regex', () => {
      expect(isRegexValid('[a-z]+')).toBe(true);
    });

    it('returns false for invalid regex', () => {
      expect(isRegexValid('[bad')).toBe(false);
    });

    it('returns true for empty pattern', () => {
      expect(isRegexValid('')).toBe(true);
    });

    it('accepts flags parameter', () => {
      expect(isRegexValid('test', 'gi')).toBe(true);
    });
  });
});
