/**
 * DateDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { DateDialog, DateOperation } from './DateDialog';

describe('DateDialog', () => {
  const testColumns = ['Order Date', 'Ship Date'];

  it('renders with column selection if columns exist', () => {
    const column = signal('');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year']);
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    expect(screen.getByText('Order Date')).toBeDefined();
    expect(screen.getByText('Ship Date')).toBeDefined();
    expect(screen.queryByText('Operation:')).toBeNull(); // Nothing selected yet
  });

  it('shows operation options when column selected', () => {
    const column = signal('Order Date');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year']);
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    expect(screen.getByText('Operation:')).toBeDefined();
    expect(screen.getByText('Extract Part')).toBeDefined();
  });

  it('toggles operation mode', () => {
    const column = signal('Order Date');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year']);
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    fireEvent.click(screen.getByText('Truncate'));
    expect(operation.value).toBe('truncate');
    expect(screen.getByText('Truncate to:')).toBeDefined();
  });

  it('handles multi-selection with Meta key', () => {
    const column = signal('Order Date');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year']);
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    // Initial state: year selected
    expect(extractParts.value).toEqual(['year']);

    // Click Month with Meta key -> add
    fireEvent.click(screen.getByText('Month').closest('button')!, { metaKey: true });
    expect(extractParts.value).toEqual(['year', 'month']);

    // Click Month with Meta key -> remove
    fireEvent.click(screen.getByText('Month').closest('button')!, { metaKey: true });
    expect(extractParts.value).toEqual(['year']);
  });

  it('handles single selection without Meta key', () => {
    const column = signal('Order Date');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year', 'month']); // multi initially
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    // Click Day (no meta) -> should replace selection
    fireEvent.click(screen.getByText('Day').closest('button')!);
    expect(extractParts.value).toEqual(['day']);
  });

  it('displays correct placeholder logic', () => {
    const column = signal('Order Date');
    const operation = signal<DateOperation>('extract');
    const extractParts = signal(['year']);
    const truncateUnits = signal(['month']);
    const outputColumn = signal('');
    const error = signal(null);

    const { rerender } = render(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );

    // Single extract
    const input = screen.getByPlaceholderText('Order Date_year');
    expect(input).toBeDefined();

    // Multi extract
    extractParts.value = ['year', 'month'];
    rerender(
      <DateDialog
        dateColumns={testColumns}
        column={column}
        operation={operation}
        extractParts={extractParts}
        truncateUnits={truncateUnits}
        outputColumn={outputColumn}
        error={error}
      />
    );
    expect(screen.getByText('(Multiple columns)', { exact: false })).toBeDefined();
  });
});
