# Transform Handler Simplification

> **Status**: Proposed
> **Effort**: Medium
> **Priority**: Low (developer experience improvement)

## Problem Statement

Adding a new transform dialog currently requires touching **11-12 files** due to the callback indirection pattern. This is error-prone and has already caused bugs (e.g., window transform Apply button not working because the callback chain wasn't wired).

### Current Files Required for Transform Dialogs

| #   | File                  | Purpose                              |
| --- | --------------------- | ------------------------------------ |
| 1   | `dialog-registry.ts`  | Metadata (name, title, type)         |
| 2   | `types.ts`            | `DialogName` union                   |
| 3   | `*Dialog.tsx`         | UI component                         |
| 4   | `components/index.ts` | Export component                     |
| 5   | `App.tsx`             | Render dialog                        |
| 6   | `DialogStore.ts`      | Dialog state signals                 |
| 7   | `stores/dialogs/*`    | State definition file                |
| 8   | `*-handlers.ts`       | Handler logic                        |
| 9   | `step-handlers.ts`    | `StepCallbacks` interface            |
| 10  | `step-handlers.ts`    | `applyActiveTransform()` switch case |
| 11  | `AppController.ts`    | Expose method                        |
| 12  | `syto-app.ts`         | Wire callback                        |
| 13  | `test-utils.ts`       | Mock callback                        |

The callback chain (files 9-13) exists for historical reasons: separating the "what" (handlers) from the "how" (UI integration). However, in practice this indirection provides little benefit while creating significant maintenance burden.

---

## Current Architecture

```
User clicks Apply
    ↓
App.tsx → AppController.applyActiveTransform()
    ↓
step-handlers.ts → applyActiveTransform() switch statement
    ↓
callbacks.applyFooTransform()  ← from syto-app.ts
    ↓
AppController.applyFooTransform()
    ↓
FooHandlers.applyFooTransform(createExecutionCallbacks())
```

The indirection through `StepCallbacks` → `syto-app.ts` → `AppController` → handlers adds 4 files of boilerplate per transform.

---

## Proposed Solutions

### Option A: Registry-Driven Dispatch (Recommended)

**Concept**: Register the apply handler in `dialog-registry.ts` and have `applyActiveTransform()` look it up dynamically.

```typescript
// dialog-registry.ts
import * as FilterHandlers from '../handlers/transform/filter-handlers';
import * as WindowHandlers from '../handlers/transform/window-handlers';

export const DIALOG_REGISTRY: Record<string, DialogConfig> = {
  filter: {
    name: 'filter',
    title: 'Filter Rows',
    type: 'slide-panel',
    applyHandler: FilterHandlers.applyFilterTransform, // NEW
  },
  window: {
    name: 'window',
    title: 'Window Functions',
    type: 'slide-panel',
    applyHandler: WindowHandlers.applyWindowTransform, // NEW
  },
  // ...
};

// step-handlers.ts - simplified
export async function applyActiveTransform(): Promise<void> {
  const activeDialog = AppStore.activeDialog.value;
  const config = getDialogConfig(activeDialog);

  if (config?.applyHandler) {
    await config.applyHandler(createExecutionCallbacks());
  }
  // Special cases (import, generate) handled separately
}
```

**Files eliminated**:

- `StepCallbacks` interface entries
- Switch case in `applyActiveTransform()`
- `syto-app.ts` callback wiring
- `test-utils.ts` mock entries

**Files still needed**:

- Handler function
- `AppController` method (for other callers)

**Reduction**: ~11-12 files → ~8-9 files

---

### Option B: Direct Handler Calls

**Concept**: Have `applyActiveTransform()` import and call handlers directly, removing the callback indirection entirely.

```typescript
// step-handlers.ts
import * as FilterHandlers from '../handlers/transform/filter-handlers';
import * as WindowHandlers from '../handlers/transform/window-handlers';
// ... all handlers

export async function applyActiveTransform(): Promise<void> {
  const activeDialog = AppStore.activeDialog.value;
  const callbacks = createExecutionCallbacks();

  switch (activeDialog) {
    case 'filter':
      await FilterHandlers.applyFilterTransform(callbacks);
      break;
    case 'window':
      await WindowHandlers.applyWindowTransform(callbacks);
      break;
    // ...
  }
}
```

Note: Some transforms (`date`, `text`) already use this pattern.

**Files eliminated**:

- `StepCallbacks` interface entries
- `syto-app.ts` callback wiring
- `test-utils.ts` mock entries

**Still need**: Switch case (but no interface/callback overhead)

**Reduction**: ~11-12 files → ~9 files

---

### Option C: Convention-Based Auto-Discovery

**Concept**: Use naming conventions to auto-load handlers.

```typescript
// Handlers export a standard `apply` function
// window-handlers.ts
export const apply = async (callbacks: ExecutionCallbacks) => { ... };

// step-handlers.ts
export async function applyActiveTransform(): Promise<void> {
  const activeDialog = AppStore.activeDialog.value;
  const handlers = await import(`../handlers/transform/${activeDialog}-handlers`);
  await handlers.apply(createExecutionCallbacks());
}
```

**Pros**: Minimal boilerplate, truly zero-config for new transforms
**Cons**:

- Dynamic imports complicate bundling
- Harder to tree-shake
- Less explicit, harder to trace
- Not all dialogs map 1:1 to handler files

**Not recommended** due to complexity and reduced clarity.

---

## Recommendation

**Option A (Registry-Driven Dispatch)** provides the best balance:

1. **Single source of truth**: Dialog metadata and handler in one place
2. **Type-safe**: Handler type can be enforced in `DialogConfig`
3. **Explicit**: Easy to see which dialog uses which handler
4. **Incremental**: Can migrate one dialog at a time
5. **Testable**: Registry can be mocked for testing

### Migration Path

1. Add optional `applyHandler` field to `DialogConfig` interface
2. Update `applyActiveTransform()` to check registry first, fall back to switch
3. Migrate transforms one at a time (start with simple ones)
4. Once all migrated, remove `StepCallbacks` transform methods
5. Clean up `syto-app.ts` callback wiring
6. Update `test-utils.ts` to use registry

### Risk Assessment

- **Low risk**: Incremental migration with fallback
- **Testable**: Each migration step can be verified
- **Reversible**: Can keep both patterns during transition

---

## Impact Summary

| Metric                     | Current | After Option A            |
| -------------------------- | ------- | ------------------------- |
| Files per transform dialog | 11-12   | 8-9                       |
| Switch cases to maintain   | 20+     | 0 (special cases only)    |
| Callback interface entries | 20+     | 0                         |
| Risk of missing wiring     | High    | Low (single registration) |

---

## Related Work

- **Dialog Registry Centralization** (completed Jan 2026): Established the pattern of centralizing dialog metadata
- **Preview Engine Consolidation** (completed Jan 2026): Similar pattern of extracting shared logic

---

**Last updated**: February 2026
