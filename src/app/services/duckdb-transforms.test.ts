import { describe, it, expect } from 'vitest';
import {
  quoteCol,
  sortToSQL,
  selectToSQL,
  removeToSQL,
  dedupeToSQL,
  aggregateToSQL,
} from './duckdb-transforms';
import type { FullTransformStep } from '../../core/transforms/types';

describe('quoteCol', () => {
  it('wraps column name in double quotes', () => {
    expect(quoteCol('name')).toBe('"name"');
  });

  it('escapes embedded double quotes', () => {
    expect(quoteCol('col "A"')).toBe('"col ""A"""');
  });

  it('handles column names with spaces', () => {
    expect(quoteCol('first name')).toBe('"first name"');
  });
});

describe('sortToSQL', () => {
  it('generates ORDER BY for single field ascending', () => {
    const sql = sortToSQL({ sort: { field: 'age', order: 'asc' } } as FullTransformStep);
    expect(sql).toBe('SELECT * FROM input ORDER BY "age" ASC');
  });

  it('generates ORDER BY for single field descending', () => {
    const sql = sortToSQL({ sort: { field: 'age', order: 'desc' } } as FullTransformStep);
    expect(sql).toBe('SELECT * FROM input ORDER BY "age" DESC');
  });

  it('generates ORDER BY for multiple fields', () => {
    const sql = sortToSQL({
      sort: [
        { field: 'name', order: 'asc' },
        { field: 'age', order: 'desc' },
      ],
    } as FullTransformStep);
    expect(sql).toBe('SELECT * FROM input ORDER BY "name" ASC, "age" DESC');
  });

  it('handles column names with spaces', () => {
    const sql = sortToSQL({ sort: { field: 'first name', order: 'asc' } } as FullTransformStep);
    expect(sql).toBe('SELECT * FROM input ORDER BY "first name" ASC');
  });
});

describe('selectToSQL', () => {
  it('generates SELECT with specified columns', () => {
    const sql = selectToSQL({ select: ['name', 'age'] } as FullTransformStep);
    expect(sql).toBe('SELECT "name", "age" FROM input');
  });

  it('handles single column', () => {
    const sql = selectToSQL({ select: ['id'] } as FullTransformStep);
    expect(sql).toBe('SELECT "id" FROM input');
  });
});

describe('removeToSQL', () => {
  it('generates SELECT with remaining columns', () => {
    const sql = removeToSQL({ remove: ['age'] } as FullTransformStep, ['name', 'age', 'city']);
    expect(sql).toBe('SELECT "name", "city" FROM input');
  });

  it('handles removing multiple columns', () => {
    const sql = removeToSQL({ remove: ['age', 'city'] } as FullTransformStep, [
      'name',
      'age',
      'city',
      'country',
    ]);
    expect(sql).toBe('SELECT "name", "country" FROM input');
  });
});

describe('dedupeToSQL', () => {
  it('generates DISTINCT for full row dedup', () => {
    const sql = dedupeToSQL({ dedupe: { mode: 'remove' } } as FullTransformStep, ['name', 'age']);
    expect(sql).toBe('SELECT DISTINCT * FROM input');
  });

  it('generates ROW_NUMBER for column-specific dedup', () => {
    const sql = dedupeToSQL(
      { dedupe: { columns: ['name'], mode: 'remove' } } as FullTransformStep,
      ['name', 'age']
    );
    expect(sql).toContain('ROW_NUMBER() OVER (PARTITION BY "name")');
    expect(sql).toContain('WHERE _rn = 1');
    expect(sql).toContain('"name", "age"');
  });

  it('generates ROW_NUMBER for multi-column dedup', () => {
    const sql = dedupeToSQL(
      { dedupe: { columns: ['name', 'city'], mode: 'remove' } } as FullTransformStep,
      ['name', 'age', 'city']
    );
    expect(sql).toContain('PARTITION BY "name", "city"');
  });

  it('returns empty string for unsupported mode "keep"', () => {
    const sql = dedupeToSQL({ dedupe: { columns: ['name'], mode: 'keep' } } as FullTransformStep, [
      'name',
      'age',
    ]);
    expect(sql).toBe('');
  });

  it('handles empty columns array as full dedup', () => {
    const sql = dedupeToSQL({ dedupe: { columns: [], mode: 'remove' } } as FullTransformStep, [
      'a',
      'b',
    ]);
    expect(sql).toBe('SELECT DISTINCT * FROM input');
  });
});

describe('aggregateToSQL', () => {
  it('generates GROUP BY with SUM', () => {
    const sql = aggregateToSQL({
      aggregate: {
        groupby: ['category'],
        rollup: { total: "op.sum('amount')" },
      },
    } as FullTransformStep);
    expect(sql).toBe('SELECT "category", SUM("amount") AS "total" FROM input GROUP BY "category"');
  });

  it('generates GROUP BY with multiple aggregations', () => {
    const sql = aggregateToSQL({
      aggregate: {
        groupby: ['category'],
        rollup: {
          avg_price: "op.mean('price')",
          count: 'op.count()',
        },
      },
    } as FullTransformStep);
    expect(sql).toContain('AVG("price") AS "avg_price"');
    expect(sql).toContain('COUNT(*) AS "count"');
    expect(sql).toContain('GROUP BY "category"');
  });

  it('generates aggregation without group by', () => {
    const sql = aggregateToSQL({
      aggregate: {
        groupby: [],
        rollup: { total: "op.sum('amount')" },
      },
    } as FullTransformStep);
    expect(sql).toBe('SELECT SUM("amount") AS "total" FROM input');
    expect(sql).not.toContain('GROUP BY');
  });

  it('handles distinct count', () => {
    const sql = aggregateToSQL({
      aggregate: {
        groupby: [],
        rollup: { unique_names: "op.distinct('name')" },
      },
    } as FullTransformStep);
    expect(sql).toContain('COUNT(DISTINCT "name") AS "unique_names"');
  });

  it('handles min/max', () => {
    const sql = aggregateToSQL({
      aggregate: {
        groupby: ['type'],
        rollup: {
          lowest: "op.min('price')",
          highest: "op.max('price')",
        },
      },
    } as FullTransformStep);
    expect(sql).toContain('MIN("price") AS "lowest"');
    expect(sql).toContain('MAX("price") AS "highest"');
  });

  it('throws on invalid expression', () => {
    expect(() =>
      aggregateToSQL({
        aggregate: {
          groupby: [],
          rollup: { bad: 'invalid expression' },
        },
      } as FullTransformStep)
    ).toThrow('Invalid aggregation expression');
  });

  it('throws on unsupported op function', () => {
    expect(() =>
      aggregateToSQL({
        aggregate: {
          groupby: [],
          rollup: { x: "op.unknown_func('col')" },
        },
      } as FullTransformStep)
    ).toThrow('Unsupported aggregate function');
  });
});
