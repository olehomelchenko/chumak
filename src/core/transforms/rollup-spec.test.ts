import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { encodeRollupSpec, decodeRollupSpec, tryDecodeRollupSpec } from './rollup-spec';
import { applyTransform } from '../transforms';
import { SchemaEngine } from '../schema-engine';
import { aggregateToSQL } from '../../app/services/duckdb-transforms';
import type { FullTransformStep } from './types';

describe('rollup-spec', () => {
  describe('encodeRollupSpec', () => {
    it('encodes a zero-arg op', () => {
      expect(encodeRollupSpec('count')).toBe('op.count()');
    });

    it('encodes a simple column with single-quote form', () => {
      expect(encodeRollupSpec('sum', 'amount')).toBe("op.sum('amount')");
    });

    it('encodes names with spaces and dots in single-quote form', () => {
      expect(encodeRollupSpec('sum', 'First Name')).toBe("op.sum('First Name')");
      expect(encodeRollupSpec('sum', 'user.id')).toBe("op.sum('user.id')");
    });

    it('falls back to JSON form for names with single quotes', () => {
      expect(encodeRollupSpec('sum', "O'Brien")).toBe('op.sum("O\'Brien")');
    });

    it('falls back to JSON form for names with backslashes', () => {
      expect(encodeRollupSpec('sum', 'path\\to')).toBe('op.sum("path\\\\to")');
    });

    it('treats empty string as no-arg', () => {
      expect(encodeRollupSpec('count', '')).toBe('op.count()');
    });
  });

  describe('decodeRollupSpec', () => {
    it('decodes a zero-arg op', () => {
      expect(decodeRollupSpec('op.count()')).toEqual({ func: 'count' });
    });

    it('decodes single-quoted legacy form', () => {
      expect(decodeRollupSpec("op.sum('amount')")).toEqual({ func: 'sum', col: 'amount' });
    });

    it('decodes JSON-quoted form', () => {
      expect(decodeRollupSpec('op.sum("amount")')).toEqual({ func: 'sum', col: 'amount' });
    });

    it('decodes JSON form with embedded single quote', () => {
      expect(decodeRollupSpec('op.sum("O\'Brien")')).toEqual({ func: 'sum', col: "O'Brien" });
    });

    it('decodes JSON form with escaped double quote', () => {
      expect(decodeRollupSpec('op.sum("a\\"b")')).toEqual({ func: 'sum', col: 'a"b' });
    });

    it('decodes JSON form with escaped backslash', () => {
      expect(decodeRollupSpec('op.sum("path\\\\to")')).toEqual({ func: 'sum', col: 'path\\to' });
    });

    it('decodes bare identifier (legacy)', () => {
      expect(decodeRollupSpec('op.sum(amount)')).toEqual({ func: 'sum', col: 'amount' });
    });

    it('decodes names with spaces inside single quotes', () => {
      expect(decodeRollupSpec("op.sum('First Name')")).toEqual({
        func: 'sum',
        col: 'First Name',
      });
    });

    it('throws on malformed input', () => {
      expect(() => decodeRollupSpec('not an expression')).toThrow();
      expect(() => decodeRollupSpec('op.sum')).toThrow();
    });
  });

  describe('round-trip', () => {
    const cases: [string, string?][] = [
      ['count'],
      ['sum', 'amount'],
      ['sum', 'First Name'],
      ['sum', 'user.id'],
      ['sum', "O'Brien"],
      ['sum', 'a"b'],
      ['sum', 'path\\to'],
      ['sum', 'café'],
      ['sum', '🎯metric'],
    ];

    it.each(cases)('round-trips func=%s col=%s', (func, col) => {
      const encoded = encodeRollupSpec(func, col);
      const decoded = decodeRollupSpec(encoded);
      expect(decoded.func).toBe(func);
      expect(decoded.col ?? undefined).toBe(col);
    });
  });

  describe('tryDecodeRollupSpec', () => {
    it('returns null on malformed input', () => {
      expect(tryDecodeRollupSpec('garbage')).toBeNull();
    });

    it('returns spec on valid input', () => {
      expect(tryDecodeRollupSpec('op.count()')).toEqual({ func: 'count' });
    });
  });

  // The encoded form is persisted inside saved workflow JSON, so a change in
  // any one consumer (arquero handler, DuckDB translator, schema-engine)
  // could silently break round-trips for unusual column names. This sweep
  // pushes each tricky name through every path using the same encoded spec.
  describe('persistence round-trip across subsystems', () => {
    const tricky: [string, string, number | null][] = [
      ["O'Brien", 'sum', 30],
      ['First Name', 'sum', 30],
      ['user.id', 'sum', 30],
      ['a"b', 'sum', 30],
      ['café', 'sum', 30],
    ];

    it.each(tricky)('column %s round-trips through arquero', (colName, func, expected) => {
      const encoded = encodeRollupSpec(func, colName);
      const table = (aq as any).from([
        { [colName]: 10, g: 'a' },
        { [colName]: 20, g: 'a' },
      ]);
      const transform = {
        aggregate: { groupby: ['g'], rollup: { total: encoded } },
      } as FullTransformStep;
      const result = applyTransform(table, transform, ['g', colName]);
      expect(result.objects()[0].total).toBe(expected);
    });

    it.each(tricky)('column %s round-trips through DuckDB SQL', (colName, func) => {
      const encoded = encodeRollupSpec(func, colName);
      const transform = {
        aggregate: { groupby: ['g'], rollup: { total: encoded } },
      } as FullTransformStep;
      const sql = aggregateToSQL(transform);
      // DuckDB uses double-quoted identifiers with embedded "" for literal "
      const ddbQuoted = `"${colName.replace(/"/g, '""')}"`;
      expect(sql).toContain(`SUM(${ddbQuoted})`);
    });

    it.each(tricky)('column %s is recognised by schema-engine', (colName, func) => {
      const encoded = encodeRollupSpec(func, colName);
      const schema = SchemaEngine.deriveNextSchema(
        [
          { name: 'g', type: 'string', format: {} },
          { name: colName, type: 'integer', format: {} },
        ],
        { aggregate: { groupby: ['g'], rollup: { total: encoded } } },
        []
      );
      const total = schema.find((c) => c.name === 'total');
      // sum inherits numeric type (float per current engine rules)
      expect(total?.type).toBe('float');
    });
  });
});
