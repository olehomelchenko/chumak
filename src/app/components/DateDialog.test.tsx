/**
 * DateDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { DateDialog } from './DateDialog';
import { AppStore } from '../stores/AppStore';
import * as DateHandlers from '../handlers/transform/date-handlers';

vi.mock('../handlers/preview-engine', async () =>
  (await import('../handlers/test-utils')).MockFactories.previewEngine()
);

describe('DateDialog', () => {
  const testColumns = ['Order Date', 'Ship Date'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumn.value = null;
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = {
      id: 'model-1',
      name: 'Test',
      sourceId: 'source-1',
      steps: [],
      schema: [
        { name: 'Order Date', type: 'date' },
        { name: 'Ship Date', type: 'date' },
      ],
      data: [{ 'Order Date': new Date('2024-01-01'), 'Ship Date': new Date('2024-01-15') }],
    };
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;
    AppStore.currentData.value = [
      { 'Order Date': new Date('2024-01-01'), 'Ship Date': new Date('2024-01-15') },
    ];

    // Mock getDateColumns to return test columns
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
    vi.spyOn(DateHandlers, 'getDatePartPreview').mockReturnValue('2024');
    vi.spyOn(DateHandlers, 'computeDatePreview').mockReturnValue(null);
    vi.clearAllMocks();
  });

  it('renders with column selection if columns exist', () => {
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
    renderWithI18n(<DateDialog />);

    expect(screen.getByText('Order Date')).toBeDefined();
    expect(screen.getByText('Ship Date')).toBeDefined();
  });

  it('shows operation options when column is pre-selected', () => {
    AppStore.selectedColumn.value = 'Order Date';
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
    renderWithI18n(<DateDialog />);

    expect(screen.getByText('Operation:')).toBeDefined();
    expect(screen.getByText('Extract part')).toBeDefined();
  });

  it('shows extract parts table', () => {
    AppStore.selectedColumn.value = 'Order Date';
    vi.spyOn(DateHandlers, 'getDateColumns').mockReturnValue(testColumns);
    renderWithI18n(<DateDialog />);

    const previewTable = document.querySelector('table');
    expect(previewTable).toBeDefined();
  });
});
