import { screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithI18n } from '../test-utils';
import { ColumnEditorDialog } from './ColumnEditorDialog';
import { AppStore } from '../stores/AppStore';

describe('ColumnEditorDialog', () => {
  beforeEach(() => {
    // useDialogState reads from AppStore to build initial state
    AppStore.columns.value = ['col1', 'col2'];
    AppStore.selectedColumns.value = [];
    AppStore.editingStepIndex.value = null;
    AppStore.activeDialog.value = 'column-editor';
    AppStore.dialogSnapshot.value = null;
  });

  it('renders list mode correctly', () => {
    renderWithI18n(<ColumnEditorDialog />);

    expect(screen.getByText('List mode')).toBeDefined();
    expect(screen.getByText('col1')).toBeDefined();
    expect(screen.getByText('col2')).toBeDefined();
  });

  it('switches to text mode', () => {
    renderWithI18n(<ColumnEditorDialog />);

    fireEvent.click(screen.getByText('Text mode'));

    expect(screen.getByText('Text mode operation:')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('switches to pattern mode', () => {
    renderWithI18n(<ColumnEditorDialog />);

    fireEvent.click(screen.getByText('Pattern mode'));

    expect(screen.getByText('Pattern operation:')).toBeDefined();
  });

  it('displays changes preview when columns are removed', async () => {
    // Start with columns that will show changes when toggled
    AppStore.columns.value = ['col1', 'col2'];

    renderWithI18n(<ColumnEditorDialog />);

    // Find and click checkmark to deselect col1
    const buttons = screen.getAllByText('✓');
    fireEvent.click(buttons[0]); // Toggle first item

    await screen.findByText('Changes preview:');
    expect(screen.getAllByText(/col1/).length).toBeGreaterThan(0);
  });
});
