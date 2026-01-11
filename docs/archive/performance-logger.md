# Performance Logger

Simple helper to track operation timing and data shape changes.

## Usage

```javascript
// Measure a sync function
const result = perfLogger.measure(
  'filter',
  () => {
    return applyTransform(table, transform, columns);
  },
  { input: table, details: 'sales > 1000' }
);

// Measure async
const data = await perfLogger.measureAsync(
  'import CSV',
  async () => {
    return await parseCSV(file);
  },
  { details: file.name }
);

// Manual timing
const start = performance.now();
const result = doSomething();
const duration = performance.now() - start;
perfLogger.log('operation name', inputData, result, duration, { details: 'info' });
```

## Output

```
⚡ filter — 12.3ms
  10,000×5 → 3,456×5
  sales > 1000
```

Icons: ⚡ fast (<50ms) | ✓ ok (<200ms) | ⏱️ slow (<500ms) | ⚠️ warning (>500ms)

## Toggle

```javascript
perfLogger.enabled = false; // disable
```
