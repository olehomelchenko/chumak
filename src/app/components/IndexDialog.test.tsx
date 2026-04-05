/**
 * IndexDialog Component Tests
 *
 * Tests with local state (useDialogState pattern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { IndexDialog } from './IndexDialog';
import { AppStore } from '../stores/AppStore';

describe('IndexDialog', () => {
  beforeEach(() => {
    AppStore.currentData.value = Array(100)
      .fill(null)
      .map((_, i) => ({ id: i }));
    AppStore.columns.value = ['id'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
  });

  it('renders with default values', () => {
    renderWithI18n(<IndexDialog />);

    expect(screen.getByPlaceholderText('row_index')).toBeDefined();
    expect(screen.getByPlaceholderText('1')).toBeDefined();
  });

  it('updates column name when typed', () => {
    renderWithI18n(<IndexDialog />);

    const input = screen.getByPlaceholderText('row_index') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'my_index' } });

    expect(input.value).toBe('my_index');
  });

  it('updates start value when changed', () => {
    renderWithI18n(<IndexDialog />);

    const input = screen.getByPlaceholderText('1') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '10' } });

    expect(input.value).toBe('10');
  });

  it('shows computed end value in preview', () => {
    AppStore.currentData.value = Array(50)
      .fill(null)
      .map((_, i) => ({ id: i }));
    renderWithI18n(<IndexDialog />);

    // Default startFrom is 1, so end value is 50 for 50 rows
    expect(screen.getByText('50')).toBeDefined();
  });

  it('shows column name in preview', () => {
    AppStore.currentData.value = Array(10)
      .fill(null)
      .map((_, i) => ({ id: i }));
    renderWithI18n(<IndexDialog />);

    // Default column name is 'row_index'
    expect(screen.getByText('row_index')).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [{ addIndex: { columnName: 'my_col', startFrom: 5 } }],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<IndexDialog />);

    const nameInput = screen.getByPlaceholderText('row_index') as HTMLInputElement;
    expect(nameInput.value).toBe('my_col');

    const startInput = screen.getByPlaceholderText('1') as HTMLInputElement;
    expect(startInput.value).toBe('5');
  });
});
