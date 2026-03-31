# Multi-Model Architecture: Dependency Graph Design

> **Purpose**: Design document for supporting declarative combinations of models (DAG), enabling reliable multi-model workflows.

> **Related**: [BACKLOG.md](BACKLOG.md) §Set Operations, [DATA-SPECIFICATION.md](DATA-SPECIFICATION.md) §3 Transform Steps

---

## Problem Statement

The current architecture treats Models as isolated linear pipelines. While `join` transforms allow referencing other models, there is no system to:

1. Track dependencies between models
2. Detect when a referenced model has changed
3. Trigger cascading updates to dependent models
4. Warn users about breaking changes (e.g., deleting a model that others depend on)

To support reliable multi-model workflows (join, concat, union, etc.), we need a **Dependency Graph** layer.

---

## Current State

### Existing Architecture

- **Models** are linear pipelines: `Source → [Step1, Step2, ..., StepN] → Final Data`
- **Join** is the only multi-model operation, referencing targets by ID (`join.right: "mdl_xyz"`)
- **No dependency tracking**: When Model A changes, Model B (that joins A) doesn't know
- **Runtime resolution**: `ComputeContext` provides all sources/models; joins resolve lazily

### What Works Well

- ID-based references (not names) — forward-compatible
- Context-aware transforms — join already uses `TransformContext`
- Schema propagation handles join column merging
- Arquero supports all needed operations (`concat`, `union`, `semijoin`, etc.)

---

## Design Decision: Models as DAG Nodes

After evaluating three approaches (Models-only, Sources+Models, Transform Steps as nodes), the recommendation is:

**Sources and Models as nodes, with model-level granularity.**

### Rationale

1. **Fits user mental model**: Users think in terms of models, not individual steps
2. **Sufficient granularity**: Full model recomputation is fast (<100ms typical)
3. **Simple implementation**: Graph size = number of models (typically <20)
4. **Clear extension path**: Can add step-level optimization later if needed

### Node Structure

```typescript
interface DependencyNode {
  id: string; // Source or Model ID
  type: 'source' | 'model';
  dependencies: Set<string>; // IDs this node depends on
  dependents: Set<string>; // IDs that depend on this node
}
```

### Dependency Diagram Example

```
Source: Orders ──────► Model: Clean Orders ──────┐
                                                 ▼
Source: Customers ───► Model: Clean Customers ─► Model: Joined Data ─► Model: Monthly Stats
```

---

## Implementation Plan

### Phase 1: Dependency Tracking (~200 lines)

**Create `DependencyService.ts`**

```typescript
// src/app/services/DependencyService.ts
export class DependencyService {
  private graph: Map<string, DependencyNode>;

  /**
   * Build dependency graph by scanning all models for multi-model references
   * (join.right, concat.with, union.with, etc.)
   */
  buildGraph(sources: Source[], models: Model[]): void;

  /** Get IDs this node depends on (upstream) */
  getDependencies(id: string): string[];

  /** Get IDs that depend on this node (downstream) */
  getDependents(id: string): string[];

  /** Topological sort for correct execution order */
  getExecutionOrder(targetIds: string[]): string[];

  /** Detect circular dependencies */
  hasCycle(): boolean;
}
```

**Key behaviors:**

- Graph is **computed on app load**, not persisted separately
- Rebuilt when models are added/deleted/modified
- Single source of truth remains the model transforms

**Integration points:**

- `AppStore` — rebuild graph on model list changes
- `ModelService.deleteModel()` — check dependents first, warn user

### Phase 2: Cascading Updates (~150 lines)

**Add staleness tracking to Model interface:**

```typescript
interface Model {
  // ... existing fields
  isStale?: boolean; // True if a dependency changed but not yet recomputed
}
```

**Cascade flow:**

1. Model A changes (step added/edited/deleted)
2. `DependencyService.getDependents("mdl_A")` returns [Model B, Model C]
3. Mark Models B and C as `isStale: true`
4. When user views a stale model → auto-recompute
5. Clear `isStale` flag after successful recomputation

**UI indicators:**

