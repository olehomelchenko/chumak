/**
 * SampleDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { SampleDialog } from './SampleDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('SampleDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.sampleState.count.value = 100;
    DialogStore.sampleState.seed.value = undefined;
    AppStore.currentData.value = Array.from({ length: 500 }, (_, i) => ({ id: i }));
  });

  it('renders with default values', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample Size') as HTMLInputElement;
    expect(countInput.value).toBe('100');
    expect(screen.getByText(/Total available rows:/)).toBeDefined();
  });

  it('updates count when typed', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample Size') as HTMLInputElement;
    fireEvent.input(countInput, { target: { value: '50' } });

    expect(DialogStore.sampleState.count.value).toBe(50);
  });

  it('updates seed when typed', () => {
    renderWithI18n(<SampleDialog />);

    const seedInput = screen.getByLabelText('Random Seed (Optional)') as HTMLInputElement;
    fireEvent.input(seedInput, { target: { value: '123' } });

    expect(DialogStore.sampleState.seed.value).toBe(123);
  });

  it('clears seed when input is empty', () => {
    DialogStore.sampleState.seed.value = 42;
    renderWithI18n(<SampleDialog />);

    const seedInput = screen.getByLabelText('Random Seed (Optional)') as HTMLInputElement;
    fireEvent.input(seedInput, { target: { value: '' } });

    expect(DialogStore.sampleState.seed.value).toBeUndefined();
  });

  it('handles invalid count gracefully', () => {
    renderWithI18n(<SampleDialog />);

    const countInput = screen.getByLabelText('Sample Size') as HTMLInputElement;
    fireEvent.input(countInput, { target: { value: 'abc' } });

    expect(DialogStore.sampleState.count.value).toBe(0);
  });
});
