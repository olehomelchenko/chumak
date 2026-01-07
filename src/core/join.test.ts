import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform } from './transforms';

describe('Join Transforms', () => {
  const sourceData = [
    { id: 1, val: 'a' },
    { id: 2, val: 'b' },
  ];

  const filteredModelAData = [{ id: 1, score: 100 }];

  it('should join with model using its current (transformed) data', () => {
    const mainTable = (aq as any).from(sourceData);

    // Model A with transformations applied (cached in .data)
    const models = [
      {
        id: 'mdl_A',
        name: 'Model A',
        data: filteredModelAData,
        steps: [{ import: { source: 'sourceA' } }, { filter: 'id == 1' }],
      },
    ];

    const context = {
      sources: [],
      models: models,
    };

    const transform = {
      join: {
        right: 'mdl_A',
        on: [['id', 'id']],
        how: 'inner',
      },
    };

    const result = applyTransform(mainTable, transform, ['id', 'val'], context);
    const objects = result.objects();

    expect(objects.length).toBe(1);
    expect(objects[0].id).toBe(1);
    expect(objects[0].score).toBe(100);
  });

  it('should join when left table also has transformations', () => {
    const leftTable = (aq as any).from([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    // Transform left table manually first (simulating previous steps)
    const filteredLeft = leftTable.filter((d: any) => d.id > 1);

    const models = [
      {
        id: 'mdl_right',
        name: 'Right Model',
        data: [
          { id: 2, age: 25 },
          { id: 3, age: 30 },
        ],
      },
    ];

    const context = {
      sources: [],
      models: models,
    };

    const transform = {
      join: {
        right: 'mdl_right',
        on: [['id', 'id']],
        how: 'inner',
      },
    };

    // Apply join to the already filtered left table
    const result = applyTransform(filteredLeft, transform, ['id', 'name'], context);
    const objects = result.objects();

    expect(objects.length).toBe(2);
    expect(objects.map((o) => o.id)).toContain(2);
    expect(objects.map((o) => o.id)).toContain(3);
    expect(objects.find((o) => o.id === 2).age).toBe(25);
  });

  it('should use source data when joining with a source ID', () => {
    const leftTable = (aq as any).from([{ id: 1, val: 'aa' }]);

    const sources = [
      {
        id: 'src_1',
        name: 'Source 1',
        data: [
          { id: 1, extra: 'info' },
          { id: 2, extra: 'ignored' },
        ],
      },
    ];

    const context = {
      sources: sources,
      models: [],
    };

    const transform = {
      join: {
        right: 'src_1',
        on: [['id', 'id']],
        how: 'inner',
      },
    };

    const result = applyTransform(leftTable, transform, ['id', 'val'], context);
    const objects = result.objects();

    expect(objects.length).toBe(1);
    expect(objects[0].extra).toBe('info');
  });
});
