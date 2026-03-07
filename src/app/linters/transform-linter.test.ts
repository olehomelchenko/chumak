import { describe, it, expect } from 'vitest';
import { lintTransformJson, getTransformJsonError, validateSteps } from './transform-linter';

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

  describe('validateSteps', () => {
    it('returns empty array for valid steps', () => {
      const steps = [
        { filter: 'age > 20' },
        { derive: { double_age: 'age * 2' } },
        { sort: [{ column: 'name', direction: 'asc' }] },
      ];
      expect(validateSteps(steps)).toEqual([]);
    });

    it('returns empty array for empty steps', () => {
      expect(validateSteps([])).toEqual([]);
    });

    it('warns on non-object step', () => {
      const warnings = validateSteps([null, 'not-an-object', [1, 2]]);
      expect(warnings).toHaveLength(3);
      expect(warnings[0]).toBe('Step 1: not a valid object');
      expect(warnings[1]).toBe('Step 2: not a valid object');
      expect(warnings[2]).toBe('Step 3: not a valid object');
    });

    it('warns on unknown transform keys', () => {
      const warnings = validateSteps([{ unknown_op: { foo: 'bar' } }]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('unknown transform "unknown_op"');
    });

    it('ignores __v key', () => {
      const warnings = validateSteps([{ __v: 1, filter: 'x > 0' }]);
      expect(warnings).toEqual([]);
    });

    it('warns on invalid filter expression', () => {
      const warnings = validateSteps([{ filter: 'age >' }]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Step 1 filter:');
    });

    it('warns on invalid derive expression', () => {
      const warnings = validateSteps([{ derive: { col: '1 +' } }]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Step 1 derive "col":');
    });

    it('warns on invalid conditional when/then expressions', () => {
      const warnings = validateSteps([
        {
          conditional: {
            conditions: [{ when: 'x >', then: '1' }],
          },
        },
      ]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Step 1 condition 1 "when":');
    });

    it('warns on invalid conditional else expression', () => {
      const warnings = validateSteps([
        {
          conditional: {
            conditions: [{ when: 'x > 0', then: '"yes"' }],
            else: '1 +',
          },
        },
      ]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Step 1 "else":');
    });

    it('collects multiple warnings across steps', () => {
      const warnings = validateSteps([
        { filter: 'age >' },
        { unknown_op: true },
        { derive: { a: '1 +', b: 'valid + 1' } },
      ]);
      expect(warnings).toHaveLength(3);
    });
  });
});
