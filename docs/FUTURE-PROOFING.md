# Future-Proofing: Persistence & Schema Evolution

> **Purpose:** Document realistic scenarios where stored user data (IndexedDB, workflow JSON) could cause friction as Chumak evolves.

This is not a theoretical "what if we rename everything" document. It focuses on **realistic changes** you might want to make and how they interact with data users have already saved.

---

## How Data is Persisted

| Location               | What's Stored                          | Format                                 |
| ---------------------- | -------------------------------------- | -------------------------------------- |
| IndexedDB `sources`    | Raw imported data + metadata           | `Source` objects                       |
| IndexedDB `models`     | Transform pipelines + computed results | `Model` objects with `TransformStep[]` |
| Exported workflow JSON | Portable pipeline definition           | `{ version, source, model }`           |
| URL hash               | Current view state                     | `/#/sourceId/modelId`                  |

Key insight: **IndexedDB stores the full objects**, including computed `data` arrays. Workflow JSON stores just the pipeline definition.

---

## Realistic Scenarios & Their Impact

### 1. Adding New Column Types

**Scenario:** Add `decimal`, `duration`, `json`, or `array` types.

**What's stored:**

```json
{ "types": { "price": "float", "metadata": "json" } }
```

**Impact:** Old app versions won't recognize `"json"` type.

**Mitigation:**

- On load, treat unknown types as `string` with a console warning
- This is purely additive - old workflows continue to work

**Difficulty:** Low

---

### 2. Extending Function Signatures

**Scenario:** Add optional timezone argument to `date_add(date, amount, unit)`.

**What's stored:**

```
date_add([StartDate], 30, 'days')
```

**Impact:** None for old expressions. New 4-arg expressions won't work on old app versions.

**Mitigation:**

- Bump `maxArgs` from 3 to 4 in `ast-validator.ts`
- Old 3-arg calls continue to work unchanged

**Difficulty:** Low

**Real constraint:** You cannot _change_ existing function behavior. If `round(2.5)` currently returns `3`, it must always return `3` for old workflows.

---

### 3. Improving Aggregate/Rollup Format

**Scenario:** Replace Arquero-specific strings with structured objects.

**Current format:**

```json
{
  "aggregate": {
    "groupby": ["region"],
    "rollup": { "avg_sales": "op.mean('sales')" }
  }
}
```

**Desired format:**

```json
{
  "aggregate": {
    "groupby": ["region"],
    "rollup": [{ "output": "avg_sales", "func": "mean", "column": "sales" }]
  }
}
```

**Impact:** Must support both formats forever, or migrate on load.

**Mitigation:**

- Detect old format: `typeof rollup[key] === 'string' && rollup[key].startsWith('op.')`
- Convert to new format in-memory on load
- Save in new format going forward

**Difficulty:** Medium - conversion code must be maintained

---

### 4. Multi-Column Operations

**Scenario:** Pivot currently takes `values: string`. You want `values: string | string[]`.

**What's stored:**

```json
{ "pivot": { "values": "sales", ... } }
```

**Impact:** Code must handle both string and array.

**Mitigation:**

```typescript
const valueColumns = Array.isArray(pivot.values) ? pivot.values : [pivot.values];
```

**Difficulty:** Low - just runtime checks

---

### 5. Adding Undo/History

**Scenario:** Track step-level history for undo or version comparison.

**What's stored:** Currently nothing - no history object store exists.

**Impact:** Requires IndexedDB schema change (new object store).

**Mitigation:**

```typescript
const DB_VERSION = 2; // Bump from 1

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('history')) {
    db.createObjectStore('history', { keyPath: 'id' });
  }
};
```

**Difficulty:** Low - adding stores doesn't affect existing data

---

### 6. New Expression Syntax

**Scenario:** Add string interpolation, array literals, or object property access.

**What's stored:**

```
upper([Name]) + ' - ' + [Category]
```

**Impact:** Old expressions parse fine. New syntax only available in new versions.

**Mitigation:**

- Configure jsep with new features
- Add interpreter support
- Old expressions continue to work

