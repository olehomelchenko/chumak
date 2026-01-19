import { describe, it, expect } from 'vitest';
import { DependencyService } from './DependencyService';
import { Model, Source } from '../types';

// Helper to create minimal test sources
function createSource(id: string, name: string): Source {
  return {
    id,
    name,
    columns: [],
    data: [],
    headerMode: 'first-row',
    delimiter: ',',
    customHeaders: null,
    origin: 'test',
  };
}

// Helper to create minimal test models
function createModel(id: string, name: string, sourceId: string, steps: any[] = []): Model {
  return {
    id,
    name,
    sourceId,
    steps,
    schema: [],
    data: [],
  };
}

describe('DependencyService', () => {
  describe('buildGraph', () => {
    it('creates nodes for sources and models', () => {
      const sources = [createSource('src_1', 'Orders')];
      const models = [createModel('mdl_1', 'Clean Orders', 'src_1')];

      const graph = DependencyService.buildGraph(sources, models);

      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.get('src_1')?.type).toBe('source');
      expect(graph.nodes.get('mdl_1')?.type).toBe('model');
    });

    it('tracks model -> source dependency', () => {
      const sources = [createSource('src_1', 'Orders')];
      const models = [createModel('mdl_1', 'Clean Orders', 'src_1')];

      const graph = DependencyService.buildGraph(sources, models);

      const modelNode = graph.nodes.get('mdl_1');
      expect(modelNode?.dependencies.has('src_1')).toBe(true);

      const sourceNode = graph.nodes.get('src_1');
      expect(sourceNode?.dependents.has('mdl_1')).toBe(true);
    });

    it('tracks join dependencies between models', () => {
      const sources = [
        createSource('src_orders', 'Orders'),
        createSource('src_customers', 'Customers'),
      ];
      const models = [
        createModel('mdl_orders', 'Clean Orders', 'src_orders'),
        createModel('mdl_customers', 'Clean Customers', 'src_customers'),
        createModel('mdl_joined', 'Joined Data', 'src_orders', [
          { import: { source: 'Orders' } },
          { join: { right: 'mdl_customers', on: [['id', 'id']], how: 'inner' } },
        ]),
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
        createSource('src_orders', 'Orders'),
        createSource('src_lookup', 'Lookup Table'),
      ];
      const models = [
        createModel('mdl_enriched', 'Enriched Orders', 'src_orders', [
          { import: { source: 'Orders' } },
          { join: { right: 'src_lookup', on: [['code', 'code']], how: 'left' } },
        ]),
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
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      expect(DependencyService.getDependents(graph, 'mdl_a')).toContain('mdl_b');
      expect(DependencyService.getDependencies(graph, 'mdl_b')).toContain('mdl_a');
    });
  });

  describe('getAllDependents (transitive)', () => {
    it('finds transitive dependents through chain', () => {
      // src_1 -> mdl_a -> mdl_b -> mdl_c
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
        createModel('mdl_c', 'Model C', 'src_1', [
          { join: { right: 'mdl_b', on: [], how: 'inner' } },
        ]),
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
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
        createModel('mdl_c', 'Model C', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
        createModel('mdl_d', 'Model D', 'src_1', [
          { join: { right: 'mdl_b', on: [], how: 'inner' } },
          { join: { right: 'mdl_c', on: [], how: 'inner' } },
        ]),
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
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const order = DependencyService.getExecutionOrder(graph, ['mdl_b']);

      const aIndex = order.indexOf('mdl_a');
      const bIndex = order.indexOf('mdl_b');
      expect(aIndex).toBeLessThan(bIndex);
    });

    it('includes source in execution order', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [createModel('mdl_a', 'Model A', 'src_1')];

      const graph = DependencyService.buildGraph(sources, models);
      const order = DependencyService.getExecutionOrder(graph, ['mdl_a']);

      expect(order).toContain('src_1');
      expect(order.indexOf('src_1')).toBeLessThan(order.indexOf('mdl_a'));
    });
  });

  describe('hasCycle', () => {
    it('returns false for acyclic graph', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      expect(DependencyService.hasCycle(graph)).toBe(false);
    });

    it('returns true for cyclic graph', () => {
      // Note: In practice, cycles shouldn't occur because you can't join a model
      // that doesn't exist yet. But we test the detection anyway.
      const sources = [createSource('src_1', 'Source')];

      // Manually construct a cycle by building graph with circular refs
      const models = [
        createModel('mdl_a', 'Model A', 'src_1', [
          { join: { right: 'mdl_b', on: [], how: 'inner' } },
        ]),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const graph = DependencyService.buildGraph(sources, models);
      expect(DependencyService.hasCycle(graph)).toBe(true);
    });
  });

  describe('canDeleteModel', () => {
    it('allows deletion when no dependents', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1'),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');
      expect(result.canDelete).toBe(true);
      expect(result.dependentModels).toEqual([]);
    });

    it('blocks deletion when model has dependents', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].name).toBe('Model B');
      expect(result.message).toContain('Model B');
    });

    it('lists multiple dependent models', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_shared', 'Shared Lookup', 'src_1'),
        createModel('mdl_x', 'Model X', 'src_1', [
          { join: { right: 'mdl_shared', on: [], how: 'inner' } },
        ]),
        createModel('mdl_y', 'Model Y', 'src_1', [
          { join: { right: 'mdl_shared', on: [], how: 'inner' } },
        ]),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_shared');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(2);
    });
  });

  describe('canDeleteSource', () => {
    it('allows deletion when no external dependents', () => {
      const sources = [
        createSource('src_orders', 'Orders'),
        createSource('src_customers', 'Customers'),
      ];
      const models = [
        createModel('mdl_orders', 'Clean Orders', 'src_orders'),
        createModel('mdl_customers', 'Clean Customers', 'src_customers'),
      ];

      const result = DependencyService.canDeleteSource(models, sources, 'src_orders');
      expect(result.canDelete).toBe(true);
    });

    it('blocks deletion when source models are referenced externally', () => {
      const sources = [createSource('src_lookup', 'Lookup'), createSource('src_main', 'Main')];
      const models = [
        createModel('mdl_lookup', 'Lookup Model', 'src_lookup'),
        createModel('mdl_main', 'Main Model', 'src_main', [
          { join: { right: 'mdl_lookup', on: [], how: 'inner' } },
        ]),
      ];

      const result = DependencyService.canDeleteSource(models, sources, 'src_lookup');
      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].name).toBe('Main Model');
    });
  });

  describe('getModelsToMarkStale', () => {
    it('returns transitive model dependents', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
        createModel('mdl_c', 'Model C', 'src_1', [
          { join: { right: 'mdl_b', on: [], how: 'inner' } },
        ]),
      ];

      const stale = DependencyService.getModelsToMarkStale(models, sources, 'mdl_a');
      expect(stale).toContain('mdl_b');
      expect(stale).toContain('mdl_c');
      expect(stale).not.toContain('mdl_a'); // Changed model itself not included
    });

    it('returns empty array when no dependents', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [createModel('mdl_a', 'Model A', 'src_1')];

      const stale = DependencyService.getModelsToMarkStale(models, sources, 'mdl_a');
      expect(stale).toEqual([]);
    });
  });

  describe('markDependentsStale', () => {
    it('marks transitive dependents as stale', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
        createModel('mdl_c', 'Model C', 'src_1', [
          { join: { right: 'mdl_b', on: [], how: 'inner' } },
        ]),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(staleIds).toContain('mdl_c');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_c')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('returns empty array when no dependents', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [createModel('mdl_a', 'Model A', 'src_1')];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toEqual([]);
    });
  });

  describe('clearStaleFlag', () => {
    it('clears the stale flag from a model', () => {
      const model = createModel('mdl_1', 'Model', 'src_1');
      model.isStale = true;

      DependencyService.clearStaleFlag(model);

      expect(model.isStale).toBe(false);
    });
  });

  describe('findOrphanedReferences', () => {
    it('finds join references to deleted models', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_orphan', 'Orphan Model', 'src_1', [
          { import: { source: 'Source' } },
          { join: { right: 'mdl_deleted', on: [], how: 'inner' } }, // Target doesn't exist
        ]),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('returns empty array when all references valid', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [
          { join: { right: 'mdl_a', on: [], how: 'inner' } },
        ]),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toEqual([]);
    });

    it('finds concat references to deleted models', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_orphan', 'Orphan Model', 'src_1', [
          { import: { source: 'Source' } },
          { concat: { with: 'mdl_deleted' } }, // Target doesn't exist
        ]),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('finds union references to deleted models', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_orphan', 'Orphan Model', 'src_1', [
          { import: { source: 'Source' } },
          { union: { with: 'mdl_deleted' } }, // Target doesn't exist
        ]),
      ];

      const orphaned = DependencyService.findOrphanedReferences(models, sources);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].modelId).toBe('mdl_orphan');
      expect(orphaned[0].stepIndex).toBe(1);
      expect(orphaned[0].targetId).toBe('mdl_deleted');
    });

    it('tracks concat dependencies in graph', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ concat: { with: 'mdl_a' } }]),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('src_1'); // Source dependency
      expect(deps).toContain('mdl_a'); // Concat dependency

      const dependents = DependencyService.getDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
    });

    it('tracks union dependencies in graph', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ union: { with: 'mdl_a' } }]),
      ];

      const graph = DependencyService.buildGraph(sources, models);

      const deps = DependencyService.getDependencies(graph, 'mdl_b');
      expect(deps).toContain('src_1'); // Source dependency
      expect(deps).toContain('mdl_a'); // Union dependency

      const dependents = DependencyService.getDependents(graph, 'mdl_a');
      expect(dependents).toContain('mdl_b');
    });

    it('marks dependents stale when concat source changes', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ concat: { with: 'mdl_a' } }]),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('marks dependents stale when union source changes', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ union: { with: 'mdl_a' } }]),
      ];

      const staleIds = DependencyService.markDependentsStale(models, sources, 'mdl_a');

      expect(staleIds).toContain('mdl_b');
      expect(models.find((m) => m.id === 'mdl_b')?.isStale).toBe(true);
      expect(models.find((m) => m.id === 'mdl_a')?.isStale).toBeUndefined();
    });

    it('prevents deletion of model referenced by concat', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ concat: { with: 'mdl_a' } }]),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');

      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].id).toBe('mdl_b');
      expect(result.message).toContain('model is referenced by');
    });

    it('prevents deletion of model referenced by union', () => {
      const sources = [createSource('src_1', 'Source')];
      const models = [
        createModel('mdl_a', 'Model A', 'src_1'),
        createModel('mdl_b', 'Model B', 'src_1', [{ union: { with: 'mdl_a' } }]),
      ];

      const result = DependencyService.canDeleteModel(models, sources, 'mdl_a');

      expect(result.canDelete).toBe(false);
      expect(result.dependentModels).toHaveLength(1);
      expect(result.dependentModels[0].id).toBe('mdl_b');
      expect(result.message).toContain('model is referenced by');
    });
  });
});
