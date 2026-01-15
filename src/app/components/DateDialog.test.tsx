/**
 * DateDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { DateDialog } from './DateDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as DateHandlers from '../handlers/date-handlers';

describe('DateDialog', () => {
  const testColumns = ['Order Date', 'Ship Date'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.dateState.column.value = '';
    DialogStore.dateState.operation.value = 'extract';
    DialogStore.dateState.extractParts.value = ['year'];
    DialogStore.dateState.truncateUnits.value = ['month'];
    DialogStore.dateState.outputColumn.value = '';
    DialogStore.dateState.error.value = null;
    AppStore.columns.value = testColumns;
    AppStore.currentData.value = [{ 'Order Date': '2024-01-01', 'Ship Date': '2024-01-15' }];

    // Mock getDateColumns to return test columns
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
  });

  it('renders with column selection if columns exist', () => {
    render(<DateDialog />);

    expect(screen.getByText('Order Date')).toBeDefined();
    expect(screen.getByText('Ship Date')).toBeDefined();
  });

  it('shows operation options when column selected', () => {
    DialogStore.dateState.column.value = 'Order Date';
    render(<DateDialog />);

    expect(screen.getByText('Operation:')).toBeDefined();
    expect(screen.getByText('Extract Part')).toBeDefined();
  });

  it('toggles operation mode', () => {
    DialogStore.dateState.column.value = 'Order Date';
    render(<DateDialog />);

    const truncateButton = screen.getByText('Truncate');
    fireEvent.click(truncateButton);
    expect(DialogStore.dateState.operation.value).toBe('truncate');
  });

  it('handles multi-selection with Meta key', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year'];
    render(<DateDialog />);

    // Initial state: year selected
    expect(DialogStore.dateState.extractParts.value).toEqual(['year']);

    // Click Month with Meta key -> add
    const monthButton = screen.getByText('Month').closest('button');
    fireEvent.click(monthButton!, { metaKey: true });
    expect(DialogStore.dateState.extractParts.value).toEqual(['year', 'month']);

    // Click Month with Meta key -> remove
    fireEvent.click(monthButton!, { metaKey: true });
    expect(DialogStore.dateState.extractParts.value).toEqual(['year']);
  });

  it('handles single selection without Meta key', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year', 'month'];
    render(<DateDialog />);

    // Click Day (no meta) -> should replace selection
    const dayButton = screen.getByText('Day').closest('button');
    fireEvent.click(dayButton!);
    expect(DialogStore.dateState.extractParts.value).toEqual(['day']);
  });

  it('displays correct placeholder logic', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year'];
    render(<DateDialog />);

    // Single extract
    const input = screen.getByPlaceholderText('Order Date_year');
    expect(input).toBeDefined();
  });
});
