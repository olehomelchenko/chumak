/**
 * ReplaceDialog Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/preact';
import { renderWithI18n } from '../test-utils';
import { ReplaceDialog } from './ReplaceDialog';
import { AppStore } from '../stores/AppStore';

describe('ReplaceDialog', () => {
  const testColumns = ['name', 'status', 'count'];

  beforeEach(() => {
    AppStore.columns.value = testColumns;
    AppStore.selectedColumn.value = null;
    AppStore.selectedColumns.value = [];
    AppStore.selectedCell.value = null;
    AppStore.editingStepIndex.value = null;
  });

  it('renders all column chips', () => {
    renderWithI18n(<ReplaceDialog />);

    testColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('initializes from selectedColumn', () => {
    AppStore.selectedColumn.value = 'status';
    renderWithI18n(<ReplaceDialog />);

    const statusButton = screen.getByText('status').closest('button');
    expect(statusButton?.className).toContain('active');
  });

  it('initializes from selectedCell with value', () => {
    AppStore.selectedCell.value = { col: 'name', value: 'Alice', isError: false };
    renderWithI18n(<ReplaceDialog />);

    // Should have the find value pre-filled
    const input = screen.getByPlaceholderText('Value to replace') as HTMLInputElement;
    expect(input.value).toBe('Alice');
  });

  it('initializes from selectedCell with error', () => {
    AppStore.selectedCell.value = { col: 'name', value: 'bad', isError: true };
    renderWithI18n(<ReplaceDialog />);

    // Should be in errors mode — find value input is hidden
    expect(screen.queryByPlaceholderText('Value to replace')).toBeNull();
  });
});
