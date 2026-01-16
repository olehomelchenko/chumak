/**
 * UnpivotDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { UnpivotDialog } from './UnpivotDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('UnpivotDialog', () => {
  const testColumns = ['Year', 'Q1', 'Q2', 'Q3', 'Q4'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.foldState.keyName.value = 'Year';
    DialogStore.foldState.valueName.value = 'Sales';
    DialogStore.foldState.mode.value = 'keep';
    DialogStore.foldState.selectedColumns.value = [true, false, false, false, false];
    AppStore.columns.value = testColumns;
  });

  it('renders with default values', () => {
    render(<UnpivotDialog />);

    expect(screen.getByDisplayValue('Year')).toBeDefined();
    expect(screen.getByDisplayValue('Sales')).toBeDefined();
    // Check that the button has the active class (CSS module class contains "active")
    const keepButton = screen.getByText('Columns to Keep (as index)').closest('button');
    expect(keepButton?.className).toContain('active');
  });

  it('updates names when input changes', () => {
    DialogStore.foldState.keyName.value = '';
    DialogStore.foldState.valueName.value = '';
    render(<UnpivotDialog />);

    const keyInput = screen.getByPlaceholderText('e.g. Year') as HTMLInputElement;
    fireEvent.input(keyInput, { target: { value: 'Month' } });
    expect(DialogStore.foldState.keyName.value).toBe('Month');
  });

  it('toggles mode', () => {
    render(<UnpivotDialog />);

    fireEvent.click(screen.getByText('Columns to Fold'));
    expect(DialogStore.foldState.mode.value).toBe('fold');
    expect(screen.getByText('Select Columns to Fold:')).toBeDefined();
  });

  it('toggles column selection', () => {
    DialogStore.foldState.selectedColumns.value = [false, false, false, false, false];
    render(<UnpivotDialog />);

    fireEvent.click(screen.getByText('Q1').closest('button')!);
    expect(DialogStore.foldState.selectedColumns.value[1]).toBe(true);

    fireEvent.click(screen.getByText('Q1').closest('button')!);
    expect(DialogStore.foldState.selectedColumns.value[1]).toBe(false);
  });

  it('handles Select All', () => {
    DialogStore.foldState.selectedColumns.value = [false, false, false, false, false];
    render(<UnpivotDialog />);

    fireEvent.click(screen.getByText('Select All'));
    expect(DialogStore.foldState.selectedColumns.value.every((v) => v)).toBe(true);
  });

  it('handles Select None', () => {
    DialogStore.foldState.selectedColumns.value = [true, true, true, true, true];
    render(<UnpivotDialog />);

    fireEvent.click(screen.getByText('Select None'));
    expect(DialogStore.foldState.selectedColumns.value.every((v) => !v)).toBe(true);
  });
});
