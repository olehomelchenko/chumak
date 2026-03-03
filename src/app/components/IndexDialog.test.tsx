/**
 * IndexDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { IndexDialog } from './IndexDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('IndexDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.indexState.columnName.value = 'row_index';
    DialogStore.indexState.startFrom.value = 1;
    AppStore.currentData.value = Array(100)
      .fill(null)
      .map((_, i) => ({ id: i }));
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

    expect(DialogStore.indexState.columnName.value).toBe('my_index');
  });

  it('updates start value when changed', () => {
    renderWithI18n(<IndexDialog />);

    const input = screen.getByPlaceholderText('1') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '10' } });

    expect(DialogStore.indexState.startFrom.value).toBe(10);
  });

  it('shows computed end value in preview', () => {
    DialogStore.indexState.startFrom.value = 0;
    AppStore.currentData.value = Array(50)
      .fill(null)
      .map((_, i) => ({ id: i }));
    renderWithI18n(<IndexDialog />);

    // Preview should show "0 to 49" for 50 rows starting at 0
    expect(screen.getByText('49')).toBeDefined();
  });

  it('shows column name in preview', () => {
    DialogStore.indexState.columnName.value = 'my_col';
    AppStore.currentData.value = Array(10)
      .fill(null)
      .map((_, i) => ({ id: i }));
    renderWithI18n(<IndexDialog />);

    expect(screen.getByText('my_col')).toBeDefined();
  });
});