- Show "stale" badge on model in sidebar
- Brief loading state when auto-recomputing

### Phase 3: New Multi-Model Operations (~100 lines each)

Follow the existing `join` pattern for new operations:

**Concat** (stack rows, keep duplicates):

```typescript
interface TransformStep {
  concat?: {
    with: string; // Model or Source ID
  };
}
```

**Union** (stack rows, remove duplicates):

```typescript
interface TransformStep {
  union?: {
    with: string; // Model or Source ID
  };
}
```

**Implementation in transforms.ts:**

```typescript
if (transform.concat) {
  const targetTable = resolveTarget(transform.concat.with, context);
  return table.concat(targetTable);
}

if (transform.union) {
  const targetTable = resolveTarget(transform.union.with, context);
  return table.union(targetTable);
}
```

---

## Design Decisions

### Why not persist the graph?

The dependency graph is **derived state** — it can be fully reconstructed from model transforms. Persisting it separately would:

- Create sync issues if transforms change without graph update
- Add migration complexity
- Violate single-source-of-truth principle

### Why include Sources as nodes?

Although `Model.sourceId` already tracks the source relationship:

- Completes the DAG from data origin to final output
- Enables "what depends on this source?" queries
- Future: if source data changes (re-import), cascade to all dependent models
- Trivial cost (sources have empty `dependencies` set)

### Why single-target transforms (not arrays)?

For `concat` and `union`, we use `{ with: string }` not `{ with: string[] }`:

- Simpler mental model: one operation, one target
- Users can chain multiple concats if needed
- Matches join's existing pattern
- Array syntax can be added later if demand emerges

### Why lazy recomputation?

Mark stale → compute on view, rather than immediate cascade:

- Avoids unnecessary work if user never views the model
- Better UX — user sees their current view immediately
- Cascade can be expensive with deep dependency chains

---

## Future Considerations

### Step-Level Granularity (Not Recommended Now)

If performance becomes an issue (models with 20+ steps, recomputation >1 second):

- Track which step creates each dependency
- Recompute only from the dependent step onwards
- Adds significant complexity; defer until profiling shows need

### Dependency Visualization

Potential future feature: visual DAG showing model relationships

- Would use the same `DependencyService` data
- Could highlight stale models, cascade paths
- Not essential for v1

### Multi-Target Operations

If users frequently need `concat([A, B, C])`:

- Extend schema to support arrays
- Or: provide "concat all" UI that generates chained single concats

---

## Verification Plan

### Unit Tests for DependencyService

```typescript
describe('DependencyService', () => {
  it('builds graph from models with join references');
  it('returns empty dependencies for sources');
  it('detects circular dependencies');
  it('returns correct topological order');
  it('finds all dependents of a model');
});
```

### Integration Tests

```typescript
describe('Cascading updates', () => {
  it('marks dependent models stale when source model changes');
  it('recomputes stale model when viewed');
  it('warns before deleting model with dependents');
});
```

---

## Implementation Status

**Phase 1: Dependency Tracking** — ✅ Complete (January 2025)

- Created `DependencyService.ts` with full graph building and querying
- 24 unit tests covering all graph operations
- Integrated into `ModelService.deleteCurrentModel()` and `deleteSource()`
- Users now get warnings when trying to delete models referenced by others

**Phase 2: Staleness Tracking** — ✅ Complete (January 2025)

- Added `isStale` field to Model interface
- `markDependentsStale()` called automatically when model data changes
- Auto-recompute in `ModelService.switchToModel()` for stale models
- UI indicators deferred (logic layer complete)

**Phase 3: New Operations** — ✅ Complete (January 2025)

- Concat and union transforms implemented with full UI integration
- Added to `extractReferencedIds()` and transforms.ts
- Dependency tracking, staleness marking, and delete protection working
- Stale model indicators in Sidebar and DatasetInfoView
- Dependency tooltips showing relationship counts

**Phase 4: Model Chaining** — ✅ Complete (March 2026)

- `sourceId` can reference another model, enabling pipeline chains
- `StepService` resolves input from source or parent model
- Sidebar/JoinTreeSelector group chained models under root source
- `getRootSourceId()` and `getUpstreamDependencies()` added to DependencyService

