/**
 * ConditionalDialog Component Tests
 *
 * Tests with local state (useDialogState pattern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { ConditionalDialog } from './ConditionalDialog';
import { AppStore } from '../stores/AppStore';

describe('ConditionalDialog', () => {
  beforeEach(() => {
    AppStore.currentData.value = [{ name: 'Alice', age: 30 }];
    AppStore.columns.value = ['name', 'age'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeModel.value = { steps: [], schema: [], id: 'test', name: 'test' } as any;
  });

  it('renders with empty defaults', () => {
    renderWithI18n(<ConditionalDialog />);

    // Should have output name input, condition fields, and else field
    expect(screen.getByText(/output/i)).toBeDefined();
  });

  it('initializes from editing step', () => {
    AppStore.editingStepIndex.value = 0;
    AppStore.activeModel.value = {
      steps: [
        {
          conditional: {
            column: 'category',
            conditions: [{ when: 'age > 30', then: '"senior"' }],
            else: '"other"',
          },
        },
      ],
      schema: [],
      id: 'test',
      name: 'test',
    } as any;

    renderWithI18n(<ConditionalDialog />);

    // Output column name should be pre-filled
    const nameInput = screen.getByDisplayValue('category');
    expect(nameInput).toBeDefined();

    // Expression values are rendered in CodeMirror editors (not plain inputs).
    // Verify they appear in the DOM text content.
    const container = nameInput.closest('div')!.parentElement!;
    expect(container.textContent).toContain('age');
    expect(container.textContent).toContain('"senior"');
    expect(container.textContent).toContain('"other"');
  });
});
