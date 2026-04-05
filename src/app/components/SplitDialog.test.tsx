/**
 * SplitDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { SplitDialog } from './SplitDialog';
import { AppStore } from '../stores/AppStore';

vi.mock('../handlers/transform/split-handlers', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    detectDelimiter: vi.fn().mockReturnValue(null),
    applySplitPreview: vi.fn().mockReturnValue(null),
  };
});

vi.mock('../handlers/preview-engine', async () =>
  (await import('../handlers/test-utils')).MockFactories.previewEngine()
);

vi.mock('../handlers/validation-engine', async () =>
  (await import('../handlers/test-utils')).MockFactories.validationEngineRegex()
);

describe('SplitDialog', () => {
  const testColumns = ['Product ID', 'Name', 'Category'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumn.value = 'Product ID';
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = null;
    AppStore.currentData.value = [{ 'Product ID': 'A,B', Name: 'Test', Category: 'Cat' }];
    vi.clearAllMocks();
  });

  it('renders with default comma delimiter', () => {
    renderWithI18n(<SplitDialog />);

    const input = screen.getByPlaceholderText('Enter delimiter') as HTMLInputElement;
    expect(input.value).toBe(',');
  });

  it('initializes from editing step', () => {
    AppStore.selectedColumn.value = null;
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      id: 'model-1',
      name: 'Test',
      sourceId: 'source-1',
      steps: [
        {
          split: {
            column: 'Name',
            delimiter: ';',
            isRegex: false,
            mode: 'left',
            keepOriginal: false,
          },
        },
      ],
      schema: [],
      data: [],
    };

    renderWithI18n(<SplitDialog />);

    const input = screen.getByPlaceholderText('Enter delimiter') as HTMLInputElement;
    expect(input.value).toBe(';');
  });
});
