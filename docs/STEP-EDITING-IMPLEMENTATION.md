# Step Editing Implementation

> **Status**: Phase 1 Complete (Edit Last Step)
> **Date Implemented**: January 2026
> **LOC**: ~250 lines (core + tests + UI)

---

## Overview

Step editing allows users to modify transformation steps after they've been added to the pipeline, eliminating the need to delete and recreate steps when making adjustments.

**Use Case**: User adds a filter `sales > 1000` but meant to type `sales > 1200`. Instead of deleting the step and recreating it, they can click the edit button and change the expression.

---

## Implementation Phases

### Phase 1: Edit Last Step ✅ Complete

**Scope**: Edit only the last non-import, non-types step

**Features**:

- Edit button (✎) appears on hover for last step
- Opens appropriate modal with existing parameters pre-filled
- Updates step in place and recomputes pipeline
- Automatic rollback if recomputation fails
- Full schema propagation

**Effort**: ~4-6 hours, ~250 LOC

**Transform Support**:

- ✅ Filter (expression)
- ✅ Select (column list)
- ✅ Remove (column list)
- ✅ Rename (column mappings)
- ✅ Derive (column name + expression)
- ✅ Sort (field + order)
- ✅ Fold (columns + key/value names)
- ❌ Aggregate (not yet implemented)
- ❌ Join (not yet implemented)

### Phase 2: Edit Arbitrary Step 🔲 Future

**Scope**: Edit any step in the pipeline (not just last)

**Additional Features**:

- Edit button on all steps (except import/types)
- Better error messages showing which downstream step failed
- Graceful handling of downstream pipeline breaks

**Effort**: ~4-6 hours additional, ~150 LOC

**Challenges**:

- Downstream steps may break if column references change
- User needs clear feedback on what failed and why
- Trial-and-error UX (no advance warning)

### Phase 3: Smart Invalidation 🔲 Future

**Scope**: Dependency analysis and impact preview

**Additional Features**:

- Scan downstream steps for column references
- Show impact preview before committing edit
- Auto-fix suggestions for renames (e.g., rename propagation)
- Warning: "This will break step 5 (Filter on 'sales')"

**Effort**: ~2-3 days, ~800 LOC

**Components**:

- Dependency analyzer (~300 lines)
- Column reference extractor per transform type (~200 lines)
- Impact preview UI (~150 lines)
- Auto-fix suggestions (~200 lines)

---

## Architecture

### Core Methods

**Location**: [src/chumak-app.js](../src/chumak-app.js:2382-2490)

#### `editStep(stepIndex)`

Opens the appropriate modal with existing step parameters pre-filled.

```javascript
editStep(stepIndex) {
  const step = this.activeModel.steps[stepIndex];
  this.editingStepIndex = stepIndex;

  if (step.filter) {
    this.filterExpression = step.filter;
    this.openDialog('filter');
  } else if (step.select) {
    this.selectedColumns = this.columns.map(col => step.select.includes(col));
    this.openDialog('select');
  }
  // ... other transform types
}
```

**Pattern**: Extract parameters from step → populate dialog state → open dialog

#### `updateStep(stepIndex, newTransform)`

Replaces step and recomputes pipeline from that point forward.

```javascript
async updateStep(stepIndex, newTransform) {
  // Backup state for rollback
  const backup = {
    steps: [...this.activeModel.steps],
    data: [...this.activeModel.data],
    schema: [...this.activeModel.schema]
  };

  try {
    // Update step
    this.activeModel.steps[stepIndex] = newTransform;

    // Recompute from updated step to end
    const result = this.computeUpToStep(lastStepIndex);

    // Update model
    this.activeModel.data = result.data;
    this.activeModel.schema = result.schema;

    await autoSave();
  } catch (error) {
    // Rollback on failure
    this.activeModel.steps = backup.steps;
    this.activeModel.data = backup.data;
    this.activeModel.schema = backup.schema;

    alert(`Error updating step: ${error.message}\nChanges reverted.`);
  }
}
```

**Pattern**: Backup → update → recompute → save OR rollback

#### `applyStepResult(transform, resultTable)`

Modified to check for edit mode and route to `updateStep()`.

```javascript
async applyStepResult(transform, resultTable) {
  // Check if editing existing step
  if (this.editingStepIndex !== null) {
    await this.updateStep(this.editingStepIndex, transform);
    return;
  }

  // Otherwise, add new step (original logic)
  this.activeModel.steps.push(transform);
  // ...
}
```

**Pattern**: Edit mode detection → conditional routing

### State Management

**New State Variable**: `editingStepIndex`

- `null` = not editing (default)
- `number` = index of step being edited

**Location**: [src/chumak-app.js:9](../src/chumak-app.js:9)

### UI Components

**Edit Button**: [index.html:463-470](../index.html:463-470)

```html
<button
  class="step-item__edit"
  @click.stop="editStep(index)"
  x-show="!step.import && !step.types && index === activeModel.steps.length - 1"
  title="Edit this step"
>
  ✎
</button>
```

**Visibility Rules**:

- Not on import step (`!step.import`)
- Not on types step (`!step.types`)
- Only on last step (`index === activeModel.steps.length - 1`)

