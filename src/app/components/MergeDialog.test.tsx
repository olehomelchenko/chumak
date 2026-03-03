import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { MergeDialog } from './MergeDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('MergeDialog', () => {
  beforeEach(() => {
    DialogStore.resetAll();
    // Setup mock columns
    AppStore.columns.value = ['first_name', 'last_name', 'city', 'state'];
    AppStore.currentData.value = [
      { first_name: 'Alice', last_name: 'Smith', city: 'Boston', state: 'MA' },
      { first_name: 'Bob', last_name: 'Jones', city: 'Austin', state: 'TX' },
    ];
  });

  it('renders column selector', () => {
    const { getByText } = renderWithI18n(<MergeDialog />);
    expect(getByText('Columns to merge:')).toBeTruthy();
  });

  it('renders separator presets', () => {
    const { getByText } = renderWithI18n(<MergeDialog />);
    expect(getByText('(none)')).toBeTruthy();
    expect(getByText('(space)')).toBeTruthy();
    expect(getByText(',')).toBeTruthy();
    expect(getByText('-')).toBeTruthy();
    expect(getByText('_')).toBeTruthy();
    expect(getByText('/')).toBeTruthy();
    expect(getByText('|')).toBeTruthy();
  });

  it('updates separator when preset button clicked', () => {
    const { getByText } = renderWithI18n(<MergeDialog />);
    const commaButton = getByText(',');
    fireEvent.click(commaButton);
    expect(DialogStore.mergeState.separator.value).toBe(',');
  });

  it('allows custom separator input', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: ' - ' } });
    expect(DialogStore.mergeState.separator.value).toBe(' - ');
  });

  it('auto-generates column name from selected columns', async () => {
    vi.useFakeTimers();
    renderWithI18n(<MergeDialog />);

    // Simulate column selection
    DialogStore.mergeState.columns.value = ['first_name', 'last_name'];

    // Flush microtasks and advance timers for signal effects to propagate
    await vi.advanceTimersByTimeAsync(10);

    expect(DialogStore.mergeState.columnName.value).toBe('first_name_last_name_merged');
    vi.useRealTimers();
  });

  it('does not overwrite manually entered column name', async () => {
    vi.useFakeTimers();
    renderWithI18n(<MergeDialog />);

    // Manually set column name first
    DialogStore.mergeState.columnName.value = 'full_name';

    // Then select columns
    DialogStore.mergeState.columns.value = ['first_name', 'last_name'];

    // Flush microtasks and advance timers for signal effects to propagate
    await vi.advanceTimersByTimeAsync(10);

    // Should keep manual name
    expect(DialogStore.mergeState.columnName.value).toBe('full_name');
    vi.useRealTimers();
  });

  it('allows editing output column name', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const inputs = container.querySelectorAll('input[type="text"]');
    const columnNameInput = inputs[1] as HTMLInputElement; // Second text input

    fireEvent.input(columnNameInput, { target: { value: 'merged_column' } });
    expect(DialogStore.mergeState.columnName.value).toBe('merged_column');
  });

  it('toggles removeOriginal checkbox', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(DialogStore.mergeState.removeOriginal.value).toBe(false);

    fireEvent.change(checkbox, { target: { checked: true } });
    expect(DialogStore.mergeState.removeOriginal.value).toBe(true);

    fireEvent.change(checkbox, { target: { checked: false } });
    expect(DialogStore.mergeState.removeOriginal.value).toBe(false);
  });

  it('displays error message when present', () => {
    DialogStore.mergeState.error.value = 'Test error message';
    const { getByText } = renderWithI18n(<MergeDialog />);
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('does not display error when none present', () => {
    DialogStore.mergeState.error.value = null;
    const { container } = renderWithI18n(<MergeDialog />);
    const errorElements = container.querySelectorAll('.error');
    expect(errorElements.length).toBe(0);
  });
});
