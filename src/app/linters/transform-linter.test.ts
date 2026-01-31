import { describe, it, expect } from 'vitest';
import { lintTransformJson, getTransformJsonError } from './transform-linter';

describe('transform-linter', () => {
  describe('getTransformJsonError', () => {
    it('returns null for valid JSON', () => {
      const json = JSON.stringify(
        {
          transforms: [{ filter: 'age > 20' }, { derive: { double_age: 'age * 2' } }],
        },
        null,
        2
      );
      expect(getTransformJsonError(json)).toBeNull();
    });

    it('returns error for invalid JSON syntax', () => {
      const json = '{ "transforms": [ { "filter": "age > 20" } '; // Missing closing bracket
      expect(getTransformJsonError(json)).toBeDefined();
      expect(getTransformJsonError(json)).not.toBeNull();
    });

    it('returns error for missing transforms property', () => {
      const json = JSON.stringify({ foo: 'bar' });
      expect(getTransformJsonError(json)).toBe('JSON must contain a "transforms" array');
    });

    it('returns error for non-array transforms', () => {
      const json = JSON.stringify({ transforms: {} });
      expect(getTransformJsonError(json)).toBe('JSON must contain a "transforms" array');
    });

    it('returns error for invalid expression in filter', () => {
      const json = JSON.stringify({
        transforms: [{ filter: 'age >' }],
      });
      const error = getTransformJsonError(json);
      expect(error).toContain('Step 1 filter:');
      expect(error).toContain('Expected expression');
    });

    it('returns error for invalid expression in derive', () => {
      const json = JSON.stringify({
        transforms: [{ derive: { col: '1 +' } }],
      });
      const error = getTransformJsonError(json);
      expect(error).toContain('Step 1 derive "col":');
      expect(error).toContain('Expected expression');
    });

    it('returns error for invalid expression in conditional', () => {
      const json = JSON.stringify({
        transforms: [
          {
            conditional: {
              conditions: [{ when: 'x >', then: '1' }],
            },
          },
        ],
      });
      const error = getTransformJsonError(json);
      expect(error).toContain('Step 1 condition 1 "when":');
      expect(error).toContain('Expected expression');
    });
  });

  describe('lintTransformJson', () => {
    it('returns diagnostics for syntax errors', () => {
      const json = '{ "transforms" }';
      const diagnostics = lintTransformJson(json);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].severity).toBe('error');
    });

    it('returns warning for unknown transform keys', () => {
      const json = JSON.stringify(
        {
          transforms: [{ unknown_op: { foo: 'bar' } }],
        },
        null,
        2
      );
      const diagnostics = lintTransformJson(json);
      const warning = diagnostics.find((d) => d.severity === 'warning');
      expect(warning).toBeDefined();
      expect(warning?.message).toContain('unknown transform "unknown_op"');
    });

    it('returns warning for empty transform', () => {
      const json = JSON.stringify(
        {
          transforms: [{}],
        },
        null,
        2
      );
      const diagnostics = lintTransformJson(json);
      const warning = diagnostics.find((d) => d.severity === 'warning');
      expect(warning).toBeDefined();
      expect(warning?.message).toContain('empty transform');
    });
  });
});
