/**
 * SliceRowsDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
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
    renderWithI18n(<SliceRowsDialog />);

    expect(screen.getByPlaceholderText('10')).toBeDefined();
    const radio = screen.getByLabelText('Keep first N rows') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('updates count when input changes', () => {
    renderWithI18n(<SliceRowsDialog />);

    const input = screen.getByPlaceholderText('10') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '25' } });

    expect(DialogStore.sliceRowsState.count.value).toBe(25);
  });

  it('updates mode when radio changes', () => {
    renderWithI18n(<SliceRowsDialog />);

    const removeLastRadio = screen.getByLabelText('Remove last N rows');
    fireEvent.click(removeLastRadio);

    expect(DialogStore.sliceRowsState.mode.value).toBe('removeLast');
  });

  it('shows correct preview for "first" mode', () => {
    DialogStore.sliceRowsState.count.value = 5;
    renderWithI18n(<SliceRowsDialog />);

    expect(screen.getByText(/Will keep rows/)).toBeDefined();
  });

  it('shows correct preview for "last" mode', () => {
    DialogStore.sliceRowsState.count.value = 10;
    DialogStore.sliceRowsState.mode.value = 'last';
    renderWithI18n(<SliceRowsDialog />);

    expect(screen.getByText(/Will keep rows/)).toBeDefined();
  });
});
