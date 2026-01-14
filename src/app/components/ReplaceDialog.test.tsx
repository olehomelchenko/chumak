/**
 * ReplaceDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { ReplaceDialog } from './ReplaceDialog';

describe('ReplaceDialog', () => {
  const testColumns = ['name', 'status', 'count'];

  it('renders all column chips', () => {
    const column = signal('');
    const findValue = signal('');
    const replaceValue = signal('');

    render(
      <ReplaceDialog
        columns={testColumns}
        column={column}
        findValue={findValue}
        replaceValue={replaceValue}
      />
    );

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('selects a column when clicked', () => {
    const column = signal('name');
    const findValue = signal('');
    const replaceValue = signal('');

    render(
      <ReplaceDialog
        columns={testColumns}
        column={column}
        findValue={findValue}
        replaceValue={replaceValue}
      />
    );

    const statusButton = screen.getByText('status').closest('button');
    fireEvent.click(statusButton!);

    expect(column.value).toBe('status');
  });

  it('updates find value when typed', () => {
    const column = signal('name');
    const findValue = signal('');
    const replaceValue = signal('');

    render(
      <ReplaceDialog
        columns={testColumns}
        column={column}
        findValue={findValue}
        replaceValue={replaceValue}
      />
    );

    const input = screen.getByPlaceholderText('Value to replace') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'old_value' } });

    expect(findValue.value).toBe('old_value');
  });

  it('updates replace value when typed', () => {
    const column = signal('name');
    const findValue = signal('');
    const replaceValue = signal('');

    render(
      <ReplaceDialog
        columns={testColumns}
        column={column}
        findValue={findValue}
        replaceValue={replaceValue}
      />
    );

    const input = screen.getByPlaceholderText(
      'New value (leave empty for null)'
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'new_value' } });

    expect(replaceValue.value).toBe('new_value');
  });

  it('highlights the selected column', () => {
    const column = signal('status');
    const findValue = signal('');
    const replaceValue = signal('');

    render(
      <ReplaceDialog
        columns={testColumns}
        column={column}
        findValue={findValue}
        replaceValue={replaceValue}
      />
    );

    const statusButton = screen.getByText('status').closest('button');
    expect(statusButton?.classList.contains('active')).toBe(true);
  });
});
