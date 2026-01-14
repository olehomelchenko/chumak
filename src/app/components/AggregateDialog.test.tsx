import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { describe, it, expect, vi } from 'vitest';
import { AggregateDialog, Aggregation } from './AggregateDialog';

describe('AggregateDialog', () => {
  const columns = ['dept', 'salary', 'age'];

  it('renders correctly with initial state', () => {
    const groupBy = signal<string[]>([]);
    const aggregations = signal<Aggregation[]>([{ col: '', func: 'count', output: 'count' }]);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <AggregateDialog
        columns={columns}
        groupBy={groupBy}
        aggregations={aggregations}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    expect(screen.getByText('Group By (Columns)')).toBeDefined();
    expect(columns.length).toBe(3);
    columns.forEach((col) => {
      expect(screen.getAllByText(col).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Count')).toBeDefined();
  });

  it('toggles group by columns', () => {
    const groupBy = signal<string[]>([]);
    const aggregations = signal<Aggregation[]>([]);
    // ... setup
    render(
      <AggregateDialog
        columns={columns}
        groupBy={groupBy}
        aggregations={aggregations}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('dept').closest('button')!);
    expect(groupBy.value).toContain('dept');

    fireEvent.click(screen.getByText('dept').closest('button')!);
    expect(groupBy.value).not.toContain('dept');
  });

  it('handles select all and select none', () => {
    const groupBy = signal<string[]>([]);

    render(
      <AggregateDialog
        columns={columns}
        groupBy={groupBy}
        aggregations={signal([])}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Select All'));
    expect(groupBy.value.length).toBe(3);

    fireEvent.click(screen.getByText('Select None'));
    expect(groupBy.value.length).toBe(0);
  });

  it('adds and removes aggregations', () => {
    const aggregations = signal<Aggregation[]>([]);

    render(
      <AggregateDialog
        columns={columns}
        groupBy={signal([])}
        aggregations={aggregations}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('+ Add Aggregation'));
    expect(aggregations.value.length).toBe(1);
    expect(aggregations.value[0].func).toBe('count');

    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);
    expect(aggregations.value.length).toBe(0);
  });

  it('auto-generates output name', () => {
    const aggregations = signal<Aggregation[]>([{ col: '', func: 'sum', output: '' }]);

    render(
      <AggregateDialog
        columns={columns}
        groupBy={signal([])}
        aggregations={aggregations}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // 0 = col, 1 = func
    fireEvent.change(selects[0], { target: { value: 'salary' } });

    expect(aggregations.value[0].col).toBe('salary');
    expect(aggregations.value[0].output).toBe('sum_salary');
  });
});
