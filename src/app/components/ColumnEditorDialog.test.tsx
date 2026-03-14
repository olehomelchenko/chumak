import { screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithI18n } from '../test-utils';
import { ColumnEditorDialog } from './ColumnEditorDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('ColumnEditorDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.columnEditorState.mode.value = 'list';
    DialogStore.columnEditorState.columns.value = [
      { original: 'col1', renamed: 'col1', selected: true },
      { original: 'col2', renamed: 'col2_renamed', selected: true },
    ];
    DialogStore.columnEditorState.patternText.value = '';
    DialogStore.columnEditorState.patternMode.value = 'include';
    DialogStore.columnEditorState.patternMatchType.value = 'prefix';
    DialogStore.columnEditorState.draggedIndex.value = null;
    DialogStore.columnEditorState.textSubMode.value = 'rename';
    DialogStore.columnEditorState.textValue.value = '';
    DialogStore.columnEditorState.textError.value = null;
    AppStore.columns.value = ['col1', 'col2'];
  });

  it('renders list mode correctly', () => {
    renderWithI18n(<ColumnEditorDialog />);

    expect(screen.getByText('List mode')).toBeDefined();
    expect(screen.getByText('col1')).toBeDefined();
    expect(screen.getByText('col2')).toBeDefined(); // Original name
    expect(screen.getByDisplayValue('col2_renamed')).toBeDefined();
  });

  it('renders text mode correctly', () => {
    DialogStore.columnEditorState.mode.value = 'text';
    renderWithI18n(<ColumnEditorDialog />);

    expect(screen.getByText('Text mode operation:')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('handles item selection toggling', () => {
    renderWithI18n(<ColumnEditorDialog />);

    const buttons = screen.getAllByText('✓');
    fireEvent.click(buttons[0]); // Toggle first item

    expect(DialogStore.columnEditorState.columns.value[0].selected).toBe(false);
  });

  it('handles item renaming', () => {
    renderWithI18n(<ColumnEditorDialog />);

    const inputs = screen.getAllByDisplayValue(/col/);
    // index 0 is already 'col1'
    fireEvent.input(inputs[0], { target: { value: 'new_name' } });

    expect(DialogStore.columnEditorState.columns.value[0].renamed).toBe('new_name');
  });

  it('displays changes preview', async () => {
    // Set up columns to show changes
    DialogStore.columnEditorState.columns.value = [
      { original: 'col1', renamed: 'col1', selected: false }, // Will be removed
      { original: 'col2', renamed: 'new_name', selected: true }, // Will be renamed
    ];
    // Reorder by switching the order in columns
    AppStore.columns.value = ['col1', 'col2'];

    renderWithI18n(<ColumnEditorDialog />);

    await screen.findByText('Changes preview:');
    expect(screen.getAllByText(/col1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/col2 → new_name/)).toBeDefined();
  });

  it('switches to text mode', () => {
    renderWithI18n(<ColumnEditorDialog />);

    fireEvent.click(screen.getByText('Text mode'));
    expect(DialogStore.columnEditorState.mode.value).toBe('text');
  });
});
