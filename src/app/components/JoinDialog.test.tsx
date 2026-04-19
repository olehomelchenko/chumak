import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { JoinDialog } from './JoinDialog';
import { AppStore } from '../stores/AppStore';

describe('JoinDialog', () => {
  beforeEach(() => {
    // Set up AppStore context so useDialogState factory can initialize
    AppStore.columns.value = ['id', 'amount'];
    AppStore.activeModel.value = {
      id: 'active',
      name: 'Active',
      sourceId: 's1',
      steps: [],
      schema: [
        { name: 'id', type: 'integer' },
        { name: 'amount', type: 'float' },
      ],
      data: [],
    };
    AppStore.activeSource.value = {
      id: 's1',
      name: 'Source1',
      data: [],
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'amount', type: 'float' },
      ],
      delimiter: ',',
      headerMode: 'first-row',
      customHeaders: null,
      origin: 'file',
    };
    AppStore.sources.value = [
      {
        id: 's1',
        name: 'Source1',
        data: [],
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'amount', type: 'float' },
        ],
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
      {
        id: 's2',
        name: 'Customers',
        data: [],
        columns: [
          { name: 'customer_id', type: 'integer' },
          { name: 'name', type: 'string' },
        ],
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
    ];
    AppStore.models.value = [AppStore.activeModel.value!];
    AppStore.editingStepIndex.value = null;
    AppStore.selectedColumns.value = [];
  });

  it('renders correctly with initial state', () => {
    renderWithI18n(<JoinDialog />);

    expect(screen.getByText('Left table')).toBeDefined();
    expect(screen.getByText('Right table')).toBeDefined();
    expect(screen.getByText('Join types')).toBeDefined();
    expect(screen.getByText('Join keys')).toBeDefined();
    // Default join type is left
    const leftRadio = screen.getByLabelText('Left') as HTMLInputElement;
    expect(leftRadio.checked).toBe(true);
  });

  it('renders tree selector for right table', () => {
    renderWithI18n(<JoinDialog />);

    expect(screen.getByText('Right table')).toBeDefined();
  });

  it('updates join type', () => {
    renderWithI18n(<JoinDialog />);

    fireEvent.click(screen.getByLabelText('Inner'));
    // Verify the inner radio is now checked
    const innerRadio = screen.getByLabelText('Inner') as HTMLInputElement;
    expect(innerRadio.checked).toBe(true);
  });

  it('hides match keys for cross join', () => {
    renderWithI18n(<JoinDialog />);

    // Switch to cross join
    fireEvent.click(screen.getByLabelText('Cross'));

    expect(screen.queryByText('Join keys')).toBeNull();
  });

  it('shows preview button', () => {
    renderWithI18n(<JoinDialog />);

    expect(screen.getByText('Preview join')).toBeDefined();
  });
});
