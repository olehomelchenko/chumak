import { describe, it, expect } from 'vitest';
import {
  detectVersion,
  upgradeV1toV2,
  validateV2Workflow,
  translateIdsToNames,
  translateNamesToIds,
  V2Workflow,
  V1Workflow,
} from './workflow-v2';

describe('workflow-v2', () => {
  describe('detectVersion', () => {
    it('returns 2 for formatVersion 2', () => {
      expect(detectVersion({ formatVersion: 2 })).toBe(2);
    });

    it('returns 1 for formatVersion 1', () => {
      expect(detectVersion({ formatVersion: 1 })).toBe(1);
    });

    it('returns 1 when formatVersion is missing', () => {
      expect(detectVersion({})).toBe(1);
    });

    it('returns 1 for other values', () => {
      expect(detectVersion({ formatVersion: 3 })).toBe(1);
    });
  });

  describe('upgradeV1toV2', () => {
    it('converts a v1 workflow to v2 format', () => {
      const v1: V1Workflow = {
        formatVersion: 1,
        sytoVersion: '0.1.0',
        exportedAt: '2026-03-21T00:00:00.000Z',
        source: {
          id: 'src_1',
          name: 'orders',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'amount', type: 'float' },
          ],
        },
        model: {
          id: 'mdl_1',
          name: 'clean-orders',
          steps: [{ filter: { expr: 'amount > 0' } }],
        },
      };

      const v2 = upgradeV1toV2(v1);

      expect(v2.formatVersion).toBe(2);
      expect(v2.sytoVersion).toBe('0.1.0');
      expect(v2.exportedAt).toBe('2026-03-21T00:00:00.000Z');
      expect(Object.keys(v2.sources)).toEqual(['orders']);
      expect(v2.sources['orders'].columns).toHaveLength(2);
      expect(Object.keys(v2.models)).toEqual(['clean-orders']);
      expect(v2.models['clean-orders'].source).toBe('orders');
      expect(v2.models['clean-orders'].steps).toHaveLength(1);
      expect(v2.outputs).toEqual(['clean-orders']);
    });

    it('preserves no parsing hints from v1', () => {
      const v1: V1Workflow = {
        sytoVersion: '0.1.0',
        exportedAt: '2026-03-21T00:00:00.000Z',
        source: { name: 'data', columns: [] },
        model: { name: 'main', steps: [] },
      };

      const v2 = upgradeV1toV2(v1);
      expect(v2.sources['data'].parsing).toBeUndefined();
    });
  });

  describe('validateV2Workflow', () => {
    function createValidWorkflow(): V2Workflow {
      return {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '2026-03-21T00:00:00.000Z',
        sources: {
          orders: {
            columns: [{ name: 'id', type: 'integer' }],
          },
        },
        models: {
          main: {
            source: 'orders',
            steps: [],
          },
        },
        outputs: ['main'],
      };
    }

    it('passes for a valid workflow', () => {
      const result = validateV2Workflow(createValidWorkflow());
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails when formatVersion is wrong', () => {
      const wf = { ...createValidWorkflow(), formatVersion: 1 as any };
      const result = validateV2Workflow(wf);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'invalid_version')).toBe(true);
    });

    it('fails when no sources', () => {
      const wf = { ...createValidWorkflow(), sources: {} };
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'no_sources')).toBe(true);
    });

    it('fails when no models', () => {
      const wf = { ...createValidWorkflow(), models: {} };
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'no_models')).toBe(true);
    });

    it('fails when no outputs', () => {
      const wf = { ...createValidWorkflow(), outputs: [] };
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'no_outputs')).toBe(true);
    });

    it('fails when output references missing model', () => {
      const wf = { ...createValidWorkflow(), outputs: ['nonexistent'] };
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'missing_output')).toBe(true);
    });

    it('fails when model source references nonexistent name', () => {
      const wf = createValidWorkflow();
      wf.models['main'].source = 'nonexistent';
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'missing_model_source')).toBe(true);
    });

    it('fails when join references nonexistent model', () => {
      const wf = createValidWorkflow();
      wf.models['main'].steps = [
        { join: { right: 'nonexistent', on: [['id', 'id']], how: 'inner' } },
      ];
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'missing_reference')).toBe(true);
    });

    it('warns on unknown transform keys', () => {
      const wf = createValidWorkflow();
      wf.models['main'].steps = [{ unknownTransform: {} } as any];
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'unknown_transform')).toBe(true);
    });

    it('detects circular dependencies', () => {
      const wf = createValidWorkflow();
      wf.models['a'] = { source: 'b', steps: [] };
      wf.models['b'] = { source: 'a', steps: [] };
      wf.outputs = ['a'];
      const result = validateV2Workflow(wf);
      expect(result.errors.some((e) => e.type === 'circular_dependency')).toBe(true);
    });

    it('validates model chaining (model source referencing another model)', () => {
      const wf = createValidWorkflow();
      wf.models['derived'] = { source: 'main', steps: [] };
      wf.outputs = ['derived'];
      const result = validateV2Workflow(wf);
      expect(result.valid).toBe(true);
    });

    it('validates multi-model references (join, concat, etc.)', () => {
      const wf = createValidWorkflow();
      wf.sources['customers'] = { columns: [{ name: 'id', type: 'integer' }] };
      wf.models['lookup'] = { source: 'customers', steps: [] };
      wf.models['main'].steps = [{ join: { right: 'lookup', on: [['id', 'id']], how: 'left' } }];
      const result = validateV2Workflow(wf);
      expect(result.valid).toBe(true);
    });
  });

  describe('translateIdsToNames', () => {
    it('translates join.right IDs to names', () => {
      const steps = [{ join: { right: 'mdl_abc', on: [['id', 'id']], how: 'inner' } }] as any[];
      const idToName = new Map([['mdl_abc', 'clean-customers']]);

      const result = translateIdsToNames(steps, idToName);
      expect(result[0].join?.right).toBe('clean-customers');
    });

    it('translates concat.with IDs to names', () => {
      const steps = [{ concat: { with: 'mdl_xyz' } }] as any[];
      const idToName = new Map([['mdl_xyz', 'extra-data']]);

      const result = translateIdsToNames(steps, idToName);
      expect((result[0] as any).concat.with).toBe('extra-data');
    });

    it('translates lookup.right IDs to names', () => {
      const steps = [{ lookup: { right: 'mdl_lkp', on: [], values: ['name'] } }] as any[];
      const idToName = new Map([['mdl_lkp', 'lookup-table']]);

      const result = translateIdsToNames(steps, idToName);
      expect((result[0] as any).lookup.right).toBe('lookup-table');
    });

    it('leaves steps without references unchanged', () => {
      const steps = [{ filter: { expr: 'age > 20' } }] as any[];
      const idToName = new Map<string, string>();

      const result = translateIdsToNames(steps, idToName);
      expect(result[0]).toEqual({ filter: { expr: 'age > 20' } });
    });

    it('does not mutate original steps', () => {
      const original = { join: { right: 'mdl_1', on: [], how: 'inner' } };
      const steps = [original] as any[];
      const idToName = new Map([['mdl_1', 'other']]);

      translateIdsToNames(steps, idToName);
      expect(original.join.right).toBe('mdl_1');
    });
  });

  describe('translateNamesToIds', () => {
    it('translates names back to IDs', () => {
      const steps = [
        { join: { right: 'clean-customers', on: [['id', 'id']], how: 'inner' } },
      ] as any[];
      const nameToId = new Map([['clean-customers', 'mdl_abc']]);

      const result = translateNamesToIds(steps, nameToId);
      expect(result[0].join?.right).toBe('mdl_abc');
    });

    it('round-trips with translateIdsToNames', () => {
      const originalSteps = [
        { join: { right: 'mdl_1', on: [['id', 'id']], how: 'left' } },
        { concat: { with: 'mdl_2' } },
        { filter: { expr: 'x > 0' } },
      ] as any[];
      const idToName = new Map([
        ['mdl_1', 'customers'],
        ['mdl_2', 'extra'],
      ]);
      const nameToId = new Map([
        ['customers', 'mdl_1'],
        ['extra', 'mdl_2'],
      ]);

      const namedSteps = translateIdsToNames(originalSteps, idToName);
      const restored = translateNamesToIds(namedSteps, nameToId);

      expect(restored[0].join?.right).toBe('mdl_1');
      expect((restored[1] as any).concat.with).toBe('mdl_2');
      expect(restored[2]).toEqual({ filter: { expr: 'x > 0' } });
    });
  });
});
