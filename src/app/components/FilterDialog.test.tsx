/**
 * FilterDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
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
    render(<FilterDialog />);

    expect(screen.getByPlaceholderText('e.g., sales > 1000')).toBeDefined();
    expect(screen.getByText('Show All').className).toContain('button--primary');
  });

  it('updates expression when typed', () => {
    render(<FilterDialog />);

    const input = screen.getByPlaceholderText('e.g., sales > 1000') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sales > 1000' } });

    expect(DialogStore.filterState.expression.value).toBe('sales > 1000');
  });

  it('toggles preview mode', () => {
    render(<FilterDialog />);

    const matchingButton = screen.getByText('Matching Only');
    fireEvent.click(matchingButton);

    expect(DialogStore.filterState.previewMode.value).toBe('matching');
  });

  it('shows error message when present', () => {
    DialogStore.filterState.error.value = 'Syntax error';
    render(<FilterDialog />);

    expect(screen.getByText('Syntax error')).toBeDefined();
  });

  it('opens expressions dialog when reference button is clicked', () => {
    render(<FilterDialog />);

    const refButton = screen.getByText('Full Reference');
    fireEvent.click(refButton);

    expect(AppStore.activeDialog.value).toBe('expressions');
  });
});
