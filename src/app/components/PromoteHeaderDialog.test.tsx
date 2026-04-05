/**
 * PromoteHeaderDialog Component Tests
 *
 * Tests with local state (useDialogState pattern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { PromoteHeaderDialog } from './PromoteHeaderDialog';
import { AppStore } from '../stores/AppStore';

describe('PromoteHeaderDialog', () => {
  beforeEach(() => {
    AppStore.currentData.value = Array(10)
      .fill(null)
      .map((_, i) => ({ id: i }));
    AppStore.columns.value = ['id'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
  });

  it('renders with default values', () => {
    renderWithI18n(<PromoteHeaderDialog />);

    const input = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(input.value).toBe('0');
  });

  it('updates skip rows when changed', () => {
    renderWithI18n(<PromoteHeaderDialog />);

    const input = screen.getByPlaceholderText('0') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '3' } });

    expect(input.value).toBe('3');
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [{ promoteHeader: { skipRows: 2 } }],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<PromoteHeaderDialog />);

    const input = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(input.value).toBe('2');
  });
});
