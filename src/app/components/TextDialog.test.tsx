/**
 * TextDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { TextDialog } from './TextDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as TextHandlers from '../handlers/transform/text-handlers';

describe('TextDialog', () => {
  const testColumns = ['Name', 'Description'];

  beforeEach(() => {
    DialogStore.resetAll();
    AppStore.activeDialog.value = 'text';
    AppStore.editingStepIndex.value = null;
    AppStore.selectedColumn.value = '';
    AppStore.columns.value = testColumns;
    AppStore.currentData.value = [
      { Name: 'Alice Smith', Description: '  Hello World  ' },
      { Name: 'bob jones', Description: 'test' },
    ];

    vi.spyOn(TextHandlers, 'getTextColumns').mockReturnValue(testColumns);
  });

  it('renders with column selection if columns exist', () => {
    renderWithI18n(<TextDialog />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
  });

  it('shows operation options when column pre-selected', () => {
    AppStore.selectedColumn.value = 'Name';
    renderWithI18n(<TextDialog />);

    expect(screen.getByText('Case transformation:')).toBeDefined();
    expect(screen.getByText('Uppercase')).toBeDefined();
    expect(screen.getByText('Lowercase')).toBeDefined();
    expect(screen.getByText('Titlecase')).toBeDefined();
  });

  it('toggles case operation selection', () => {
    AppStore.selectedColumn.value = 'Name';
    renderWithI18n(<TextDialog />);

    const uppercaseRadio = screen.getByLabelText('Uppercase');
    fireEvent.click(uppercaseRadio);
    expect(DialogStore.activeDialogState.value?.operations).toContain('uppercase');

    const lowercaseRadio = screen.getByLabelText('Lowercase');
    fireEvent.click(lowercaseRadio);
    expect(DialogStore.activeDialogState.value?.operations).toContain('lowercase');
    expect(DialogStore.activeDialogState.value?.operations).not.toContain('uppercase');
  });

  it('toggles trim operation', () => {
    AppStore.selectedColumn.value = 'Name';
    renderWithI18n(<TextDialog />);

    const trimCheckbox = screen.getByLabelText(/Trim whitespace/);
    fireEvent.click(trimCheckbox);
    expect(DialogStore.activeDialogState.value?.operations).toContain('trim');

    fireEvent.click(trimCheckbox);
    expect(DialogStore.activeDialogState.value?.operations).not.toContain('trim');
  });

  it('shows remove origin option when operations are selected', () => {
    AppStore.selectedColumn.value = 'Name';
    renderWithI18n(<TextDialog />);

    // Select an operation first
    const uppercaseRadio = screen.getByLabelText('Uppercase');
    fireEvent.click(uppercaseRadio);

    expect(screen.getByLabelText(/Remove origin column/)).toBeDefined();
  });

  it('hides remove origin option when no operations selected', () => {
    AppStore.selectedColumn.value = 'Name';
    renderWithI18n(<TextDialog />);
    expect(screen.queryByLabelText(/Remove origin column/)).toBeNull();
  });

  it('displays help text when no string columns available', () => {
    vi.spyOn(TextHandlers, 'getTextColumns').mockReturnValue([]);
    renderWithI18n(<TextDialog />);
    expect(screen.getByText(/No string columns found/)).toBeDefined();
  });
});
