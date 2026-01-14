/**
 * SortDialog Component Tests
 *
 * Verifies the Sort Dialog TSX component works correctly with @testing-library/preact
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SortDialog, createSortDialogState } from './SortDialog';

describe('SortDialog', () => {
  const testColumns = ['name', 'age', 'city'];

  it('renders all column chips', () => {
    const state = createSortDialogState();
    render(<SortDialog columns={testColumns} field={state.field} order={state.order} />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column when clicked', () => {
    const state = createSortDialogState();
    render(<SortDialog columns={testColumns} field={state.field} order={state.order} />);

    const ageButton = screen.getByText('age').closest('button');
    expect(ageButton).toBeDefined();

    fireEvent.click(ageButton!);
    expect(state.field.value).toBe('age');
  });

  it('highlights the selected column', () => {
    const state = createSortDialogState('name');
    render(<SortDialog columns={testColumns} field={state.field} order={state.order} />);

    const nameButton = screen.getByText('name').closest('button');
    expect(nameButton?.classList.contains('active')).toBe(true);
  });

  it('toggles between ascending and descending order', () => {
    const state = createSortDialogState('name', 'asc');
    render(<SortDialog columns={testColumns} field={state.field} order={state.order} />);

    // Find the descending radio button
    const descendingRadio = screen.getByText('Descending')
      .previousElementSibling as HTMLInputElement;
    expect(descendingRadio).toBeDefined();

    fireEvent.click(descendingRadio);
    expect(state.order.value).toBe('desc');
  });

  it('shows ascending as default checked', () => {
    const state = createSortDialogState('name', 'asc');
    render(<SortDialog columns={testColumns} field={state.field} order={state.order} />);

    const ascendingRadio = screen.getByText('Ascending').previousElementSibling as HTMLInputElement;
    expect(ascendingRadio.checked).toBe(true);
  });
});
