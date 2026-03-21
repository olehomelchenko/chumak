import { Model, Source } from '../types';
import { TransformStep } from '../../core/schema-engine';
import { MULTI_MODEL_REFERENCE_PATHS } from '../../core/transforms/types';

/**
 * DependencyService
 *
 * Builds and queries a dependency graph for multi-model workflows.
 * Models can reference other models/sources via join transforms.
 * This service tracks those relationships to enable:
 * - Cascade warnings on delete
 * - Staleness tracking when dependencies change
 * - Correct execution order (topological sort)
 */

export interface DependencyNode {
  id: string;
  type: 'source' | 'model';
  dependencies: Set<string>; // IDs this node depends on
  dependents: Set<string>; // IDs that depend on this node
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
}

export interface DependencyCheckResult {
  canDelete: boolean;
  dependentModels: Array<{ id: string; name: string }>;
  message?: string;
}

/**
 * Extracts all model/source IDs referenced by a transform step.
 * Uses MULTI_MODEL_REFERENCE_PATHS as the single source of truth.
 */
function extractReferencedIds(step: TransformStep): string[] {
  const ids: string[] = [];

  for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
    const stepValue = (step as any)[key];
    if (stepValue && stepValue[field]) {
      ids.push(stepValue[field]);
    }
  }

  return ids;
}

export class DependencyService {
  /**
   * Builds a dependency graph from sources and models.
   * Graph is computed, not persisted - single source of truth remains model transforms.
   */
  static buildGraph(sources: Source[], models: Model[]): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();

    // Add source nodes (no dependencies, only dependents)
    for (const source of sources) {
      nodes.set(source.id, {
        id: source.id,
        type: 'source',
        dependencies: new Set(),
        dependents: new Set(),
      });
    }

    // Add model nodes
    for (const model of models) {
      const dependencies = new Set<string>();

      // Model depends on its source
      dependencies.add(model.sourceId);

      // Scan steps for multi-model references
      for (const step of model.steps) {
        const referencedIds = extractReferencedIds(step);
        for (const refId of referencedIds) {
          dependencies.add(refId);
        }
      }

      nodes.set(model.id, {
        id: model.id,
        type: 'model',
        dependencies,
        dependents: new Set(),
      });
    }

