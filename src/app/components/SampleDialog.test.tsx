/**
 * SampleDialog Component Tests
 *
 * Tests with local state (useDialogState pattern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { SampleDialog } from './SampleDialog';
import { AppStore } from '../stores/AppStore';

describe('SampleDialog', () => {
  beforeEach(() => {
    AppStore.currentData.value = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    AppStore.columns.value = ['id'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
  });

  it('renders with default values', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample size') as HTMLInputElement;
    expect(countInput.value).toBe('100');
    expect(screen.getByText(/Total available rows:/)).toBeDefined();
  });

  it('updates count when typed', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample size') as HTMLInputElement;
    fireEvent.input(countInput, { target: { value: '50' } });

    expect(countInput.value).toBe('50');
  });

  it('updates seed when typed', () => {
    renderWithI18n(<SampleDialog />);

    const seedInput = screen.getByLabelText('Random seed (optional)') as HTMLInputElement;
    fireEvent.input(seedInput, { target: { value: '123' } });

    expect(seedInput.value).toBe('123');
  });

  it('clears seed when input is empty', () => {
    renderWithI18n(<SampleDialog />);

    const seedInput = screen.getByLabelText('Random seed (optional)') as HTMLInputElement;
    fireEvent.input(seedInput, { target: { value: '42' } });
    fireEvent.input(seedInput, { target: { value: '' } });

    expect(seedInput.value).toBe('');
  });

  it('handles invalid count gracefully', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample size') as HTMLInputElement;
    fireEvent.input(countInput, { target: { value: 'abc' } });

    expect(countInput.value).toBe('0');
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [{ sample: { count: 50, seed: 42 } }],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample size') as HTMLInputElement;
    expect(countInput.value).toBe('50');

    const seedInput = screen.getByLabelText('Random seed (optional)') as HTMLInputElement;
    expect(seedInput.value).toBe('42');
  });
});
