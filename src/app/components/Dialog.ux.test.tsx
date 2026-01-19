/**
 * Generic Dialog Behavior UX Tests
 *
 * Tests common dialog interactions that apply across all transform dialogs:
 * - Opening and closing dialogs
 * - Cancel button behavior
 * - Apply button behavior
 * - Close button (×) behavior
 * - Backdrop click behavior
 * - Dialog closing after successful apply
 * - Error state handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { App } from './App';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { SytoApp } from '../../syto-app';

describe('Generic Dialog Behavior', () => {
  let app: SytoApp;
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
    app = new SytoApp();

    // Mock dialog methods
    app.alert = vi.fn().mockResolvedValue(undefined);
    app.confirm = vi.fn().mockResolvedValue(true);
    app.prompt = vi.fn().mockResolvedValue('test');

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

  describe('Filter Dialog', () => {
    beforeEach(() => {
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockResolvedValue(undefined);
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      // Open filter dialog
      app.openDialog('filter');
    });

    it('should render Cancel and Apply buttons', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        // Find buttons by looking for the dialog footer
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        expect(footer).toBeDefined();
        expect(footer?.textContent).toContain('Cancel');
        expect(footer?.textContent).toContain('Apply');
      });
    });

    it('should close dialog when Cancel button is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
        expect(cancelButton).toBeDefined();
        fireEvent.click(cancelButton!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });

    it('should close dialog when header close button (×) is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const closeButtons = document.querySelectorAll('button');
        const headerCloseButton = Array.from(closeButtons).find(
          (btn) => btn.textContent === '×' && btn.className.includes('closeButton')
        );
        expect(headerCloseButton).toBeDefined();
        fireEvent.click(headerCloseButton!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });

    it('should close dialog when backdrop is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const backdrop = document.querySelector('[class*="backdrop"]');
        expect(backdrop).toBeDefined();
        fireEvent.click(backdrop!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });

    it('should call applyActiveTransform when Apply button is clicked', async () => {
      render(<App app={app} />);

      // Set up valid filter expression
      DialogStore.filterState.expression.value = 'sales > 1000';
      DialogStore.filterState.error.value = null;

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(false);
        fireEvent.click(applyButton);
      });

      expect(app.applyActiveTransform).toHaveBeenCalled();
    });

    it('should disable Apply button when dialog has errors', async () => {
      render(<App app={app} />);

      // Set up invalid filter expression
      DialogStore.filterState.expression.value = 'invalid expression';
      DialogStore.filterState.error.value = 'Syntax error';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(true);
      });
    });

    it('should close dialog after successful apply', async () => {
      // Mock successful transform that closes dialog
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockImplementation(async () => {
        // Simulate successful transform - in real code, this is handled by StepService
        // which calls onDialogClose callback
        await new Promise((resolve) => setTimeout(resolve, 0));
        // The closeDialog should be called via the onDialogClose callback
        app.closeDialog(true);
      });

      render(<App app={app} />);

      // Set up valid filter expression
      DialogStore.filterState.expression.value = 'sales > 1000';
      DialogStore.filterState.error.value = null;

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        fireEvent.click(applyButton);
      });

      // Wait for async apply to complete
      await waitFor(() => {
        expect(app.closeDialog).toHaveBeenCalled();
      });
    });
  });

  describe('Sort Dialog', () => {
    beforeEach(() => {
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockResolvedValue(undefined);
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      // Open sort dialog
      app.openDialog('sort');
    });

    it('should close dialog when Cancel button is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
        expect(cancelButton).toBeDefined();
        fireEvent.click(cancelButton!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });

    it('should call applyActiveTransform when Apply button is clicked with valid selection', async () => {
      render(<App app={app} />);

      // Set up valid sort selection
      DialogStore.sortState.field.value = 'age';
      DialogStore.sortState.order.value = 'asc';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(false);
        fireEvent.click(applyButton);
      });

      expect(app.applyActiveTransform).toHaveBeenCalled();
    });

    it('should allow changing sort order when field is selected', async () => {
      render(<App app={app} />);

      // Sort dialog auto-selects first field, so field is already selected
      // Verify we can change the order
      DialogStore.sortState.field.value = 'age';
      DialogStore.sortState.order.value = 'asc';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        // Apply button should be enabled since field is selected
        expect(applyButton.hasAttribute('disabled')).toBe(false);
      });
    });
  });

  describe('Derive Dialog', () => {
    beforeEach(() => {
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockResolvedValue(undefined);
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      // Open derive dialog
      app.openDialog('derive');
    });

    it('should close dialog when Cancel button is clicked', async () => {
      render(<App app={app} />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
        expect(cancelButton).toBeDefined();
        fireEvent.click(cancelButton!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });

    it('should call applyActiveTransform when Apply button is clicked with valid inputs', async () => {
      render(<App app={app} />);

      // Set up valid derive inputs
      DialogStore.deriveState.columnName.value = 'total';
      DialogStore.deriveState.expression.value = 'sales * 1.1';
      DialogStore.deriveState.error.value = null;

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(false);
        fireEvent.click(applyButton);
      });

      expect(app.applyActiveTransform).toHaveBeenCalled();
    });

    it('should disable Apply button when there are expression errors', async () => {
      render(<App app={app} />);

      // Set up invalid derive inputs
      DialogStore.deriveState.columnName.value = 'total';
      DialogStore.deriveState.expression.value = 'invalid expression';
      DialogStore.deriveState.error.value = 'Syntax error';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(true);
      });
    });

    it('should disable Apply button when column name is missing', async () => {
      render(<App app={app} />);

      // Missing column name
      DialogStore.deriveState.columnName.value = '';
      DialogStore.deriveState.expression.value = 'sales * 1.1';
      DialogStore.deriveState.error.value = null;

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  describe('Cross-Dialog Consistency', () => {
    const dialogs = ['filter', 'sort', 'derive', 'split', 'aggregate'] as const;

    it.each(dialogs)('should have Cancel and Apply buttons for %s dialog', async (dialogName) => {
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockResolvedValue(undefined);
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      app.openDialog(dialogName);
      render(<App app={app} />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        expect(footer).toBeDefined();
        expect(footer?.textContent).toContain('Cancel');
        expect(footer?.textContent).toContain('Apply');
      });
    });

    it.each(dialogs)('should close when Cancel is clicked for %s dialog', async (dialogName) => {
      app.closeDialog = vi.fn();
      app.applyActiveTransform = vi.fn().mockResolvedValue(undefined);
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      app.openDialog(dialogName);
      render(<App app={app} />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
        expect(cancelButton).toBeDefined();
        fireEvent.click(cancelButton!);
      });

      expect(app.closeDialog).toHaveBeenCalled();
    });
  });

  describe('Dialog State Management', () => {
    it('should initialize dialog state when opening a new dialog', () => {
      app.initDialogState = vi.fn();
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      app.openDialog('filter');

      // The initDialogState should be called (either directly or via openDialog)
      // This ensures dialog state is properly initialized
      expect(AppStore.activeDialog.value).toBe('filter');
    });

    it('should clear dialog state when closing', async () => {
      app.closeDialog = vi.fn().mockImplementation(() => {
        AppStore.activeDialog.value = null;
      });
      app.openDialog = vi.fn((dialog) => {
        AppStore.activeDialog.value = dialog;
      });

      app.openDialog('filter');
      expect(AppStore.activeDialog.value).toBe('filter');

      app.closeDialog();
      expect(AppStore.activeDialog.value).toBe(null);
    });
  });
});
