/**
 * ReplaceDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { ReplaceDialog } from './ReplaceDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('ReplaceDialog', () => {
  const testColumns = ['name', 'status', 'count'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.replaceState.column.value = '';
    DialogStore.replaceState.findValue.value = '';
    DialogStore.replaceState.replaceValue.value = '';
    DialogStore.replaceState.isRegex.value = false;
    AppStore.columns.value = testColumns;
  });

  it('renders all column chips', () => {
    renderWithI18n(<ReplaceDialog />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column when clicked', () => {
    renderWithI18n(<ReplaceDialog />);

    const statusButton = screen.getByText('status').closest('button');
    fireEvent.click(statusButton!);

    expect(DialogStore.replaceState.column.value).toBe('status');
  });

  it('updates find value when typed', () => {
    DialogStore.replaceState.column.value = 'name';
    renderWithI18n(<ReplaceDialog />);

    const input = screen.getByPlaceholderText('Value to replace') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'old_value' } });

    expect(DialogStore.replaceState.findValue.value).toBe('old_value');
  });

  it('updates replace value when typed', () => {
    DialogStore.replaceState.column.value = 'name';
    renderWithI18n(<ReplaceDialog />);

    const input = screen.getByPlaceholderText(
      'New value (leave empty for null)'
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'new_value' } });

    expect(DialogStore.replaceState.replaceValue.value).toBe('new_value');
  });

  it('highlights the selected column', () => {
    DialogStore.replaceState.column.value = 'status';
    renderWithI18n(<ReplaceDialog />);

    const statusButton = screen.getByText('status').closest('button');
    expect(statusButton?.className).toContain('active');
  });
});
