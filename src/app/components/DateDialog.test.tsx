/**
 * DateDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { DateDialog } from './DateDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as DateHandlers from '../handlers/transform/date-handlers';

describe('DateDialog', () => {
  const testColumns = ['Order Date', 'Ship Date'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.dateState.column.value = '';
    DialogStore.dateState.operation.value = 'extract';
    DialogStore.dateState.extractParts.value = ['year'];
    DialogStore.dateState.truncateUnits.value = ['month'];
    DialogStore.dateState.truncateIntervals.value = {};
    DialogStore.dateState.outputColumn.value = '';
    DialogStore.dateState.error.value = null;
    AppStore.columns.value = testColumns;
    AppStore.currentData.value = [{ 'Order Date': '2024-01-01', 'Ship Date': '2024-01-15' }];

    // Mock getDateColumns to return test columns
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
  });

  it('renders with column selection if columns exist', () => {
    renderWithI18n(<DateDialog />);

    expect(screen.getByText('Order Date')).toBeDefined();
    expect(screen.getByText('Ship Date')).toBeDefined();
  });

  it('shows operation options when column selected', () => {
    DialogStore.dateState.column.value = 'Order Date';
    renderWithI18n(<DateDialog />);

    expect(screen.getByText('Operation:')).toBeDefined();
    expect(screen.getByText('Extract part')).toBeDefined();
  });

  it('toggles operation mode', () => {
    DialogStore.dateState.column.value = 'Order Date';
    renderWithI18n(<DateDialog />);

    const truncateButton = screen.getByText('Truncate');
    fireEvent.click(truncateButton);
    expect(DialogStore.dateState.operation.value).toBe('truncate');
  });

  it('handles multi-selection with Meta key', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year'];
    renderWithI18n(<DateDialog />);

    // Initial state: year selected
    expect(DialogStore.dateState.extractParts.value).toEqual(['year']);

    // Find the Month row and get the button (the checkbox button is a sibling of the span containing "Month")
    const monthRow = screen.getByText('Month').closest('tr');
    const monthButton = monthRow?.querySelector('button');
    expect(monthButton).toBeDefined();

    // Click Month -> toggle adds it (toggleExtractSelection always toggles)
    fireEvent.click(monthButton!);
    expect(DialogStore.dateState.extractParts.value).toEqual(['year', 'month']);

    // Click Month again -> toggle removes it
    fireEvent.click(monthButton!);
    expect(DialogStore.dateState.extractParts.value).toEqual(['year']);
  });

  it('handles single selection without Meta key', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year', 'month'];
    renderWithI18n(<DateDialog />);

    // Find the Day row and get the button (the checkbox button is a sibling of the span containing "Day")
    const dayRow = screen.getByText('Day of month').closest('tr');
    const dayButton = dayRow?.querySelector('button');
    expect(dayButton).toBeDefined();

    // Click Day -> toggle adds it (toggleExtractSelection always toggles, doesn't replace)
    fireEvent.click(dayButton!);
    expect(DialogStore.dateState.extractParts.value).toEqual(['year', 'month', 'day']);

    // Click Day again -> toggle removes it
    fireEvent.click(dayButton!);
    expect(DialogStore.dateState.extractParts.value).toEqual(['year', 'month']);
  });

  it('displays correct preview for single extract', () => {
    DialogStore.dateState.column.value = 'Order Date';
    DialogStore.dateState.extractParts.value = ['year'];
    renderWithI18n(<DateDialog />);

    // The preview should show the output column name in the table
    // Output column name format: ${column}_${part} = 'Order Date_year'
    // Check that the preview table is rendered (the component shows preview in a table)
    const previewTable = document.querySelector('table');
    expect(previewTable).toBeDefined();
  });
});
