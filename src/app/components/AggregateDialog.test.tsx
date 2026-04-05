/**
 * AggregateDialog Component Tests
 *
 * Tests the Aggregate Dialog with local state (useDialogState pattern).
 * State is initialized from AppStore context, not set directly on DialogStore.
 */

import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { AggregateDialog } from './AggregateDialog';
import { AppStore } from '../stores/AppStore';

describe('AggregateDialog', () => {
  const columns = ['dept', 'salary', 'age'];

  beforeEach(() => {
    AppStore.columns.value = columns;
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
    AppStore.currentData.value = [
      { dept: 'Sales', salary: 50000, age: 30 },
      { dept: 'Sales', salary: 60000, age: 35 },
      { dept: 'Eng', salary: 80000, age: 28 },
    ];
  });

  it('renders with default count aggregation', () => {
    renderWithI18n(<AggregateDialog />);

    expect(screen.getByText('Group by (columns)')).toBeDefined();
    // Default aggregation is count
    expect(screen.getByText('Count')).toBeDefined();
  });

  it('toggles group by columns', () => {
    renderWithI18n(<AggregateDialog />);

    const deptTexts = screen.getAllByText('dept');
    const chipText = deptTexts.find((el) => el.closest('button'));
    expect(chipText).toBeDefined();
    fireEvent.click(chipText!.closest('button')!);

    // Click again to toggle off
    fireEvent.click(chipText!.closest('button')!);
  });

  it('handles select all and select none', () => {
    renderWithI18n(<AggregateDialog />);

    fireEvent.click(screen.getByText('Select All'));
    fireEvent.click(screen.getByText('Select None'));
  });

  it('adds aggregation via button', () => {
    renderWithI18n(<AggregateDialog />);

    // Should start with one default aggregation (count)
    const removeButtons = screen.getAllByTitle('Remove');
    expect(removeButtons).toHaveLength(1);

    fireEvent.click(screen.getByText('+ Add aggregation'));

    // Now should have two aggregation rows
    expect(screen.getAllByTitle('Remove')).toHaveLength(2);
  });

  it('removes aggregation', () => {
    renderWithI18n(<AggregateDialog />);

    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);

    // No more aggregation rows — no Remove buttons
    expect(screen.queryAllByTitle('Remove')).toHaveLength(0);
  });

  it('initializes with selected columns for group by', () => {
    AppStore.selectedColumns.value = ['dept'];
    renderWithI18n(<AggregateDialog />);

    // dept should be pre-selected — find it in the chip buttons
    const deptTexts = screen.getAllByText('dept');
    const chipText = deptTexts.find((el) => el.closest('button'));
    expect(chipText).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [
        {
          aggregate: {
            groupby: ['dept'],
            rollup: {
              total_salary: "op.sum('salary')",
              count: 'op.count()',
            },
          },
        },
      ],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<AggregateDialog />);

    // Should have 2 aggregation rows
    expect(screen.getAllByTitle('Remove')).toHaveLength(2);
  });
});