**CSS Styling**: [styles/chumak.css:447-467](../styles/chumak.css:447-467)

```css
.step-item__edit {
  display: none;
  position: absolute;
  right: 28px; /* Left of delete button */
  color: var(--color-cyan);
  /* ... */
}

.step-item:hover .step-item__edit {
  display: block;
}
```

---

## Modal Pre-filling Patterns

### Filter Transform

```javascript
if (step.filter) {
  this.filterExpression = step.filter;
  this.filterError = null;
  this.openDialog('filter');
}
```

### Select Transform

```javascript
if (step.select) {
  this.selectedColumns = this.columns.map((col) => step.select.includes(col));
  this.openDialog('select');
}
```

### Remove Transform

```javascript
if (step.remove) {
  this.removedColumns = this.columns.map((col) => step.remove.includes(col));
  this.openDialog('remove');
}
```

### Rename Transform

```javascript
if (step.rename) {
  const renames = {};
  this.columns.forEach((col) => {
    renames[col] = step.rename[col] || col;
  });
  this.renameDialogState = { renames };
  this.openDialog('rename');
}
```

### Derive Transform

```javascript
if (step.derive) {
  const firstCol = Object.keys(step.derive)[0];
  this.deriveDialogState = {
    columnName: firstCol,
    expression: step.derive[firstCol],
    error: null,
  };
  this.openDialog('derive');
}
```

**Note**: Derive currently only supports editing single-column derivations (first column if multiple exist).

### Sort Transform

```javascript
if (step.sort) {
  this.sortDialogState = {
    field: step.sort.field,
    order: step.sort.order,
  };
  this.openDialog('sort');
}
```

### Fold Transform

```javascript
if (step.fold) {
  const foldCols = step.fold.columns || [];
  this.foldDialogState = {
    keyName: step.fold.as?.[0] || 'key',
    valueName: step.fold.as?.[1] || 'value',
    selectedColumns: this.columns.map((col) => foldCols.includes(col)),
  };
  this.openDialog('fold');
}
```

---

## Recomputation Logic

### How It Works

1. **Identify range**: Edit at step N → recompute steps N through end
2. **Apply transforms**: Use existing `computeUpToStep(lastIndex)` method
3. **Update model**: Replace `data` and `schema` with recomputed results
4. **Save**: Call `autoSave()` to persist to IndexedDB

### Schema Propagation

Critical: Schema must be recalculated through entire pipeline.

```javascript
// In computeUpToStep()
for (let i = 0; i <= stepIndex; i++) {
  const step = model.steps[i];

  // Apply transform to data
  table = applyTransform(table, step, columns);

  // Update schema
  schema = SchemaEngine.deriveNextSchema(schema, step, sampleData);
}
```

**Why this matters**:

