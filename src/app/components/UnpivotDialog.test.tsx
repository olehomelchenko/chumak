/**
 * UnpivotDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { UnpivotDialog } from './UnpivotDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

vi.mock('../handlers/preview-engine', async () =>
  (await import('../handlers/test-utils')).MockFactories.previewEngine()
);

describe('UnpivotDialog', () => {
  const testColumns = ['Year', 'Q1', 'Q2', 'Q3', 'Q4'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    DialogStore.activeDialogState.value = null;
    DialogStore.activeDialogHasError.value = false;
    DialogStore.activeDialogError.value = null;
  });

  it('renders with default values', () => {
    renderWithI18n(<UnpivotDialog />);

    expect(screen.getByDisplayValue('key')).toBeDefined();
    expect(screen.getByDisplayValue('value')).toBeDefined();
    const keepButton = screen.getByText('Columns to keep (as index)').closest('button');
    expect(keepButton?.className).toContain('active');
  });

  it('updates names when input changes', () => {
    renderWithI18n(<UnpivotDialog />);

    const keyInput = screen.getByPlaceholderText('e.g. Year') as HTMLInputElement;
    fireEvent.input(keyInput, { target: { value: 'Month' } });
    expect(keyInput.value).toBe('Month');
  });

  it('toggles mode', () => {
    renderWithI18n(<UnpivotDialog />);

    fireEvent.click(screen.getByText('Columns to fold'));
    expect(screen.getByText('Select columns to fold:')).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    const mockModel = {
      id: 'test',
      steps: [
        {
          fold: {
            columns: ['Q1', 'Q2'],
            as: ['Quarter', 'Sales'],
          },
        },
      ],
      schema: [],
      data: [],
      sourceId: 'src',
      name: 'test',
    };
    AppStore.activeModel.value = mockModel as any;

    renderWithI18n(<UnpivotDialog />);

    expect(screen.getByDisplayValue('Quarter')).toBeDefined();
    expect(screen.getByDisplayValue('Sales')).toBeDefined();
  });
});
