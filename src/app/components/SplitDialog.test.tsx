/**
 * SplitDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { SplitDialog } from './SplitDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('SplitDialog', () => {
  const testColumns = ['Product ID', 'Name', 'Category'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.splitState.column.value = 'Product ID';
    DialogStore.splitState.delimiter.value = ',';
    DialogStore.splitState.autoDetectedDelimiter.value = null;
    DialogStore.splitState.isRegex.value = false;
    DialogStore.splitState.mode.value = 'spread';
    DialogStore.splitState.maxColumns.value = 2;
    DialogStore.splitState.keepOriginal.value = false;
    DialogStore.splitState.error.value = null;
    AppStore.columns.value = testColumns;
  });

  it('renders with columns and default values', () => {
    renderWithI18n(<SplitDialog />);

    expect(screen.getByText('Product ID')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    const input = screen.getByPlaceholderText('Enter delimiter') as HTMLInputElement;
    expect(input.value).toBe(',');
  });

  it('updates delimiter via presets', () => {
    renderWithI18n(<SplitDialog />);

    // Click semi-colon
    fireEvent.click(screen.getByText(';'));
    expect(DialogStore.splitState.delimiter.value).toBe(';');
    expect(DialogStore.splitState.isRegex.value).toBe(false);

    // Click whitespace icon (title="Whitespace")
    fireEvent.click(screen.getByTitle('Whitespace'));
    expect(DialogStore.splitState.delimiter.value).toBe('\\s+');
    expect(DialogStore.splitState.isRegex.value).toBe(true);
  });

  it('switches modes and shows max columns input', () => {
    renderWithI18n(<SplitDialog />);

    expect(screen.queryByPlaceholderText('e.g., 3')).toBeNull();

    // Click "Keep First N" which has value="firstN"
    const radio = screen.getByLabelText('Keep first N - limit number of columns');
    fireEvent.click(radio);
    expect(DialogStore.splitState.mode.value).toBe('firstN');
    expect(screen.getByPlaceholderText('e.g., 3')).toBeDefined();
  });

  it('selects column', () => {
    renderWithI18n(<SplitDialog />);

    fireEvent.click(screen.getByText('Category'));
    expect(DialogStore.splitState.column.value).toBe('Category');
  });

  it('shows auto-detected delimiter', () => {
    DialogStore.splitState.autoDetectedDelimiter.value = '|';
    renderWithI18n(<SplitDialog />);

    // Check for auto-detected text with translation interpolation
    const autoDiv = screen.getByText(/Auto-detected:/);
    expect(autoDiv).toBeDefined();
  });
});
