import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { MergeDialog } from './MergeDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('MergeDialog', () => {
  beforeEach(() => {
    DialogStore.resetAll();
    AppStore.activeDialog.value = 'merge';
    AppStore.editingStepIndex.value = null;
    AppStore.selectedColumns.value = [];
    AppStore.columns.value = ['first_name', 'last_name', 'city', 'state'];
    AppStore.currentData.value = [
      { first_name: 'Alice', last_name: 'Smith', city: 'Boston', state: 'MA' },
      { first_name: 'Bob', last_name: 'Jones', city: 'Austin', state: 'TX' },
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
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
    // Bridge signal reflects local state
    expect(DialogStore.activeDialogState.value?.separator).toBe(',');
  });

  it('allows custom separator input', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: ' - ' } });
    expect(DialogStore.activeDialogState.value?.separator).toBe(' - ');
  });

  it('auto-generates column name from selected columns', async () => {
    vi.useFakeTimers();
    AppStore.selectedColumns.value = ['first_name', 'last_name'];
    renderWithI18n(<MergeDialog />);

    await vi.advanceTimersByTimeAsync(10);

    expect(DialogStore.activeDialogState.value?.columnName).toBe('first_name_last_name_merged');
  });

  it('allows editing output column name', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const inputs = container.querySelectorAll('input[type="text"]');
    const columnNameInput = inputs[1] as HTMLInputElement;

    fireEvent.input(columnNameInput, { target: { value: 'merged_column' } });
    expect(DialogStore.activeDialogState.value?.columnName).toBe('merged_column');
  });

  it('toggles removeOriginal checkbox', () => {
    const { container } = renderWithI18n(<MergeDialog />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(DialogStore.activeDialogState.value?.removeOriginal).toBe(false);

    fireEvent.change(checkbox, { target: { checked: true } });
    expect(DialogStore.activeDialogState.value?.removeOriginal).toBe(true);

    fireEvent.change(checkbox, { target: { checked: false } });
    expect(DialogStore.activeDialogState.value?.removeOriginal).toBe(false);
  });

  it('initializes with selected columns', () => {
    AppStore.selectedColumns.value = ['first_name', 'last_name'];
    renderWithI18n(<MergeDialog />);
    expect(DialogStore.activeDialogState.value?.columns).toEqual(['first_name', 'last_name']);
  });
});
