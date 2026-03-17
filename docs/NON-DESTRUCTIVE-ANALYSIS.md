# Non-Destructive Architecture: Gap Analysis & Roadmap

This document captures the analysis of Syto's adherence to the **Non-Destructive** principle as of January 2026.

## Current State Assessment

**Status: High Adherence (Solid Foundation)**

Syto's architecture effectively prevents data loss and ensures reproducibility through:

- **Immutable Sources**: Raw data is never modified after import.
- **Declarative Pipelines**: All transformations are stored as recomputable steps.
- **Immutable Engine**: Leveraging Arquero for table operations ensures that new data structures are created rather than modifying existing ones.

---

## Identified Gaps & Enhancements

### 1. Multi-Model Dependency Fragility

**Severity: Medium — Decided: Keep Current Behavior**

- **Issue**: Deleting a model that others depend on (via joins or unions) is blocked with a clear message naming the dependent models.
- **Resolution**: The hard-block approach is simple, transparent, and sufficient. The proposed "Shadow Sources" alternative (hidden frozen snapshots) was rejected — it would add a new concept (hidden state) that conflicts with the project's transparency values, for marginal benefit in an edge-case scenario (reorganizing 4+ interconnected models).

### 2. Aggregate "Silent Exclusion"

**Severity: Low — Decided: Accept Current Behavior**

- **Issue**: Aggregations (sum, mean, etc.) silently skip error objects without alerting the user in the context of the calculation.
- **Resolution**: Error counts are already visible per-column in the EDA sidebar before aggregation. Adding post-aggregation warnings would require a warnings sideband in the transform pipeline — significant architectural cost for marginal transparency gain.

### 3. JSON "Danger Zone" Validation

**Severity: Low**

- **Issue**: Manual JSON edits to the pipeline can create logic breaks that aren't caught until full recomputation.
- **Proposed Enhancement**: **Pipeline Integrity Pre-flight**. Run a virtual schema propagation across the entire edited pipeline before committing JSON changes to ensure no "broken paths" are introduced.

### 4. User-Facing Undo/Redo for Steps

**Severity: Low**

- **Issue**: While the technical "rollback" is possible by deleting steps, there is no standardized UI for "Undo" (Cmd+Z) of successful operations.
- **Proposed Enhancement**: **Command History Store**. Implement a temporary stack of successful pipeline operations to allow users to rapidly experimental with workflows with zero friction.

---

## Implementation Guidelines for Future Transforms

To maintain this high level of adherence, all new transformations must:

1. Never modify the input table.
2. Use object spreads or deep clones when manipulating raw row objects.
3. Explicitly define how "Error Objects" are handled in any custom logic.
4. Correctively propagate schema changes to the next step.
