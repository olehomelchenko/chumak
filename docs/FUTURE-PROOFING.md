# Future-Proofing: Persistence & Schema Evolution

> **Purpose:** Guidelines for implementing new features while maintaining compatibility with existing stored data (IndexedDB, workflow JSON).

**Use this document when:** Adding new column types, transforms, functions, or modifying data structures that get persisted.

This is not a theoretical "what if we rename everything" document. It focuses on **realistic scenarios** you'll encounter when evolving Syto and how to handle them gracefully.

---

## How Data is Persisted

| Location               | What's Stored                          | Format                                          |
| ---------------------- | -------------------------------------- | ----------------------------------------------- |
| IndexedDB `sources`    | Raw imported data + metadata           | `Source` objects                                |
| IndexedDB `models`     | Transform pipelines + computed results | `Model` objects with `TransformStep[]`          |
| Exported workflow JSON | Portable pipeline definition           | `{ formatVersion, sytoVersion, source, model }` |
| URL hash               | Current view state                     | `/#/sourceId/modelId`                           |

**Key insight:** IndexedDB stores the full objects, including computed `data` arrays. Workflow JSON stores just the pipeline definition.

---

## Guidelines for Adding New Features

### ✅ When Adding a New Column Type

**What to do:**

1. Add the new type to `KNOWN_COLUMN_TYPES` in `src/core/schema-engine.ts`
2. Update `ColumnType` union type
3. Add type inference logic in `SchemaEngine.inferType()` if needed
4. Add conversion logic in `type-converter.ts` for all supported conversions
5. ✅ Unknown types are already handled: `normalizeSchema()` converts unknown types to `string` with warnings

**Example:** Adding `decimal` type:

```typescript
// src/core/schema-engine.ts
const KNOWN_COLUMN_TYPES: readonly ColumnType[] = [
  'string', 'integer', 'float', 'boolean', 'date', 'datetime', 'decimal' // ← add here
] as const;

export type ColumnType = ... | 'decimal'; // ← update union type
```

**Why it's safe:** Old app versions will treat `decimal` as `string` automatically. No migration needed.

---

### ✅ When Adding a New Transform

**What to do:**

1. Add the transform key to `KNOWN_TRANSFORM_KEYS` in `src/core/transforms.ts`
2. Add the transform key to the known keys list in `deriveNextSchema()` (if schema-changing)
3. Implement transform logic in `applyTransform()`
4. Implement schema propagation in `deriveNextSchema()` (if schema-changing)
5. ✅ Unknown transforms are already handled: they're skipped with warnings

**Example:** Adding a `resample` transform:

```typescript
// src/core/transforms.ts
const KNOWN_TRANSFORM_KEYS: readonly string[] = [
  'select', 'remove', ..., 'resample' // ← add here
] as const;

// Then implement in applyTransform()
if (transform.resample) {
  // ... implementation
  return result;
}
```

**Why it's safe:** Old app versions will skip the transform with a warning. The workflow continues with remaining transforms.

---

### ✅ When Extending Function Signatures

**What to do:**

1. Update `maxArgs` in `ast-validator.ts` if adding arguments
2. Keep old argument counts working (backward compatible)
3. ✅ Never change existing function behavior - old workflows depend on it

**Example:** Adding optional `timezone` argument to `date_add()`:

```typescript
// src/core/ast-validator.ts
const FUNCTION_SIGNATURES: Record<string, { minArgs: number; maxArgs: number }> = {
  date_add: { minArgs: 3, maxArgs: 4 }, // ← bump maxArgs from 3 to 4
  // ...
};
```

**Critical constraint:** You cannot _change_ existing function behavior. If `round(2.5)` currently returns `3`, it must always return `3` for old workflows.

---

### ✅ When Extending Transform Parameters

**What to do:**

Handle both old and new formats with runtime checks. Convert old format to new format in-memory if needed.

**Example:** Making `pivot.values` accept both `string` and `string[]`:

```typescript
// src/core/transforms.ts
if (transform.pivot) {
  const { values } = transform.pivot;
  // Handle both formats
  const valueColumns = Array.isArray(values) ? values : [values];
  // ... use valueColumns
}
```

**For format migrations:** If you want to improve a format (e.g., rollup syntax), you'll need migration code that:

1. Detects the old format
2. Converts it in-memory on load
3. Saves in new format going forward
4. Maintains this conversion code forever (or until all old workflows are migrated)

---

### ✅ When Adding New Expression Syntax

**What to do:**

