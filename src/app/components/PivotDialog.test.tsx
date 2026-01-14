/**
 * PivotDialog Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { PivotDialog, PivotAggregation } from './PivotDialog';

describe('PivotDialog', () => {
  const testColumns = ['Year', 'Region', 'Sales', 'Category'];

  it('renders with default values', () => {
    const rowColumns = signal([]);
    const columnColumn = signal('');
    const valueColumn = signal('');
    const aggregation = signal<PivotAggregation>('sum');
    const uniqueValueCount = signal(0);
    const sort = signal(true);
    const limit = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <PivotDialog
        columns={testColumns}
        rowColumns={rowColumns}
        columnColumn={columnColumn}
        valueColumn={valueColumn}
        aggregation={aggregation}
        uniqueValueCount={uniqueValueCount}
        sort={sort}
        limit={limit}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    expect(screen.getByText('Create a pivot table by selecting', { exact: false })).toBeDefined();
    expect(screen.getByText('Rows')).toBeDefined();
    expect(screen.getAllByText('Columns')[0]).toBeDefined();
    expect(screen.getAllByText('Values')[0]).toBeDefined();
  });

  it('toggles row column selection', () => {
    const rowColumns = signal([]);
    const columnColumn = signal('');
    const valueColumn = signal('');
    const aggregation = signal<PivotAggregation>('sum');
    const uniqueValueCount = signal(0);
    const sort = signal(true);
    const limit = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <PivotDialog
        columns={testColumns}
        rowColumns={rowColumns}
        columnColumn={columnColumn}
        valueColumn={valueColumn}
        aggregation={aggregation}
        uniqueValueCount={uniqueValueCount}
        sort={sort}
        limit={limit}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    // Region appears in chip and select options. Find the one in the button (chip)
    const regionTexts = screen.getAllByText('Region');
    const chipText = regionTexts.find((el) => el.closest('button'));
    fireEvent.click(chipText!.closest('button')!);

    expect(rowColumns.value).toContain('Region');

    // Click again to toggle off
    fireEvent.click(chipText!.closest('button')!);
    expect(rowColumns.value).not.toContain('Region');
  });

  it('updates column options', () => {
    const rowColumns = signal([]);
    const columnColumn = signal('');
    const valueColumn = signal('');
    const aggregation = signal<PivotAggregation>('sum');
    const uniqueValueCount = signal(0);
    const sort = signal(true);
    const limit = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <PivotDialog
        columns={testColumns}
        rowColumns={rowColumns}
        columnColumn={columnColumn}
        valueColumn={valueColumn}
        aggregation={aggregation}
        uniqueValueCount={uniqueValueCount}
        sort={sort}
        limit={limit}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    // Select Columns field (first select is for Columns)
    const selects = screen.getAllByRole('combobox');
    const colSelect = selects[0];
    fireEvent.change(colSelect, { target: { value: 'Category' } });
    expect(columnColumn.value).toBe('Category');

    // Select Values field (second select is for Values)
    const valSelect = selects[1];
    fireEvent.change(valSelect, { target: { value: 'Sales' } });
    expect(valueColumn.value).toBe('Sales');
  });

  it('shows summary when configured', () => {
    const rowColumns = signal(['Year']);
    const columnColumn = signal('Region');
    const valueColumn = signal('Sales');
    const aggregation = signal<PivotAggregation>('sum');
    const uniqueValueCount = signal(5);
    const sort = signal(true);
    const limit = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <PivotDialog
        columns={testColumns}
        rowColumns={rowColumns}
        columnColumn={columnColumn}
        valueColumn={valueColumn}
        aggregation={aggregation}
        uniqueValueCount={uniqueValueCount}
        sort={sort}
        limit={limit}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    expect(screen.getByText('Result:')).toBeDefined();

    // Find the element containing "unique values" text and check it contains "5"
    // Since "5" is in a strong tag and "unique values" is typical text, checking parent textContent is best
    const uniqueHelper = screen.getByText(/unique values/);
    expect(uniqueHelper.textContent).toContain('5 unique values');
  });

  it('calls onPreview when clicked', () => {
    const rowColumns = signal(['Year']);
    const columnColumn = signal('Region');
    const valueColumn = signal('Sales');
    const aggregation = signal<PivotAggregation>('sum');
    const uniqueValueCount = signal(5);
    const sort = signal(true);
    const limit = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <PivotDialog
        columns={testColumns}
        rowColumns={rowColumns}
        columnColumn={columnColumn}
        valueColumn={valueColumn}
        aggregation={aggregation}
        uniqueValueCount={uniqueValueCount}
        sort={sort}
        limit={limit}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    fireEvent.click(screen.getByText('Preview Result'));
    expect(onPreview).toHaveBeenCalled();
  });
});
