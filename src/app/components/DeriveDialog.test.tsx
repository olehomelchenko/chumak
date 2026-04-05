import { screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithI18n } from '../test-utils';

// Mock ExpressionEditor as a plain input
vi.mock('./ExpressionEditor', () => ({
  ExpressionEditor: ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      value={value}
      onInput={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

import { DeriveDialog } from './DeriveDialog';
import { AppStore } from '../stores/AppStore';

describe('DeriveDialog', () => {
  beforeEach(() => {
    AppStore.editingStepIndex.value = null;
    AppStore.columns.value = [];
  });

  it('renders input fields with default empty values', () => {
    renderWithI18n(<DeriveDialog />);

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin') as HTMLInputElement;
    const expressionInput = screen.getByPlaceholderText(
      'e.g., (profit / sales) * 100'
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('');
    expect(expressionInput.value).toBe('');
  });

  it('initializes from editing step', () => {
    AppStore.activeModel.value = {
      id: 'model-1',
      name: 'Test',
      sourceId: 'source-1',
      steps: [
        {
          import: { source: 'source-1', fileName: 'test.csv', delimiter: ',', headerMode: 'auto' },
        },
        { derive: { profit: 'sales * 0.1' } },
      ],
      schema: [],
      data: [],
    };
    AppStore.editingStepIndex.value = 1;

    renderWithI18n(<DeriveDialog />);

    const nameInput = screen.getByPlaceholderText('e.g., profit_margin') as HTMLInputElement;
    const expressionInput = screen.getByPlaceholderText(
      'e.g., (profit / sales) * 100'
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('profit');
    expect(expressionInput.value).toBe('sales * 0.1');
  });

  it('opens reference dialog when reference button is clicked', () => {
    renderWithI18n(<DeriveDialog />);

    fireEvent.click(screen.getByText('Full reference'));
    expect(AppStore.activeDialog.value).toBe('reference');
  });
});
