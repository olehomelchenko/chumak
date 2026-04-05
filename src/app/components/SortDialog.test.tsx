/**
 * SortDialog Component Tests
 *
 * Tests the Sort Dialog with local state (useDialogState pattern).
 * State is initialized from AppStore context, not set directly on DialogStore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { SortDialog } from './SortDialog';
import { AppStore } from '../stores/AppStore';
import { renderWithI18n } from '../test-utils';

describe('SortDialog', () => {
  const testColumns = ['name', 'age', 'city'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
  });

  it('renders column options in the select dropdown', () => {
    renderWithI18n(<SortDialog />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column via the dropdown', () => {
    renderWithI18n(<SortDialog />);

    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'age' } });

    expect(select.value).toBe('age');
  });

  it('initializes with selected columns', () => {
    AppStore.selectedColumns.value = ['name'];
    renderWithI18n(<SortDialog />);

    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(select.value).toBe('name');
  });

  it('toggles between ascending and descending order', () => {
    AppStore.selectedColumns.value = ['name'];
    renderWithI18n(<SortDialog />);

    const toggleButton = screen.getByTitle('Ascending');
    fireEvent.click(toggleButton);

    expect(screen.getByTitle('Descending')).toBeDefined();
  });

  it('shows ascending as default', () => {
    AppStore.selectedColumns.value = ['name'];
    renderWithI18n(<SortDialog />);

    const toggleButton = screen.getByTitle('Ascending');
    expect(toggleButton.textContent).toContain('Asc');
  });

  it('shows add sort level button', () => {
    renderWithI18n(<SortDialog />);

    expect(
      screen.getByText((_content, element) => {
        return element?.tagName === 'BUTTON' && element?.textContent === '+ Add sort level';
      })
    ).toBeDefined();
  });

  it('adds a second sort level', () => {
    renderWithI18n(<SortDialog />);

    fireEvent.click(
      screen.getByText((_content, element) => {
        return element?.tagName === 'BUTTON' && element?.textContent === '+ Add sort level';
      })
    );

    // Should now have 2 select dropdowns
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  it('shows remove button when multiple levels exist', () => {
    renderWithI18n(<SortDialog />);

    // Add a second level
    fireEvent.click(
      screen.getByText((_content, element) => {
        return element?.tagName === 'BUTTON' && element?.textContent === '+ Add sort level';
      })
    );

    const removeButtons = screen.getAllByTitle('Remove sort level');
    expect(removeButtons).toHaveLength(2);
  });

  it('shows help text when multiple levels exist', () => {
    renderWithI18n(<SortDialog />);

    // Add a second level
    fireEvent.click(
      screen.getByText((_content, element) => {
        return element?.tagName === 'BUTTON' && element?.textContent === '+ Add sort level';
      })
    );

    expect(
      screen.getByText(
        'Rows are sorted by the first column, then ties are broken by subsequent columns.'
      )
    ).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [
        {
          sort: [
            { field: 'age', order: 'desc' },
            { field: 'name', order: 'asc' },
          ],
        },
      ],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<SortDialog />);

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect((selects[0] as HTMLSelectElement).value).toBe('age');
    expect((selects[1] as HTMLSelectElement).value).toBe('name');
    expect(screen.getByTitle('Descending')).toBeDefined();
  });
});