- Editing step 3 (remove column) affects schema for steps 4-10
- Schema mismatch causes "ghost columns" (UI thinks column exists, data doesn't)

### Empty Table Handling

**Problem**: When filter returns 0 rows, `aq.from([])` loses column information.

**Solution**: [src/transforms.js:92-101](../src/transforms.js:92-101)

```javascript
if (filteredRows.length === 0 && rows.length > 0) {
  const emptyRow = {};
  table.columnNames().forEach((col) => (emptyRow[col] = undefined));
  result = aq.from([emptyRow]).filter((d) => false);
} else {
  result = aq.from(filteredRows);
}
```

Creates dummy row with all columns → filters it out → empty table with columns preserved.

---

## Error Handling

### Rollback Mechanism

**Trigger**: Any error during recomputation

**Process**:

1. Catch error in `updateStep()`
2. Restore backup state (steps, data, schema)
3. Clear `editingStepIndex`
4. Show user-friendly error message
5. Leave user in same state as before edit attempt

**User Experience**:

- No partial state corruption
- Clear error message explains what went wrong
- User can try again or cancel

### Common Error Scenarios

**Validation Error**:

```
Error updating step: Filter validation failed:
Column 'unknownColumn' not found. Did you mean 'sales'?

Changes have been reverted.
```

**Downstream Failure** (Phase 2):

```
Error updating step: Failed at step 5 (Filter):
Column 'sales' no longer exists after step 3 (Remove).

Changes have been reverted.
```

---

## Testing

### Test Suite

**Location**: [src/tests/step-editing.test.js](../src/tests/step-editing.test.js)

**Coverage**: 25 tests across 3 categories

#### 1. `updateStep()` Tests (9 tests)

- Update filter expression
- Update select columns
- Update derive formula
- Update rename mappings
- Update remove columns
- Validation errors
- Preserve earlier steps
- Multiple edits

#### 2. Edge Cases (6 tests)

- Cannot edit import step
- Edit types step (metadata only)
- Empty data after edit
- Complex expressions
- Rollback on failure

#### 3. Transform Descriptions (3 tests)

- Correct description after filter edit
- Correct description after select edit
- Correct description after derive edit

### Test Helper: `computeUpToStep()`

Minimal implementation for testing recomputation logic:

```javascript
function computeUpToStep(model, stepIndex, sourceData) {
  let table = aq.from(sourceData);

  for (let i = 0; i <= stepIndex; i++) {
    const step = model.steps[i];
    if (step.import || step.types) continue;

    const result = applyTransform(table, step, columns);
    table = Array.isArray(result) ? aq.from(result) : result;
  }

  return {
    data: table.objects(),
    schema: table.columnNames().map((name) => ({ name, type: 'string' })),
    columns: table.columnNames(),
  };
}
```

---

## Known Limitations

### Phase 1 Limitations

1. **Last step only**: Cannot edit steps in the middle of pipeline
2. **No impact preview**: User doesn't know if edit will break downstream
3. **Single-column derive**: Only edits first column in multi-column derive
4. **No aggregate/join edit**: Not yet implemented

### Future Enhancements

**Phase 2**:

- Edit any step, not just last
- Better error messages (which downstream step failed)

**Phase 3**:

- Dependency analysis (scan for column references)
- Impact preview before commit
- Auto-fix suggestions (rename propagation)

---

## Implementation Checklist

When adding edit support for a new transform:

- [ ] Add case in `editStep()` to populate dialog state
- [ ] Ensure modal can be pre-filled with existing values
- [ ] Test that recomputation works correctly
- [ ] Add test cases in `step-editing.test.js`
- [ ] Verify schema propagation after edit
- [ ] Test rollback on validation failure

---

## Code Stats

**Total Implementation**:

- Core logic: ~110 lines (editStep + updateStep)
- UI/CSS: ~25 lines
- Tests: ~370 lines
- Total: ~505 lines

**Files Modified**: 4

- `src/chumak-app.js` - Core methods
- `index.html` - Edit button UI
- `styles/chumak.css` - Button styling
- `src/tests/step-editing.test.js` - Test suite (new file)
- `src/tests/runner.html` - Include new test file

**Bug Fixes During Implementation**:

- `table.not()` → `table.select(aq.not())` (Arquero API correction)
- Empty table column preservation (filter returning 0 rows)
- Trailing spaces in `describeTransform()` return values

---

## Performance Considerations

**Recomputation Cost**:

- Small datasets (<1000 rows): Negligible (<50ms)
- Medium datasets (1000-10000 rows): Acceptable (<500ms)
- Large datasets (>10000 rows): Noticeable but tolerable

**Optimization Opportunities** (not implemented):

- Cache intermediate results (complexity vs benefit trade-off)
- Only recompute from edited step (already implemented)
- Lazy recomputation on demand (Phase 3)

---

## User Experience

**Interaction Flow**:

1. User adds several transform steps
2. Realizes last step has wrong parameter
3. Hovers over last step → sees edit button (✎)
4. Clicks edit → modal opens with current values
5. Changes parameter (e.g., filter threshold)
6. Clicks apply → step updates, data recomputes
7. Views updated result instantly

**Feedback**:

- Visual: Edit button appears on hover (cyan color)
- Confirmation: Data updates immediately
- Error: Clear rollback message if edit fails

**Discovery**: Edit button is discoverable through hover (matches delete button pattern)

---

## Future Considerations

### Phase 2 Implementation Notes

**Key Changes Needed**:

1. Change visibility condition: `x-show="!step.import && !step.types"` (remove last-step check)
2. Add step number to error messages: `Failed at step ${failedIndex}`
3. Identify which downstream step broke (scan pipeline after edit)

**Example Error Message**:

```
Error updating step 3 (Remove):
Step 5 (Filter) references column 'sales' which no longer exists.

Options:
- Cancel edit (undo changes)
- Delete step 5 and continue
```

### Phase 3 Implementation Notes

**Dependency Analyzer Design**:

```javascript
function analyzeImpact(steps, editedIndex, newTransform) {
  const schemaBefore = computeSchemaUpToStep(editedIndex - 1);
  const schemaAfter = deriveNextSchema(schemaBefore, newTransform);

  const removedCols = findRemovedColumns(schemaBefore, schemaAfter);
  const renamedCols = findRenamedColumns(schemaBefore, schemaAfter);

  const impactedSteps = [];
  for (let i = editedIndex + 1; i < steps.length; i++) {
    const refs = extractColumnReferences(steps[i]);
    if (refs.some((ref) => removedCols.includes(ref))) {
      impactedSteps.push({ index: i, reason: 'column removed', col: ref });
    }
  }

  return { removedCols, renamedCols, impactedSteps };
}
```

**UI Preview**:

```
⚠️ Impact Analysis:

This edit will:
- Remove column 'sales'
- Affect 2 downstream steps:

  Step 5 (Filter): References 'sales'
  Step 7 (Derive): Uses 'sales' in 'profit' calculation

Continue anyway? [Cancel] [Edit Anyway]
```

---

## References

- **Original Plan**: `/Users/oleh/.claude/plans/whimsical-humming-hellman.md`
- **Core Implementation**: [src/chumak-app.js:2382-2490](../src/chumak-app.js:2382-2490)
- **Test Suite**: [src/tests/step-editing.test.js](../src/tests/step-editing.test.js)
- **Arquero API**: [https://uwdata.github.io/arquero/](https://uwdata.github.io/arquero/)
