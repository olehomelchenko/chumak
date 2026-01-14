/**
 * SliceRowsDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { SliceRowsDialog, SliceMode } from './SliceRowsDialog';

describe('SliceRowsDialog', () => {
  it('renders with default values', () => {
    const count = signal(10);
    const mode = signal<SliceMode>('first');

    render(<SliceRowsDialog count={count} mode={mode} rowCount={100} />);

    expect(screen.getByPlaceholderText('10')).toBeDefined();
    // Check if the 'first' radio is checked
    const radio = screen.getByLabelText('Keep first N rows') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('updates count when input changes', () => {
    const count = signal(10);
    const mode = signal<SliceMode>('first');

    render(<SliceRowsDialog count={count} mode={mode} rowCount={100} />);

    const input = screen.getByPlaceholderText('10') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '25' } });

    expect(count.value).toBe(25);
  });

  it('updates mode when radio changes', () => {
    const count = signal(10);
    const mode = signal<SliceMode>('first');

    render(<SliceRowsDialog count={count} mode={mode} rowCount={100} />);

    const removeLastRadio = screen.getByLabelText('Remove last N rows');
    fireEvent.click(removeLastRadio);

    expect(mode.value).toBe('removeLast');
  });

  it('shows correct preview for "first" mode', () => {
    const count = signal(5);
    const mode = signal<SliceMode>('first');

    render(<SliceRowsDialog count={count} mode={mode} rowCount={100} />);

    // "Will keep rows 1 to 5"
    expect(screen.getByText('Will keep rows 1 to')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows correct preview for "last" mode', () => {
    const count = signal(10);
    const mode = signal<SliceMode>('last');

    // Total 100, keep last 10 -> start at 91 (100 - 10 + 1)
    render(<SliceRowsDialog count={count} mode={mode} rowCount={100} />);

    // Use regex to match the text content
    expect(screen.getByText(/Will keep rows/)).toBeDefined();
    // We look for '91' in a strong tag, testing library finds text anywhere
    const strong91 = screen.getByText('91');
    expect(strong91.tagName).toBe('STRONG');
  });
});
