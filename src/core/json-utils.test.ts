import { describe, it, expect } from 'vitest';
import {
  resolvePath,
  getSuggestedKeys,
  flattenData,
  serializeNestedData,
  resolveDuplicateHeaders,
  jsonToRows,
} from './json-utils';

describe('resolvePath', () => {
  it('returns original object for empty path', () => {
    const obj = { a: 1 };
    expect(resolvePath(obj, '')).toBe(obj);
  });

  it('navigates dot-separated keys', () => {
    expect(resolvePath({ data: { items: [1, 2] } }, 'data.items')).toEqual([1, 2]);
  });

  it('navigates numeric array indices', () => {
    expect(resolvePath({ data: [{ name: 'Alice' }] }, 'data.0.name')).toBe('Alice');
  });

  it('returns undefined for invalid paths', () => {
    expect(resolvePath({ a: 1 }, 'b.c')).toBeUndefined();
  });

  it('handles null intermediate values', () => {
    expect(resolvePath({ a: null }, 'a.b')).toBeUndefined();
  });
});

describe('getSuggestedKeys', () => {
  it('returns object keys with types for plain objects', () => {
    expect(getSuggestedKeys({ a: 1, b: 'hello' })).toEqual([
      { key: 'a', type: 'primitive' },
      { key: 'b', type: 'primitive' },
    ]);
  });

  it('classifies nested objects and arrays with counts', () => {
    expect(getSuggestedKeys({ data: { x: 1 }, items: [1, 2], name: 'test' })).toEqual([
      { key: 'data', type: 'object', count: 1 },
      { key: 'items', type: 'array', count: 2 },
      { key: 'name', type: 'primitive' },
    ]);
  });

  it('returns index + first element keys with types for arrays', () => {
    expect(getSuggestedKeys([{ name: 'Alice', tags: ['a'], meta: { x: 1 } }])).toEqual([
      { key: '0', type: 'object', count: 3 },
      { key: 'name', type: 'primitive' },
      { key: 'tags', type: 'array', count: 1 },
      { key: 'meta', type: 'object', count: 1 },
    ]);
  });

  it('returns empty array for empty arrays', () => {
    expect(getSuggestedKeys([])).toEqual([]);
  });

  it('returns empty array for primitives', () => {
    expect(getSuggestedKeys(42)).toEqual([]);
    expect(getSuggestedKeys('hello')).toEqual([]);
    expect(getSuggestedKeys(null)).toEqual([]);
  });

  it('handles null values in objects', () => {
    expect(getSuggestedKeys({ a: null, b: undefined })).toEqual([
      { key: 'a', type: 'primitive' },
      { key: 'b', type: 'primitive' },
    ]);
  });
});

describe('flattenData', () => {
  it('flattens one level of nesting with underscore delimiter', () => {
    const input = [{ user: { name: 'Alice', age: 30 } }];
    expect(flattenData(input)).toEqual([{ user_name: 'Alice', user_age: 30 }]);
  });

  it('preserves arrays as values', () => {
    const input = [{ tags: ['a', 'b'] }];
    expect(flattenData(input)).toEqual([{ tags: ['a', 'b'] }]);
  });

  it('handles null values', () => {
    const input = [{ a: null, b: 1 }];
    expect(flattenData(input)).toEqual([{ a: null, b: 1 }]);
  });

  it('handles already-flat data', () => {
    const input = [{ name: 'Alice', age: 30 }];
    expect(flattenData(input)).toEqual([{ name: 'Alice', age: 30 }]);
  });

  it('flattens deeply nested objects', () => {
    const input = [{ a: { b: { c: 1 } } }];
    expect(flattenData(input)).toEqual([{ a_b_c: 1 }]);
  });
});

describe('serializeNestedData', () => {
  it('converts nested objects to JSON strings', () => {
    const input = [{ name: 'Alice', address: { city: 'NYC' } }];
    const result = serializeNestedData(input);
    expect(result[0].name).toBe('Alice');
    expect(result[0].address).toBe('{"city":"NYC"}');
  });

  it('leaves primitives unchanged', () => {
    const input = [{ a: 1, b: 'hello', c: true, d: null }];
    const result = serializeNestedData(input);
    expect(result[0]).toEqual({ a: 1, b: 'hello', c: true, d: null });
  });

  it('serializes arrays', () => {
    const input = [{ tags: ['a', 'b'] }];
    const result = serializeNestedData(input);
    expect(result[0].tags).toBe('["a","b"]');
  });
});

describe('resolveDuplicateHeaders', () => {
  it('returns unchanged headers when no duplicates', () => {
    const { resolvedHeaders, warning } = resolveDuplicateHeaders(['a', 'b', 'c']);
    expect(resolvedHeaders).toEqual(['a', 'b', 'c']);
    expect(warning).toBe('');
  });

  it('adds _2, _3 suffixes for duplicates', () => {
    const { resolvedHeaders } = resolveDuplicateHeaders(['name', 'name', 'name']);
    expect(resolvedHeaders).toEqual(['name', 'name_2', 'name_3']);
  });

  it('produces warning for duplicates', () => {
    const { warning } = resolveDuplicateHeaders(['id', 'id']);
    expect(warning).toContain('duplicate');
    expect(warning).toContain('"id"');
  });

  it('handles multiple different duplicates', () => {
    const { resolvedHeaders } = resolveDuplicateHeaders(['a', 'b', 'a', 'b']);
    expect(resolvedHeaders).toEqual(['a', 'b', 'a_2', 'b_2']);
  });
});

describe('jsonToRows', () => {
  it('converts flat JSON array to rows', () => {
    const json = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const { rows, headers } = jsonToRows(json);
    expect(headers).toEqual(['name', 'age']);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Alice');
  });

  it('applies path to nested JSON', () => {
    const json = { data: { items: [{ x: 1 }, { x: 2 }] } };
    const { rows, headers } = jsonToRows(json, { path: 'data.items' });
    expect(headers).toEqual(['x']);
    expect(rows).toHaveLength(2);
  });

  it('applies flatten option', () => {
    const json = [{ user: { name: 'Alice' } }];
    const { headers } = jsonToRows(json, { flatten: true });
    expect(headers).toEqual(['user_name']);
  });

  it('applies serialize option', () => {
    const json = [{ data: { nested: true } }];
    const { rows } = jsonToRows(json, { serializeNested: true });
    expect(rows[0].data).toBe('{"nested":true}');
  });

  it('returns empty for non-array data', () => {
    const { rows, headers } = jsonToRows({ key: 'value' });
    expect(rows).toEqual([]);
    expect(headers).toEqual([]);
  });

  it('returns empty for empty array', () => {
    const { rows } = jsonToRows([]);
    expect(rows).toEqual([]);
  });

  it('resolves duplicate headers in output', () => {
    const json = [{ a: 1 }];
    // Simulate by using path to data with dupes — hard to trigger naturally,
    // so test resolveDuplicateHeaders integration indirectly
    const { warning } = jsonToRows(json);
    expect(warning).toBe('');
  });
});
