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

## References

Additional analysis documents were created during design exploration:

- `research/multi-model-architecture-v1.md` — Initial proposal with DependencyService concept
- `.cursor/plans/multi-model_dag_architecture_assessment_*.md` — Comparative analysis of three DAG granularity options

These informed the consolidated design above but are not canonical documentation.

---

**Status**: Design complete, awaiting implementation
