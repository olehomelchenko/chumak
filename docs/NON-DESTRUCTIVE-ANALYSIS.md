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

**Severity: Medium**

- **Issue**: Deleting a model that others depend on (via joins or unions) can break downstream workflows. While currently "blocked," this creates a rigid UX.
- **Proposed Enhancement**: **"Shadow Sources"**. When a referenced model is deleted, convert its final state into a hidden static source that persists for the benefit of dependent models.

### 2. Aggregate "Silent Exclusion"

**Severity: Low**

- **Issue**: Aggregations (sum, mean, etc.) currently skip "Error Objects" (created during type conversion failures) without explicitly alerting the user in the context of the calculation.
- **Proposed Enhancement**: **Error Audit Trail**. Implement a model-level warning indicator that summarizes records excluded from calculations, ensuring transparency in data integrity.

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
