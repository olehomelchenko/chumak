import { describe, it, expect } from 'vitest';
import { DependencyService } from './DependencyService';
import { createTestSource, createTestModel } from '../handlers/test-utils';

describe('DependencyService', () => {
  describe('buildGraph', () => {
    it('creates nodes for sources and models', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Orders' })];
      const models = [
        createTestModel({ id: 'mdl_1', name: 'Clean Orders', sourceId: 'src_1', steps: [] }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.get('src_1')?.type).toBe('source');
      expect(graph.nodes.get('mdl_1')?.type).toBe('model');
    });

    it('tracks model -> source dependency', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Orders' })];
      const models = [
        createTestModel({ id: 'mdl_1', name: 'Clean Orders', sourceId: 'src_1', steps: [] }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const modelNode = graph.nodes.get('mdl_1');
      expect(modelNode?.dependencies.has('src_1')).toBe(true);

      const sourceNode = graph.nodes.get('src_1');
      expect(sourceNode?.dependents.has('mdl_1')).toBe(true);
    });

    it('tracks join dependencies between models', () => {
      const sources = [
        createTestSource({ id: 'src_orders', name: 'Orders' }),
        createTestSource({ id: 'src_customers', name: 'Customers' }),
      ];
      const models = [
        createTestModel({
          id: 'mdl_orders',
          name: 'Clean Orders',
          sourceId: 'src_orders',
          steps: [],
        }),
        createTestModel({
          id: 'mdl_customers',
          name: 'Clean Customers',
          sourceId: 'src_customers',
          steps: [],
        }),
        createTestModel({
          id: 'mdl_joined',
          name: 'Joined Data',
          sourceId: 'src_orders',
          steps: [
            { import: { source: 'Orders' } },
            { join: { right: 'mdl_customers', on: [['id', 'id']], how: 'inner' } },
          ],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const joinedNode = graph.nodes.get('mdl_joined');
      expect(joinedNode?.dependencies.has('mdl_customers')).toBe(true);
      expect(joinedNode?.dependencies.has('src_orders')).toBe(true);

      const customersNode = graph.nodes.get('mdl_customers');
      expect(customersNode?.dependents.has('mdl_joined')).toBe(true);
    });

    it('handles join to source (not model)', () => {
      const sources = [
        createTestSource({ id: 'src_orders', name: 'Orders' }),
        createTestSource({ id: 'src_lookup', name: 'Lookup Table' }),
      ];
      const models = [
        createTestModel({
          id: 'mdl_enriched',
          name: 'Enriched Orders',
          sourceId: 'src_orders',
          steps: [
            { import: { source: 'Orders' } },
            { join: { right: 'src_lookup', on: [['code', 'code']], how: 'left' } },
          ],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const enrichedNode = graph.nodes.get('mdl_enriched');
      expect(enrichedNode?.dependencies.has('src_orders')).toBe(true);
      expect(enrichedNode?.dependencies.has('src_lookup')).toBe(true);
    });
  });

  describe('getDependents / getDependencies', () => {
    it('returns empty arrays for non-existent nodes', () => {
      const graph = DependencyService.buildGraph([], []);

      expect(DependencyService.getDependents(graph, 'fake_id')).toEqual([]);
      expect(DependencyService.getDependencies(graph, 'fake_id')).toEqual([]);
    });

    it('returns direct dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      expect(DependencyService.getDependents(graph, 'mdl_a')).toContain('mdl_b');
      expect(DependencyService.getDependencies(graph, 'mdl_b')).toContain('mdl_a');
    });
  });

  describe('getAllDependents (transitive)', () => {
    it('finds transitive dependents through chain', () => {
      // src_1 -> mdl_a -> mdl_b -> mdl_c
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_c',
          name: 'Model C',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_b', on: [], how: 'inner' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const dependents = DependencyService.getAllDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
      expect(dependents).toContain('mdl_c');
      expect(dependents.length).toBe(2);
    });

    it('handles diamond dependencies', () => {
      //     mdl_a
      //    /     \
      // mdl_b   mdl_c
      //    \     /
      //     mdl_d
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_c',
          name: 'Model C',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_d',
          name: 'Model D',
          sourceId: 'src_1',
          steps: [
            { join: { right: 'mdl_b', on: [], how: 'inner' } },
            { join: { right: 'mdl_c', on: [], how: 'inner' } },
          ],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const dependents = DependencyService.getAllDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
      expect(dependents).toContain('mdl_c');
      expect(dependents).toContain('mdl_d');
      expect(dependents.length).toBe(3);
    });
  });

  describe('getExecutionOrder', () => {
    it('returns dependencies before dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const order = DependencyService.getExecutionOrder(graph, ['mdl_b']);

      const aIndex = order.indexOf('mdl_a');
      const bIndex = order.indexOf('mdl_b');
      expect(aIndex).toBeLessThan(bIndex);
    });

    it('includes source in execution order', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      const order = DependencyService.getExecutionOrder(graph, ['mdl_a']);

      expect(order).toContain('src_1');
      expect(order.indexOf('src_1')).toBeLessThan(order.indexOf('mdl_a'));
    });
  });

  describe('hasCycle', () => {
    it('returns false for acyclic graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      expect(DependencyService.hasCycle(graph)).toBe(false);
    });

    it('returns true for cyclic graph', () => {
      // Note: In practice, cycles shouldn't occur because you can't join a model
      // that doesn't exist yet. But we test the detection anyway.
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];

      // Manually construct a cycle by building graph with circular refs
      const models = [
        createTestModel({
          id: 'mdl_a',
          name: 'Model A',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_b', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      expect(DependencyService.hasCycle(graph)).toBe(true);
    });
  });

  describe('canDeleteModel', () => {
    it('allows deletion when no dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({ id: 'mdl_b', name: 'Model B', sourceId: 'src_1', steps: [] }),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');
      expect(result.canDelete).toBe(true);
      expect(result.dependentModels).toEqual([]);
    });

    it('blocks deletion when model has dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].name).toBe('Model B');
      expect(result.message).toContain('Model B');
    });

    it('lists multiple dependent models', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_shared', name: 'Shared Lookup', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_x',
          name: 'Model X',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_shared', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_y',
          name: 'Model Y',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_shared', on: [], how: 'inner' } }],
        }),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_shared');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(2);
    });
  });

  describe('canDeleteSource', () => {
    it('allows deletion when no external dependents', () => {
      const sources = [
        createTestSource({ id: 'src_orders', name: 'Orders' }),
        createTestSource({ id: 'src_customers', name: 'Customers' }),
      ];
      const models = [
        createTestModel({
          id: 'mdl_orders',
          name: 'Clean Orders',
          sourceId: 'src_orders',
          steps: [],
        }),
        createTestModel({
          id: 'mdl_customers',
          name: 'Clean Customers',
          sourceId: 'src_customers',
          steps: [],
        }),
      ];

      const result = DependencyService.canDeleteSource(models, sources, 'src_orders');
      expect(result.canDelete).toBe(true);
    });

    it('blocks deletion when source models are referenced externally', () => {
      const sources = [
        createTestSource({ id: 'src_lookup', name: 'Lookup' }),
        createTestSource({ id: 'src_main', name: 'Main' }),
      ];
      const models = [
        createTestModel({
          id: 'mdl_lookup',
          name: 'Lookup Model',
          sourceId: 'src_lookup',
          steps: [],
        }),
        createTestModel({
          id: 'mdl_main',
          name: 'Main Model',
          sourceId: 'src_main',
          steps: [{ join: { right: 'mdl_lookup', on: [], how: 'inner' } }],
        }),
      ];

      const result = DependencyService.canDeleteSource(models, sources, 'src_lookup');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].name).toBe('Main Model');
    });
  });

  describe('getModelsToMarkStale', () => {
    it('returns transitive model dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_c',
          name: 'Model C',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_b', on: [], how: 'inner' } }],
        }),
      ];

      const stale = DependencyService.getModelsToMarkStale(models, sources, 'mdl_a');
      expect(stale).toContain('mdl_b');
      expect(stale).toContain('mdl_c');
      expect(stale).not.toContain('mdl_a'); // Changed model itself not included
    });

    it('returns empty array when no dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
      ];

      const stale = DependencyService.getModelsToMarkStale(models, sources, 'mdl_a');
      expect(stale).toEqual([]);
    });
  });

  describe('markDependentsStale', () => {
    it('marks transitive dependents as stale', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
        createTestModel({
          id: 'mdl_c',
          name: 'Model C',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_b', on: [], how: 'inner' } }],
        }),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(staleIds).toContain('mdl_c');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_c')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('returns empty array when no dependents', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toEqual([]);
    });
  });

  describe('clearStaleFlag', () => {
    it('clears the stale flag from a model', () => {
      const model = createTestModel({ id: 'mdl_1', name: 'Model', sourceId: 'src_1', steps: [] });
      model.isStale = true;

      DependencyService.clearStaleFlag(model);

      expect(model.isStale).toBe(false);
    });
  });

  describe('findOrphanedReferences', () => {
    it('finds join references to deleted models', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({
          id: 'mdl_orphan',
          name: 'Orphan Model',
          sourceId: 'src_1',
          steps: [
            { import: { source: 'Source' } },
            { join: { right: 'mdl_deleted', on: [], how: 'inner' } }, // Target doesn't exist
          ],
        }),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('returns empty array when all references valid', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ join: { right: 'mdl_a', on: [], how: 'inner' } }],
        }),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toEqual([]);
    });

    it('finds concat references to deleted models', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({
          id: 'mdl_orphan',
          name: 'Orphan Model',
          sourceId: 'src_1',
          steps: [
            { import: { source: 'Source' } },
            { concat: { with: 'mdl_deleted' } }, // Target doesn't exist
          ],
        }),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('finds union references to deleted models', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({
          id: 'mdl_orphan',
          name: 'Orphan Model',
          sourceId: 'src_1',
          steps: [
            { import: { source: 'Source' } },
            { union: { with: 'mdl_deleted' } }, // Target doesn't exist
          ],
        }),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('tracks concat dependencies in graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ concat: { with: 'mdl_a' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('src_1'); // Source dependency
      expect(deps).toContain('mdl_a'); // Concat dependency

      const dependents = DependencyService.getDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
    });

    it('tracks union dependencies in graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ union: { with: 'mdl_a' } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('src_1'); // Source dependency
      expect(deps).toContain('mdl_a'); // Union dependency

      const dependents = DependencyService.getDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
    });

    it('marks dependents stale when concat source changes', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ concat: { with: 'mdl_a' } }],
        }),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('marks dependents stale when union source changes', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ union: { with: 'mdl_a' } }],
        }),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('prevents deletion of model referenced by concat', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ concat: { with: 'mdl_a' } }],
        }),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');

      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].id).toBe('mdl_b');
      expect(result.message).toContain('model is referenced by');
    });

    it('prevents deletion of model referenced by union', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ union: { with: 'mdl_a' } }],
        }),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');

      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].id).toBe('mdl_b');
      expect(result.message).toContain('model is referenced by');
    });

    it('tracks semijoin dependencies in graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ semijoin: { right: 'mdl_a', on: [] } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('mdl_a');
    });

    it('tracks antijoin dependencies in graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ antijoin: { right: 'mdl_a', on: [] } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('mdl_a');
    });

    it('tracks lookup dependencies in graph', () => {
      const sources = [createTestSource({ id: 'src_1', name: 'Source' })];
      const models = [
        createTestModel({ id: 'mdl_a', name: 'Model A', sourceId: 'src_1', steps: [] }),
        createTestModel({
          id: 'mdl_b',
          name: 'Model B',
          sourceId: 'src_1',
          steps: [{ lookup: { right: 'mdl_a', on: [], values: [] } }],
        }),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('mdl_a');
    });
  });
});
