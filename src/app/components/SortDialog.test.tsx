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
    // Reset store state before each test
    DialogStore.sortState.field.value = '';
    DialogStore.sortState.order.value = 'asc';
    AppStore.columns.value = testColumns;
  });

  it('renders all column chips', () => {
    render(<SortDialog />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column when clicked', () => {
    render(<SortDialog />);

    const ageButton = screen.getByText('age').closest('button');
    expect(ageButton).toBeDefined();

    fireEvent.click(ageButton!);
    expect(DialogStore.sortState.field.value).toBe('age');
  });

  it('highlights the selected column', () => {
    DialogStore.sortState.field.value = 'name';
    render(<SortDialog />);

    const nameButton = screen.getByText('name').closest('button');
    expect(nameButton?.className).toContain('active');
  });

  it('toggles between ascending and descending order', () => {
    DialogStore.sortState.field.value = 'name';
    render(<SortDialog />);

    // Find the descending radio button
    const descendingRadio = screen.getByText('Descending')
      .previousElementSibling as HTMLInputElement;
    expect(descendingRadio).toBeDefined();

    fireEvent.click(descendingRadio);
    expect(DialogStore.sortState.order.value).toBe('desc');
  });

  it('shows ascending as default checked', () => {
    DialogStore.sortState.field.value = 'name';
    render(<SortDialog />);

    const ascendingRadio = screen.getByText('Ascending').previousElementSibling as HTMLInputElement;
    expect(ascendingRadio.checked).toBe(true);
  });
});