1. Configure `jsep` parser with new features (if needed)
2. Update `ast-interpreter.ts` to handle new AST node types
3. ✅ Old expressions continue to work - new syntax is additive

**Risk:** If new syntax accidentally matches old patterns, could cause subtle bugs. Test thoroughly.

---

### ✅ When Adding IndexedDB Object Stores

**What to do:**

1. Bump `DB_VERSION` in `src/core/storage.ts`
2. Add object store creation in `onupgradeneeded` handler
3. ✅ Adding stores doesn't affect existing data

**Example:**

```typescript
// src/core/storage.ts
const DB_VERSION = 2; // ← bump from 1

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('history')) {
    db.createObjectStore('history', { keyPath: 'id' });
  }
};
```

---

### ✅ When Adding Optional Fields to Source/Model

**What to do:**

1. Add field as optional (`?:`) to TypeScript interfaces
2. Default to `undefined` or sensible default in creation functions
3. ✅ Old data just lacks the field - handle gracefully with optional chaining

**Example:**

```typescript
// src/app/types.ts
export interface Model {
  id: string;
  name: string;
  // ... existing fields
  newOptionalField?: string; // ← optional
}
```

---

### ⚠️ When Renaming Existing Features

**Don't do this.** Instead:

- Add new name as alias (if possible)
- Or create migration path with version checking
- Or accept that old workflows will break (document clearly)

**Why:** Renaming breaks stored expressions/workflows. If `derive` → `compute`, all old `{ derive: {...} }` transforms break.

---

## Reference: What's Safe vs. Unsafe

### ✅ Safe to Add (Backward Compatible)

| Change Type                        | Implementation Notes                 |
| ---------------------------------- | ------------------------------------ |
| Add new function                   | Add to `ast-validator.ts` whitelist  |
| Add optional function arg          | Bump `maxArgs`, old calls still work |
| Add new column type                | Add to `KNOWN_COLUMN_TYPES`          |
| Add new transform type             | Add to `KNOWN_TRANSFORM_KEYS`        |
| Add new DB object store            | Bump `DB_VERSION`, add in upgrade    |
| Add optional field to Source/Model | Use optional (`?:`) in TypeScript    |

### ❌ Not Safe to Change (Breaks Existing Data)

| Change Type                            | Why It Breaks                         |
| -------------------------------------- | ------------------------------------- |
| Rename function                        | Stored expressions reference old name |
| Change function behavior               | Old workflows expect old results      |
| Rename transform key                   | `derive` → `compute` breaks workflows |
| Remove column type                     | Old data references the removed type  |
| Change field from optional to required | Old data lacks the required field     |

### 🔄 Requires Migration Code

| Change Type                | Migration Approach                     |
| -------------------------- | -------------------------------------- |
| New rollup format          | Detect old format, convert on load     |
| Change ID format           | Map old→new IDs, update all references |
| Restructure nested objects | Version check (`__v`), transform       |

---

## Current Implementation Status

**Already implemented (you don't need to add these):**

- ✅ Schema version fields (`__v`) on Source and Model - enables version-based migrations
- ✅ Graceful unknown type handling (`normalizeSchema()`) - converts unknown types to `string`
- ✅ Graceful unknown transform handling - skips unknown transforms with warnings
- ✅ Workflow format versioning (`formatVersion`, `sytoVersion`) - enables format detection
- ✅ Join references use ID internally (IndexedDB) — v2 export format translates to names for portability

**You should use these patterns when adding new features.**

---

## Design Principles

Most changes are **additive** and safe. The constraints are:

1. **Don't rename existing things** - breaks stored references
2. **Don't change existing behavior** - old workflows depend on it
3. **Version fields enable migrations** - use `__v` to detect old formats
4. **Graceful degradation** - unknown types/transforms should be handled gracefully
5. **Forward compatibility** - old app versions should be able to load new data (even if some features are skipped)

---

## Quick Checklist for New Features

When adding a new feature that affects persisted data:

- [ ] Is it additive? (Not renaming or changing existing behavior)
- [ ] If adding a column type: Added to `KNOWN_COLUMN_TYPES`?
- [ ] If adding a transform: Added to `KNOWN_TRANSFORM_KEYS`?
- [ ] If adding function args: Updated `maxArgs` in validator?
- [ ] If changing format: Added migration code with version check?
- [ ] If adding DB store: Bumped `DB_VERSION`?
- [ ] Tested with old workflow JSON from previous versions?
- [ ] Console warnings for graceful degradation?
