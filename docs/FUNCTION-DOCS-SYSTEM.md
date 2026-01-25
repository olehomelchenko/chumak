# Auto-Generated Function Documentation System

## Overview

The Syto project now includes an automated documentation generation system that creates both human-readable markdown documentation and machine-readable JSON schema from JSDoc comments in the source code.

## Architecture

### 1. Source of Truth: JSDoc Comments

All function metadata is defined using structured JSDoc comments in [src/core/ast-interpreter.ts](../src/core/ast-interpreter.ts):

```typescript
/**
 * @category Date
 * @description Extracts the year from a date value
 * @param value - Date value or date string
 * @returns Year as number (e.g., 2024), or null if invalid
 * @example year(order_date)
 * @example year("2024-01-15") → 2024
 */
year: (value) => { ... }
```

### 2. Build Script: Documentation Generator

The script [scripts/generate-function-docs.ts](../scripts/generate-function-docs.ts):

- Parses JSDoc comments from the source file
- Extracts function metadata (name, category, description, params, returns, examples)
- Generates categorized markdown files
- Generates JSON schema

**Run manually:**

```bash
npm run docs:generate
```

**Automatically runs during build:**

```bash
npm run build  # includes docs:generate
```

### 3. Generated Output

#### Markdown Documentation

Located in `src/content/functions/`:

- `operators.md` - Arithmetic, comparison, logical, special operators
- `date.md` - Date extraction, utilities, arithmetic (15 functions)
- `text.md` - String manipulation and comparison (15 functions)
- `math.md` - Mathematical operations (6 functions)
- `regex.md` - Regular expression functions (2 functions)
- `conversion.md` - Type conversion functions (3 functions)

#### JSON Schema

Located at `src/schemas/functions.json`:

```json
{
  "version": "1.0.0",
  "generated": "2026-01-25T03:49:34.444Z",
  "functions": [
    {
      "name": "year",
      "category": "Date",
      "description": "Extracts the year from a date value",
      "signature": "year(value)",
      "params": [...],
      "returns": "Year as number (e.g., 2024), or null if invalid",
      "examples": [...]
    },
    ...
  ]
}
```

### 4. Documentation Viewer Component

The [FunctionReferenceDialog](../src/app/components/FunctionReferenceDialog.tsx) component provides:

- Tabbed interface with categories (Operators, Date, Text, Math, Regex, Conversion)
- Responsive sidebar navigation
- Styled markdown rendering
- Accessible via Help menu → "Expression Reference"

## Adding New Functions

When adding a new function to `FUNCTION_IMPLS`:

1. **Add JSDoc comment** with all required tags:

   ```typescript
   /**
    * @category [Date|Text|Math|Regex|Conversion]
    * @description Brief description of what the function does
    * @param paramName - Parameter description
    * @returns Return value description
    * @example functionName(arg1)
    * @example functionName("value") → result
    */
   newFunction: (param) => { ... }
   ```

2. **Regenerate documentation:**

   ```bash
   npm run docs:generate
   ```

3. **Verify tests pass:**
   ```bash
   npm test -- function-docs-validation.test.ts
   ```

## Validation Tests

The test suite [src/core/function-docs-validation.test.ts](../src/core/function-docs-validation.test.ts) ensures:

✅ JSON schema file exists
✅ All markdown files exist
✅ All functions have complete metadata
✅ All functions have examples
✅ Valid categories are used
✅ No duplicate function names
✅ Function counts match across documentation

## Future Enhancements

The JSON schema can be used for:

- **Autocomplete/IntelliSense** in expression editor
- **Expression validation** before execution
- **Function picker** dropdown UI
- **External tools** (VS Code extensions, API docs)
- **AI/LLM integration** (Claude helping users write expressions)

## Benefits

1. **Single source of truth** - Documentation lives with code
2. **Always in sync** - Docs regenerate on every build
3. **Type-safe** - TypeScript validates JSDoc structure
4. **Machine-readable** - JSON schema enables tooling
5. **Human-friendly** - Beautiful markdown for users
6. **Testable** - Validation ensures completeness

## Maintenance

- **Keep JSDoc comments up to date** when modifying functions
- **Run tests** to ensure documentation completeness
- **Regenerate docs** after adding/removing functions
- **Follow JSDoc conventions** for consistency

## Files Changed/Added

### Added:

- `scripts/generate-function-docs.ts` - Documentation generator
- `src/content/functions/*.md` - Generated markdown docs
- `src/schemas/functions.json` - Generated JSON schema
- `src/app/components/FunctionReferenceDialog.tsx` - Documentation viewer
- `src/app/components/FunctionReferenceDialog.module.css` - Styles
- `src/core/function-docs-validation.test.ts` - Validation tests
- `docs/FUNCTION-DOCS-SYSTEM.md` - This document

### Modified:

- `src/core/ast-interpreter.ts` - Added JSDoc to all 41 functions
- `package.json` - Added `docs:generate` script, tsx dependency
- `src/app/components/App.tsx` - Integrated FunctionReferenceDialog
- `src/app/components/index.ts` - Exported FunctionReferenceDialog

## Statistics

- **41 functions documented** (across 5 categories)
- **6 markdown files** generated
- **1 JSON schema** with full metadata
- **789 tests passing** (including 8 new validation tests)
