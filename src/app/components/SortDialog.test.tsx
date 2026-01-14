/**
 * SortDialog Component Tests
 *
 * Verifies the Sort Dialog TSX component works correctly with @testing-library/preact
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { SortDialog } from './SortDialog';

describe('SortDialog', () => {
  const testColumns = ['name', 'age', 'city'];

  it('renders all column chips', () => {
    const field = signal('');
    const order = signal<'asc' | 'desc'>('asc');
    render(<SortDialog columns={testColumns} field={field} order={order} />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column when clicked', () => {
    const field = signal('');
    const order = signal<'asc' | 'desc'>('asc');
    render(<SortDialog columns={testColumns} field={field} order={order} />);

    const ageButton = screen.getByText('age').closest('button');
    expect(ageButton).toBeDefined();

    fireEvent.click(ageButton!);
    expect(field.value).toBe('age');
  });

  it('highlights the selected column', () => {
    const field = signal('name');
    const order = signal<'asc' | 'desc'>('asc');
    render(<SortDialog columns={testColumns} field={field} order={order} />);

    const nameButton = screen.getByText('name').closest('button');
    expect(nameButton?.classList.contains('active')).toBe(true);
  });

  it('toggles between ascending and descending order', () => {
    const field = signal('name');
    const order = signal<'asc' | 'desc'>('asc');
    render(<SortDialog columns={testColumns} field={field} order={order} />);

    // Find the descending radio button
    const descendingRadio = screen.getByText('Descending')
      .previousElementSibling as HTMLInputElement;
    expect(descendingRadio).toBeDefined();

    fireEvent.click(descendingRadio);
    expect(order.value).toBe('desc');
  });

  it('shows ascending as default checked', () => {
    const field = signal('name');
    const order = signal<'asc' | 'desc'>('asc');
    render(<SortDialog columns={testColumns} field={field} order={order} />);

    const ascendingRadio = screen.getByText('Ascending').previousElementSibling as HTMLInputElement;
    expect(ascendingRadio.checked).toBe(true);
  });
});
