/**
 * FilterDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
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

import { FilterDialog } from './FilterDialog';
import { AppStore } from '../stores/AppStore';

describe('FilterDialog', () => {
  beforeEach(() => {
    AppStore.columns.value = [];
    AppStore.selectedColumn.value = null;
    AppStore.editingStepIndex.value = null;
  });

  it('renders with default values', () => {
    renderWithI18n(<FilterDialog />);

    expect(screen.getByPlaceholderText('e.g., sales > 1000')).toBeDefined();
    expect(screen.getByText('Show all').className).toContain('button--primary');
  });

  it('pre-populates expression from selectedColumn', () => {
    AppStore.selectedColumn.value = 'sales';
    renderWithI18n(<FilterDialog />);

    const input = screen.getByPlaceholderText('e.g., sales > 1000') as HTMLInputElement;
    expect(input.value).toContain('[sales]');
  });

  it('toggles preview mode', () => {
    renderWithI18n(<FilterDialog />);

    const matchingButton = screen.getByText('Matching only');
    fireEvent.click(matchingButton);

    expect(matchingButton.className).toContain('button--primary');
  });

  it('opens reference dialog when reference button is clicked', () => {
    renderWithI18n(<FilterDialog />);

    const refButton = screen.getByText('Full reference');
    fireEvent.click(refButton);

    expect(AppStore.activeDialog.value).toBe('reference');
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
        { filter: 'age > 25' },
      ],
      schema: [],
      data: [],
    };
    AppStore.editingStepIndex.value = 1;

    renderWithI18n(<FilterDialog />);

    const input = screen.getByPlaceholderText('e.g., sales > 1000') as HTMLInputElement;
    expect(input.value).toBe('age > 25');
  });
});
