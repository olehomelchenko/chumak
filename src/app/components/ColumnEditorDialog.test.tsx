import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { describe, it, expect, vi } from 'vitest';
import { ColumnEditorDialog, ColumnEditorItem, ColumnEditorChanges } from './ColumnEditorDialog';

describe('ColumnEditorDialog', () => {
  const createProps = () => ({
    mode: signal<'list' | 'text'>('list'),
    columns: signal<ColumnEditorItem[]>([
      { original: 'col1', renamed: 'col1', selected: true },
      { original: 'col2', renamed: 'col2_renamed', selected: true },
    ]),
    patternText: signal(''),
    patternMode: signal<'include' | 'exclude'>('include'),
    patternMatchType: signal<'prefix' | 'suffix' | 'exact'>('prefix'),
    draggedIndex: signal<number | null>(null),
    textSubMode: signal<'rename' | 'reorder' | 'select'>('rename'),
    textValue: signal(''),
    textError: signal<string | null>(null),
    changes: signal<ColumnEditorChanges>({
      removed: [],
      renamed: [],
      reordered: false,
      hasChanges: false,
    }),
    onApplyPattern: vi.fn(),
    onSwitchToText: vi.fn(),
    onValidateText: vi.fn(),
  });

  it('renders list mode correctly', () => {
    const props = createProps();
    render(<ColumnEditorDialog {...props} />);

    expect(screen.getByText('List Mode')).toBeDefined();
    expect(screen.getByText('col1')).toBeDefined();
    expect(screen.getByText('col2')).toBeDefined(); // Original name
    expect(screen.getByDisplayValue('col2_renamed')).toBeDefined();
  });

  it('renders text mode correctly', () => {
    const props = createProps();
    props.mode.value = 'text';
    render(<ColumnEditorDialog {...props} />);

    expect(screen.getByText('Text Mode Operation:')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('handles item selection toggling', () => {
    const props = createProps();
    render(<ColumnEditorDialog {...props} />);

    const buttons = screen.getAllByText('✓');
    fireEvent.click(buttons[0]); // Toggle first item

    expect(props.columns.value[0].selected).toBe(false);
  });

  it('handles item renaming', () => {
    const props = createProps();
    render(<ColumnEditorDialog {...props} />);

    const inputs = screen.getAllByDisplayValue(/col/);
    // index 0 is already 'col1'
    fireEvent.input(inputs[0], { target: { value: 'new_name' } });

    expect(props.columns.value[0].renamed).toBe('new_name');
  });

  it('displays changes preview', async () => {
    const props = createProps();
    props.changes.value = {
      hasChanges: true,
      removed: ['deleted_col'],
      renamed: [{ from: 'old', to: 'new' }],
      reordered: true,
    };
    render(<ColumnEditorDialog {...props} />);

    await screen.findByText('Changes Preview:');
    expect(screen.getByText('deleted_col')).toBeDefined();
    expect(screen.getByText('old → new')).toBeDefined();
    expect(screen.getByText('Column order changed')).toBeDefined();
  });

  it('switches to text mode', () => {
    const props = createProps();
    render(<ColumnEditorDialog {...props} />);

    fireEvent.click(screen.getByText('Text Mode'));
    expect(props.mode.value).toBe('text');
    expect(props.onSwitchToText).toHaveBeenCalled();
  });
});
