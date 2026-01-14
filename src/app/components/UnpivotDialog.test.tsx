/**
 * UnpivotDialog Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { UnpivotDialog, UnpivotMode } from './UnpivotDialog';

describe('UnpivotDialog', () => {
  const testColumns = ['Year', 'Q1', 'Q2', 'Q3', 'Q4'];

  it('renders with default values', () => {
    const keyName = signal('Year');
    const valueName = signal('Sales');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal([true, false, false, false, false]);

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    expect(screen.getByDisplayValue('Year')).toBeDefined();
    expect(screen.getByDisplayValue('Sales')).toBeDefined();
    expect(screen.getByText('Columns to Keep (as index)').className).toContain('button--primary');
  });

  it('updates names when input changes', () => {
    const keyName = signal('');
    const valueName = signal('');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal(testColumns.map(() => false));

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    const keyInput = screen.getByPlaceholderText('e.g. Year') as HTMLInputElement;
    fireEvent.input(keyInput, { target: { value: 'Month' } });
    expect(keyName.value).toBe('Month');
  });

  it('toggles mode', () => {
    const keyName = signal('');
    const valueName = signal('');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal(testColumns.map(() => false));

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    fireEvent.click(screen.getByText('Columns to Fold'));
    expect(mode.value).toBe('fold');
    expect(screen.getByText('Select Columns to Fold:')).toBeDefined();
  });

  it('toggles column selection', () => {
    const keyName = signal('');
    const valueName = signal('');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal([false, false, false, false, false]);

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    fireEvent.click(screen.getByText('Q1').closest('button')!);
    expect(selectedColumns.value[1]).toBe(true);

    fireEvent.click(screen.getByText('Q1').closest('button')!);
    expect(selectedColumns.value[1]).toBe(false);
  });

  it('handles Select All', () => {
    const keyName = signal('');
    const valueName = signal('');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal([false, false, false, false, false]);

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    fireEvent.click(screen.getByText('Select All'));
    expect(selectedColumns.value.every((v) => v)).toBe(true);
  });

  it('handles Select None', () => {
    const keyName = signal('');
    const valueName = signal('');
    const mode = signal<UnpivotMode>('keep');
    const selectedColumns = signal([true, true, true, true, true]);

    render(
      <UnpivotDialog
        columns={testColumns}
        keyName={keyName}
        valueName={valueName}
        mode={mode}
        selectedColumns={selectedColumns}
      />
    );

    fireEvent.click(screen.getByText('Select None'));
    expect(selectedColumns.value.every((v) => !v)).toBe(true);
  });
});
