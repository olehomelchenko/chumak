/**
 * PivotDialog Component Tests
 *
 * Tests the Pivot Dialog with local state (useDialogState pattern).
 * State is initialized from AppStore context, not set directly on DialogStore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { PivotDialog } from './PivotDialog';
import { AppStore } from '../stores/AppStore';

describe('PivotDialog', () => {
  const testColumns = ['Year', 'Region', 'Sales', 'Category'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
    AppStore.currentData.value = [
      { Year: 2020, Region: 'East', Sales: 100, Category: 'A' },
      { Year: 2020, Region: 'West', Sales: 200, Category: 'B' },
      { Year: 2021, Region: 'East', Sales: 150, Category: 'A' },
    ];
  });

  it('renders with default values', () => {
    renderWithI18n(<PivotDialog />);

    expect(screen.getByText('How pivot works')).toBeDefined();
    expect(screen.getAllByText('Rows')[0]).toBeDefined();
    expect(screen.getAllByText('Columns')[0]).toBeDefined();
    expect(screen.getAllByText('Values')[0]).toBeDefined();
  });

  it('toggles row column selection', () => {
    renderWithI18n(<PivotDialog />);

    const regionTexts = screen.getAllByText('Region');
    const chipText = regionTexts.find((el) => el.closest('button'));
    fireEvent.click(chipText!.closest('button')!);

    // Click again to toggle off
    fireEvent.click(chipText!.closest('button')!);
  });

  it('updates column options', () => {
    renderWithI18n(<PivotDialog />);

    const selects = screen.getAllByRole('combobox');
    const colSelect = selects[0];
    fireEvent.change(colSelect, { target: { value: 'Category' } });
    expect((colSelect as HTMLSelectElement).value).toBe('Category');

    const valSelect = selects[1];
    fireEvent.change(valSelect, { target: { value: 'Sales' } });
    expect((valSelect as HTMLSelectElement).value).toBe('Sales');
  });

  it('shows summary when configured', () => {
    renderWithI18n(<PivotDialog />);

    // Select columns to trigger summary
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Region' } });
    fireEvent.change(selects[1], { target: { value: 'Sales' } });

    expect(screen.getByText('Result:')).toBeDefined();
  });

  it('preview button disabled until columns selected', () => {
    renderWithI18n(<PivotDialog />);

    const previewBtn = screen.getByText('Preview result');
    expect((previewBtn as HTMLButtonElement).disabled).toBe(true);

    // Select required columns
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Region' } });
    fireEvent.change(selects[1], { target: { value: 'Sales' } });

    expect((previewBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [
        {
          pivot: {
            rows: ['Year'],
            keys: 'Region',
            values: 'Sales',
            aggregation: 'mean',
            options: { sort: false, limit: 10 },
          },
        },
      ],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<PivotDialog />);

    const selects = screen.getAllByRole('combobox');
    expect((selects[0] as HTMLSelectElement).value).toBe('Region');
    expect((selects[1] as HTMLSelectElement).value).toBe('Sales');
    expect((selects[2] as HTMLSelectElement).value).toBe('mean');
  });
});
