/**
 * SliceRowsDialog Component Tests
 *
 * Tests with local state (useDialogState pattern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { SliceRowsDialog } from './SliceRowsDialog';
import { AppStore } from '../stores/AppStore';

describe('SliceRowsDialog', () => {
  beforeEach(() => {
    AppStore.currentData.value = Array(100)
      .fill(null)
      .map((_, i) => ({ id: i }));
    AppStore.columns.value = ['id'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
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

    expect(input.value).toBe('25');
  });

  it('updates mode when radio changes', () => {
    renderWithI18n(<SliceRowsDialog />);

    const removeLastRadio = screen.getByLabelText('Remove last N rows');
    fireEvent.click(removeLastRadio);

    expect((removeLastRadio as HTMLInputElement).checked).toBe(true);
  });

  it('shows correct preview for "first" mode', () => {
    renderWithI18n(<SliceRowsDialog />);

    // Default count=10, mode='first'
    expect(screen.getByText(/Will keep rows/)).toBeDefined();
  });

  it('shows correct preview for "last" mode', () => {
    renderWithI18n(<SliceRowsDialog />);

    const lastRadio = screen.getByLabelText('Keep last N rows');
    fireEvent.click(lastRadio);

    expect(screen.getByText(/Will keep rows/)).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [{ sliceRows: { count: 25, mode: 'removeLast' } }],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<SliceRowsDialog />);

    const input = screen.getByPlaceholderText('10') as HTMLInputElement;
    expect(input.value).toBe('25');

    const removeLastRadio = screen.getByLabelText('Remove last N rows') as HTMLInputElement;
    expect(removeLastRadio.checked).toBe(true);
  });
});
