import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JoinDialog, JoinTarget } from './JoinDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('JoinDialog', () => {
  const dummyTargets: JoinTarget[] = [
    { id: 'm1', name: 'Sales', type: 'model' },
    { id: 's1', name: 'Customers', type: 'source', sourceName: 'customers.csv' },
  ];

  const leftColumns = ['id', 'amount'];
  const rightColumns = ['customer_id', 'name'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.joinState.rightModel.value = null;
    DialogStore.joinState.joinType.value = 'left';
    DialogStore.joinState.keyPairs.value = [[null, null]];
    DialogStore.joinState.suffixes.value = ['_x', '_y'];
    DialogStore.joinState.targets.value = dummyTargets;
    DialogStore.joinState.rightColumns.value = rightColumns;
    DialogStore.joinState.previewData.value = null;
    DialogStore.joinState.previewError.value = null;
    DialogStore.joinState.isPreviewing.value = false;
    AppStore.columns.value = leftColumns;
  });

  it('renders correctly with initial state', () => {
    render(<JoinDialog />);

    expect(screen.getByText('Join With')).toBeDefined();
    expect(screen.getByText('Join Type')).toBeDefined();
    expect(screen.getByText('Join Keys')).toBeDefined();
    // Default join type is left
    const leftRadio = screen.getByLabelText('Left') as HTMLInputElement;
    expect(leftRadio.checked).toBe(true);
  });

  it('updates target model', () => {
    render(<JoinDialog />);

    fireEvent.change(screen.getByRole('combobox', { name: /join with/i }), {
      target: { value: 'm1' },
    });
    expect(DialogStore.joinState.rightModel.value).toBe('m1');
  });

  it('updates join type', () => {
    render(<JoinDialog />);

    fireEvent.click(screen.getByLabelText('Inner'));
    expect(DialogStore.joinState.joinType.value).toBe('inner');
  });

  it('hides match keys for cross join', () => {
    DialogStore.joinState.joinType.value = 'cross';

    render(<JoinDialog />);

    expect(screen.queryByText('Join Keys')).toBeNull();
  });

  it('adds and removes key pairs', () => {
    render(<JoinDialog />);

    // Initial state: 1 pair
    const addBtn = screen.getByText('+ Add Key Pair');
    fireEvent.click(addBtn);
    expect(DialogStore.joinState.keyPairs.value.length).toBe(2);

    const removeBtn = screen.getAllByTitle('Remove key pair')[1];
    fireEvent.click(removeBtn);
    expect(DialogStore.joinState.keyPairs.value.length).toBe(1);
  });

  it('updates key pair values', () => {
    render(<JoinDialog />);

    const selects = screen.getAllByRole('combobox');
    // First is Join With, next two are key pair [left, right]
    const leftSelect = selects[1];
    const rightSelect = selects[2];

    fireEvent.change(leftSelect, { target: { value: 'id' } });
    expect(DialogStore.joinState.keyPairs.value[0][0]).toBe('id');

    fireEvent.change(rightSelect, { target: { value: 'customer_id' } });
    expect(DialogStore.joinState.keyPairs.value[0][1]).toBe('customer_id');
  });

  it('calls onPreview callback when provided', () => {
    const onPreview = vi.fn();
    DialogStore.joinState.rightModel.value = 'm1';

    render(<JoinDialog onPreview={onPreview} />);

    fireEvent.click(screen.getByText('Preview Join'));
    expect(onPreview).toHaveBeenCalled();
  });
});
