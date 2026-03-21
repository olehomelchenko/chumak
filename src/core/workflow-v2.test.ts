import { describe, it, expect } from 'vitest';
import {
  validateV2Workflow,
  translateIdsToNames,
  translateNamesToIds,
  getReachableModels,
  topologicalSortV2,
  V2Workflow,
} from './workflow-v2';

describe('workflow-v2', () => {
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

  describe('getReachableModels', () => {
    it('returns single model from outputs', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: { main: { source: 'data', steps: [] } },
        outputs: ['main'],
      };
      expect(getReachableModels(wf, wf.outputs)).toEqual(new Set(['main']));
    });

    it('walks upstream through model chain', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: {
          clean: { source: 'data', steps: [] },
          enriched: { source: 'clean', steps: [] },
        },
        outputs: ['enriched'],
      };
      expect(getReachableModels(wf, wf.outputs)).toEqual(new Set(['enriched', 'clean']));
    });

    it('walks diamond dependencies', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: {
          base: { source: 'data', steps: [] },
          left: { source: 'base', steps: [] },
          right: { source: 'base', steps: [] },
          merged: {
            source: 'left',
            steps: [{ join: { right: 'right', on: [['id', 'id']], how: 'inner' } }],
          },
        },
        outputs: ['merged'],
      };
      const reachable = getReachableModels(wf, wf.outputs);
      expect(reachable).toEqual(new Set(['merged', 'left', 'right', 'base']));
    });

    it('respects outputs subset', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: {
          a: { source: 'data', steps: [] },
          b: { source: 'data', steps: [] },
        },
        outputs: ['a', 'b'],
      };
      expect(getReachableModels(wf, ['a'])).toEqual(new Set(['a']));
    });
  });

  describe('topologicalSortV2', () => {
    it('returns single model', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: { main: { source: 'data', steps: [] } },
        outputs: ['main'],
      };
      const reachable = getReachableModels(wf, wf.outputs);
      expect(topologicalSortV2(wf, reachable)).toEqual(['main']);
    });

    it('sorts chain in dependency order', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: {
          clean: { source: 'data', steps: [] },
          enriched: { source: 'clean', steps: [] },
        },
        outputs: ['enriched'],
      };
      const reachable = getReachableModels(wf, wf.outputs);
      const order = topologicalSortV2(wf, reachable);
      expect(order.indexOf('clean')).toBeLessThan(order.indexOf('enriched'));
    });

    it('sorts diamond dependency correctly', () => {
      const wf: V2Workflow = {
        formatVersion: 2,
        sytoVersion: '0.1.0',
        exportedAt: '',
        sources: { data: { columns: [] } },
        models: {
          base: { source: 'data', steps: [] },
          left: { source: 'base', steps: [] },
          right: { source: 'base', steps: [] },
          merged: {
            source: 'left',
            steps: [{ join: { right: 'right', on: [['id', 'id']], how: 'inner' } }],
          },
        },
        outputs: ['merged'],
      };
      const reachable = getReachableModels(wf, wf.outputs);
      const order = topologicalSortV2(wf, reachable);
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('left'));
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('right'));
      expect(order.indexOf('left')).toBeLessThan(order.indexOf('merged'));
      expect(order.indexOf('right')).toBeLessThan(order.indexOf('merged'));
    });
  });
});
