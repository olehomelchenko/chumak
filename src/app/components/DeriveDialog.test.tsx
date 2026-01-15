import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach } from 'vitest';
import { DeriveDialog } from './DeriveDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('DeriveDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.deriveState.columnName.value = '';
    DialogStore.deriveState.expression.value = '';
    DialogStore.deriveState.error.value = null;
  });

  it('renders input fields with initial values', () => {
    DialogStore.deriveState.columnName.value = 'initial_name';
    DialogStore.deriveState.expression.value = 'initial + expression';

    render(<DeriveDialog />);

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin') as HTMLInputElement;
    const expressionInput = screen.getByPlaceholderText(
      'e.g., (profit / sales) * 100'
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('initial_name');
    expect(expressionInput.value).toBe('initial + expression');
  });

  it('updates signals on input', () => {
    render(<DeriveDialog />);

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin');
    const expressionInput = screen.getByPlaceholderText('e.g., (profit / sales) * 100');

    fireEvent.input(nameInput, { target: { value: 'new_name' } });
    expect(DialogStore.deriveState.columnName.value).toBe('new_name');

    fireEvent.input(expressionInput, { target: { value: 'col * 2' } });
    expect((expressionInput as HTMLInputElement).value).toBe('col * 2');
  });

  it('displays error message when present', () => {
    DialogStore.deriveState.error.value = 'Syntax Error';
    render(<DeriveDialog />);

    expect(screen.getByText('Syntax Error')).toBeDefined();
  });

  it('opens expressions dialog when reference button is clicked', () => {
    render(<DeriveDialog />);

    fireEvent.click(screen.getByText('Full Reference'));
    expect(AppStore.activeDialog.value).toBe('expressions');
  });
});