    // Build reverse edges (dependents)
    for (const [nodeId, node] of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.add(nodeId);
        }
      }
    }

    return { nodes };
  }

  /**
   * Gets all IDs that directly depend on a given node.
   */
  static getDependents(graph: DependencyGraph, id: string): string[] {
    const node = graph.nodes.get(id);
    return node ? Array.from(node.dependents) : [];
  }

  /**
   * Gets all IDs that a node depends on.
   */
  static getDependencies(graph: DependencyGraph, id: string): string[] {
    const node = graph.nodes.get(id);
    return node ? Array.from(node.dependencies) : [];
  }

  /**
   * Gets all transitive dependents (full downstream cascade).
   * Uses BFS to find all nodes that transitively depend on the given node.
   */
  static getAllDependents(graph: DependencyGraph, id: string): string[] {
    const visited = new Set<string>();
    const queue = [id];
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = graph.nodes.get(current);
      if (!node) continue;

      for (const depId of node.dependents) {
        if (!visited.has(depId)) {
          visited.add(depId);
          result.push(depId);
          queue.push(depId);
        }
      }
    }

    return result;
  }

  /**
   * Returns topological order for executing models.
   * Dependencies come before dependents.
   */
  static getExecutionOrder(graph: DependencyGraph, targetIds: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = graph.nodes.get(id);
      if (!node) return;

      // Visit dependencies first
      for (const depId of node.dependencies) {
        visit(depId);
      }

      result.push(id);
    };

    for (const id of targetIds) {
      visit(id);
    }

    return result;
  }

  /**
   * Detects if the graph has a cycle.
   * Uses DFS with color marking (white/gray/black).
   */
  static hasCycle(graph: DependencyGraph): boolean {
    const WHITE = 0; // Not visited
    const GRAY = 1; // In current path
    const BLACK = 2; // Finished

    const colors = new Map<string, number>();
    for (const id of graph.nodes.keys()) {
      colors.set(id, WHITE);
    }

    const hasCycleFrom = (id: string): boolean => {
      colors.set(id, GRAY);

      const node = graph.nodes.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          const color = colors.get(depId);
          if (color === GRAY) return true; // Back edge = cycle
          if (color === WHITE && hasCycleFrom(depId)) return true;
        }
      }

      colors.set(id, BLACK);
      return false;
    };

    for (const id of graph.nodes.keys()) {
      if (colors.get(id) === WHITE && hasCycleFrom(id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a model can be safely deleted.
   * Returns dependent models that would be affected.
   */
  static canDeleteModel(
    models: Model[],
    sources: Source[],
    modelId: string
  ): DependencyCheckResult {
    const graph = DependencyService.buildGraph(sources, models);
    const dependentIds = DependencyService.getDependents(graph, modelId);

    // Filter to only model dependents (not sources)
    const dependentModels = dependentIds
      .map((id) => models.find((m) => m.id === id))
      .filter((m): m is Model => m !== undefined)
      .map((m) => ({ id: m.id, name: m.name }));

    if (dependentModels.length === 0) {
      return { canDelete: true, dependentModels: [] };
    }

    const modelNames = dependentModels.map((m) => m.name).join(', ');
    return {
      canDelete: false,
      dependentModels,
      message: `Cannot delete: model is referenced by ${dependentModels.length === 1 ? 'model' : 'models'}: ${modelNames}`,
    };
  }

  /**
   * Checks if adding a dependency to a target would create a circular dependency.
   * @param models - All models
   * @param sources - All sources
   * @param activeModelId - ID of the model where the dependency is being added
   * @param targetId - ID of the model/source being referenced
   */
  static checkCircularDependency(
    models: Model[],
    sources: Source[],
    activeModelId: string | null,
    targetId: string
  ): { isCyclic: boolean; message?: string } {
    if (!activeModelId) return { isCyclic: false };

    const graph = DependencyService.buildGraph(sources, models);
    const node = graph.nodes.get(activeModelId);

    if (node) {
      node.dependencies.add(targetId);
      if (DependencyService.hasCycle(graph)) {
        const targetName =
          models.find((m) => m.id === targetId)?.name ||
          sources.find((s) => s.id === targetId)?.name ||
          'target';
        return {
          isCyclic: true,
          message: `Cannot reference "${targetName}": this would create a circular dependency (e.g., A depends on B, B depends on A).`,
        };
      }
    }

    return { isCyclic: false };
  }

  /**
   * Checks if a source can be safely deleted.
   * A source can be deleted if all its dependent models can be deleted.
   * This is more permissive since deleting a source already cascades to its models.
   */
  static canDeleteSource(
    models: Model[],
    sources: Source[],
    sourceId: string
  ): DependencyCheckResult {
    const graph = DependencyService.buildGraph(sources, models);

    // Find models that depend on this source (directly or via sourceId)
    const directModels = models.filter((m) => m.sourceId === sourceId);

    // Check if any of those models are referenced by models outside this source
    const externalDependents: Array<{ id: string; name: string }> = [];

    for (const directModel of directModels) {
      const dependentIds = DependencyService.getDependents(graph, directModel.id);
      for (const depId of dependentIds) {
        const depModel = models.find((m) => m.id === depId);
        // If the dependent model belongs to a different source, it's external
        if (depModel && depModel.sourceId !== sourceId) {
          if (!externalDependents.find((e) => e.id === depId)) {
            externalDependents.push({ id: depId, name: depModel.name });
          }
        }
      }
    }

    if (externalDependents.length === 0) {
      return { canDelete: true, dependentModels: [] };
    }

    const modelNames = externalDependents.map((m) => m.name).join(', ');
    return {
      canDelete: false,
      dependentModels: externalDependents,
      message: `Cannot delete: source's models are referenced by: ${modelNames}`,
    };
  }

  /**
   * Gets all model IDs that should be marked stale when a model changes.
   * Returns transitive dependents (only models, not sources).
   */
  static getModelsToMarkStale(
    models: Model[],
    sources: Source[],
    changedModelId: string
  ): string[] {
    const graph = DependencyService.buildGraph(sources, models);
    const allDependents = DependencyService.getAllDependents(graph, changedModelId);

    // Filter to only models
    return allDependents.filter((id) => models.some((m) => m.id === id));
  }

  /**
   * Marks all dependent models as stale when a model changes.
   * Modifies models in place and returns the IDs of models marked stale.
   */
  static markDependentsStale(models: Model[], sources: Source[], changedModelId: string): string[] {
    const staleIds = DependencyService.getModelsToMarkStale(models, sources, changedModelId);

    for (const staleId of staleIds) {
      const model = models.find((m) => m.id === staleId);
      if (model) {
        model.isStale = true;
      }
    }

    return staleIds;
  }

  /**
   * Clears the stale flag from a model after recomputation.
   */
  static clearStaleFlag(model: Model): void {
    model.isStale = false;
  }

  /**
   * Finds join references that point to non-existent models/sources.
   * Useful for validation and cleanup.
   */
  static findOrphanedReferences(
    models: Model[],
    sources: Source[]
  ): Array<{ modelId: string; modelName: string; stepIndex: number; targetId: string }> {
    const validIds = new Set([...sources.map((s) => s.id), ...models.map((m) => m.id)]);

    const orphaned: Array<{
      modelId: string;
      modelName: string;
      stepIndex: number;
      targetId: string;
    }> = [];

    for (const model of models) {
      for (let i = 0; i < model.steps.length; i++) {
        const step = model.steps[i];
        const referencedIds = extractReferencedIds(step);

        for (const refId of referencedIds) {
          if (!validIds.has(refId)) {
            orphaned.push({
              modelId: model.id,
              modelName: model.name,
              stepIndex: i,
              targetId: refId,
            });
          }
        }
      }
    }

    return orphaned;
  }

  /**
   * Walks the sourceId chain upward until it hits a source (src_* prefix).
   * Needed for grouping chained models under their root source in the Sidebar.
   */
  static getRootSourceId(models: Model[], sources: Source[], modelId: string): string | null {
    const visited = new Set<string>();
    let currentId = modelId;

    while (true) {
      if (visited.has(currentId)) return null; // Cycle guard
      visited.add(currentId);

      const model = models.find((m) => m.id === currentId);
      if (!model) return null;

      // Check if sourceId points to a source
      const isSource = sources.some((s) => s.id === model.sourceId);
      if (isSource) return model.sourceId;

      // sourceId points to another model — follow the chain
      currentId = model.sourceId;
    }
  }

  /**
   * Returns all upstream dependencies (transitive) for a set of target IDs.
   * Includes the target IDs themselves. Used for v2 export to collect the full subgraph.
   */
  static getUpstreamDependencies(graph: DependencyGraph, targetIds: string[]): Set<string> {
    const visited = new Set<string>();
    const queue = [...targetIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = graph.nodes.get(current);
      if (!node) continue;

      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          queue.push(depId);
        }
      }
    }

    return visited;
  }

  /**
   * Gets list of dependent models with names for UI display
   */
  static getDependentModelsForUI(
    models: Model[],
    sources: Source[],
    changedModelId: string
  ): Array<{ id: string; name: string; sourceName: string }> {
    const staleIds = DependencyService.getModelsToMarkStale(models, sources, changedModelId);

    return staleIds
      .map((id) => {
        const model = models.find((m) => m.id === id);
        if (!model) return null;
        const source = sources.find((s) => s.id === model.sourceId);
        const parentModel = source ? null : models.find((m) => m.id === model.sourceId);
        return {
          id: model.id,
          name: model.name,
          sourceName: source?.name || parentModel?.name || 'Unknown Source',
        };
      })
      .filter((m): m is { id: string; name: string; sourceName: string } => m !== null);
  }
}
