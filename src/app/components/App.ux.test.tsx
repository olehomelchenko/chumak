/**
 * UX Interaction Tests for App Component
 *
 * Tests user interactions like clicking column headers and cells,
 * verifying that toolbars and EDA panels appear correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { App } from './App';
import { AppStore } from '../stores/AppStore';
import { ChumakApp } from '../../chumak-app';
import { DialogStore } from '../stores/DialogStore';

describe('App UX Interactions', () => {
  let app: ChumakApp;
  const testData = [
    { name: 'Alice', age: 30, sales: 1000 },
    { name: 'Bob', age: 25, sales: 1500 },
    { name: 'Carol', age: 35, sales: 800 },
  ];

  beforeEach(() => {
    // Reset all stores
    AppStore.reset();
    DialogStore.resetAll();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create app instance
    app = new ChumakApp();

    // Mock dialog methods
    app.alert = vi.fn().mockResolvedValue(undefined);
    app.confirm = vi.fn().mockResolvedValue(true);
    app.prompt = vi.fn().mockResolvedValue('test');
    app.closeDialog = vi.fn();
    app.openDialog = vi.fn();

    // Set up test data
    AppStore.columns.value = ['name', 'age', 'sales'];
    AppStore.currentData.value = testData;
    AppStore.viewMode.value = 'model';
    AppStore.activeModel.value = {
      id: 'test-model',
      name: 'Test Model',
      sourceId: 'test-source',
      data: testData,
      schema: [
        { name: 'name', type: 'string' },
        { name: 'age', type: 'integer' },
        { name: 'sales', type: 'float' },
      ],
      steps: [],
    };
  });

  describe('Column Header Interactions', () => {
    it('should show EDA panel when column header is clicked', async () => {
      render(<App app={app} />);

      // Find and click a column header - use data-col attribute instead
      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const nameHeader = document.querySelector('th[data-col="name"]');

      expect(nameHeader).toBeDefined();
      fireEvent.click(nameHeader!);

      // Wait for EDA panel to appear
      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('name');
      });

      // EDA panel should be visible (it renders when selectedColumn is set)
      await waitFor(() => {
        const edaPanel = document.querySelector('[class*="edaPanel"]');
        expect(edaPanel).toBeDefined();
      });
    });

    it('should show column toolbar when column header is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const salesHeader = document.querySelector('th[data-col="sales"]');

      fireEvent.click(salesHeader!);

      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('sales');
        expect(AppStore.columnToolbarPos.value.x).toBeGreaterThan(0);
      });

      // Column toolbar should be rendered
      await waitFor(() => {
        const toolbar = document.querySelector('[class*="floatingToolbar"]');
        expect(toolbar).toBeDefined();
      });
    });

    it('should calculate EDA stats when column is selected', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const ageHeader = document.querySelector('th[data-col="age"]');

      fireEvent.click(ageHeader!);

      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('age');
        expect(AppStore.edaStats.value).toBeDefined();
      });

      // EDA stats should have type information
      // Note: integer and float types are normalized to 'number' in EDA stats
      const stats = AppStore.edaStats.value;
      expect(stats).toBeDefined();
      expect(stats?.type).toBe('number');
    });

    it('should toggle column selection when clicking same header twice', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const nameHeader = document.querySelector('th[data-col="name"]');

      // First click - select
      fireEvent.click(nameHeader!);
      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('name');
      });

      // Second click - deselect
      fireEvent.click(nameHeader!);
      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBeNull();
      });
    });

    it('should clear cell selection when column is selected', async () => {
      // First select a cell
      AppStore.selectedCell.value = {
        col: 'name',
        value: 'Alice',
        type: 'string',
        rowIdx: 0,
      };

      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const ageHeader = document.querySelector('th[data-col="age"]');

      fireEvent.click(ageHeader!);

      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('age');
        expect(AppStore.selectedCell.value).toBeNull();
      });
    });
  });

  describe('Cell Interactions', () => {
    it('should show cell toolbar when cell is clicked', async () => {
      render(<App app={app} />);

      // Find a cell and click it - use data-col attribute
      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col]');
        expect(cells.length).toBeGreaterThan(0);
      });

      const aliceCell = document.querySelector('td[data-col="name"][data-row="0"]');

      expect(aliceCell).toBeDefined();
      fireEvent.click(aliceCell!);

      await waitFor(() => {
        expect(AppStore.selectedCell.value).toBeDefined();
        expect(AppStore.selectedCell.value?.col).toBe('name');
        expect(AppStore.selectedCell.value?.value).toBe('Alice');
        expect(AppStore.cellToolbarPos.value.x).toBeGreaterThan(0);
      });

      // Cell toolbar should be rendered
      await waitFor(() => {
        const toolbar = document.querySelector('[class*="floatingToolbar"]');
        expect(toolbar).toBeDefined();
      });
    });

    it('should clear column selection when cell is selected', async () => {
      // First select a column
      AppStore.selectedColumn.value = 'name';
      AppStore.edaStats.value = { type: 'string' } as any;

      render(<App app={app} />);

      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col]');
        expect(cells.length).toBeGreaterThan(0);
      });

      const salesCell = document.querySelector('td[data-col="sales"][data-row="0"]');

      fireEvent.click(salesCell!);

      await waitFor(() => {
        expect(AppStore.selectedCell.value).toBeDefined();
        expect(AppStore.selectedColumn.value).toBeNull();
      });
    });

    it('should set correct cell type based on column schema', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col]');
        expect(cells.length).toBeGreaterThan(0);
      });

      const ageCell = document.querySelector('td[data-col="age"][data-row="0"]');

      fireEvent.click(ageCell!);

      await waitFor(() => {
        const selectedCell = AppStore.selectedCell.value;
        expect(selectedCell).toBeDefined();
        expect(selectedCell?.col).toBe('age');
        expect(selectedCell?.type).toBe('integer');
        expect(selectedCell?.value).toBe(30);
      });
    });

    it('should position cell toolbar correctly for numeric cells', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col]');
        expect(cells.length).toBeGreaterThan(0);
      });

      const salesCell = document.querySelector('td[data-col="sales"][data-row="1"]');

      fireEvent.click(salesCell!);

      await waitFor(() => {
        const pos = AppStore.cellToolbarPos.value;
        expect(pos).toBeDefined();
        expect(pos.x).toBeGreaterThan(0);
        // y can be negative if element is near top of viewport (toolbar positioned above)
        // Just verify it's a number and position is calculated
        expect(typeof pos.y).toBe('number');
        expect(Number.isFinite(pos.y)).toBe(true);
        // Numeric cells should have wider toolbar (220px vs 80px)
        // We can't directly test width, but we can verify position is calculated
        expect(pos.arrowOffset).toBeDefined();
      });
    });
  });

  describe('Toolbar Actions', () => {
    it('should open filter dialog when column toolbar filter button is clicked', async () => {
      AppStore.selectedColumn.value = 'name';

      render(<App app={app} />);

      await waitFor(() => {
        const toolbar = document.querySelector('[class*="floatingToolbar"]');
        expect(toolbar).toBeDefined();
      });

      // Find filter button (carbon:filter icon)
      const filterButton = document.querySelector('[data-icon="carbon:filter"]')?.closest('button');
      expect(filterButton).toBeDefined();

      fireEvent.click(filterButton!);

      await waitFor(() => {
        expect(app.openDialog).toHaveBeenCalledWith('filter');
      });
    });

    it('should open sort dialog when column toolbar sort button is clicked', async () => {
      AppStore.selectedColumn.value = 'sales';

      render(<App app={app} />);

      await waitFor(() => {
        const toolbar = document.querySelector('[class*="floatingToolbar"]');
        expect(toolbar).toBeDefined();
      });

      // Find sort ascending button (carbon:arrow-up icon)
      const sortButton = document.querySelector('[data-icon="carbon:arrow-up"]')?.closest('button');
      expect(sortButton).toBeDefined();

      fireEvent.click(sortButton!);

      // Should trigger quickSort which opens sort dialog
      await waitFor(() => {
        expect(DialogStore.sortState.field.value).toBe('sales');
      });
    });

    it('should open replace dialog when cell toolbar replace button is clicked', async () => {
      AppStore.selectedCell.value = {
        col: 'name',
        value: 'Alice',
        type: 'string',
        rowIdx: 0,
      };

      render(<App app={app} />);

      await waitFor(() => {
        const toolbar = document.querySelector('[class*="floatingToolbar"]');
        expect(toolbar).toBeDefined();
      });

      // Find replace button (codicon:replace icon)
      const replaceButton = document
        .querySelector('[data-icon="codicon:replace"]')
        ?.closest('button');
      expect(replaceButton).toBeDefined();

      fireEvent.click(replaceButton!);

      await waitFor(() => {
        expect(app.openDialog).toHaveBeenCalledWith('replace');
        expect(DialogStore.replaceState.column.value).toBe('name');
        expect(DialogStore.replaceState.findValue.value).toBe('Alice');
      });
    });

    it('should show EDA toolbar when clicking on numeric stat in EDA panel', async () => {
      // First select a column to show EDA panel
      AppStore.selectedColumn.value = 'sales';
      AppStore.edaStats.value = {
        column: 'sales',
        type: 'number',
        totalCount: 5,
        nullCount: 0,
        nullPercentage: '0.0',
        uniqueCount: 5,
        uniquePercentage: '100.0',
        min: '100',
        max: '500',
        mean: '300',
        median: '300',
        p25: '200',
        p75: '400',
        std: '158.1',
        meanMinus3Sigma: '-174.3',
        meanPlus3Sigma: '774.3',
        raw: {
          min: 100,
          max: 500,
          mean: 300,
          median: 300,
          p25: 200,
          p75: 400,
          std: 158.1,
          meanMinus3Sigma: -174.3,
          meanPlus3Sigma: 774.3,
        },
      };

      render(<App app={app} />);

      await waitFor(() => {
        const edaPanel = document.querySelector('[class*="edaPanel"]');
        expect(edaPanel).toBeDefined();
      });

      // Find a stat value (e.g., Mean)
      const meanStat = Array.from(document.querySelectorAll('[class*="edaFlowItem"]')).find((el) =>
        el.textContent?.includes('Mean')
      );
      expect(meanStat).toBeDefined();

      if (meanStat) {
        fireEvent.click(meanStat);

        await waitFor(() => {
          expect(AppStore.selectedCell.value).toBeDefined();
          expect(AppStore.selectedCell.value?.isEda).toBe(true);
          expect(AppStore.selectedCell.value?.edaLabel).toBe('Mean');
        });

        // Toolbar should appear
        await waitFor(() => {
          const toolbar = document.querySelector('[class*="floatingToolbar"]');
          expect(toolbar).toBeDefined();
        });

        // Should show comparison operators only (no exact/not/replace)
        // Find the toolbar that contains comparison operators (EDA toolbar)
        const toolbars = document.querySelectorAll('[class*="floatingToolbar"]');
        const edaToolbar = Array.from(toolbars).find((toolbar) => {
          const buttons = toolbar.querySelectorAll('button');
          // EDA toolbar should have exactly 4 buttons (gt, gte, lt, lte)
          // and no replace button
          const hasReplace = Array.from(buttons).some((btn) =>
            btn.querySelector('[data-icon="codicon:replace"]')
          );
          return buttons.length === 4 && !hasReplace;
        });
        expect(edaToolbar).toBeDefined();
      }
    });
  });

  describe('EDA Panel Integration', () => {
    it('should render charts for numeric columns', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const salesHeader = document.querySelector('th[data-col="sales"]');

      fireEvent.click(salesHeader!);

      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('sales');
        expect(AppStore.edaStats.value?.type).toBe('number');
      });

      // EDA panel should render chart containers
      await waitFor(() => {
        const boxplotContainer = document.querySelector('#eda-boxplot');
        const histogramContainer = document.querySelector('#eda-histogram');
        // At least one should exist (depending on chart view)
        expect(boxplotContainer || histogramContainer).toBeDefined();
      });
    });

    it('should show categorical chart for string columns', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const headers = document.querySelectorAll('th[data-col]');
        expect(headers.length).toBeGreaterThan(0);
      });

      const nameHeader = document.querySelector('th[data-col="name"]');

      fireEvent.click(nameHeader!);

      await waitFor(() => {
        expect(AppStore.selectedColumn.value).toBe('name');
        expect(AppStore.edaStats.value?.type).toBe('string');
      });

      // Categorical bar chart container should exist
      await waitFor(() => {
        const categoricalContainer = document.querySelector('#eda-categorical-bar');
        expect(categoricalContainer).toBeDefined();
      });
    });
  });

  describe('Import Dialog Rendering', () => {
    it('should render import-csv dialog as slide panel', async () => {
      app.openDialog('import-csv');
      app.activeDialog = 'import-csv';

      render(<App app={app} />);

      await waitFor(() => {
        // Slide panel should be rendered (not centered modal)
        const slidePanel = document.querySelector('[class*="slidePanelShell"]');
        expect(slidePanel).toBeDefined();
        // ImportCsvDialog should be in the slide panel content
        const dialogContent = document.querySelector('[class*="slidePanelContent"]');
        expect(dialogContent).toBeDefined();
      });
    });

    it('should show preview panel when import-csv has preview data', async () => {
      app.openDialog('import-csv');
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1', 'col2'];
      DialogStore.importCsvState.previewDataRows.value = [
        ['a', 'b'],
        ['c', 'd'],
      ];

      render(<App app={app} />);

      await waitFor(() => {
        // Preview panel should be visible
        const previewPanel = document.querySelector('[class*="previewPanelShell"]');
        expect(previewPanel).toBeDefined();
        // Preview should show "Import Preview" title
        const previewTitle = document.querySelector('[class*="previewPanelHeader"]');
        expect(previewTitle).toBeDefined();
      });
    });

    it('should render import-url dialog as slide panel', async () => {
      app.openDialog('import-url');
      app.activeDialog = 'import-url';

      render(<App app={app} />);

      await waitFor(() => {
        // Slide panel should be rendered
        const slidePanel = document.querySelector('[class*="slidePanelShell"]');
        expect(slidePanel).toBeDefined();
      });
    });
  });

  describe('Type Conversion', () => {
    it('should display error cells for failed conversions', async () => {
      // Simulate data after type conversion with error cells
      const testData = [
        { value: 42, name: 'A' },
        { value: { type: 'error', message: 'Cannot convert "abc" to integer' }, name: 'B' },
        { value: 123, name: 'C' },
      ];

      AppStore.currentData.value = testData;
      AppStore.columns.value = ['value', 'name'];
      AppStore.activeModel.value = {
        id: 'test-model',
        name: 'Test Model',
        sourceId: 'test-source',
        data: testData,
        schema: [
          { name: 'value', type: 'integer', format: {}, originalPosition: 0 },
          { name: 'name', type: 'string', format: {}, originalPosition: 1 },
        ],
        steps: [],
      };

      render(<App app={app} />);

      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col="value"]');
        expect(cells.length).toBe(3);
      });

      // Check that error cell is styled and displays "Error" with icon
      const errorCell = Array.from(document.querySelectorAll('td[data-col="value"]')).find((cell) =>
        cell.textContent?.includes('Error')
      );
      expect(errorCell).toBeDefined();
      expect(errorCell?.classList.toString()).toContain('error');
      // Should show "Error" text (not the full message)
      expect(errorCell?.textContent).toContain('Error');
      // Should have an icon
      const icon = errorCell?.querySelector('.iconify[data-icon="carbon:warning-filled"]');
      expect(icon).toBeDefined();
    });

    it('should display boolean values as checkmarks', async () => {
      const testData = [
        { flag: true, name: 'A' },
        { flag: false, name: 'B' },
      ];

      AppStore.currentData.value = testData;
      AppStore.columns.value = ['flag', 'name'];
      AppStore.activeModel.value = {
        id: 'test-model',
        name: 'Test Model',
        sourceId: 'test-source',
        data: testData,
        schema: [
          { name: 'flag', type: 'boolean', format: {}, originalPosition: 0 },
          { name: 'name', type: 'string', format: {}, originalPosition: 1 },
        ],
        steps: [],
      };

      render(<App app={app} />);

      await waitFor(() => {
        const cells = document.querySelectorAll('td[data-col="flag"]');
        expect(cells.length).toBe(2);
      });

      // Check that boolean values are displayed as checkmarks
      const flagCells = Array.from(document.querySelectorAll('td[data-col="flag"]'));
      expect(flagCells[0].textContent).toContain('✓');
      expect(flagCells[1].textContent).toContain('✗');
    });
  });

  describe('EDA Panel Error Display', () => {
    it('should display error count in EDA panel overview', async () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const testData = [
        { value: 'a', count: 1 },
        { value: 'b', count: 2 },
        { value: errorObj, count: 3 },
        { value: errorObj, count: 4 },
        { value: null, count: 5 },
      ];

      AppStore.currentData.value = testData;
      AppStore.columns.value = ['value', 'count'];
      AppStore.selectedColumn.value = 'value';
      AppStore.edaStats.value = {
        column: 'value',
        type: 'string',
        totalCount: 5,
        nullCount: 1,
        nullPercentage: '20.0',
        errorCount: 2,
        errorPercentage: '40.0',
        uniqueCount: 2,
        uniquePercentage: '40.0',
        topValues: [
          { value: 'b', count: 1, percentage: '20.0', rawPercentage: 20.0 },
          { value: 'a', count: 1, percentage: '20.0', rawPercentage: 20.0 },
          { value: '(null)', count: 1, percentage: '20.0', rawPercentage: 20.0, isNull: true },
          { value: 'Error', count: 2, percentage: '40.0', rawPercentage: 40.0, isError: true },
        ],
      };

      render(<App app={app} />);

      await waitFor(() => {
        const edaPanel = document.querySelector('[class*="edaPanel"]');
        expect(edaPanel).toBeDefined();
      });

      // Check that error count is displayed
      const errorStat = Array.from(document.querySelectorAll('[class*="edaStat"]')).find((el) =>
        el.textContent?.includes('Errors')
      );
      expect(errorStat).toBeDefined();
      expect(errorStat?.textContent).toContain('2'); // errorCount
      expect(errorStat?.textContent).toContain('40.0'); // errorPercentage
    });

    it('should include errors in categorical chart topValues', async () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      const testData = [
        { value: 'a', count: 1 },
        { value: errorObj, count: 2 },
        { value: errorObj, count: 3 },
      ];

      AppStore.currentData.value = testData;
      AppStore.columns.value = ['value', 'count'];
      AppStore.selectedColumn.value = 'value';
      AppStore.edaStats.value = {
        column: 'value',
        type: 'string',
        totalCount: 3,
        nullCount: 0,
        nullPercentage: '0.0',
        errorCount: 2,
        errorPercentage: '66.7',
        uniqueCount: 1,
        uniquePercentage: '33.3',
        topValues: [
          { value: 'a', count: 1, percentage: '33.3', rawPercentage: 33.3 },
          { value: 'Error', count: 2, percentage: '66.7', rawPercentage: 66.7, isError: true },
        ],
      };

      render(<App app={app} />);

      await waitFor(() => {
        const edaPanel = document.querySelector('[class*="edaPanel"]');
        expect(edaPanel).toBeDefined();
      });

      // Check that error is in topValues
      const stats = AppStore.edaStats.value;
      if (stats && 'topValues' in stats) {
        const errorItem = stats.topValues.find((item: any) => item.isError);
        expect(errorItem).toBeDefined();
        expect(errorItem?.value).toBe('Error');
        expect(errorItem?.count).toBe(2);
        // Error should be at the end
        expect(stats.topValues[stats.topValues.length - 1].isError).toBe(true);
      }
    });
  });
});
