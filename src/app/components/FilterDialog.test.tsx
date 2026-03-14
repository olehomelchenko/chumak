/**
 * FilterDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';

// Mock ExpressionEditor as a plain input
vi.mock('./ExpressionEditor', () => ({
  ExpressionEditor: ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      value={value}
      onInput={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

import { FilterDialog } from './FilterDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('FilterDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.filterState.expression.value = '';
    DialogStore.filterState.error.value = null;
    DialogStore.filterState.previewMode.value = 'all';
    AppStore.columns.value = [];
  });

  it('renders with default values', () => {
    renderWithI18n(<FilterDialog />);

    expect(screen.getByPlaceholderText('e.g., sales > 1000')).toBeDefined();
    expect(screen.getByText('Show all').className).toContain('button--primary');
  });

  it('updates expression when typed', () => {
    renderWithI18n(<FilterDialog />);

    const input = screen.getByPlaceholderText('e.g., sales > 1000') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sales > 1000' } });

    expect(DialogStore.filterState.expression.value).toBe('sales > 1000');
  });

  it('toggles preview mode', () => {
    renderWithI18n(<FilterDialog />);

    const matchingButton = screen.getByText('Matching only');
    fireEvent.click(matchingButton);

    expect(DialogStore.filterState.previewMode.value).toBe('matching');
  });

  it('shows error message when present', async () => {
    renderWithI18n(<FilterDialog />);

    // Set error after rendering (validation runs on mount and may clear it)
    DialogStore.filterState.error.value = 'Syntax error';

    // Wait for error message to appear (Preact signals trigger async updates)
    const errorElement = await waitFor(() => screen.getByText('Syntax error'));
    expect(errorElement).toBeDefined();
    expect(errorElement.tagName).toBe('DIV');
  });

  it('opens reference dialog when reference button is clicked', () => {
    renderWithI18n(<FilterDialog />);

    const refButton = screen.getByText('Full reference');
    fireEvent.click(refButton);

    expect(AppStore.activeDialog.value).toBe('reference');
  });
});
