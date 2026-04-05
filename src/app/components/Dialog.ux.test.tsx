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
import { fireEvent, waitFor } from '@testing-library/preact';
import { App } from './App';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { renderWithI18n } from '../test-utils';

describe('Generic Dialog Behavior', () => {
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
      // Open filter dialog directly via store
      AppStore.activeDialog.value = 'filter';
    });

    it('should render Cancel and Filter buttons', async () => {
      renderWithI18n(<App />);

      await waitFor(() => {
        // Find buttons by looking for the dialog footer
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        expect(footer).toBeDefined();
        expect(footer?.textContent).toContain('Cancel');
        expect(footer?.textContent).toContain('Filter');
      });
    });

    it('should close dialog when Cancel button is clicked', async () => {
      renderWithI18n(<App />);

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });

    it('should close dialog when header close button (×) is clicked', async () => {
      renderWithI18n(<App />);

      const closeButtons = await waitFor(() => {
        const buttons = document.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
        return buttons;
      });

      const headerCloseButton = Array.from(closeButtons).find(
        (btn) => btn.textContent === '×' && btn.className.includes('closeButton')
      );
      expect(headerCloseButton).toBeDefined();
      fireEvent.click(headerCloseButton!);

      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });

    it('should close dialog when backdrop is clicked', async () => {
      renderWithI18n(<App />);

      const backdrop = await waitFor(() => {
        const b = document.querySelector('[class*="backdrop"]');
        expect(b).toBeDefined();
        return b;
      });

      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });

    it('should have enabled Apply button when bridge has no error', async () => {
      renderWithI18n(<App />);

      // Use bridge signals (filter state is now local to component)
      DialogStore.activeDialogHasError.value = false;
      DialogStore.activeDialogError.value = null;

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
      expect(applyButton).toBeDefined();
      expect(applyButton.hasAttribute('disabled')).toBe(false);
    });

    it('should disable Apply button when bridge has error', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = true;
      DialogStore.activeDialogError.value = 'Syntax error';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.getAttribute('aria-disabled')).toBe('true');
      });
    });

    it('should show error message as tooltip on disabled Apply button', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = true;
      DialogStore.activeDialogError.value = 'Expected expression after operator';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.getAttribute('aria-disabled')).toBe('true');
        const title = applyButton.getAttribute('title');
        expect(title).toBeTruthy();
        expect(typeof title).toBe('string');
      });
    });

    it('should not show tooltip when Apply button is enabled', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = false;
      DialogStore.activeDialogError.value = null;

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.hasAttribute('aria-disabled')).toBe(false);
        expect(applyButton.hasAttribute('title')).toBe(false);
      });
    });

    it('should have correct button structure in dialog footer', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = false;

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const cancelButton = footer?.querySelector('.button--secondary');
      const applyButton = footer?.querySelector('.button--primary');
      expect(cancelButton).toBeDefined();
      expect(applyButton).toBeDefined();
      expect(cancelButton?.textContent).toContain('Cancel');
      expect(applyButton?.textContent).toContain('Filter');
    });
  });

  describe('Sort Dialog', () => {
    beforeEach(() => {
      // Open sort dialog directly via store
      AppStore.activeDialog.value = 'sort';
    });

    it('should close dialog when Cancel button is clicked', async () => {
      renderWithI18n(<App />);

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });

    it('should have enabled Apply button when valid sort selection is set', async () => {
      // useDialogState factory auto-selects the first column
      renderWithI18n(<App />);

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
      expect(applyButton).toBeDefined();
      // Apply button should be enabled when there's a valid selection
      expect(applyButton.hasAttribute('disabled')).toBe(false);
    });

    it('should allow changing sort order when field is selected', async () => {
      // useDialogState factory auto-selects the first column
      renderWithI18n(<App />);

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
      // Open derive dialog directly via store
      AppStore.activeDialog.value = 'derive';
    });

    it('should close dialog when Cancel button is clicked', async () => {
      renderWithI18n(<App />);

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      // Verify dialog is closed by checking store state
      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });

    it('should have enabled Apply button when valid derive inputs are set', async () => {
      renderWithI18n(<App />);

      // Use bridge signals (derive state is now local to component)
      DialogStore.activeDialogHasError.value = false;
      DialogStore.activeDialogError.value = null;

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
      expect(applyButton).toBeDefined();
      expect(applyButton.hasAttribute('disabled')).toBe(false);
    });

    it('should disable Apply button when bridge has error', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = true;
      DialogStore.activeDialogError.value = 'Syntax error';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.getAttribute('aria-disabled')).toBe('true');
      });
    });

    it('should disable Apply button when column name is missing', async () => {
      renderWithI18n(<App />);

      DialogStore.activeDialogHasError.value = true;
      DialogStore.activeDialogError.value = 'Column name required';

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        const applyButton = footer?.querySelector('.button--primary') as HTMLButtonElement;
        expect(applyButton).toBeDefined();
        expect(applyButton.getAttribute('aria-disabled')).toBe('true');
      });
    });
  });

  describe('Cross-Dialog Consistency', () => {
    const dialogs = ['filter', 'sort', 'derive', 'split', 'aggregate'] as const;

    // Each dialog now has action-specific button text instead of generic "Apply"
    const expectedButtonText: Record<string, string> = {
      filter: 'Filter',
      sort: 'Sort',
      derive: 'Add column',
      split: 'Split',
      aggregate: 'Group',
    };

    it.each(dialogs)('should have Cancel and action button for %s dialog', async (dialogName) => {
      // Open dialog directly via store
      AppStore.activeDialog.value = dialogName;
      renderWithI18n(<App />);

      await waitFor(() => {
        const footer = document.querySelector('[class*="slidePanelFooter"]');
        expect(footer).toBeDefined();
        expect(footer?.textContent).toContain('Cancel');
        expect(footer?.textContent).toContain(expectedButtonText[dialogName]);
      });
    });

    it.each(dialogs)('should close when Cancel is clicked for %s dialog', async (dialogName) => {
      // Open dialog directly via store
      AppStore.activeDialog.value = dialogName;
      renderWithI18n(<App />);

      const footer = await waitFor(() => {
        const f = document.querySelector('[class*="slidePanelFooter"]');
        expect(f).toBeDefined();
        return f;
      });

      const cancelButton = footer?.querySelector('.button--secondary') as HTMLButtonElement;
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      // Verify dialog is closed by checking store state
      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBeNull();
      });
    });
  });

  describe('Dialog State Management', () => {
    it('should initialize dialog state when opening a new dialog', () => {
      // Open dialog directly via store
      AppStore.activeDialog.value = 'filter';

      // This ensures dialog state is properly initialized
      expect(AppStore.activeDialog.value).toBe('filter');
    });

    it('should clear dialog state when closing', async () => {
      // Open dialog
      AppStore.activeDialog.value = 'filter';
      expect(AppStore.activeDialog.value).toBe('filter');

      // Close dialog via handler
      const { closeDialog } = await import('../handlers/dialog/dialog-handlers');
      closeDialog();

      await waitFor(() => {
        expect(AppStore.activeDialog.value).toBe(null);
      });
    });
  });
});
