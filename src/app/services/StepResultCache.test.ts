import { describe, it, expect, beforeEach } from 'vitest';
import { getCheckpoint, setCheckpoint, invalidate, invalidateForModel } from './StepResultCache';
import type { ColumnSchema } from '../../core/schema-engine';

const schema: ColumnSchema[] = [
  { name: 'a', type: 'integer' },
  { name: 'b', type: 'string' },
];

const data = [
  { a: 1, b: 'x' },
  { a: 2, b: 'y' },
];

const steps = [{ import: { source: 'test' } }, { filter: 'a > 0' }];

describe('StepResultCache', () => {
  beforeEach(() => {
    invalidate();
  });

  it('returns null when cache is empty', () => {
    expect(getCheckpoint('m1', steps)).toBeNull();
  });

  it('stores and retrieves a checkpoint', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);

    const hit = getCheckpoint('m1', steps);
    expect(hit).not.toBeNull();
    expect(hit!.modelId).toBe('m1');
    expect(hit!.stepIndex).toBe(1);
    expect(hit!.data).toBe(data);
    expect(hit!.schema).toBe(schema);
    expect(hit!.columns).toEqual(['a', 'b']);
  });

  it('returns null for wrong modelId', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);

    expect(getCheckpoint('m2', steps)).toBeNull();
  });

  it('returns null for wrong fingerprint (steps changed)', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);

    const differentSteps = [{ import: { source: 'test' } }, { filter: 'a > 1' }];
    expect(getCheckpoint('m1', differentSteps)).toBeNull();
  });

  it('invalidate() clears the cache', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);
    invalidate();

    expect(getCheckpoint('m1', steps)).toBeNull();
  });

  it('invalidateForModel() clears cache for matching model', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);
    invalidateForModel('m1');

    expect(getCheckpoint('m1', steps)).toBeNull();
  });

  it('invalidateForModel() keeps cache for different model', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);
    invalidateForModel('m2');

    expect(getCheckpoint('m1', steps)).not.toBeNull();
  });

  it('second setCheckpoint overwrites the first', () => {
    setCheckpoint('m1', 1, data, schema, ['a', 'b'], steps);

    const newData = [{ a: 10, b: 'z' }];
    const newSteps = [{ import: { source: 'other' } }];
    setCheckpoint('m2', 0, newData, schema, ['a', 'b'], newSteps);

    // Old entry gone
    expect(getCheckpoint('m1', steps)).toBeNull();
    // New entry present
    const hit = getCheckpoint('m2', newSteps);
    expect(hit).not.toBeNull();
    expect(hit!.data).toBe(newData);
  });
});
