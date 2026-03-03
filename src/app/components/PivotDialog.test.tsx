/**
 * PivotDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { PivotDialog } from './PivotDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as PivotHandlers from '../handlers/transform/pivot-handlers';

describe('PivotDialog', () => {
  const testColumns = ['Year', 'Region', 'Sales', 'Category'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.pivotState.rowColumns.value = [];
    DialogStore.pivotState.columnColumn.value = '';
    DialogStore.pivotState.valueColumn.value = '';
    DialogStore.pivotState.aggregation.value = 'sum';
    DialogStore.pivotState.uniqueValueCount.value = 0;
    DialogStore.pivotState.options.value = { sort: true, limit: null };
    DialogStore.pivotState.isPreviewing.value = false;
    AppStore.columns.value = testColumns;
  });

  it('renders with default values', () => {
    renderWithI18n(<PivotDialog />);

    expect(screen.getByText('How Pivot works')).toBeDefined();
    expect(screen.getAllByText('Rows')[0]).toBeDefined();
    expect(screen.getAllByText('Columns')[0]).toBeDefined();
    expect(screen.getAllByText('Values')[0]).toBeDefined();
  });

  it('toggles row column selection', () => {
    renderWithI18n(<PivotDialog />);

    // Region appears in chip and select options. Find the one in the button (chip)
    const regionTexts = screen.getAllByText('Region');
    const chipText = regionTexts.find((el) => el.closest('button'));
    fireEvent.click(chipText!.closest('button')!);

    expect(DialogStore.pivotState.rowColumns.value).toContain('Region');

    // Click again to toggle off
    fireEvent.click(chipText!.closest('button')!);
    expect(DialogStore.pivotState.rowColumns.value).not.toContain('Region');
  });

  it('updates column options', () => {
    renderWithI18n(<PivotDialog />);

    // Select Columns field (first select is for Columns)
    const selects = screen.getAllByRole('combobox');
    const colSelect = selects[0];
    fireEvent.change(colSelect, { target: { value: 'Category' } });
    expect(DialogStore.pivotState.columnColumn.value).toBe('Category');

    // Select Values field (second select is for Values)
    const valSelect = selects[1];
    fireEvent.change(valSelect, { target: { value: 'Sales' } });
    expect(DialogStore.pivotState.valueColumn.value).toBe('Sales');
  });

  it('shows summary when configured', () => {
    DialogStore.pivotState.rowColumns.value = ['Year'];
    DialogStore.pivotState.columnColumn.value = 'Region';
    DialogStore.pivotState.valueColumn.value = 'Sales';
    DialogStore.pivotState.uniqueValueCount.value = 5;
    renderWithI18n(<PivotDialog />);

    expect(screen.getByText('Result:')).toBeDefined();

    // Find the element containing "unique values" text and check it contains "5"
    const uniqueHelper = screen.getByText(/unique values/);
    expect(uniqueHelper.textContent).toContain('5 unique values');
  });

  it('calls preview handler when clicked', () => {
    vi.spyOn(PivotHandlers, 'previewPivot');
    DialogStore.pivotState.rowColumns.value = ['Year'];
    DialogStore.pivotState.columnColumn.value = 'Region';
    DialogStore.pivotState.valueColumn.value = 'Sales';

    renderWithI18n(<PivotDialog />);

    fireEvent.click(screen.getByText('Preview Result'));
    expect(PivotHandlers.previewPivot).toHaveBeenCalled();
  });
});
