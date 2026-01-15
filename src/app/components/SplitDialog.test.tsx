/**
 * SplitDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
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
    render(<SplitDialog />);

    expect(screen.getByText('Product ID')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    const input = screen.getByPlaceholderText('Enter delimiter') as HTMLInputElement;
    expect(input.value).toBe(',');
  });

  it('updates delimiter via presets', () => {
    render(<SplitDialog />);

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
    render(<SplitDialog />);

    expect(screen.queryByPlaceholderText('e.g., 3')).toBeNull();

    // Click "Keep First N" which has value="firstN"
    const radio = screen.getByLabelText('Keep First N - limit number of columns');
    fireEvent.click(radio);
    expect(DialogStore.splitState.mode.value).toBe('firstN');
    expect(screen.getByPlaceholderText('e.g., 3')).toBeDefined();
  });

  it('selects column', () => {
    render(<SplitDialog />);

    fireEvent.click(screen.getByText('Category'));
    expect(DialogStore.splitState.column.value).toBe('Category');
  });

  it('shows auto-detected delimiter', () => {
    DialogStore.splitState.autoDetectedDelimiter.value = '|';
    render(<SplitDialog />);

    // Check for auto-detected text
    const autoDiv = screen.getByText((content) => content.includes('Auto-detected'));
    expect(autoDiv).toBeDefined();
    expect(autoDiv.textContent).toContain('|');
  });
});
