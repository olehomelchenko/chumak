import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChumakApp } from '../chumak-app';
import { AppStore } from './stores/AppStore';
import { ImportService } from './services/ImportService';
import { ExportService } from './services/ExportService';
import { StepService } from './services/StepService';
import Papa from 'papaparse';

/**
 * E2E Critical Path Test
 *
 * Tests the complete workflow: Import CSV -> Filter -> Derive -> Export CSV
 *
 * This test verifies the core functionality end-to-end without requiring
 * a full browser environment, using Vitest with HappyDOM.
 */
describe('E2E Critical Path', () => {
  let app: ChumakApp;

  beforeEach(() => {
    // Reset store state before each test
    AppStore.reset();

    // Mock console methods to keep output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create app instance
    app = new ChumakApp();

    // Mock dialog methods
    app.alert = vi.fn().mockResolvedValue(undefined);
    app.closeDialog = vi.fn();
  });

  it('should complete critical path: Import CSV -> Filter -> Derive -> Export CSV', async () => {
    // Step 1: Import CSV
    const csvData = `name,sales,revenue,cost
Alice,1000,5000,3000
Bob,1500,7000,4000
Carol,800,4000,2500
David,2000,9000,5000`;

    // Create a File object from CSV string
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'test-data.csv', { type: 'text/csv' });

    // Parse CSV manually to get data for ImportService
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const columns = Object.keys(parseResult.data[0] as any);
    const data = parseResult.data as any[];

    // Use ImportService to create source
    await ImportService.createSource(
      csvFile,
      'test_source',
      columns,
      data,
      'first-row',
      ',',
      null,
      'file',
      () => app.updatePagination(),
      () => app.closeDialog()
    );

    // Verify import
    expect(AppStore.sources.value.length).toBe(1);
    expect(AppStore.models.value.length).toBe(1);
    expect(AppStore.activeModel.value).toBeTruthy();
    expect(AppStore.currentData.value?.length).toBe(4);

    const initialData = AppStore.currentData.value!;
    expect(initialData[0]).toMatchObject({
      name: 'Alice',
      sales: 1000,
      revenue: 5000,
      cost: 3000,
    });

    // Step 2: Apply Filter (sales > 1000)
    const filterTransform = {
      filter: 'sales > 1000',
    };

    const filterSuccess = await StepService.runTransform('Filter', filterTransform as any, {
      onTransformStart: (label) => app.startTransformation(label),
      onTransformEnd: () => app.endTransformation(),
      onError: (msg) => app.alert(msg),
      updatePagination: () => app.updatePagination(),
    });

    expect(filterSuccess).toBe(true);

    // Verify filter result (should have 3 rows: Bob, David - Carol has sales=800, so excluded)
    const filteredData = AppStore.currentData.value!;
    expect(filteredData.length).toBe(2); // Bob (1500), David (2000) - Carol (800) excluded
    expect(filteredData.every((row: any) => row.sales > 1000)).toBe(true);

    // Verify original columns preserved
    expect(AppStore.columns.value).toEqual(['name', 'sales', 'revenue', 'cost']);

    // Step 3: Apply Derive (profit = revenue - cost)
    const deriveTransform = {
      derive: { profit: 'revenue - cost' },
    };

    const deriveSuccess = await StepService.runTransform('Derive', deriveTransform as any, {
      onTransformStart: (label) => app.startTransformation(label),
      onTransformEnd: () => app.endTransformation(),
      onError: (msg) => app.alert(msg),
      updatePagination: () => app.updatePagination(),
    });

    expect(deriveSuccess).toBe(true);

    // Verify derive result
    const derivedData = AppStore.currentData.value!;
    expect(derivedData.length).toBe(2);
    expect(AppStore.columns.value).toContain('profit');

    // Verify profit calculation
    const firstRow = derivedData[0];
    expect(firstRow.profit).toBe(firstRow.revenue - firstRow.cost);

    // Step 4: Export CSV
    const exportedCsv = ExportService.exportCSV((msg) => app.alert(msg));

    // Verify export format
    expect(exportedCsv).toBeTruthy();
    const exportedLines = exportedCsv.split('\n');
    expect(exportedLines.length).toBeGreaterThan(1); // Header + data rows

    // Verify exported data contains derived column
    expect(exportedCsv).toContain('profit');

    // Parse exported CSV to verify structure
    const exportedParse = Papa.parse(exportedCsv, {
      header: true,
      skipEmptyLines: true,
    });

    expect(exportedParse.data.length).toBe(2);
    expect(exportedParse.meta.fields).toContain('profit');
  });

  it('should handle filter error gracefully', async () => {
    // Import minimal data
    const csvData = `name,value
Test,100`;
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'test.csv', { type: 'text/csv' });

    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const columns = Object.keys(parseResult.data[0] as any);
    const data = parseResult.data as any[];

    await ImportService.createSource(
      csvFile,
      'test',
      columns,
      data,
      'first-row',
      ',',
      null,
      'file',
      () => {},
      () => {}
    );

    // Try invalid filter expression
    const success = await StepService.runTransform(
      'Filter',
      { filter: 'invalid_column > 100' } as any,
      {
        onError: async (msg) => {
          expect(msg).toContain('Error');
        },
      }
    );

    // Should fail gracefully
    expect(success).toBe(false);
  });

  it('should maintain schema consistency through transforms', async () => {
    // Import data with mixed types
    const csvData = `id,name,amount,date
1,Alice,100.5,2024-01-01
2,Bob,200.75,2024-01-02`;

    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'test.csv', { type: 'text/csv' });

    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const columns = Object.keys(parseResult.data[0] as any);
    const data = parseResult.data as any[];

    await ImportService.createSource(
      csvFile,
      'test',
      columns,
      data,
      'first-row',
      ',',
      null,
      'file',
      () => {},
      () => {}
    );

    const model = AppStore.activeModel.value;
    expect(model?.schema).toBeTruthy();
    expect(model?.schema.length).toBe(4);

    // Apply filter
    await StepService.runTransform('Filter', { filter: 'id > 0' } as any, {
      onTransformStart: () => {},
      onTransformEnd: () => {},
      onError: async () => {},
      updatePagination: () => {},
    });

    // Schema should still be consistent
    const updatedModel = AppStore.activeModel.value;
    expect(updatedModel?.schema.length).toBe(4);
    expect(AppStore.columns.value.length).toBe(4);
  });
});