**Phase 5: Name Uniqueness** — ✅ Complete (March 2026)

- Model names unique per-source, source names globally unique
- `NameService` provides centralized uniqueness checking
- Auto-dedup on import via `suggestUniqueName()`
- v2 export uses `sourceName/modelName` composite keys for global uniqueness

---

## Model Chaining

A model's `sourceId` can reference another **model** (not just a source), creating pipeline chains where one model's output feeds the next. This enables the v2 workflow format's `source: "clean-orders"` pattern.

### sourceId Resolution Points

When `sourceId` is resolved, the lookup **must** check sources first, then fall back to models:

- **`StepService.computeModelUpToStep()`** — primary pipeline execution: resolves input data + schema from source or parent model
- **`Sidebar.tsx`** / **`JoinTreeSelector.tsx`** — UI grouping: uses `DependencyService.getRootSourceId()` to group chained models under their root source
- **`ModelInfoView.tsx`** — displays parent model name when source lookup fails
- **`interaction-handlers.ts`** (`extractSelectedRows`) — validates model input exists (source or parent model)
- **`join-handlers.ts`** (`saveAsNewModel`) — resolves root source via `getRootSourceId()` for creating initial steps

### Key Helpers

- **`DependencyService.getRootSourceId(models, sources, modelId)`** — walks `sourceId` chain upward to the first `src_*` ID. Used for Sidebar grouping.
- **`DependencyService.getUpstreamDependencies(graph, targetIds)`** — transitive upstream walk collecting all dependencies. Used for v2 export.

### Cycle Detection

Already handled — `DependencyService.checkCircularDependency()` and `hasCycle()` operate on the full graph which includes `sourceId` edges.

---

## Name Uniqueness

Source names are **globally unique**. Model names are **unique per-source** (two different sources can each have a model named "main"). All checks are case-insensitive.

For the v2 workflow format, globally-unique model keys are constructed as `sourceName/modelName` at export time. This composite key is only used in the portable format — the browser UI shows just the model name.

**Enforcement**: `NameService.isModelNameTaken(name, sourceId, excludeId?)` and `isSourceNameTaken(name, excludeId?)` in `src/app/services/NameService.ts`.

**Where enforced**: `ModelService` (create, copy, fork, rename), `ImportService` (auto-dedup on import via `suggestUniqueName`), `join-handlers.ts` (save join as new model), `interaction-handlers.ts` (extract rows to new model).

---

## Implementation Rules

Constraints and conventions discovered during implementation. Violating these causes data correctness bugs.

### Recomputation Order

Both recomputation paths (lazy and eager) **must** recompute stale upstream dependencies in topological order before the target model. Without this, a model can be marked clean but contain data computed from stale intermediaries.

- **Lazy path** (`ModelService.switchToModel`): builds graph, gets execution order for the target, recomputes any stale upstream models first
- **Eager path** (`StepService.handleDependencyImpact`): uses `getExecutionOrder()` on all stale IDs, recomputes in sorted order
- **On error**: keep `isStale` flag, show user-facing warning — never silently mark as clean

### Copy vs Reference Semantics

- **Model creation** (new, copy, fork): always deep-copies data, steps, and schema — models are fully independent objects
- **Multi-model operations** (join, concat, union, etc.): resolve target data at compute time via `resolveTableFromContext()`, which reads `model.data` from the shared context. Data must be loaded first via `ensureModelData()`/`ensureSourceData()` — `model.data` may be `null` if not yet fetched from IndexedDB. Arquero creates a new table, but the source array is read by reference — so stale data in context produces stale results
- **Implication**: the recomputation order rule above is critical because context contains live model objects

### Dependency Dialog Cancellation

When a user applies a step that has downstream dependents, the dependency impact dialog appears. If the user **cancels**:

- The step must be fully rolled back: pop from `model.steps`, recompute data from remaining steps, restore AppStore signals
- The undo snapshot pushed before the step must also be popped (nothing to undo)

---

**Status**: All phases complete ✅
