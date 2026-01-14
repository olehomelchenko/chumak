/**
 * SplitDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { SplitDialog, SplitMode } from './SplitDialog';

describe('SplitDialog', () => {
  const testColumns = ['Product ID', 'Name', 'Category'];

  it('renders with columns and default values', () => {
    const column = signal('Product ID');
    const delimiter = signal(',');
    const autoDetectedDelimiter = signal<string | null>(null);
    const isRegex = signal(false);
    const mode = signal<SplitMode>('spread');
    const maxColumns = signal(2);
    const keepOriginal = signal(false);
    const error = signal(null);

    render(
      <SplitDialog
        columns={testColumns}
        column={column}
        delimiter={delimiter}
        autoDetectedDelimiter={autoDetectedDelimiter}
        isRegex={isRegex}
        mode={mode}
        maxColumns={maxColumns}
        keepOriginal={keepOriginal}
        error={error}
      />
    );

    expect(screen.getByText('Product ID')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    const input = screen.getByPlaceholderText('Enter delimiter') as HTMLInputElement;
    expect(input.value).toBe(',');
  });

  it('updates delimiter via presets', () => {
    const column = signal('Product ID');
    const delimiter = signal(',');
    const autoDetectedDelimiter = signal(null);
    const isRegex = signal(false);
    const mode = signal<SplitMode>('spread');
    const maxColumns = signal(2);
    const keepOriginal = signal(false);
    const error = signal(null);

    render(
      <SplitDialog
        columns={testColumns}
        column={column}
        delimiter={delimiter}
        autoDetectedDelimiter={autoDetectedDelimiter}
        isRegex={isRegex}
        mode={mode}
        maxColumns={maxColumns}
        keepOriginal={keepOriginal}
        error={error}
      />
    );

    // Click semi-colon
    fireEvent.click(screen.getByText(';'));
    expect(delimiter.value).toBe(';');
    expect(isRegex.value).toBe(false);

    // Click whitespace icon (title="Whitespace")
    fireEvent.click(screen.getByTitle('Whitespace'));
    expect(delimiter.value).toBe('\\s+');
    expect(isRegex.value).toBe(true);
  });

  it('switches modes and shows max columns input', () => {
    const column = signal('Product ID');
    const delimiter = signal(',');
    const autoDetectedDelimiter = signal(null);
    const isRegex = signal(false);
    const mode = signal<SplitMode>('spread');
    const maxColumns = signal(2);
    const keepOriginal = signal(false);
    const error = signal(null);

    render(
      <SplitDialog
        columns={testColumns}
        column={column}
        delimiter={delimiter}
        autoDetectedDelimiter={autoDetectedDelimiter}
        isRegex={isRegex}
        mode={mode}
        maxColumns={maxColumns}
        keepOriginal={keepOriginal}
        error={error}
      />
    );

    expect(screen.queryByPlaceholderText('e.g., 3')).toBeNull();

    // Click "Keep First N" which has value="firstN"
    // We can find the radio by the span text "Keep First N - limit number of columns"
    // Since the label wraps input and span, finding by Label Text works if the text matches the label content
    const radio = screen.getByLabelText('Keep First N - limit number of columns');
    fireEvent.click(radio);
    expect(mode.value).toBe('firstN');
    expect(screen.getByPlaceholderText('e.g., 3')).toBeDefined();
  });

  it('selects column', () => {
    const column = signal('Product ID');
    const delimiter = signal(',');
    const autoDetectedDelimiter = signal(null);
    const isRegex = signal(false);
    const mode = signal<SplitMode>('spread');
    const maxColumns = signal(2);
    const keepOriginal = signal(false);
    const error = signal(null);

    render(
      <SplitDialog
        columns={testColumns}
        column={column}
        delimiter={delimiter}
        autoDetectedDelimiter={autoDetectedDelimiter}
        isRegex={isRegex}
        mode={mode}
        maxColumns={maxColumns}
        keepOriginal={keepOriginal}
        error={error}
      />
    );

    fireEvent.click(screen.getByText('Category'));
    expect(column.value).toBe('Category');
  });

  it('shows auto-detected delimiter', () => {
    const column = signal('Product ID');
    const delimiter = signal(',');
    const autoDetectedDelimiter = signal('|');
    const isRegex = signal(false);
    const mode = signal<SplitMode>('spread');
    const maxColumns = signal(2);
    const keepOriginal = signal(false);
    const error = signal(null);

    render(
      <SplitDialog
        columns={testColumns}
        column={column}
        delimiter={delimiter}
        autoDetectedDelimiter={autoDetectedDelimiter}
        isRegex={isRegex}
        mode={mode}
        maxColumns={maxColumns}
        keepOriginal={keepOriginal}
        error={error}
      />
    );

    // Check for button with |
    const buttons = screen.getAllByRole('button', { name: '|' });
    expect(buttons.length).toBeGreaterThan(0);

    // Check for auto-detected text
    const autoDiv = screen.getByText((content) => content.includes('Auto-detected'));
    expect(autoDiv).toBeDefined();
    expect(autoDiv.textContent).toContain('|');
  });
});
