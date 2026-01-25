/**
 * TextDialog Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { TextDialog } from './TextDialog';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as TextHandlers from '../handlers/text-handlers';

describe('TextDialog', () => {
  const testColumns = ['Name', 'Description'];

  beforeEach(() => {
    // Reset store state before each test
    DialogStore.textState.column.value = '';
    DialogStore.textState.operations.value = [];
    DialogStore.textState.removeOrigin.value = false;
    DialogStore.textState.error.value = null;
    AppStore.columns.value = testColumns;
    AppStore.currentData.value = [
      { Name: 'Alice Smith', Description: '  Hello World  ' },
      { Name: 'bob jones', Description: 'test' },
    ];

    // Mock getTextColumns to return test columns
    vi.spyOn(TextHandlers, 'getTextColumns').mockReturnValue(testColumns);
  });

  it('renders with column selection if columns exist', () => {
    render(<TextDialog />);

    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
  });

  it('shows operation options when column selected', () => {
    DialogStore.textState.column.value = 'Name';
    render(<TextDialog />);

    expect(screen.getByText('Case transformation:')).toBeDefined();
    expect(screen.getByText('Uppercase')).toBeDefined();
    expect(screen.getByText('Lowercase')).toBeDefined();
    expect(screen.getByText('Title Case')).toBeDefined();
  });

  it('toggles case operation selection', () => {
    DialogStore.textState.column.value = 'Name';
    render(<TextDialog />);

    const uppercaseRadio = screen.getByLabelText('Uppercase');
    fireEvent.click(uppercaseRadio);
    expect(DialogStore.textState.operations.value).toContain('uppercase');

    const lowercaseRadio = screen.getByLabelText('Lowercase');
    fireEvent.click(lowercaseRadio);
    expect(DialogStore.textState.operations.value).toContain('lowercase');
    expect(DialogStore.textState.operations.value).not.toContain('uppercase');
  });

  it('toggles trim operation', () => {
    DialogStore.textState.column.value = 'Name';
    render(<TextDialog />);

    const trimCheckbox = screen.getByLabelText(/Trim whitespace/);
    fireEvent.click(trimCheckbox);
    expect(DialogStore.textState.operations.value).toContain('trim');

    fireEvent.click(trimCheckbox);
    expect(DialogStore.textState.operations.value).not.toContain('trim');
  });

  it('shows remove origin option when operations are selected', () => {
    DialogStore.textState.column.value = 'Name';
    DialogStore.textState.operations.value = ['uppercase'];
    render(<TextDialog />);

    expect(screen.getByLabelText(/Remove origin column/)).toBeDefined();
  });

  it('hides remove origin option when no operations selected', () => {
    DialogStore.textState.column.value = 'Name';
    DialogStore.textState.operations.value = [];
    render(<TextDialog />);

    expect(screen.queryByLabelText(/Remove origin column/)).toBeNull();
  });

  it('displays help text when no string columns available', () => {
    vi.spyOn(TextHandlers, 'getTextColumns').mockReturnValue([]);
    render(<TextDialog />);

    expect(screen.getByText(/No string columns found/)).toBeDefined();
  });
});
