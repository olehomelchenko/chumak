/**
 * SortDialog Component Tests
 *
 * Verifies the Sort Dialog TSX component works correctly with @testing-library/preact
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SortDialog } from './SortDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('SortDialog', () => {
  const testColumns = ['name', 'age', 'city'];

  beforeEach(() => {
    DialogStore.sortState.fields.value = [{ field: '', order: 'asc' }];
    AppStore.columns.value = testColumns;
  });

  it('renders column options in the select dropdown', () => {
    render(<SortDialog />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column via the dropdown', () => {
    render(<SortDialog />);

    const select = screen.getByDisplayValue('Select column…') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'age' } });

    expect(DialogStore.sortState.fields.value[0].field).toBe('age');
  });

  it('toggles between ascending and descending order', () => {
    DialogStore.sortState.fields.value = [{ field: 'name', order: 'asc' }];
    render(<SortDialog />);

    const toggleButton = screen.getByTitle('Ascending');
    fireEvent.click(toggleButton);

    expect(DialogStore.sortState.fields.value[0].order).toBe('desc');
  });

  it('shows ascending as default', () => {
    DialogStore.sortState.fields.value = [{ field: 'name', order: 'asc' }];
    render(<SortDialog />);

    const toggleButton = screen.getByTitle('Ascending');
    expect(toggleButton.textContent).toContain('Asc');
  });

  it('shows add sort level button', () => {
    render(<SortDialog />);

    expect(screen.getByText('+ Add sort level')).toBeDefined();
  });

  it('adds a second sort level', () => {
    DialogStore.sortState.fields.value = [{ field: 'name', order: 'asc' }];
    render(<SortDialog />);

    fireEvent.click(screen.getByText('+ Add sort level'));

    expect(DialogStore.sortState.fields.value).toHaveLength(2);
    expect(DialogStore.sortState.fields.value[1]).toEqual({ field: '', order: 'asc' });
  });

  it('shows remove button when multiple levels exist', () => {
    DialogStore.sortState.fields.value = [
      { field: 'name', order: 'asc' },
      { field: 'age', order: 'desc' },
    ];
    render(<SortDialog />);

    const removeButtons = screen.getAllByTitle('Remove sort level');
    expect(removeButtons).toHaveLength(2);
  });

  it('shows help text when multiple levels exist', () => {
    DialogStore.sortState.fields.value = [
      { field: 'name', order: 'asc' },
      { field: 'age', order: 'desc' },
    ];
    render(<SortDialog />);

    expect(screen.getByText(/ties are broken by subsequent/)).toBeDefined();
  });
});