**Difficulty:** Low for additions

**Risk:** If new syntax accidentally matches old patterns, could cause subtle bugs. Test thoroughly.

---

## Known Issues to Fix Now

### Join References Use Name Instead of ID

**Current behavior:** Join handler looks up by both ID and name:

```typescript
find((m) => m.id === right || m.name === right);
```

**Problem:** If user renames a model, joins referencing the old name break.

**Fix:** Always store `model.id` in join config. Validate on load that referenced ID exists.

**Priority:** Fix before users create complex multi-model workflows.

---

### Column Renames Don't Update Downstream Steps

**Scenario:**

1. Step 1: Rename `sales` → `revenue`
2. Step 2: Filter on `sales > 1000` ← breaks

**Current behavior:** Step 2 fails with "column not found" error.

**This is acceptable** - the error message is clear. Full dependency tracking would be complex and probably not worth it for the target audience.

**Optional improvement:** When applying a rename step, warn if downstream steps reference the old column name.

---

## Recommended Additions

### 1. Schema Version on Stored Objects

Add a version field to detect old data:

```typescript
interface Source {
  __v?: number; // Defaults to 1 if missing
  // ...existing fields
}

interface Model {
  __v?: number;
  // ...existing fields
}
```

**Cost:** One field, checked on load.
**Benefit:** Enables future migrations without guessing data format.

### 2. Graceful Unknown Type/Transform Handling

When loading data, don't crash on unknown values:

```typescript
// Unknown column type
if (!KNOWN_TYPES.includes(schema.type)) {
  console.warn(`Unknown type "${schema.type}", treating as string`);
  schema.type = 'string';
}

// Unknown transform key
const knownTransforms = ['select', 'filter', 'derive', ...];
for (const key of Object.keys(step)) {
  if (!knownTransforms.includes(key) && !key.startsWith('_')) {
    console.warn(`Unknown transform "${key}", ignoring`);
  }
}
```

### 3. Workflow Format Version

Current export uses `version: '1.0'` as a string. Make it machine-comparable:

```typescript
const workflow = {
  formatVersion: 1, // Integer, bump on breaking changes
  chumakVersion: '1.2.0', // App version that created it
  // ...
};
```

---

## What's Safe to Change

| Change Type                        | Safe?  | Notes                      |
| ---------------------------------- | ------ | -------------------------- |
| Add new function                   | ✅ Yes | Old workflows don't use it |
| Add optional function arg          | ✅ Yes | Old calls still valid      |
| Add new column type                | ✅ Yes | With fallback handling     |
| Add new transform type             | ✅ Yes | Old workflows don't use it |
| Add new DB object store            | ✅ Yes | Bump DB_VERSION            |
| Add optional field to Source/Model | ✅ Yes | Old data just lacks it     |

## What's Not Safe to Change

| Change Type                            | Safe? | Notes                                 |
| -------------------------------------- | ----- | ------------------------------------- |
| Rename function                        | ❌ No | Breaks stored expressions             |
| Change function behavior               | ❌ No | Old workflows expect old results      |
| Rename transform key                   | ❌ No | `derive` → `compute` breaks workflows |
| Remove column type                     | ❌ No | Old data references it                |
| Change field from optional to required | ❌ No | Old data lacks it                     |

## What Requires Migration Code

| Change Type                | Migration Approach                     |
| -------------------------- | -------------------------------------- |
| New rollup format          | Detect + convert on load               |
| Change ID format           | Map old→new IDs, update all references |
| Restructure nested objects | Version check + transform              |

---

## Summary

The realistic risks are:

1. **Forward compatibility** - Can old Chumak versions open new workflows? Handle gracefully with fallbacks.

2. **Format evolution** - When you improve a format (like rollup syntax), you carry conversion code forever.

3. **Reference integrity** - Joins and column references can break when things are renamed. Fix join ID issue now.

Most changes are **additive** and safe. The constraints are:

- Don't rename existing things
- Don't change existing behavior
- Add version fields now to enable future migrations
