/**
 * SliceRowsDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SliceRowsDialog } from './SliceRowsDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('SliceRowsDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.sliceRowsState.count.value = 10;
    DialogStore.sliceRowsState.mode.value = 'first';
    AppStore.currentData.value = Array(100)
      .fill(null)
      .map((_, i) => ({ id: i }));
  });

  it('renders with default values', () => {
    render(<SliceRowsDialog />);

    expect(screen.getByPlaceholderText('10')).toBeDefined();
    const radio = screen.getByLabelText('Keep first N rows') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('updates count when input changes', () => {
    render(<SliceRowsDialog />);

    const input = screen.getByPlaceholderText('10') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '25' } });

    expect(DialogStore.sliceRowsState.count.value).toBe(25);
  });

  it('updates mode when radio changes', () => {
    render(<SliceRowsDialog />);

    const removeLastRadio = screen.getByLabelText('Remove last N rows');
    fireEvent.click(removeLastRadio);

    expect(DialogStore.sliceRowsState.mode.value).toBe('removeLast');
  });

  it('shows correct preview for "first" mode', () => {
    DialogStore.sliceRowsState.count.value = 5;
    render(<SliceRowsDialog />);

    expect(screen.getByText('Will keep rows 1 to')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows correct preview for "last" mode', () => {
    DialogStore.sliceRowsState.count.value = 10;
    DialogStore.sliceRowsState.mode.value = 'last';
    render(<SliceRowsDialog />);

    expect(screen.getByText(/Will keep rows/)).toBeDefined();
    const strong91 = screen.getByText('91');
    expect(strong91.tagName).toBe('STRONG');
  });
});
