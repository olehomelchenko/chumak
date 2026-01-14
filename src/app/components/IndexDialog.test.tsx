/**
 * IndexDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { IndexDialog } from './IndexDialog';

describe('IndexDialog', () => {
  it('renders with default values', () => {
    const columnName = signal('row_index');
    const startFrom = signal(1);

    render(<IndexDialog columnName={columnName} startFrom={startFrom} rowCount={100} />);

    expect(screen.getByPlaceholderText('row_index')).toBeDefined();
    expect(screen.getByPlaceholderText('1')).toBeDefined();
  });

  it('updates column name when typed', () => {
    const columnName = signal('');
    const startFrom = signal(1);

    render(<IndexDialog columnName={columnName} startFrom={startFrom} rowCount={100} />);

    const input = screen.getByPlaceholderText('row_index') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'my_index' } });

    expect(columnName.value).toBe('my_index');
  });

  it('updates start value when changed', () => {
    const columnName = signal('row_index');
    const startFrom = signal(1);

    render(<IndexDialog columnName={columnName} startFrom={startFrom} rowCount={100} />);

    const input = screen.getByPlaceholderText('1') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '10' } });

    expect(startFrom.value).toBe(10);
  });

  it('shows computed end value in preview', () => {
    const columnName = signal('idx');
    const startFrom = signal(0);

    render(<IndexDialog columnName={columnName} startFrom={startFrom} rowCount={50} />);

    // Preview should show "0 to 49" for 50 rows starting at 0
    expect(screen.getByText('49')).toBeDefined();
  });

  it('shows column name in preview', () => {
    const columnName = signal('my_col');
    const startFrom = signal(1);

    render(<IndexDialog columnName={columnName} startFrom={startFrom} rowCount={10} />);

    expect(screen.getByText('my_col')).toBeDefined();
  });
});
