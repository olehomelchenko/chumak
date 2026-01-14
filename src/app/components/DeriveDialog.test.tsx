import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { describe, it, expect, vi } from 'vitest';
import { DeriveDialog } from './DeriveDialog';

describe('DeriveDialog', () => {
  it('renders input fields with initial values', () => {
    const columnName = signal('initial_name');
    const expression = signal('initial + expression');
    const error = signal<string | null>(null);
    const onOpenReference = vi.fn();

    render(
      <DeriveDialog
        columnName={columnName}
        expression={expression}
        error={error}
        onOpenReference={onOpenReference}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin') as HTMLInputElement;
    const expressionInput = screen.getByPlaceholderText(
      'e.g., (profit / sales) * 100'
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('initial_name');
    expect(expressionInput.value).toBe('initial + expression');
  });

  it('updates signals on input', () => {
    const columnName = signal('');
    const expression = signal('');
    const error = signal<string | null>(null);
    const onOpenReference = vi.fn();

    render(
      <DeriveDialog
        columnName={columnName}
        expression={expression}
        error={error}
        onOpenReference={onOpenReference}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin');
    const expressionInput = screen.getByPlaceholderText('e.g., (profit / sales) * 100');

    fireEvent.input(nameInput, { target: { value: 'new_name' } });
    expect(columnName.value).toBe('new_name');

    fireEvent.input(expressionInput, { target: { value: 'col * 2' } });
    expect((expressionInput as HTMLInputElement).value).toBe('col * 2');
  });

  it('displays error message when present', () => {
    const columnName = signal('');
    const expression = signal('');
    const error = signal<string | null>('Syntax Error');
    const onOpenReference = vi.fn();

    render(
      <DeriveDialog
        columnName={columnName}
        expression={expression}
        error={error}
        onOpenReference={onOpenReference}
      />
    );

    expect(screen.getByText('Syntax Error')).toBeDefined();
  });

  it('calls onOpenReference when button is clicked', () => {
    const columnName = signal('');
    const expression = signal('');
    const error = signal<string | null>(null);
    const onOpenReference = vi.fn();

    render(
      <DeriveDialog
        columnName={columnName}
        expression={expression}
        error={error}
        onOpenReference={onOpenReference}
      />
    );

    fireEvent.click(screen.getByText('Full Reference'));
    expect(onOpenReference).toHaveBeenCalled();
  });
});
