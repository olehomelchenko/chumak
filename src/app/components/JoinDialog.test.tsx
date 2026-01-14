import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { describe, it, expect, vi } from 'vitest';
import { JoinDialog, JoinTarget, JoinType } from './JoinDialog';

describe('JoinDialog', () => {
  const dummyTargets: JoinTarget[] = [
    { id: 'm1', name: 'Sales', type: 'model' },
    { id: 's1', name: 'Customers', type: 'source', sourceName: 'customers.csv' },
  ];

  const leftColumns = ['id', 'amount'];
  const rightColumns = signal(['customer_id', 'name']);

  it('renders correctly with initial state', () => {
    const rightModel = signal<string | null>(null);
    const joinType = signal<JoinType>('left');
    const keyPairs = signal<(string | null)[][]>([[null, null]]);
    const suffixes = signal<string[]>(['_x', '_y']);
    const previewData = signal(null);
    const previewError = signal(null);
    const isPreviewing = signal(false);
    const onPreview = vi.fn();

    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={rightModel}
        joinType={joinType}
        keyPairs={keyPairs}
        suffixes={suffixes}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={previewData}
        previewError={previewError}
        isPreviewing={isPreviewing}
        onPreview={onPreview}
      />
    );

    expect(screen.getByText('Join With')).toBeDefined();
    expect(screen.getByText('Join Type')).toBeDefined();
    expect(screen.getByText('Join Keys')).toBeDefined();
    // Default join type is left
    const leftRadio = screen.getByLabelText('Left') as HTMLInputElement;
    expect(leftRadio.checked).toBe(true);
  });

  it('updates target model', () => {
    const rightModel = signal<string | null>(null);

    // Minimal props for rendering
    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={rightModel}
        joinType={signal('left')}
        keyPairs={signal([[null, null]])}
        suffixes={signal(['_x', '_y'])}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={signal(null)}
        previewError={signal(null)}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: /join with/i }), {
      target: { value: 'm1' },
    });
    expect(rightModel.value).toBe('m1');
  });

  it('updates join type', () => {
    const joinType = signal<JoinType>('left');

    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={signal(null)}
        joinType={joinType}
        keyPairs={signal([[null, null]])}
        suffixes={signal(['_x', '_y'])}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={signal(null)}
        previewError={signal(null)}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Inner'));
    expect(joinType.value).toBe('inner');
  });

  it('hides match keys for cross join', () => {
    const joinType = signal<JoinType>('cross');

    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={signal(null)}
        joinType={joinType}
        keyPairs={signal([[null, null]])}
        suffixes={signal(['_x', '_y'])}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={signal(null)}
        previewError={signal(null)}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    expect(screen.queryByText('Join Keys')).toBeNull();
  });

  it('adds and removes key pairs', () => {
    const keyPairs = signal<(string | null)[][]>([[null, null]]);

    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={signal(null)}
        joinType={signal('left')}
        keyPairs={keyPairs}
        suffixes={signal(['_x', '_y'])}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={signal(null)}
        previewError={signal(null)}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    // Initial state: 1 pair
    const addBtn = screen.getByText('+ Add Key Pair');
    fireEvent.click(addBtn);
    expect(keyPairs.value.length).toBe(2);

    const removeBtn = screen.getAllByTitle('Remove key pair')[1];
    fireEvent.click(removeBtn);
    expect(keyPairs.value.length).toBe(1);
  });

  it('updates key pair values', () => {
    const keyPairs = signal<(string | null)[][]>([[null, null]]);

    render(
      <JoinDialog
        targets={dummyTargets}
        rightModel={signal(null)}
        joinType={signal('left')}
        keyPairs={keyPairs}
        suffixes={signal(['_x', '_y'])}
        leftColumns={leftColumns}
        rightColumns={rightColumns}
        previewData={signal(null)}
        previewError={signal(null)}
        isPreviewing={signal(false)}
        onPreview={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // First is Join With, next two are key pair [left, right]
    const leftSelect = selects[1];
    const rightSelect = selects[2];

    fireEvent.change(leftSelect, { target: { value: 'id' } });
    expect(keyPairs.value[0][0]).toBe('id');

    fireEvent.change(rightSelect, { target: { value: 'customer_id' } });
    expect(keyPairs.value[0][1]).toBe('customer_id');
  });
});
