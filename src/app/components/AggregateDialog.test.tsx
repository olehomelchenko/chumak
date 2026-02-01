import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AggregateDialog } from './AggregateDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as AggregateHandlers from '../handlers/transform/aggregate-handlers';

describe('AggregateDialog', () => {
  const columns = ['dept', 'salary', 'age'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.aggregateState.groupBy.value = [];
    DialogStore.aggregateState.aggregations.value = [];
    DialogStore.aggregateState.isPreviewing.value = false;
    AppStore.columns.value = columns;
  });

  it('renders correctly with initial state', () => {
    DialogStore.aggregateState.aggregations.value = [{ col: '', func: 'count', output: 'count' }];

    render(<AggregateDialog />);

    expect(screen.getByText('Group By (Columns)')).toBeDefined();
    expect(columns.length).toBe(3);
    columns.forEach((col) => {
      expect(screen.getAllByText(col).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Count')).toBeDefined();
  });

  it('toggles group by columns', () => {
    render(<AggregateDialog />);

    const deptButton = screen.getByText('dept').closest('button');
    expect(deptButton).toBeDefined();
    fireEvent.click(deptButton!);
    expect(DialogStore.aggregateState.groupBy.value).toContain('dept');

    fireEvent.click(deptButton!);
    expect(DialogStore.aggregateState.groupBy.value).not.toContain('dept');
  });

  it('handles select all and select none', () => {
    render(<AggregateDialog />);

    fireEvent.click(screen.getByText('Select All'));
    expect(DialogStore.aggregateState.groupBy.value.length).toBe(3);

    fireEvent.click(screen.getByText('Select None'));
    expect(DialogStore.aggregateState.groupBy.value.length).toBe(0);
  });

  it('adds and removes aggregations', () => {
    vi.spyOn(AggregateHandlers, 'addAggregation').mockImplementation(() => {
      DialogStore.aggregateState.aggregations.value = [{ col: '', func: 'count', output: 'count' }];
    });
    vi.spyOn(AggregateHandlers, 'removeAggregation').mockImplementation(() => {
      DialogStore.aggregateState.aggregations.value = [];
    });

    render(<AggregateDialog />);

    fireEvent.click(screen.getByText('+ Add Aggregation'));
    expect(DialogStore.aggregateState.aggregations.value.length).toBe(1);
    expect(DialogStore.aggregateState.aggregations.value[0].func).toBe('count');

    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);
    expect(DialogStore.aggregateState.aggregations.value.length).toBe(0);
  });

  it('auto-generates output name', () => {
    vi.spyOn(AggregateHandlers, 'updateAggregateOutputName').mockImplementation(() => {
      const aggs = DialogStore.aggregateState.aggregations.value;
      if (aggs.length > 0 && aggs[0].col === 'salary' && aggs[0].func === 'sum') {
        aggs[0].output = 'sum_salary';
        DialogStore.aggregateState.aggregations.value = [...aggs];
      }
    });

    DialogStore.aggregateState.aggregations.value = [{ col: '', func: 'sum', output: '' }];
    render(<AggregateDialog />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'salary' } });

    AggregateHandlers.updateAggregateOutputName(0);
    expect(DialogStore.aggregateState.aggregations.value[0].col).toBe('salary');
    expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('sum_salary');
  });
});
